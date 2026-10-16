import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Anti-Proxy / Burp Suite Tamper Verification Header Check for non-public endpoints
        path = request.url.path
        if path.startswith("/api/") and not path.startswith("/api/health") and not path.startswith("/docs") and not path.startswith("/openapi.json"):
            # Check for suspicious proxy headers commonly injected by intercepting proxies
            suspicious_headers = ["x-forwarded-host", "x-host", "x-forwarded-server"]
            for h in suspicious_headers:
                if h in request.headers and "localhost" not in request.headers[h] and "127.0.0.1" not in request.headers[h]:
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "Proxy tampering or untrusted forwarder detected. Request blocked by NexaERP Security Shield."}
                    )

            # Check timestamp skew to defeat replay attacks
            ts = request.headers.get("x-nexa-timestamp")
            if ts:
                try:
                    req_time = int(ts) / 1000.0
                    now = time.time()
                    if abs(now - req_time) > 300: # 5 minutes skew tolerance
                        return JSONResponse(
                            status_code=403,
                            content={"detail": "Request timestamp expired or replay attempt detected."}
                        )
                except ValueError:
                    pass

        response: Response = await call_next(request)

        # 2. OWASP Recommended Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' data: https:; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 http://localhost:5173;"
        )

        return response
