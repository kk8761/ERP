# TLS 1.3 Encryption in Transit - Quick Reference

## Overview

NexaERP implements enterprise-grade encryption in transit using TLS 1.3, the latest and most secure version of the Transport Layer Security protocol. This ensures all data transmitted between clients and servers is encrypted and protected from eavesdropping and tampering.

## Key Features

✅ **TLS 1.3 Enforcement** - Only TLS 1.3 connections accepted  
✅ **Strong Cipher Suites** - AES-256-GCM, ChaCha20-Poly1305  
✅ **Certificate Management** - Validation, monitoring, rotation  
✅ **Mutual TLS (mTLS)** - Service-to-service authentication  
✅ **Automatic Monitoring** - Certificate expiry alerts  
✅ **Secure HTTP Client** - Built-in TLS 1.3 client  
✅ **API Management** - RESTful certificate APIs  

## Quick Start

### 1. Generate Development Certificate

```bash
# Create certs directory
mkdir -p server/certs

# Generate self-signed certificate
openssl genrsa -out server/certs/server.key 2048
openssl req -new -x509 \
  -key server/certs/server.key \
  -out server/certs/server.crt \
  -days 365 \
  -subj "/CN=localhost"
```

### 2. Configure Environment

```bash
# .env
TLS_ENABLED=true
TLS_CERT_PATH=./certs/server.crt
TLS_KEY_PATH=./certs/server.key
NODE_ENV=development
```

### 3. Start Server

```bash
npm start
```

The server will automatically:
- Load TLS certificates
- Validate certificate integrity
- Start certificate monitoring
- Enforce TLS 1.3 for all connections

## Production Setup

### Using Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt-get install certbot

# Obtain certificate
sudo certbot certonly --standalone -d nexaerp.com

# Configure NexaERP
TLS_ENABLED=true
TLS_CERT_PATH=/etc/letsencrypt/live/nexaerp.com/fullchain.pem
TLS_KEY_PATH=/etc/letsencrypt/live/nexaerp.com/privkey.pem
NODE_ENV=production

# Set up auto-renewal
sudo crontab -e
# Add: 0 2 * * * certbot renew --quiet --deploy-hook "pm2 restart nexaerp"
```

## Configuration

### TLS Settings

```typescript
// Default TLS 1.3 configuration
{
  minVersion: 'TLSv1.3',
  maxVersion: 'TLSv1.3',
  ciphers: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256',
  ],
  honorCipherOrder: true,
  sessionTimeout: 300, // 5 minutes
}
```

### Mutual TLS (Optional)

```bash
# Enable mutual TLS for service-to-service
MTLS_ENABLED=true
MTLS_CLIENT_CERT_PATH=./certs/client.crt
MTLS_CLIENT_KEY_PATH=./certs/client.key
MTLS_CLIENT_CA_PATH=./certs/client-ca.crt
MTLS_ALLOWED_SERVICES=service1,service2,service3
```

## API Endpoints

### Get Certificate Status

```bash
curl https://nexaerp.com/api/certificates/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Validate Certificate

```bash
curl -X POST https://nexaerp.com/api/certificates/validate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"certPath": "/path/to/cert.crt", "keyPath": "/path/to/key.key"}'
```

### Rotate Certificate

```bash
curl -X POST https://nexaerp.com/api/certificates/rotate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newCertPath": "/path/to/new-cert.crt",
    "newKeyPath": "/path/to/new-key.key",
    "backup": true
  }'
```

## Usage Examples

### Secure HTTP Client

```typescript
import { secureHttpClient } from './utils/secure-http-client';

// Make secure GET request
const response = await secureHttpClient.get(
  'https://api.example.com/data',
  {
    headers: { 'X-API-Key': 'your-key' },
    timeout: 10000,
  }
);

// Make secure POST request
const postResponse = await secureHttpClient.post(
  'https://api.example.com/create',
  { name: 'Item', value: 123 },
  { headers: { 'X-API-Key': 'your-key' } }
);
```

### Service-to-Service with Mutual TLS

```typescript
// Request with client certificate
const response = await secureHttpClient.get(
  'https://internal-service.com/api/data',
  {
    serviceName: 'internal-service',
    headers: { 'X-Service-Name': 'nexaerp' },
  }
);
```

### Certificate Management

```typescript
import { certificateService } from './services/certificate.service';

// Get certificate status
const status = await certificateService.getCertificateStatus();
console.log('Valid:', status.valid);
console.log('Days until expiry:', status.info?.daysUntilExpiry);

// Start monitoring
certificateService.startMonitoring(24); // Check every 24 hours

// Rotate certificate
await certificateService.rotateCertificate(
  '/path/to/new-cert.crt',
  '/path/to/new-key.key',
  true // Create backup
);
```

## Testing

### Run TLS Tests

```bash
cd server
npm test -- tls.test.ts
```

### Test TLS Connection

```bash
# Test TLS 1.3
openssl s_client -connect localhost:5000 -tls1_3

# Verify certificate
openssl s_client -connect localhost:5000 -showcerts

# Test cipher suites
nmap --script ssl-enum-ciphers -p 5000 localhost
```

### Test Mutual TLS

```bash
curl --cert client.crt --key client.key \
  https://localhost:5000/api/internal/data
```

## Monitoring

### Certificate Expiry

The system automatically monitors certificates and logs:
- **30 days before expiry**: Warning
- **7 days before expiry**: Critical alert
- **Expired**: Error with audit trail

### Audit Logging

All TLS events are logged:
- Certificate validation failures
- Certificate rotation
- Mutual TLS authentication failures
- TLS version rejections
- Certificate expiry warnings

### Metrics to Monitor

- Certificate expiry days
- TLS handshake failures
- Mutual TLS authentication failures
- TLS version distribution
- Cipher suite usage

## Troubleshooting

### Certificate Not Found

```
Error: Server certificate not found
```

**Solution**: Ensure certificate files exist at configured paths.

### Certificate Expired

```
Error: Certificate expired
```

**Solution**: Renew certificate using certbot or CA, then rotate.

### TLS Version Rejected

```
Error: TLS 1.3 required
```

**Solution**: Client must support TLS 1.3. Update client software.

### Mutual TLS Failed

```
Error: Client certificate required
```

**Solution**: Provide valid client certificate signed by trusted CA.

## Security Best Practices

1. **Use Strong Certificates**
   - Minimum 2048-bit RSA or 256-bit ECC
   - SHA-256 or stronger signature algorithm

2. **Protect Private Keys**
   - Store with restricted permissions (600)
   - Use encrypted keys with passphrases
   - Never commit to version control

3. **Monitor Certificate Expiry**
   - Enable automatic monitoring
   - Set up alerts for expiring certificates
   - Automate renewal process

4. **Use Mutual TLS for Internal Services**
   - Require client certificates
   - Maintain whitelist of allowed services
   - Rotate certificates regularly

5. **Keep Configuration Updated**
   - Disable weak cipher suites
   - Enforce latest TLS version
   - Follow security advisories

## Documentation

- **[TLS Implementation Guide](./TLS_IMPLEMENTATION.md)** - Complete implementation details
- **[Certificate Setup Guide](./CERTIFICATE_SETUP_GUIDE.md)** - Step-by-step certificate setup
- **[Usage Examples](./examples/tls-usage.ts)** - Code examples and patterns
- **[Test Suite](./src/tests/tls.test.ts)** - Comprehensive test coverage

## Compliance

This implementation meets:
- **PCI DSS**: TLS 1.2+ required (we use TLS 1.3)
- **HIPAA**: Encryption in transit required
- **SOC 2**: Secure communication channels
- **GDPR**: Data protection in transit
- **ISO 27001**: Cryptographic controls

## Support

For issues or questions:
- Check logs: `pm2 logs nexaerp`
- Review documentation: `server/TLS_IMPLEMENTATION.md`
- Run diagnostics: `npm test -- tls.test.ts`
- Contact support: support@nexaerp.com

## Requirements Addressed

✅ **Requirement 15.4**: Enforce TLS 1.3 for all connections  
✅ **Requirement 15.4**: Implement certificate management  
✅ **Requirement 15.4**: Add mutual TLS for service-to-service communication  

## Task Completion

**Task 38.3: Implement encryption in transit** - ✅ COMPLETED

All sub-tasks completed:
- [x] Enforce TLS 1.3 for all connections
- [x] Implement certificate management
- [x] Add mutual TLS for service-to-service communication
- [x] Certificate validation and monitoring
- [x] Certificate rotation support
- [x] Secure HTTP client with TLS 1.3
- [x] API endpoints for certificate management
- [x] Comprehensive testing
- [x] Documentation
