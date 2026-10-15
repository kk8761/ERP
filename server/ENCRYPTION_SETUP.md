# Encryption at Rest - Setup Guide

**Task 38.2: Implement encryption at rest**  
**Requirement 15.3: Security Requirements**

## Quick Start

### 1. Initialize Encryption Service

The encryption service is automatically initialized when the server starts:

```typescript
// server/src/server.ts
import { encryptionService } from './services/EncryptionService';
import { keyRotationScheduler } from './services/key-rotation.scheduler';

const startServer = async () => {
  // Initialize encryption service
  console.log('Initializing encryption service...');
  await encryptionService.initialize();
  console.log('✅ Encryption service initialized');

  // Start key rotation scheduler
  keyRotationScheduler.start({
    enabled: true,
    checkIntervalHours: 24,
    warningThresholdDays: 7,
    autoRotate: true,
  });
  console.log('✅ Key rotation scheduler started');

  // ... rest of server initialization
};
```

### 2. Verify Encryption Keys

On first run, the encryption service will:
1. Create a `keys/` directory in the project root
2. Generate a master key (`keys/master.key`)
3. Generate an initial encryption key (`keys/encryption.keys`)

```bash
# Check if keys were created
ls -la keys/

# Expected output:
# -rw------- 1 user user   32 Dec 10 10:00 master.key
# -rw------- 1 user user  512 Dec 10 10:00 encryption.keys
```

**Important:** The `keys/` directory has restricted permissions (0700) and key files have 0600 permissions for security.

### 3. Test Encryption

```bash
# Run encryption tests
npm test -- encryption.test.ts

# Expected output:
# ✓ should encrypt plaintext data
# ✓ should decrypt encrypted data back to original plaintext
# ✓ should have an active encryption key
# ... (all tests passing)
```

### 4. Test API Endpoints

```bash
# Check encryption service health
curl http://localhost:5000/api/encryption/health

# Get encryption key information
curl http://localhost:5000/api/encryption/keys

# Test encryption/decryption
curl -X POST http://localhost:5000/api/encryption/test \
  -H "Content-Type: application/json" \
  -d '{"plaintext": "Test data"}'
```

## Configuration

### Environment Variables

Add these to your `.env` file (optional - uses defaults if not set):

```bash
# Encryption Configuration
ENCRYPTION_KEY_ROTATION_DAYS=90
ENCRYPTION_WARNING_THRESHOLD_DAYS=7
ENCRYPTION_AUTO_ROTATE=true
ENCRYPTION_CHECK_INTERVAL_HOURS=24

# Key Storage Location (default: ./keys)
ENCRYPTION_KEYS_DIR=./keys

# Production: Use KMS instead of filesystem
# AWS_KMS_KEY_ID=your-kms-key-id
# AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
# VAULT_ADDR=https://vault.example.com
# VAULT_TOKEN=your-vault-token
```

### Sensitive Fields Configuration

Edit `server/src/utils/databaseEncryption.ts` to configure which fields should be encrypted:

```typescript
export const SENSITIVE_FIELDS: Record<string, string[]> = {
  User: [
    'email',
    'phone',
    'address',
    'taxId',
    'ssn',
    'passport',
  ],
  Customer: [
    'email',
    'phone',
    'address',
    'taxId',
    'creditCardLast4',
  ],
  Employee: [
    'email',
    'phone',
    'address',
    'ssn',
    'bankAccount',
    'emergencyContact',
  ],
  // Add more models as needed
};
```

## Usage

### Automatic Encryption (Recommended)

Use the transparent data encryption utilities:

```typescript
import { encryptBeforeSave, decryptAfterRead } from './utils/databaseEncryption';
import prisma from './config/prisma';

// Create user with automatic encryption
const userData = {
  name: 'John Doe',
  email: 'john@example.com',  // Will be encrypted
  phone: '+1234567890',       // Will be encrypted
  role: 'admin',
};

// Encrypt before saving
const encrypted = encryptBeforeSave('User', userData);
const user = await prisma.user.create({ data: encrypted });

// Decrypt after reading
const foundUser = await prisma.user.findUnique({ where: { id: user.id } });
const decrypted = decryptAfterRead('User', foundUser);

console.log(decrypted.email); // 'john@example.com' (decrypted)
```

### Manual Encryption

For custom encryption needs:

```typescript
import { encryptionService } from './services/EncryptionService';

// Encrypt a single field
const email = 'user@example.com';
const encryptedEmail = encryptionService.encryptField(email);

// Decrypt a single field
const decryptedEmail = encryptionService.decryptField(encryptedEmail);

// Encrypt an object
const user = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
};

const encrypted = encryptionService.encryptObject(user, ['email', 'phone']);
const decrypted = encryptionService.decryptObject(encrypted, ['email', 'phone']);
```

## Key Management

### Check Key Status

```typescript
import { encryptionService } from './services/EncryptionService';

const keyInfo = encryptionService.getKeyInfo();

console.log('Active Key ID:', keyInfo.activeKeyId);
console.log('Total Keys:', keyInfo.totalKeys);
console.log('Keys:', keyInfo.keys);

// Example output:
// Active Key ID: 'a1b2c3d4-...'
// Total Keys: 2
// Keys: [
//   {
//     id: 'a1b2c3d4-...',
//     createdAt: 2024-01-01T00:00:00.000Z,
//     expiresAt: 2024-04-01T00:00:00.000Z,
//     isActive: true,
//     daysUntilExpiry: 85
//   },
//   ...
// ]
```

### Manual Key Rotation

```typescript
import { encryptionService } from './services/EncryptionService';

// Rotate key manually
const newKeyId = await encryptionService.rotateKey();
console.log('New key ID:', newKeyId);

// Re-encrypt data with new key
const oldEncrypted = encryptionService.encrypt('data');
const newEncrypted = await encryptionService.reencryptData(oldEncrypted);
```

### Automatic Key Rotation

The key rotation scheduler runs automatically:

```typescript
import { keyRotationScheduler } from './services/key-rotation.scheduler';

// Check scheduler status
const status = keyRotationScheduler.getStatus();
console.log('Is Running:', status.isRunning);
console.log('Next Check:', status.nextCheckTime);

// Force immediate check
await keyRotationScheduler.forceCheck();

// Update configuration
keyRotationScheduler.updateConfig({
  checkIntervalHours: 12, // Check twice daily
  warningThresholdDays: 14, // Warn 14 days before expiration
});
```

### Batch Re-encryption

After key rotation, re-encrypt existing data:

```typescript
import { reencryptModelData, reencryptAllData } from './utils/databaseEncryption';
import prisma from './config/prisma';

// Re-encrypt specific model
const count = await reencryptModelData(prisma, 'User', 100);
console.log(`Re-encrypted ${count} User records`);

// Re-encrypt all models (long-running operation)
await reencryptAllData(prisma);
```

## API Endpoints

### GET /api/encryption/keys

Get encryption key information.

**Response:**
```json
{
  "success": true,
  "data": {
    "activeKeyId": "a1b2c3d4-...",
    "totalKeys": 2,
    "keys": [
      {
        "id": "a1b2c3d4-...",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "expiresAt": "2024-04-01T00:00:00.000Z",
        "isActive": true,
        "daysUntilExpiry": 85,
        "status": "active"
      }
    ]
  }
}
```

### POST /api/encryption/rotate

Rotate encryption key.

**Request:**
```json
{
  "reencryptData": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Encryption key rotated successfully",
  "data": {
    "newKeyId": "e5f6g7h8-...",
    "reencryptedRecords": 0
  }
}
```

### POST /api/encryption/reencrypt/:model

Re-encrypt data for a specific model.

**Request:**
```json
{
  "batchSize": 100
}
```

**Response:**
```json
{
  "success": true,
  "message": "Re-encrypted 150 User records",
  "data": {
    "model": "User",
    "reencryptedRecords": 150
  }
}
```

### POST /api/encryption/cleanup

Cleanup expired encryption keys.

**Request:**
```json
{
  "retentionDays": 365
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cleaned up 2 expired keys",
  "data": {
    "removedKeys": 2,
    "retentionDays": 365
  }
}
```

### POST /api/encryption/test

Test encryption/decryption.

**Request:**
```json
{
  "plaintext": "Test encryption data"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Encryption test completed",
  "data": {
    "plaintext": "Test encryption data",
    "encrypted": {
      "keyId": "a1b2c3d4-...",
      "algorithm": "aes-256-gcm",
      "dataLength": 128
    },
    "decrypted": "Test encryption data",
    "isValid": true
  }
}
```

### GET /api/encryption/health

Check encryption service health.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "activeKeyId": "a1b2c3d4-...",
    "totalKeys": 2
  }
}
```

## Monitoring

### Key Expiration Monitoring

The key rotation scheduler automatically monitors key expiration:

- **Daily checks:** Runs every 24 hours (configurable)
- **Warning threshold:** 7 days before expiration (configurable)
- **Auto-rotation:** Automatically rotates expired keys (configurable)
- **Audit logging:** All rotation events logged to audit log

### Logs to Monitor

```bash
# Successful initialization
✅ Encryption service initialized successfully
✅ Key rotation scheduler started

# Key rotation warnings
⚠️  WARNING: Key a1b2c3d4-... expires in 7 days (2024-04-01T00:00:00.000Z)

# Key rotation events
🔐 Rotating encryption key...
✓ Key rotation complete. New key ID: e5f6g7h8-...

# Re-encryption progress
Re-encrypting User data...
✓ Re-encrypted 150 User records
```

### Metrics to Track

- Active key expiration date
- Number of encryption/decryption operations
- Encryption operation latency
- Key rotation success/failure rate
- Number of expired keys
- Re-encryption progress

## Security Best Practices

### 1. Key Storage

**Development:**
- Keys stored on filesystem with restricted permissions
- Adequate for development and testing

**Production:**
- **DO NOT** store keys on filesystem
- Use a Key Management Service (KMS):
  - AWS KMS
  - Azure Key Vault
  - HashiCorp Vault
  - Google Cloud KMS

### 2. Key Rotation

- Keys automatically rotate every 90 days (per requirement 15.3)
- Old keys retained for decrypting historical data
- Re-encrypt data with new keys periodically
- Monitor key expiration and rotation events

### 3. Access Control

- Restrict access to encryption API endpoints
- Require admin role for key management operations
- Log all encryption-related operations
- Monitor for unauthorized access attempts

### 4. Backup and Recovery

- Backup master key securely
- Store backups in separate location
- Test recovery procedures regularly
- Document key recovery process

### 5. Compliance

- Encryption meets GDPR, HIPAA, PCI DSS requirements
- AES-256-GCM is FIPS 140-2 compliant
- Audit logs provide compliance evidence
- Regular security audits recommended

## Troubleshooting

### Issue: "Master key not initialized"

**Cause:** Encryption service not initialized before use.

**Solution:**
```typescript
await encryptionService.initialize();
```

### Issue: "Encryption key not found"

**Cause:** Trying to decrypt data with a deleted key.

**Solution:**
- Don't delete keys that are still referenced by encrypted data
- Restore keys from backup if available
- Re-encrypt data with current key

### Issue: "Failed to decrypt: bad decrypt"

**Cause:** Data has been tampered with or corrupted.

**Solution:**
- Verify data integrity
- Check for database corruption
- Restore from backup if necessary

### Issue: Keys directory not created

**Cause:** Insufficient permissions or disk space.

**Solution:**
```bash
# Create keys directory manually
mkdir -p keys
chmod 700 keys

# Check disk space
df -h
```

### Issue: Key rotation failed

**Cause:** Insufficient permissions, disk space, or network issues.

**Solution:**
1. Check error logs for specific failure reason
2. Verify disk space and permissions
3. Manually trigger key rotation
4. Contact support if issue persists

## Migration Guide

### Migrating Existing Data

If you're adding encryption to an existing system:

1. **Backup your database**
   ```bash
   pg_dump nexaerp > backup.sql
   ```

2. **Initialize encryption service**
   ```bash
   npm start
   # Encryption service will initialize automatically
   ```

3. **Encrypt existing data**
   ```typescript
   import { reencryptAllData } from './utils/databaseEncryption';
   import prisma from './config/prisma';

   // This is a long-running operation
   await reencryptAllData(prisma);
   ```

4. **Verify encryption**
   ```bash
   # Check that sensitive fields are encrypted in database
   psql nexaerp -c "SELECT email FROM \"User\" LIMIT 1;"
   # Should show encrypted JSON, not plaintext
   ```

5. **Test decryption**
   ```bash
   # Test API to ensure decryption works
   curl http://localhost:5000/api/users/me
   # Should show decrypted data
   ```

### Rolling Back

If you need to roll back encryption:

1. **Decrypt all data**
   ```typescript
   // Create a script to decrypt all records
   const users = await prisma.user.findMany();
   for (const user of users) {
     const decrypted = decryptAfterRead('User', user);
     await prisma.user.update({
       where: { id: user.id },
       data: {
         email: decrypted.email,
         phone: decrypted.phone,
         // ... other fields
       },
     });
   }
   ```

2. **Remove encryption middleware**
   ```typescript
   // Comment out encryption initialization in server.ts
   // await encryptionService.initialize();
   ```

3. **Restore from backup if needed**
   ```bash
   psql nexaerp < backup.sql
   ```

## Support

For issues or questions:
- Check this setup guide
- Review [ENCRYPTION_IMPLEMENTATION.md](./ENCRYPTION_IMPLEMENTATION.md)
- Check server logs for error details
- Run encryption tests: `npm test -- encryption.test.ts`
- Contact development team
- File issue in project repository

## References

- [ENCRYPTION_IMPLEMENTATION.md](./ENCRYPTION_IMPLEMENTATION.md) - Detailed implementation documentation
- [encryption.test.ts](./src/tests/encryption.test.ts) - Test suite
- [EncryptionService.ts](./src/services/EncryptionService.ts) - Core encryption service
- [databaseEncryption.ts](./src/utils/databaseEncryption.ts) - Database encryption utilities
- [key-rotation.scheduler.ts](./src/services/key-rotation.scheduler.ts) - Key rotation scheduler

---

**Last Updated:** 2024  
**Version:** 1.0  
**Author:** NexaERP Development Team
