# TLS 1.3 Quick Start Guide

Get TLS 1.3 up and running in 5 minutes!

## Step 1: Generate Certificate (Development)

```bash
# Create certs directory
mkdir -p server/certs

# Generate private key
openssl genrsa -out server/certs/server.key 2048

# Generate self-signed certificate
openssl req -new -x509 \
  -key server/certs/server.key \
  -out server/certs/server.crt \
  -days 365 \
  -subj "/C=US/ST=State/L=City/O=NexaERP/CN=localhost"

# Set permissions
chmod 600 server/certs/server.key
chmod 644 server/certs/server.crt
```

## Step 2: Configure Environment

Create or update `server/.env`:

```bash
# Enable TLS
TLS_ENABLED=true

# Certificate paths
TLS_CERT_PATH=./certs/server.crt
TLS_KEY_PATH=./certs/server.key

# Environment
NODE_ENV=development
```

## Step 3: Start Server

```bash
cd server
npm start
```

You should see:
```
✅ HTTPS server created with TLS 1.3 enforcement
✅ TLS certificate valid until 2025-XX-XX
   Days remaining: 365
🚀 NexaERP Server running on port 5000
```

## Step 4: Test Connection

```bash
# Test TLS 1.3
curl -k https://localhost:5000/health

# Verify TLS version
openssl s_client -connect localhost:5000 -tls1_3
```

## Step 5: Access API

```bash
# Get certificate status
curl -k https://localhost:5000/api/certificates/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## That's It! 🎉

Your server is now running with TLS 1.3 encryption!

## Next Steps

- **Production Setup**: See [CERTIFICATE_SETUP_GUIDE.md](./CERTIFICATE_SETUP_GUIDE.md)
- **Mutual TLS**: See [TLS_IMPLEMENTATION.md](./TLS_IMPLEMENTATION.md#mutual-tls-mtls)
- **Usage Examples**: See [examples/tls-usage.ts](./examples/tls-usage.ts)
- **Full Documentation**: See [TLS_README.md](./TLS_README.md)

## Common Issues

### "Certificate not found"

**Solution**: Make sure you created the certificate in Step 1.

### "Permission denied"

**Solution**: Run `chmod 600 server/certs/server.key`

### "Port already in use"

**Solution**: Change PORT in `.env` or stop other services on port 5000.

### Browser shows "Not Secure"

**Solution**: This is normal for self-signed certificates in development. Click "Advanced" and "Proceed" to continue.

## Production Setup (Let's Encrypt)

```bash
# Install certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Update .env
TLS_ENABLED=true
TLS_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
TLS_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
NODE_ENV=production

# Restart server
pm2 restart nexaerp
```

## Need Help?

- 📖 [Full Documentation](./TLS_IMPLEMENTATION.md)
- 🔧 [Troubleshooting Guide](./CERTIFICATE_SETUP_GUIDE.md#troubleshooting)
- 💬 Support: support@nexaerp.com
