# NexaERP Security Specification & OWASP Compliance

## 1. Security Overview
NexaERP enforces a defense-in-depth model aligned with the OWASP Top 10, OWASP API Security Top 10, and OWASP ASVS (Application Security Verification Standard). Security is treated as a server-side responsibility that cannot be delegated to or bypassed by client browsers.

---

## 2. Threat Vector Mitigation Matrix

| OWASP Threat Category | Risk Vector | NexaERP Defense Implementation |
|---|---|---|
| **A01: Broken Access Control** | IDOR, privilege escalation, parameter tampering | Granular RBAC (`require_permission` dependency on every route), active token validation, mandatory separation of duties, and tenant/branch scoped queries. |
| **A02: Cryptographic Failures** | Compromised passwords or leaked credentials | Passwords hashed using Bcrypt/Argon2 with high work factor (`pwd_context.hash`). JWT tokens signed with secure 256-bit secret and mandatory expiration timestamps. |
| **A03: Injection** | SQL injection, NoSQL injection, Command injection | Parameterized queries via SQLAlchemy ORM. Dynamic search queries sanitized via column allowlists. No execution of raw untrusted strings or shell commands. |
| **A04: Insecure Design** | Self-approval of high privileges, brute force login | Just-in-Time (JIT) role elevation with strictly enforced **No-Self-Approval** rule. Account lockout after 5 consecutive failed attempts. |
| **A05: Security Misconfiguration** | Missing headers, exposed debug traces | `SecurityHeadersMiddleware` injecting CSP, HSTS, X-Frame-Options: DENY, and X-Content-Type-Options: nosniff. CORS limited to explicit origins. |
| **A06: Vulnerable Components** | Outdated or compromised libraries | Direct dependencies locked and pinned in `requirements.txt` and `package.json`. No external runtime CDNs or unverified third-party scripts. |
| **A07: Identification & Auth Failures** | Replay attacks, token re-use after logout | Token revocation table (`RevokedToken`) consulted on every authenticated request. Explicit logout revokes the JWT `jti` immediately. |
| **A08: Software & Data Integrity** | Price/total tampering, stock manipulation | Server-side recalculation of line items, tax, and totals in `SalesService`. Client prices are completely ignored and re-fetched from database records. |
| **A09: Security Logging & Monitoring** | Undetected unauthorized access attempts | Centralized `AuditLog` records every login, failed login, elevation request, approval, inventory adjustment, and financial post with IP address and timestamp. |
| **A10: Server-Side Request Forgery** | External webhook or integration abuse | AI Assistant and integration endpoints interact only with local, controlled database queries and strictly validated endpoints. Outbound network calls restricted. |

---

## 3. Just-In-Time (JIT) Role Elevation Security Model
High-privilege capabilities (e.g., modifying master chart of accounts, processing payroll, or editing role definitions) can be obtained dynamically via the JIT Elevation engine:

1. **Request Submission**: An authenticated user requests a temporary role or permission set, specifying a business justification and duration (in minutes, capped at maximum organizational limit).
2. **Separation of Duties (No-Self-Approval)**: If an administrative user submits an elevation request, they **cannot approve their own request**. The backend checks `if request.user_id == current_user.id: raise HTTPException(400, "Self-approval is strictly prohibited")`.
3. **Audited Activation**: Approvals update the request status to `APPROVED` and record `approved_by_id`, `approved_at`, and `expires_at`.
4. **Dynamic Authorization Resolution**: On every API invocation, `get_current_active_user` resolves both base assigned roles and any non-expired approved elevation grants.
5. **Immediate Revocation & Expiration**: Expired grants are automatically dropped from the user's active permissions without requiring session restart. Administrators can revoke an active elevation at any time.

---

## 4. Security Headers Configuration
Configured in `backend/app/middleware/security_headers.py`:
- `Content-Security-Policy`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:8000; frame-ancestors 'none';`
- `X-Frame-Options`: `DENY`
- `X-Content-Type-Options`: `nosniff`
- `X-XSS-Protection`: `1; mode=block`
- `Strict-Transport-Security`: `max-age=31536000; includeSubDomains`
- `Referrer-Policy`: `strict-origin-when-cross-origin`
