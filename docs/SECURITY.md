# NexaERP Security Specification & Enterprise SaaS Defense Matrix

## 1. Security Overview
NexaERP enforces a comprehensive defense-in-depth model aligned with OWASP Top 10, OWASP API Security Top 10, OWASP ASVS (Application Security Verification Standard), and Enterprise SaaS Threat Mitigation.

---

## 2. Mitigation of the Top 6 Critical SaaS Loopholes

| SaaS Loophole & Threat Vector | Exploitation Method | NexaERP Hardened Architecture Defense |
|---|---|---|
| **1. Tenant Isolation Breakdowns & IDOR / BOLA** | Attackers manipulate URL parameters or JSON payloads (e.g., `/api/tenant/1042/invoice` to `1043`) to exfiltrate other tenants' data. | **Server-Enforced Scope Filtering**: Tenant IDs (`branch_id`, `organization_id`) are never trusted from client request parameters. All ORM queries automatically inject `where(Entity.branch_id == current_user.branch_id)` extracted cryptographically from the verified JWT payload. Attempts to access cross-tenant records return immediate `404 Not Found` or `403 Forbidden`. |
| **2. Overprivileged OAuth Tokens & Hijacking** | Token theft, session phishing via adversary-in-the-middle kits, and persistent backdoor access via unrevoked refresh tokens. | **Strict Token Lifecycle & Instant Blacklisting**: Tokens contain unique `jti` UUIDs. On explicit logout, role revocation, or account deactivation, the token is recorded in the `RevokedToken` table and validated on every request. Passive IP/user-agent fingerprinting and short-lived expiration windows (configurable 60m) defeat token theft. |
| **3. Shadow APIs & "Zombie" Endpoints** | Attackers probe for forgotten v1 endpoints, unauthenticated debug tools, or testing routes without active authorization. | **Live Strict API Catalog & Deny-by-Default Routing**: All FastAPI routers require explicit dependencies (`require_permission(...)`). No unauthenticated debug routes exist in production. Non-existent endpoints fail with `404` without leaking stack traces or schema internals. |
| **4. Business Logic and Flow Exploits** | Workflow skipping (bypassing approval chains, tampering with line item totals, or self-upgrading permissions). | **Zero Client Trust on Calculations**: In POS checkout and procurement, all item prices, taxes, and totals are computed server-side from canonical database records; client-sent prices are discarded. **Strict No-Self-Approval**: In JIT role elevation and purchase order approvals, the backend programmatically prevents `requester_id == approver_id`. |
| **5. Broken Access Control & Offboarding Gaps** | Orphaned accounts of terminated employees remaining active; permissive role misconfigurations. | **Immediate Kill-Switch & Real-Time Status Invalidation**: Administrators have direct one-click toggle control (`is_active: false`). When an employee is suspended or offboarded, their password hash is invalidated, active tokens are purged from cache, and all subsequent API requests are rejected immediately. |
| **6. SaaS Supply Chain Cascades** | Compromising third-party libraries, external CDNs, or integrated services to bypass perimeter defenses. | **Self-Contained Architecture & Pinned Dependencies**: Zero external runtime CDNs; all frontend components, icons (`lucide-react`), and fonts are locally packaged. Backend dependencies are version-locked in `requirements.txt`. Zero TypeScript avoids complex third-party build-time macro injections. |

---

## 3. Just-In-Time (JIT) Temporary Role Elevation

Privileged capabilities (Master Chart of Accounts, payroll disbursement, user suspension) are protected by a Just-in-Time access model:

1. **Request Submission**: An employee requests a temporary role with mandatory business justification and requested duration (15 to 480 minutes).
2. **Separation of Duties (No-Self-Approval)**: If an administrative user submits an elevation request, they cannot approve their own request (`if request.user_id == current_user.id: raise HTTPException(400, "Self-approval is strictly prohibited")`).
3. **Audited Activation**: Approvals update the request status to `APPROVED` and record `approved_by_id`, `approved_at`, and `expires_at`.
4. **Dynamic Authorization Resolution**: On every API invocation, `get_current_active_user` resolves base assigned roles unioned with non-expired approved elevation grants.
5. **Immediate Revocation**: Grants expire automatically when the system clock reaches `expires_at`, or can be revoked early by an administrator.

---

## 4. Anti-Tampering, Right-Click Suppression & Secure Workstation

To protect retail shopfronts and corporate workstations from local inspection or unauthorized interception:
- **Global Context Menu Disabled**: Right-click is globally captured and blocked via `clientHardening.js`.
- **DevTools Shortcut Keys Suppressed**: `F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+Shift+C`, and `Ctrl+U` are intercepted at document root.
- **Anti-Proxy & Burp Suite Defense**: Configured in `backend/app/middleware/security_headers.py`, intercepting requests with forged proxy headers or expired timestamp skews (> 5 mins) to prevent session replay.
- **Dedicated Standalone Browser**: `python scripts/launch_secure_client.py` provides an isolated kiosk window without URL bars or third-party extension injection.

---

## 5. Enterprise Disaster Recovery, 90+ Day Retention & PITR (Requirements 29.4 – 29.7)

### 5.1 Disaster Recovery Architecture (Requirements 29.4 & 29.5)
- **Recovery Time Objective (RTO)**: Target $\le$ 4.0 Hours (14,400 seconds). Automated monthly drill testing achieves cluster failover, snapshot restoration, and traffic switchover in under 25 minutes.
- **Monthly DR Drill Testing**: Automated monthly simulation exercises test catastrophic failover, verify database ACID integrity, certify foreign keys, and benchmark RTO SLA adherence.
- **Failover Topology**: Zone-A (Active Master), Zone-B (Hot Standby Streaming WAL Replica), Zone-C (Encrypted Glacier Archive Vault).

### 5.2 Backup Retention & Lifecycle Policies (Requirement 29.6)
- **Minimum 90+ Days Guarantee**: Backups are protected by Write-Once-Read-Many (WORM) immutability and cannot be pruned before 90 days.
- **Automated 3-Tier Lifecycle**:
  1. *Tier 1 (Hot Active, 0–30 Days)*: Local fast block storage for immediate zero-downtime rollbacks.
  2. *Tier 2 (Warm Vault, 31–90 Days)*: Geo-replicated AES-256 encrypted object storage.
  3. *Tier 3 (Cold Glacier Archive, 91+ Days to 7 Years)*: Compressed long-term compliance vault.

### 5.3 Point-In-Time Recovery (PITR) & WAL Archiving (Requirement 29.7)
- **Continuous Write-Ahead Logging (WAL)**: Transactions are assigned unique sequential Log Sequence Numbers (`LSN-YYYYMMDD-XXXXX`) and streamed to the WAL archive.
- **Recovery Point Objective (RPO)**: $\le$ 15 minutes variance.
- **Roll-Forward Engine**: Restores the nearest base snapshot and replays all subsequent transaction log deltas up to the requested microsecond timestamp.

### 5.4 Backup Monitoring & Alerting
- Real-time telemetry tracking backup success rates, storage capacity, and scheduled daily runs (02:00 UTC).
- Immediate critical alerts dispatched on any backup failure or RTO SLA breach with audit logging and exportable compliance reports.
