"""
NexaERP Autonomous Intrusion Detection & Prevention System (IDS/IPS).
Provides real-time multi-vector threat signature analysis, heuristic anomaly scoring,
and dynamic automated IP quarantine defense against OWASP Top 10 exploits.
"""

import re
import time
from typing import Optional, Dict, Any, List, Tuple, Set
from datetime import datetime, timezone, timedelta
from urllib.parse import unquote
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.security_incident import IntrusionEvent, QuarantinedIP
from app.models.auth import User, Role, UserRole
from app.services.audit_service import record_audit_log
from app.services.email_service import send_business_email, generate_sqli_alert_template
from app.config import settings

# Threat signature regex definitions
PATTERNS = {
    "SQL_INJECTION": re.compile(
        r"("
        # Tautologies with quotes/parentheses: ' OR 1=1, ' OR '1'='1, " OR "1"="1", ') OR ('1'='1, ' OR ''=', ' OR 'a'='a', ' OR true
        r"(?:['\"]\s*|\)\s*)\b(?:or|and|xor)\b\s*\(?['\"]?[a-z0-9_]+['\"]?\s*=\s*['\"]?[a-z0-9_]+['\"]?\)?|"
        r"\b(?:or|and)\s+(?:1\s*=\s*1|0\s*=\s*0|true\s*=\s*true|'1'\s*=\s*'1'|\"1\"\s*=\s*\"1\")\b|"
        # SQL Comments following a quote or alphanumeric: admin'--, admin' #, admin'/*, or standalone --, #, /*
        r"(['\"][^'\"]*(--|#|/\*)|^\s*(--|#|/\*))|"
        # SQL Commands: UNION SELECT, SELECT ... FROM, INSERT INTO, DELETE FROM, DROP TABLE/DATABASE, ALTER TABLE, EXEC
        r"\b(?:union(?:\s+all)?\s+select|select\s+.*?\s+from|insert\s+into|delete\s+from|update\s+.*?\s+set|drop\s+(?:table|database|view|index)|alter\s+table|create\s+table|truncate\s+table|exec(?:\s+xp_)?)\b|"
        # Stacked SQL statements: ; SELECT, ; DROP, ; INSERT, ; UPDATE, ; DELETE
        r";\s*(?:select|insert|update|delete|drop|alter|exec|truncate)\b|"
        # Time-based blind SQLi: sleep(N), benchmark(N), waitfor delay, pg_sleep(N)
        r"\b(?:waitfor\s+delay|sleep\s*\(|benchmark\s*\(|pg_sleep\s*\(|dbms_pipe\.receive_message)\b|"
        # SQL functions often used in injection: version(), user(), database(), schema(), current_user
        r"\b(?:version\(\)|current_user\(\)|user\(\)|database\(\)|schema\(\)|load_file\s*\(|into\s+(?:out|dump)file)\b"
        r")",
        re.IGNORECASE
    ),
    "COMMAND_INJECTION": re.compile(
        r"(;\s*(cat|ls|dir|whoami|id|uname|curl|wget|nc|sh|bash|powershell|cmd)\b|\|\s*(whoami|cat|ls|dir|id|sh|bash|powershell)|\$\([^\)]+\)|`[^`]+`|&&\s*(cat|ls|whoami|id|powershell|cmd))",
        re.IGNORECASE
    ),
    "XSS_INJECTION": re.compile(
        r"(<\s*script\b|javascript\s*:|vbscript\s*:|\bonerror\s*=|\bonload\s*=|<\s*iframe\b|<\s*svg[^>]*onload|document\.cookie|document\.location)",
        re.IGNORECASE
    ),
    "NOSQL_INJECTION": re.compile(
        r"(\$gt|\$ne|\$where|\$regex|\$exists|\$nin|\$or\s*:\s*\[)",
        re.IGNORECASE
    ),
    "PATH_TRAVERSAL": re.compile(
        r"(\.\./|\.\.\\|%2e%2e|/etc/(passwd|shadow|hosts|group)|/proc/self/|\\windows\\system32|\\boot\.ini|/winnt/)",
        re.IGNORECASE
    ),
    "SSRF_PROBE": re.compile(
        r"(169\.254\.169\.254|metadata\.google\.internal|100\.100\.100\.200|169\.254\.170\.2|instance-data|localhost|127\.0\.0\.1|0\.0\.0\.0)",
        re.IGNORECASE
    ),
    "AUTOMATED_SCANNER": re.compile(
        r"(sqlmap|nikto|wpscan|acunetix|nessus|gobuster|dirbuster|nuclei|masscan|zgrab|nmap|fuzz)",
        re.IGNORECASE
    )
}

# Base threat scores per attack vector
THREAT_SCORES = {
    "COMMAND_INJECTION": 80,
    "SQL_INJECTION": 70,
    "SSRF_PROBE": 75,
    "AUTOMATED_SCANNER": 85,
    "PATH_TRAVERSAL": 55,
    "XSS_INJECTION": 45,
    "NOSQL_INJECTION": 60,
    "UNKNOWN_PROBE": 30
}

# In-memory fast state tracking
_quarantined_ips_cache: Dict[str, float] = {} # ip -> expiry_timestamp
_ip_threat_accumulator: Dict[str, List[Tuple[float, int]]] = {} # ip -> list of (timestamp, score)
QUARANTINE_THRESHOLD = 100
QUARANTINE_DURATION_SECONDS = 3600 # 1 hour

def is_ip_currently_quarantined(client_ip: str) -> bool:
    """Checks if an IP is currently locked under active quarantine."""
    now = time.time()
    expiry = _quarantined_ips_cache.get(client_ip)
    if expiry is not None:
        if expiry > now:
            return True
        else:
            _quarantined_ips_cache.pop(client_ip, None)
    return False

def record_threat_and_evaluate_quarantine(client_ip: str, score: int) -> Tuple[bool, int]:
    """
    Accumulates threat score within a rolling 15-minute window.
    Returns (is_quarantined_now, current_cumulative_score).
    """
    now = time.time()
    cutoff = now - 900 # 15 minutes window

    history = _ip_threat_accumulator.get(client_ip, [])
    history = [item for item in history if item[0] > cutoff]
    history.append((now, score))
    _ip_threat_accumulator[client_ip] = history

    total_score = sum(item[1] for item in history)
    if total_score >= QUARANTINE_THRESHOLD:
        _quarantined_ips_cache[client_ip] = now + QUARANTINE_DURATION_SECONDS
        return True, total_score

    return False, total_score

def unquarantine_ip_memory(client_ip: str):
    """Removes an IP from active in-memory quarantine."""
    _quarantined_ips_cache.pop(client_ip, None)
    _ip_threat_accumulator.pop(client_ip, None)

def analyze_request_for_threats(
    path: str,
    raw_query: str = "",
    user_agent: str = "",
    headers_sample: str = ""
) -> Optional[Dict[str, Any]]:
    """
    Scans URL, query parameters, User-Agent, and headers for intrusion attack signatures.
    Returns detected threat metadata or None if clean.
    """
    decoded_query = unquote(raw_query)
    combined_target = f"{path}?{decoded_query}" if raw_query else path

    # 1. Scanner / Exploit Bot Detection
    if user_agent and PATTERNS["AUTOMATED_SCANNER"].search(user_agent):
        return {
            "attack_type": "AUTOMATED_SCANNER",
            "threat_score": THREAT_SCORES["AUTOMATED_SCANNER"],
            "sample": user_agent[:150],
            "location": "Header: User-Agent"
        }

    # 2. Path Traversal & LFI
    if PATTERNS["PATH_TRAVERSAL"].search(combined_target):
        match = PATTERNS["PATH_TRAVERSAL"].search(combined_target)
        return {
            "attack_type": "PATH_TRAVERSAL",
            "threat_score": THREAT_SCORES["PATH_TRAVERSAL"],
            "sample": match.group(0) if match else combined_target[:120],
            "location": "Path / URL Query"
        }

    # 3. Command Injection
    for text, loc in [(decoded_query, "Query"), (path, "Path"), (headers_sample, "Headers")]:
        if text and PATTERNS["COMMAND_INJECTION"].search(text):
            match = PATTERNS["COMMAND_INJECTION"].search(text)
            return {
                "attack_type": "COMMAND_INJECTION",
                "threat_score": THREAT_SCORES["COMMAND_INJECTION"],
                "sample": match.group(0) if match else text[:120],
                "location": f"Target: {loc}"
            }

    # 4. SQL Injection
    for text, loc in [(decoded_query, "Query"), (headers_sample, "Headers")]:
        if text and PATTERNS["SQL_INJECTION"].search(text):
            match = PATTERNS["SQL_INJECTION"].search(text)
            return {
                "attack_type": "SQL_INJECTION",
                "threat_score": THREAT_SCORES["SQL_INJECTION"],
                "sample": match.group(0) if match else text[:120],
                "location": f"Target: {loc}"
            }

    # 5. XSS Polyglot Injection
    for text, loc in [(decoded_query, "Query"), (headers_sample, "Headers")]:
        if text and PATTERNS["XSS_INJECTION"].search(text):
            match = PATTERNS["XSS_INJECTION"].search(text)
            return {
                "attack_type": "XSS_INJECTION",
                "threat_score": THREAT_SCORES["XSS_INJECTION"],
                "sample": match.group(0) if match else text[:120],
                "location": f"Target: {loc}"
            }

    # 6. SSRF / Cloud Metadata Probing
    if decoded_query and PATTERNS["SSRF_PROBE"].search(decoded_query):
        match = PATTERNS["SSRF_PROBE"].search(decoded_query)
        return {
            "attack_type": "SSRF_PROBE",
            "threat_score": THREAT_SCORES["SSRF_PROBE"],
            "sample": match.group(0) if match else decoded_query[:120],
            "location": "Query Parameters"
        }

    # 7. NoSQL Injection
    if decoded_query and PATTERNS["NOSQL_INJECTION"].search(decoded_query):
        match = PATTERNS["NOSQL_INJECTION"].search(decoded_query)
        return {
            "attack_type": "NOSQL_INJECTION",
            "threat_score": THREAT_SCORES["NOSQL_INJECTION"],
            "sample": match.group(0) if match else decoded_query[:120],
            "location": "Query Parameters"
        }

    return None

def detect_sql_injection(input_text: Optional[str]) -> Optional[str]:
    """
    Scans an input string (e.g. login username/email or password) for hostile SQL injection signatures.
    Returns matched exploit pattern or None if clean.
    """
    if not input_text or not isinstance(input_text, str):
        return None
    match = PATTERNS["SQL_INJECTION"].search(input_text)
    if match:
        return match.group(0)
    return None

async def notify_administrators_of_sqli(
    db: AsyncSession,
    client_ip: str,
    target_endpoint: str,
    field_name: str,
    payload_sample: str,
    threat_score: int = 90,
    action_taken: str = "BLOCKED_AND_ADMIN_NOTIFIED",
    user_agent: Optional[str] = None
) -> Tuple[List[str], bool]:
    """
    Dispatches immediate high-priority alerts to System Administrators when SQL injection
    is intercepted (specifically during authentication or sensitive gateway operations).
    
    1. Resolves all active Superusers and System Administrators from the database.
    2. Composes & transmits RFC-compliant security notification emails with incident telemetry.
    3. Persists tamper-evident IntrusionEvent into the security database table.
    4. Records comprehensive audit log entry.
    5. Accumulates IP threat score and dynamically applies firewall quarantine if threshold exceeded.
    
    Returns (list_of_admin_emails_notified, is_ip_quarantined).
    """
    now = datetime.now(timezone.utc)
    timestamp_str = now.strftime("%d %b %Y, %H:%M:%S UTC")

    # 1. Resolve System Administrator recipients
    admin_recipients: Set[Tuple[str, str]] = set() # (email, full_name)

    # 1a. Superusers / Platform Admins
    try:
        admin_stmt = (
            select(User.email, User.full_name)
            .where(User.is_active == True)
            .where(User.is_superuser == True)
        )
        admin_res = await db.execute(admin_stmt)
        for row in admin_res.all():
            if row.email:
                admin_recipients.add((row.email, row.full_name or "System Administrator"))

        # 1b. Users explicitly assigned the "System Administrator" role
        role_stmt = (
            select(User.email, User.full_name)
            .join(UserRole, UserRole.user_id == User.id)
            .join(Role, Role.id == UserRole.role_id)
            .where(User.is_active == True)
            .where(Role.name == "System Administrator")
        )
        role_res = await db.execute(role_stmt)
        for row in role_res.all():
            if row.email:
                admin_recipients.add((row.email, row.full_name or "System Administrator"))
    except Exception as exc:
        print(f"[IDS Alert] Error resolving administrator emails from DB: {exc}")

    # Fallback to designated system SOC admin address if no specific database administrator exists
    if not admin_recipients:
        fallback_email = settings.SMTP_FROM_EMAIL or "admin@nexaerp.internal"
        admin_recipients.add((fallback_email, "NexaERP SOC Administrator"))

    notified_emails: List[str] = []

    # 2. Dispatch high-priority HTML email notifications
    email_content = generate_sqli_alert_template(
        client_ip=client_ip,
        timestamp_str=timestamp_str,
        target_endpoint=target_endpoint,
        field_name=field_name,
        payload_sample=payload_sample,
        threat_score=threat_score,
        action_taken=action_taken,
        user_agent=user_agent
    )

    for adm_email, adm_name in admin_recipients:
        try:
            await send_business_email(
                db=db,
                recipient_email=adm_email,
                recipient_name=adm_name,
                document_type="SECURITY_ALERT",
                document_reference="SQLI-AUTH-ATTEMPT",
                subject=email_content["subject"],
                body_html=email_content["body_html"]
            )
            notified_emails.append(adm_email)
        except Exception as exc:
            print(f"[IDS Alert] Failed to dispatch security alert to {adm_email}: {exc}")

    # 3. Persist Intrusion Incident Record
    event = IntrusionEvent(
        attack_type="SQL_INJECTION",
        client_ip=client_ip,
        user_agent=user_agent[:250] if user_agent else None,
        request_path=target_endpoint[:250],
        payload_sample=payload_sample[:500],
        threat_score=threat_score,
        action_taken=action_taken,
        is_mitigated=True,
        detected_at=now
    )
    db.add(event)

    # 4. Record Audit Log
    await record_audit_log(
        db,
        action="AUTH_SQL_INJECTION_BLOCKED",
        entity_name="IntrusionEvent",
        ip_address=client_ip,
        status="BLOCKED",
        details={
            "attack_type": "SQL_INJECTION",
            "endpoint": target_endpoint,
            "targeted_field": field_name,
            "payload_sample": payload_sample[:100],
            "threat_score": threat_score,
            "action_taken": action_taken,
            "administrators_notified": notified_emails,
            "timestamp": now.isoformat()
        }
    )

    # 5. Threat score accumulation & dynamic IP quarantine
    is_quarantined, total_score = record_threat_and_evaluate_quarantine(client_ip, threat_score)
    if is_quarantined:
        until = now + timedelta(minutes=60)
        q_stmt = select(QuarantinedIP).where(QuarantinedIP.ip_address == client_ip)
        q_res = await db.execute(q_stmt)
        existing_q = q_res.scalar_one_or_none()
        if existing_q:
            existing_q.is_active = True
            existing_q.quarantined_until = until
            existing_q.reason = f"Automated quarantine: SQL injection detected during authentication (Score: {total_score})"
        else:
            q_rec = QuarantinedIP(
                ip_address=client_ip,
                reason=f"Automated quarantine: SQL injection detected during authentication (Score: {total_score})",
                threat_score=total_score,
                quarantined_until=until,
                is_active=True,
                quarantined_by="NexaERP-IDS-AutoShield"
            )
            db.add(q_rec)

    await db.commit()
    return notified_emails, is_quarantined

async def log_intrusion_incident_to_db(
    db: AsyncSession,
    attack_type: str,
    client_ip: str,
    request_path: str,
    payload_sample: str,
    threat_score: int,
    action_taken: str,
    user_agent: Optional[str] = None
) -> IntrusionEvent:
    """Persists intrusion incident into tamper-evident database log."""
    event = IntrusionEvent(
        attack_type=attack_type,
        client_ip=client_ip,
        user_agent=user_agent[:250] if user_agent else None,
        request_path=request_path[:250],
        payload_sample=payload_sample[:500],
        threat_score=threat_score,
        action_taken=action_taken,
        is_mitigated=True,
        detected_at=datetime.now(timezone.utc)
    )
    db.add(event)

    await record_audit_log(
        db,
        action="INTRUSION_ATTACK_MITIGATED",
        entity_name="IntrusionEvent",
        ip_address=client_ip,
        status="BLOCKED",
        details={
            "attack_type": attack_type,
            "path": request_path,
            "threat_score": threat_score,
            "action": action_taken,
            "payload_sample": payload_sample[:100]
        }
    )
    await db.commit()
    await db.refresh(event)
    return event

async def quarantine_ip_address_db(
    db: AsyncSession,
    ip_address: str,
    reason: str,
    threat_score: int = 100,
    duration_minutes: int = 60
) -> QuarantinedIP:
    """Registers an IP in the persistent quarantine database table."""
    now = datetime.now(timezone.utc)
    until = now + timedelta(minutes=duration_minutes)

    stmt = select(QuarantinedIP).where(QuarantinedIP.ip_address == ip_address)
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()

    if existing:
        existing.reason = reason
        existing.threat_score = threat_score
        existing.quarantined_until = until
        existing.is_active = True
        record = existing
    else:
        record = QuarantinedIP(
            ip_address=ip_address,
            reason=reason,
            threat_score=threat_score,
            quarantined_until=until,
            is_active=True,
            quarantined_by="NexaERP-IDS-AutoShield"
        )
        db.add(record)

    # Sync memory cache
    _quarantined_ips_cache[ip_address] = time.time() + (duration_minutes * 60)

    await record_audit_log(
        db,
        action="IP_QUARANTINED_BY_IDS",
        entity_name="QuarantinedIP",
        ip_address=ip_address,
        status="QUARANTINED",
        details={
            "reason": reason,
            "threat_score": threat_score,
            "quarantined_until": until.isoformat()
        }
    )
    await db.commit()
    await db.refresh(record)
    return record

async def get_ids_metrics(db: AsyncSession) -> Dict[str, Any]:
    """Returns real-time IDS/IPS operational telemetry for the security console."""
    total_intrusions_stmt = select(func.count(IntrusionEvent.id))
    active_quarantines_stmt = select(func.count(QuarantinedIP.id)).where(QuarantinedIP.is_active == True)
    
    total_res = await db.execute(total_intrusions_stmt)
    quarantine_res = await db.execute(active_quarantines_stmt)

    # Recent attacks
    recent_stmt = select(IntrusionEvent).order_by(desc(IntrusionEvent.detected_at)).limit(8)
    recent_res = await db.execute(recent_stmt)
    recent_events = recent_res.scalars().all()

    return {
        "ids_status": "ARMED_AND_DEFENDING",
        "total_attacks_neutralized": total_res.scalar() or 0,
        "active_quarantined_ips": quarantine_res.scalar() or 0,
        "supported_vectors": [
            "SQL Injection (SQLi)",
            "OS Command Injection",
            "Cross-Site Scripting (XSS)",
            "Server-Side Request Forgery (SSRF)",
            "Path Traversal (LFI/RFI)",
            "NoSQL Injection",
            "Automated Exploit Scanners",
            "Volumetric DDoS / Credential Stuffing"
        ],
        "recent_attacks": [
            {
                "id": ev.id,
                "attack_type": ev.attack_type,
                "client_ip": ev.client_ip,
                "request_path": ev.request_path,
                "threat_score": ev.threat_score,
                "action_taken": ev.action_taken,
                "detected_at": ev.detected_at.isoformat()
            }
            for ev in recent_events
        ]
    }
