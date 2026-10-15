# Certificate Setup Guide

## Quick Start

This guide walks you through setting up TLS certificates for NexaERP.

## Development Setup

### Option 1: Generate Self-Signed Certificate (Recommended for Development)

```bash
# Create certs directory
mkdir -p server/certs

# Generate private key
openssl genrsa -out server/certs/server.key 2048

# Generate self-signed certificate (valid for 1 year)
openssl req -new -x509 \
  -key server/certs/server.key \
  -out server/certs/server.crt \
  -days 365 \
  -subj "/C=US/ST=State/L=City/O=NexaERP/CN=localhost"

# Set proper permissions
chmod 600 server/certs/server.key
chmod 644 server/certs/server.crt
```

### Option 2: Use API to Generate Certificate

```bash
# Start server without TLS first
TLS_ENABLED=false npm start

# Generate certificate via API
curl -X POST http://localhost:5000/api/certificates/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "commonName": "localhost",
    "validDays": 365
  }'

# Restart server with TLS enabled
TLS_ENABLED=true npm start
```

### Enable TLS in Development

Update `.env`:

```bash
# TLS Configuration
TLS_ENABLED=true
TLS_CERT_PATH=./certs/server.crt
TLS_KEY_PATH=./certs/server.key
NODE_ENV=development
```

## Production Setup

### Option 1: Let's Encrypt (Free, Automated)

#### Prerequisites
- Domain name pointing to your server
- Port 80 and 443 open

#### Installation

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Stop NexaERP temporarily
pm2 stop nexaerp

# Obtain certificate
sudo certbot certonly --standalone -d nexaerp.com -d www.nexaerp.com

# Certificates will be saved to:
# /etc/letsencrypt/live/nexaerp.com/fullchain.pem
# /etc/letsencrypt/live/nexaerp.com/privkey.pem
```

#### Configure NexaERP

Update `.env`:

```bash
TLS_ENABLED=true
TLS_CERT_PATH=/etc/letsencrypt/live/nexaerp.com/fullchain.pem
TLS_KEY_PATH=/etc/letsencrypt/live/nexaerp.com/privkey.pem
NODE_ENV=production
```

#### Set Up Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab for automatic renewal
sudo crontab -e

# Add this line (renews daily at 2 AM, restarts server if renewed)
0 2 * * * certbot renew --quiet --deploy-hook "pm2 restart nexaerp"
```

### Option 2: Commercial Certificate Authority

#### Step 1: Generate Certificate Signing Request (CSR)

```bash
# Generate private key
openssl genrsa -out server/certs/server.key 2048

# Generate CSR
openssl req -new \
  -key server/certs/server.key \
  -out server/certs/server.csr \
  -subj "/C=US/ST=State/L=City/O=YourCompany/CN=nexaerp.com"

# View CSR (submit this to CA)
cat server/certs/server.csr
```

#### Step 2: Submit CSR to Certificate Authority

1. Purchase certificate from CA (DigiCert, GlobalSign, etc.)
2. Submit the CSR content
3. Complete domain validation
4. Download certificate files

#### Step 3: Install Certificate

```bash
# Copy certificate files
cp downloaded-cert.crt server/certs/server.crt
cp intermediate.crt server/certs/ca.crt

# Combine certificate with intermediate (if needed)
cat server/certs/server.crt server/certs/ca.crt > server/certs/fullchain.crt

# Set permissions
chmod 600 server/certs/server.key
chmod 644 server/certs/server.crt
chmod 644 server/certs/ca.crt
```

#### Step 4: Configure NexaERP

Update `.env`:

```bash
TLS_ENABLED=true
TLS_CERT_PATH=/path/to/server/certs/fullchain.crt
TLS_KEY_PATH=/path/to/server/certs/server.key
TLS_CA_PATH=/path/to/server/certs/ca.crt
NODE_ENV=production
```

### Option 3: Internal Certificate Authority

For internal deployments, use your organization's CA.

#### Request Certificate from Internal CA

```bash
# Generate private key
openssl genrsa -out server/certs/server.key 2048

# Generate CSR
openssl req -new \
  -key server/certs/server.key \
  -out server/certs/server.csr \
  -subj "/C=US/ST=State/L=City/O=YourCompany/CN=nexaerp.internal"

# Submit CSR to your CA administrator
```

#### Install Certificate

```bash
# Copy signed certificate from CA
cp signed-cert.crt server/certs/server.crt

# Copy CA certificate
cp ca-cert.crt server/certs/ca.crt

# Set permissions
chmod 600 server/certs/server.key
chmod 644 server/certs/server.crt
chmod 644 server/certs/ca.crt
```

#### Configure NexaERP

Update `.env`:

```bash
TLS_ENABLED=true
TLS_CERT_PATH=/path/to/server/certs/server.crt
TLS_KEY_PATH=/path/to/server/certs/server.key
TLS_CA_PATH=/path/to/server/certs/ca.crt
NODE_ENV=production
```

## Mutual TLS Setup (Service-to-Service)

### Generate Client Certificates

#### Option 1: Self-Signed Client Certificate

```bash
# Generate client private key
openssl genrsa -out server/certs/client.key 2048

# Generate client certificate
openssl req -new -x509 \
  -key server/certs/client.key \
  -out server/certs/client.crt \
  -days 365 \
  -subj "/C=US/ST=State/L=City/O=NexaERP/CN=service1"

# Copy CA certificate (same as server CA for self-signed)
cp server/certs/server.crt server/certs/client-ca.crt
```

#### Option 2: CA-Signed Client Certificate

```bash
# Generate client private key
openssl genrsa -out server/certs/client.key 2048

# Generate CSR
openssl req -new \
  -key server/certs/client.key \
  -out server/certs/client.csr \
  -subj "/C=US/ST=State/L=City/O=YourCompany/CN=service1"

# Submit to CA and receive signed certificate
# Copy signed certificate
cp signed-client-cert.crt server/certs/client.crt
cp ca-cert.crt server/certs/client-ca.crt
```

### Configure Mutual TLS

Update `.env`:

```bash
# Enable mutual TLS
MTLS_ENABLED=true
MTLS_CLIENT_CERT_PATH=/path/to/server/certs/client.crt
MTLS_CLIENT_KEY_PATH=/path/to/server/certs/client.key
MTLS_CLIENT_CA_PATH=/path/to/server/certs/client-ca.crt

# Whitelist allowed services (CN from client certificates)
MTLS_ALLOWED_SERVICES=service1,service2,service3
```

### Distribute Client Certificates

For each service that needs to connect:

```bash
# Copy client certificate and key to service
scp server/certs/client.crt service1:/app/certs/
scp server/certs/client.key service1:/app/certs/
scp server/certs/client-ca.crt service1:/app/certs/

# Set permissions on service
chmod 600 /app/certs/client.key
chmod 644 /app/certs/client.crt
chmod 644 /app/certs/client-ca.crt
```

## Certificate Validation

### Verify Certificate

```bash
# Check certificate details
openssl x509 -in server/certs/server.crt -text -noout

# Verify certificate against CA
openssl verify -CAfile server/certs/ca.crt server/certs/server.crt

# Check certificate expiry
openssl x509 -in server/certs/server.crt -noout -enddate

# Verify private key matches certificate
openssl x509 -in server/certs/server.crt -noout -modulus | openssl md5
openssl rsa -in server/certs/server.key -noout -modulus | openssl md5
# The MD5 hashes should match
```

### Test TLS Connection

```bash
# Test TLS 1.3 connection
openssl s_client -connect localhost:5000 -tls1_3

# View certificate chain
openssl s_client -connect localhost:5000 -showcerts

# Test specific cipher
openssl s_client -connect localhost:5000 -tls1_3 -cipher TLS_AES_256_GCM_SHA384
```

### Test Mutual TLS

```bash
# Test with client certificate
curl --cert server/certs/client.crt \
     --key server/certs/client.key \
     --cacert server/certs/client-ca.crt \
     https://localhost:5000/api/internal/data

# Test without client certificate (should fail)
curl https://localhost:5000/api/internal/data
```

## Certificate Rotation

### Manual Rotation

```bash
# 1. Obtain new certificate
# (using Let's Encrypt, CA, or generate new self-signed)

# 2. Backup old certificates
cp server/certs/server.crt server/certs/backup/server-$(date +%Y%m%d).crt
cp server/certs/server.key server/certs/backup/server-$(date +%Y%m%d).key

# 3. Install new certificates
cp new-cert.crt server/certs/server.crt
cp new-key.key server/certs/server.key

# 4. Restart server
pm2 restart nexaerp
```

### API-Based Rotation

```bash
# Upload new certificate via API
curl -X POST https://nexaerp.com/api/certificates/rotate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newCertPath": "/path/to/new-cert.crt",
    "newKeyPath": "/path/to/new-key.key",
    "backup": true
  }'

# Restart server
pm2 restart nexaerp
```

## Monitoring

### Enable Certificate Monitoring

```bash
# Via API
curl -X POST https://nexaerp.com/api/certificates/monitoring/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "checkIntervalHours": 24
  }'
```

### Check Certificate Status

```bash
# Via API
curl https://nexaerp.com/api/certificates/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Set Up Alerts

Configure email alerts for certificate expiry:

```bash
# Update .env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@nexaerp.com
SMTP_PASS=your-password
ALERT_EMAIL=admin@nexaerp.com
```

## Troubleshooting

### Certificate Not Found

**Error**: `Server certificate not found: /path/to/server.crt`

**Solution**:
```bash
# Check if file exists
ls -la /path/to/server.crt

# Check environment variable
echo $TLS_CERT_PATH

# Verify path in .env file
cat .env | grep TLS_CERT_PATH
```

### Permission Denied

**Error**: `EACCES: permission denied, open '/path/to/server.key'`

**Solution**:
```bash
# Set correct permissions
chmod 600 /path/to/server.key
chown nexaerp:nexaerp /path/to/server.key
```

### Certificate Expired

**Error**: `Certificate expired on 2024-01-01T00:00:00.000Z`

**Solution**:
```bash
# Renew certificate (Let's Encrypt)
sudo certbot renew

# Or obtain new certificate from CA
# Then rotate using API or manual process
```

### Private Key Mismatch

**Error**: `Private key does not match certificate`

**Solution**:
```bash
# Verify key matches certificate
openssl x509 -in server.crt -noout -modulus | openssl md5
openssl rsa -in server.key -noout -modulus | openssl md5

# If they don't match, regenerate CSR with correct key
openssl req -new -key server.key -out server.csr
```

### TLS Handshake Failed

**Error**: `TLS handshake failed`

**Solution**:
```bash
# Check TLS version support
openssl s_client -connect localhost:5000 -tls1_3

# Check certificate chain
openssl s_client -connect localhost:5000 -showcerts

# Verify CA certificate is included
cat server.crt ca.crt > fullchain.crt
```

### Browser Shows "Not Secure"

**Causes**:
1. Self-signed certificate (expected in development)
2. Certificate not trusted by browser
3. Certificate CN doesn't match domain

**Solution**:
```bash
# For development: Add exception in browser
# For production: Use certificate from trusted CA

# Verify certificate CN matches domain
openssl x509 -in server.crt -noout -subject
```

## Security Best Practices

1. **Protect Private Keys**
   ```bash
   # Set restrictive permissions
   chmod 600 server.key
   
   # Use encrypted keys
   openssl genrsa -aes256 -out server.key 2048
   ```

2. **Use Strong Key Sizes**
   - Minimum 2048-bit RSA
   - Recommended 4096-bit RSA or 256-bit ECC

3. **Regular Rotation**
   - Rotate certificates annually
   - Rotate immediately if compromised

4. **Monitor Expiry**
   - Enable automatic monitoring
   - Set up alerts 30 days before expiry

5. **Secure Storage**
   - Never commit certificates to git
   - Use secrets management (Vault, AWS Secrets Manager)
   - Backup certificates securely

6. **Certificate Pinning**
   - Pin certificates for critical services
   - Update pins during rotation

## Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [OpenSSL Cookbook](https://www.feistyduck.com/library/openssl-cookbook/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [SSL Labs Server Test](https://www.ssllabs.com/ssltest/)

## Support

For issues or questions:
- Check logs: `pm2 logs nexaerp`
- Review documentation: `server/TLS_IMPLEMENTATION.md`
- Contact support: support@nexaerp.com
