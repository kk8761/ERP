# TLS 1.3 Encryption in Transit Implementation

## Overview

This document describes the implementation of encryption in transit using TLS 1.3 for all connections in NexaERP. The implementation includes certificate management, mutual TLS for service-to-service communication, and comprehensive monitoring.

## Requirements Addressed

- **Requirement 15.4**: Enforce TLS 1.3 for all connections
- **Requirement 15.4**: Implement certificate management
- **Requirement 15.4**: Add mutual TLS for service-to-service communication

## Architecture

### Components

1. **TLS Configuration** (`src/config/tls.config.ts`)
   - TLS 1.3 enforcement
   - Cipher suite configuration
   - Certificate path management
   - Mutual TLS configuration

2. **Certificate Service** (`src/services/certificate.service.ts`)
   - Certificate validation
   - Certificate monitoring
   - Certificate rotation
   - Self-signed certificate generation (development)

3. **TLS Middleware** (`src/middleware/tls.middleware.ts`)
   - HTTPS enforcement
   - TLS version validation
   - Mutual TLS authentication
   - Certificate pinning

4. **Secure HTTP Client** (`src/utils/secure-http-client.ts`)
   - TLS 1.3 client connections
   - Mutual TLS support
   - Service-to-service communication

5. **Certificate API** (`src/routes/certificate.routes.ts`)
   - Certificate status endpoints
   - Certificate validation
   - Certificate rotation
   - Monitoring control

## TLS 1.3 Configuration

### Cipher Suites

Only the strongest TLS 1.3 cipher suites are enabled:

```typescript
ciphers: [
  'TLS_AES_256_GCM_SHA384',      // AES-256 with GCM
  'TLS_CHACHA20_POLY1305_SHA256', // ChaCha20-Poly1305
  'TLS_AES_128_GCM_SHA256',      // AES-128 with GCM
]
```

### Version Enforcement

```typescript
minVersion: 'TLSv1.3'
maxVersion: 'TLSv1.3'
```

This ensures that only TLS 1.3 connections are accepted, rejecting older protocols like TLS 1.2, TLS 1.1, and TLS 1.0.

### Elliptic Curve Configuration

```typescript
ecdhCurve: 'auto'  // Uses X25519, P-256, P-384 for TLS 1.3
```

### Session Management

```typescript
sessionTimeout: 300  // 5 minutes
sessionIdContext: 'nexaerp-tls-session'
```

## Certificate Management

### Certificate Paths

Certificates are stored in the `server/certs/` directory:

```
server/certs/
├── server.crt       # Server certificate
├── server.key       # Server private key
├── ca.crt           # Certificate Authority
├── client.crt       # Client certificate (for mutual TLS)
├── client.key       # Client private key
├── client-ca.crt    # Client CA certificate
├── dhparam.pem      # Diffie-Hellman parameters (optional)
└── backup/          # Certificate backups
```

### Environment Variables

```bash
# TLS Configuration
TLS_ENABLED=true
TLS_CERT_PATH=/path/to/server.crt
TLS_KEY_PATH=/path/to/server.key
TLS_CA_PATH=/path/to/ca.crt
TLS_KEY_PASSPHRASE=your-passphrase  # Optional

# Mutual TLS Configuration
MTLS_ENABLED=true
MTLS_CLIENT_CERT_PATH=/path/to/client.crt
MTLS_CLIENT_KEY_PATH=/path/to/client.key
MTLS_CLIENT_CA_PATH=/path/to/client-ca.crt
MTLS_CLIENT_KEY_PASSPHRASE=your-passphrase  # Optional
MTLS_ALLOWED_SERVICES=service1,service2,service3
```

### Certificate Validation

The certificate service validates:

1. **File Existence**: Checks if certificate files exist
2. **Expiry**: Validates certificate is not expired
3. **Validity Period**: Checks certificate is currently valid
4. **Key Pair**: Validates private key matches certificate
5. **Chain**: Validates certificate chain against CA

### Certificate Monitoring

Automatic monitoring checks certificates every 24 hours:

```typescript
certificateService.startMonitoring(24); // Check every 24 hours
```

Monitoring features:
- Expiry warnings (30 days before expiry)
- Critical alerts (7 days before expiry)
- Automatic audit logging
- Email notifications (configurable)

### Certificate Rotation

Certificates can be rotated without downtime:

```typescript
await certificateService.rotateCertificate(
  '/path/to/new-cert.crt',
  '/path/to/new-key.key',
  true  // Create backup
);
```

**Note**: Server restart is required for new certificates to take effect.

## Mutual TLS (mTLS)

### Configuration

Enable mutual TLS for service-to-service communication:

```typescript
mutualTLSConfig: {
  enabled: true,
  clientCertRequired: true,
  allowedServices: ['service1', 'service2'],
}
```

### Client Certificate Validation

The mutual TLS middleware validates:

1. **Certificate Presence**: Client must present a certificate
2. **Certificate Authorization**: Certificate must be signed by trusted CA
3. **Service Authorization**: Service name (CN) must be in allowed list
4. **Certificate Validity**: Certificate must not be expired

### Service-to-Service Communication

Use the secure HTTP client for mTLS connections:

```typescript
import { secureHttpClient } from './utils/secure-http-client';

// Make secure request with mutual TLS
const response = await secureHttpClient.get(
  'https://service2.example.com/api/data',
  { serviceName: 'service2' }
);
```

### Certificate Pinning

For critical endpoints, certificate pinning can be enforced:

```typescript
import { certificatePinningMiddleware } from './middleware/tls.middleware';

router.post(
  '/critical-endpoint',
  certificatePinningMiddleware([
    'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD',
  ]),
  handler
);
```

## HTTPS Enforcement

### Production Mode

In production, all HTTP requests are automatically redirected to HTTPS:

```typescript
// Middleware automatically redirects HTTP to HTTPS
app.use(tlsSecurityMiddleware);
```

### Security Headers

The following security headers are automatically added:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

### TLS Version Enforcement

Connections using TLS versions older than 1.3 are rejected:

```typescript
app.use(tlsVersionMiddleware);
```

Response for non-TLS 1.3 connections:
```json
{
  "success": false,
  "error": "TLS 1.3 required",
  "code": "TLS_VERSION_UNSUPPORTED",
  "details": {
    "current": "TLSv1.2",
    "required": "TLSv1.3"
  }
}
```

## API Endpoints

### Get Certificate Status

```http
GET /api/certificates/status
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "info": {
      "subject": "CN=nexaerp.com",
      "issuer": "CN=NexaERP CA",
      "validFrom": "2024-01-01T00:00:00.000Z",
      "validTo": "2025-01-01T00:00:00.000Z",
      "serialNumber": "1234567890",
      "fingerprint": "AA:BB:CC:...",
      "daysUntilExpiry": 180
    },
    "validation": {
      "valid": true,
      "errors": [],
      "warnings": []
    }
  }
}
```

### Validate Certificate

```http
POST /api/certificates/validate
Authorization: Bearer <token>
Content-Type: application/json

{
  "certPath": "/path/to/cert.crt",
  "keyPath": "/path/to/key.key"
}
```

### Rotate Certificate

```http
POST /api/certificates/rotate
Authorization: Bearer <token>
Content-Type: application/json

{
  "newCertPath": "/path/to/new-cert.crt",
  "newKeyPath": "/path/to/new-key.key",
  "backup": true
}
```

### Start/Stop Monitoring

```http
POST /api/certificates/monitoring/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "checkIntervalHours": 24
}
```

```http
POST /api/certificates/monitoring/stop
Authorization: Bearer <token>
```

## Development Setup

### Generate Self-Signed Certificate

For development, generate a self-signed certificate:

```bash
# Using OpenSSL
openssl genrsa -out server/certs/server.key 2048
openssl req -new -x509 -key server/certs/server.key \
  -out server/certs/server.crt -days 365 \
  -subj "/CN=localhost"
```

Or use the API:

```http
POST /api/certificates/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "commonName": "localhost",
  "validDays": 365
}
```

### Enable TLS in Development

```bash
# .env
TLS_ENABLED=true
NODE_ENV=development
```

## Production Deployment

### Certificate Acquisition

1. **Let's Encrypt** (Recommended for public-facing services):
   ```bash
   certbot certonly --standalone -d nexaerp.com
   ```

2. **Commercial CA**: Purchase certificate from trusted CA

3. **Internal CA**: Use organization's internal CA for internal services

### Certificate Installation

1. Copy certificates to server:
   ```bash
   scp cert.crt server:/app/server/certs/server.crt
   scp key.key server:/app/server/certs/server.key
   ```

2. Set proper permissions:
   ```bash
   chmod 600 /app/server/certs/server.key
   chmod 644 /app/server/certs/server.crt
   ```

3. Update environment variables:
   ```bash
   TLS_ENABLED=true
   TLS_CERT_PATH=/app/server/certs/server.crt
   TLS_KEY_PATH=/app/server/certs/server.key
   NODE_ENV=production
   ```

4. Restart server:
   ```bash
   pm2 restart nexaerp
   ```

### Certificate Renewal

Set up automatic renewal with certbot:

```bash
# Add to crontab
0 0 1 * * certbot renew --quiet --deploy-hook "pm2 restart nexaerp"
```

Or use the certificate rotation API:

```bash
# After obtaining new certificate
curl -X POST https://nexaerp.com/api/certificates/rotate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newCertPath": "/etc/letsencrypt/live/nexaerp.com/fullchain.pem",
    "newKeyPath": "/etc/letsencrypt/live/nexaerp.com/privkey.pem",
    "backup": true
  }'
```

## Testing

### Run TLS Tests

```bash
cd server
npm test -- tls.test.ts
```

### Test TLS Connection

```bash
# Test TLS version
openssl s_client -connect localhost:5000 -tls1_3

# Verify certificate
openssl s_client -connect localhost:5000 -showcerts

# Test cipher suites
nmap --script ssl-enum-ciphers -p 5000 localhost
```

### Test Mutual TLS

```bash
# Test with client certificate
curl --cert client.crt --key client.key \
  https://localhost:5000/api/internal/data
```

## Monitoring and Alerts

### Certificate Expiry Monitoring

The certificate service automatically monitors certificate expiry:

- **30 days before expiry**: Warning logged
- **7 days before expiry**: Critical alert logged
- **Expired**: Error logged, audit trail created

### Audit Logging

All TLS-related events are logged:

- Certificate validation failures
- Certificate rotation
- Mutual TLS authentication failures
- TLS version rejections
- Certificate expiry warnings

### Metrics

Monitor these metrics:

- Certificate expiry days
- TLS handshake failures
- Mutual TLS authentication failures
- TLS version distribution
- Cipher suite usage

## Security Best Practices

1. **Use Strong Certificates**
   - Minimum 2048-bit RSA or 256-bit ECC
   - SHA-256 or stronger signature algorithm
   - Valid certificate chain

2. **Protect Private Keys**
   - Store keys with restricted permissions (600)
   - Use encrypted keys with passphrases
   - Never commit keys to version control
   - Rotate keys regularly

3. **Monitor Certificate Expiry**
   - Enable automatic monitoring
   - Set up alerts for expiring certificates
   - Automate renewal process

4. **Use Mutual TLS for Internal Services**
   - Require client certificates for service-to-service communication
   - Maintain whitelist of allowed services
   - Rotate client certificates regularly

5. **Keep TLS Configuration Updated**
   - Disable weak cipher suites
   - Enforce latest TLS version
   - Follow security advisories

## Troubleshooting

### Certificate Not Found

```
Error: Server certificate not found: /path/to/server.crt
```

**Solution**: Ensure certificate files exist at configured paths.

### Certificate Expired

```
Error: Certificate expired on 2024-01-01T00:00:00.000Z
```

**Solution**: Renew certificate and rotate using API or manual process.

### Private Key Mismatch

```
Error: Private key does not match certificate
```

**Solution**: Ensure the private key corresponds to the certificate.

### TLS Version Rejected

```
Error: TLS 1.3 required
```

**Solution**: Client must support TLS 1.3. Update client software.

### Mutual TLS Authentication Failed

```
Error: Client certificate required
```

**Solution**: Provide valid client certificate signed by trusted CA.

## Compliance

This implementation meets the following compliance requirements:

- **PCI DSS**: TLS 1.2+ required (we use TLS 1.3)
- **HIPAA**: Encryption in transit required
- **SOC 2**: Secure communication channels
- **GDPR**: Data protection in transit
- **ISO 27001**: Cryptographic controls

## References

- [RFC 8446 - TLS 1.3](https://tools.ietf.org/html/rfc8446)
- [NIST SP 800-52 Rev. 2 - TLS Guidelines](https://csrc.nist.gov/publications/detail/sp/800-52/rev-2/final)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [OWASP Transport Layer Protection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)

## Task Completion

✅ **Task 38.3: Implement encryption in transit**

- [x] Enforce TLS 1.3 for all connections
- [x] Implement certificate management
- [x] Add mutual TLS for service-to-service communication
- [x] Certificate validation and monitoring
- [x] Certificate rotation support
- [x] Secure HTTP client with TLS 1.3
- [x] API endpoints for certificate management
- [x] Comprehensive testing
- [x] Documentation

**Requirements Addressed**: 15.4
