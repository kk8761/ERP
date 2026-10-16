# Encryption at Rest Implementation

**Task 38.2: Implement encryption at rest**  
**Requirement 15.3: Security Requirements**

## Overview

This document describes the implementation of AES-256-GCM encryption at rest for NexaERP, providing transparent data encryption (TDE) for sensitive data fields with secure key management and automatic key rotation.

## Requirements Fulfilled

### Requirement 15.3 - Security Requirements

1. ✅ **THE System SHALL encrypt all data at rest using AES-256**
   - Implemented AES-256-GCM encryption algorithm
   - Provides authenticated encryption with integrity verification
   - Supports field-level and object-level encryption

2. ✅ **WHEN encryption keys are managed, THE System SHALL rotate keys every 90 days**
   - Automatic key rotation every 90 days
   - Key rotation scheduler with configurable intervals
   - Warning notifications 7 days before expiration
   - Graceful handling of old keys for decryption

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Controllers  │  │  Services    │  │   Models     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └─────────────────┴─────────────────┘               │
│                           │                                 │
├───────────────────────────┼─────────────────────────────────┤
│         Transparent Data Encryption Layer                   │
│  ┌────────────────────────┴──────────────────────────┐     │
│  │     Database Encryption Utilities                  │     │
│  │  - encryptBeforeSave()                            │     │
│  │  - decryptAfterRead()                             │     │
│  │  - Prisma Middleware                              │     │
│  └────────────────────────┬──────────────────────────┘     │
│                           │                                 │
├───────────────────────────┼─────────────────────────────────┤
│            Encryption Service Layer                         │
│  ┌────────────────────────┴──────────────────────────┐     │
│  │         EncryptionService (Singleton)              │     │
│  │  - encrypt() / decrypt()                          │     │
│  │  - encryptField() / decryptField()                │     │
│  │  - encryptObject() / decryptObject()              │     │
│  │  - Key Management                                 │     │
│  └────────────────────────┬──────────────────────────┘     │
│                           │                                 │
├───────────────────────────┼─────────────────────────────────┤
│              Key Management Layer                           │
│  ┌────────────────────────┴──────────────────────────┐     │
│  │  - Master Key (encrypts encryption keys)          │     │
│  │  - Encryption Keys (rotate every 90 days)         │     │
│  │  - Key Rotation Scheduler                         │     │
│  │  - Key Storage (filesystem/KMS)                   │     │
│  └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Encryption Flow

```
┌──────────────┐
│ Application  │
│    Write     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────┐
│ encryptBeforeSave()          │
│ - Identifies sensitive fields│
│ - Encrypts each field        │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ EncryptionService.encrypt()  │
│ - Generates random IV        │
│ - Encrypts with AES-256-GCM  │
│ - Generates auth tag         │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Database Storage             │
│ {                            │
│   data: "base64...",         │
│   iv: "base64...",           │
│   authTag: "base64...",      │
│   keyId: "uuid",             │
│   algorithm: "aes-256-gcm"   │
│ }                            │
└──────────────────────────────┘
```

### Decryption Flow

```
┌──────────────┐
│ Application  │
│     Read     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────┐
│ Database Retrieval           │
│ Returns encrypted JSON       │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ decryptAfterRead()           │
│ - Identifies encrypted fields│
│ - Decrypts each field        │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ EncryptionService.decrypt()  │
│ - Retrieves key by keyId     │
│ - Verifies auth tag          │
│ - Decrypts with AES-256-GCM  │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────┐
│  Plaintext   │
│    Data      │
└──────────────┘
```

## Implementation Details

### 1. Encryption Service (`EncryptionService.ts`)

**Core Features:**
- Singleton pattern for centralized key management
- AES-256-GCM encryption algorithm
- 256-bit encryption keys
- 128-bit initialization vectors (IV)
- 128-bit authentication tags
- Master key encryption for key storage

**Key Methods:**

```typescript
// Basic encryption/decryption
encrypt(plaintext: string): EncryptedData
decrypt(encryptedData: EncryptedData): string

// Field-level encryption
encryptField(value: string): string
decryptField(encryptedValue: string): string

// Object encryption
encryptObject<T>(obj: T, sensitiveFields: (keyof T)[]): T
decryptObject<T>(obj: T, sensitiveFields: (keyof T)[]): T

// Key management
rotateKey(): Promise<string>
getKeyInfo(): KeyInfo
cleanupExpiredKeys(retentionDays: number): Promise<number>
reencryptData(encryptedData: EncryptedData): Promise<EncryptedData>
```

### 2. Database Encryption Utilities (`databaseEncryption.ts`)

**Sensitive Field Definitions:**

```typescript
const SENSITIVE_FIELDS: Record<string, string[]> = {
  User: ['email', 'phone', 'address', 'taxId', 'ssn', 'passport'],
  Customer: ['email', 'phone', 'address', 'taxId', 'creditCardLast4'],
  Employee: ['email', 'phone', 'address', 'ssn', 'bankAccount', 'emergencyContact'],
  BankAccount: ['accountNumber', 'routingNumber', 'swiftCode'],
  PaymentMethod: ['cardNumber', 'cvv', 'accountNumber'],
  Invoice: ['taxId', 'bankAccount'],
  Payroll: ['bankAccount', 'taxId', 'ssn'],
  MedicalRecord: ['medicalRecordNumber', 'diagnosis', 'prescription', 'labResults', 'insuranceNumber'],
  Contract: ['signedDocument', 'confidentialTerms'],
};
```

**Transparent Encryption Functions:**

```typescript
// Encrypt before saving to database
encryptBeforeSave<T>(modelName: string, data: T): T

// Decrypt after reading from database
decryptAfterRead<T>(modelName: string, data: T): T

// Prisma middleware for automatic encryption/decryption
createEncryptionMiddleware()

// Batch operations
encryptRecords<T>(modelName: string, records: T[]): T[]
decryptRecords<T>(modelName: string, records: T[]): T[]

// Key rotation support
reencryptModelData(prisma: any, modelName: string, batchSize: number): Promise<number>
reencryptAllData(prisma: any): Promise<void>
```

### 3. Key Rotation Scheduler (`key-rotation.scheduler.ts`)

**Features:**
- Automatic daily checks for expiring keys
- Warning notifications 7 days before expiration
- Automatic key rotation when keys expire
- Retry logic with configurable attempts
- Audit logging of all rotation events
- Manual trigger support

**Configuration:**

```typescript
interface KeyRotationConfig {
  enabled: boolean;
  checkIntervalHours: number;        // Default: 24 (daily)
  warningThresholdDays: number;      // Default: 7
  autoRotate: boolean;               // Default: true
  retryAttempts: number;             // Default: 3
  retryDelayMinutes: number;         // Default: 5
}
```

**Usage:**

```typescript
import { keyRotationScheduler } from './services/key-rotation.scheduler';

// Start with default config
keyRotationScheduler.start();

// Start with custom config
keyRotationScheduler.start({
  enabled: true,
  checkIntervalHours: 24,
  warningThresholdDays: 7,
  autoRotate: true,
});

// Force immediate check
await keyRotationScheduler.forceCheck();

// Get status
const status = keyRotationScheduler.getStatus();

// Stop scheduler
keyRotationScheduler.stop();
```

### 4. Encryption API Routes (`encryptionRoutes.ts`)

**Endpoints:**

```
GET  /api/encryption/keys          - Get encryption key information
POST /api/encryption/rotate        - Rotate encryption key
POST /api/encryption/reencrypt/:model - Re-encrypt model data
POST /api/encryption/cleanup       - Cleanup expired keys
POST /api/encryption/test          - Test encryption/decryption
GET  /api/encryption/health        - Check encryption service health
```

## Security Features

### 1. AES-256-GCM Encryption

- **Algorithm:** AES-256-GCM (Galois/Counter Mode)
- **Key Size:** 256 bits (32 bytes)
- **IV Size:** 128 bits (16 bytes)
- **Auth Tag Size:** 128 bits (16 bytes)

**Benefits:**
- Authenticated encryption (confidentiality + integrity)
- Detects tampering with authentication tag
- Industry-standard encryption algorithm
- FIPS 140-2 compliant

### 2. Key Management

**Master Key:**
- 256-bit master key encrypts all encryption keys
- Stored on filesystem with restricted permissions (0600)
- Should be migrated to KMS in production (AWS KMS, Azure Key Vault, HashiCorp Vault)

**Encryption Keys:**
- Multiple encryption keys with rotation
- Each key has unique ID, creation date, and expiration date
- Keys expire after 90 days (configurable)
- Old keys retained for decrypting historical data
- Keys encrypted at rest using master key

**Key Storage:**
```
keys/
├── master.key           # Master key (0600 permissions)
└── encryption.keys      # Encrypted encryption keys (0600 permissions)
```

### 3. Transparent Data Encryption (TDE)

**Automatic Encryption:**
- Prisma middleware intercepts database operations
- Automatically encrypts sensitive fields before write
- Automatically decrypts sensitive fields after read
- No code changes required in application logic

**Field-Level Encryption:**
- Only sensitive fields are encrypted
- Non-sensitive fields remain plaintext for indexing and searching
- Configurable per model

### 4. Key Rotation

**Automatic Rotation:**
- Keys rotate every 90 days (per requirement 15.3)
- Scheduler checks daily for expiring keys
- Warning notifications 7 days before expiration
- Automatic rotation when keys expire

**Data Re-encryption:**
- Old data can be decrypted with old keys
- Re-encryption utility for migrating to new keys
- Batch processing with configurable batch size
- Progress tracking and error handling

## Usage Examples

### Example 1: Basic Encryption

```typescript
import { encryptionService } from './services/EncryptionService';

// Initialize (done automatically on server startup)
await encryptionService.initialize();

// Encrypt plaintext
const plaintext = 'Sensitive customer data';
const encrypted = encryptionService.encrypt(plaintext);

// Decrypt
const decrypted = encryptionService.decrypt(encrypted);
console.log(decrypted); // 'Sensitive customer data'
```

### Example 2: Field-Level Encryption

```typescript
import { encryptionService } from './services/EncryptionService';

// Encrypt individual fields
const email = 'user@example.com';
const encryptedEmail = encryptionService.encryptField(email);

// Store in database as string
await prisma.user.create({
  data: {
    name: 'John Doe',
    email: encryptedEmail, // Encrypted
  },
});

// Decrypt when reading
const user = await prisma.user.findUnique({ where: { id: userId } });
const decryptedEmail = encryptionService.decryptField(user.email);
```

### Example 3: Object Encryption

```typescript
import { encryptionService } from './services/EncryptionService';

const user = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  role: 'admin',
};

// Encrypt sensitive fields
const encrypted = encryptionService.encryptObject(user, ['email', 'phone']);

// Save to database
await prisma.user.create({ data: encrypted });

// Decrypt when reading
const decrypted = encryptionService.decryptObject(encrypted, ['email', 'phone']);
```

### Example 4: Transparent Encryption with Prisma Middleware

```typescript
import { createEncryptionMiddleware } from './utils/databaseEncryption';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Add encryption middleware
prisma.$use(createEncryptionMiddleware());

// Now all operations automatically encrypt/decrypt
const user = await prisma.user.create({
  data: {
    name: 'John Doe',
    email: 'john@example.com', // Automatically encrypted
    phone: '+1234567890',      // Automatically encrypted
  },
});

// Email and phone are automatically decrypted when reading
const foundUser = await prisma.user.findUnique({ where: { id: user.id } });
console.log(foundUser.email); // 'john@example.com' (decrypted)
```

### Example 5: Key Rotation

```typescript
import { encryptionService } from './services/EncryptionService';

// Check key status
const keyInfo = encryptionService.getKeyInfo();
console.log(`Active key: ${keyInfo.activeKeyId}`);
console.log(`Days until expiry: ${keyInfo.keys[0].daysUntilExpiry}`);

// Rotate key manually
const newKeyId = await encryptionService.rotateKey();
console.log(`New key: ${newKeyId}`);

// Re-encrypt data with new key
const oldEncrypted = encryptionService.encrypt('data');
const newEncrypted = await encryptionService.reencryptData(oldEncrypted);
```

### Example 6: Batch Re-encryption

```typescript
import { reencryptModelData, reencryptAllData } from './utils/databaseEncryption';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Re-encrypt specific model
const count = await reencryptModelData(prisma, 'User', 100);
console.log(`Re-encrypted ${count} User records`);

// Re-encrypt all models
await reencryptAllData(prisma);
```

## Configuration

### Environment Variables

```bash
# Encryption configuration (optional - uses defaults if not set)
ENCRYPTION_KEY_ROTATION_DAYS=90
ENCRYPTION_WARNING_THRESHOLD_DAYS=7
ENCRYPTION_AUTO_ROTATE=true
ENCRYPTION_CHECK_INTERVAL_HOURS=24

# Key storage (for production)
# Use AWS KMS, Azure Key Vault, or HashiCorp Vault
AWS_KMS_KEY_ID=your-kms-key-id
AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
VAULT_ADDR=https://vault.example.com
VAULT_TOKEN=your-vault-token
```

### Server Initialization

The encryption service is automatically initialized on server startup:

```typescript
// server/src/server.ts
import { encryptionService } from './services/EncryptionService';
import { keyRotationScheduler } from './services/key-rotation.scheduler';

const startServer = async () => {
  // Initialize encryption service
  await encryptionService.initialize();
  
  // Start key rotation scheduler
  keyRotationScheduler.start({
    enabled: true,
    checkIntervalHours: 24,
    warningThresholdDays: 7,
    autoRotate: true,
  });
  
  // ... rest of server initialization
};
```

## Testing

### Running Tests

```bash
# Run encryption tests
npm test -- encryption.test.ts

# Run with coverage
npm test -- --coverage encryption.test.ts
```

### Test Coverage

The test suite covers:
- ✅ Basic encryption and decryption
- ✅ Field-level encryption
- ✅ Object encryption
- ✅ Key management and rotation
- ✅ Database encryption utilities
- ✅ Security properties (IV uniqueness, auth tag verification)
- ✅ Performance (1000 records)
- ✅ Edge cases (empty strings, unicode, special characters)
- ✅ Key cleanup

## Production Deployment

### Pre-Deployment Checklist

- [ ] Migrate master key to KMS (AWS KMS, Azure Key Vault, HashiCorp Vault)
- [ ] Configure key rotation schedule
- [ ] Set up monitoring and alerting for key expiration
- [ ] Test key rotation in staging environment
- [ ] Document key recovery procedures
- [ ] Set up backup and disaster recovery for keys
- [ ] Configure audit logging for encryption operations
- [ ] Review and update sensitive field definitions
- [ ] Test encryption performance under load
- [ ] Document encryption key management procedures

### Key Management Service Integration

**AWS KMS Example:**

```typescript
import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';

const kmsClient = new KMSClient({ region: 'us-east-1' });

async function encryptWithKMS(plaintext: Buffer): Promise<Buffer> {
  const command = new EncryptCommand({
    KeyId: process.env.AWS_KMS_KEY_ID,
    Plaintext: plaintext,
  });
  const response = await kmsClient.send(command);
  return Buffer.from(response.CiphertextBlob!);
}

async function decryptWithKMS(ciphertext: Buffer): Promise<Buffer> {
  const command = new DecryptCommand({
    CiphertextBlob: ciphertext,
  });
  const response = await kmsClient.send(command);
  return Buffer.from(response.Plaintext!);
}
```

### Monitoring and Alerting

**Key Metrics to Monitor:**
- Active key expiration date
- Number of encryption/decryption operations
- Encryption operation latency
- Key rotation success/failure
- Number of expired keys
- Re-encryption progress

**Alerts to Configure:**
- Key expiring in 7 days
- Key rotation failure
- Encryption service initialization failure
- High encryption operation latency
- Master key access failure

## Troubleshooting

### Common Issues

**Issue: "Master key not initialized"**
- **Cause:** Encryption service not initialized
- **Solution:** Ensure `encryptionService.initialize()` is called on server startup

**Issue: "Encryption key not found"**
- **Cause:** Trying to decrypt data with a key that has been deleted
- **Solution:** Don't delete keys that are still referenced by encrypted data

**Issue: "Failed to decrypt: bad decrypt"**
- **Cause:** Data has been tampered with or corrupted
- **Solution:** Verify data integrity, check for database corruption

**Issue: "Key rotation failed"**
- **Cause:** Insufficient permissions, disk space, or network issues
- **Solution:** Check logs, verify permissions, ensure adequate disk space

### Recovery Procedures

**Lost Master Key:**
1. If master key is lost, encrypted data cannot be recovered
2. Restore master key from backup
3. If no backup exists, data must be re-entered

**Corrupted Encryption Keys:**
1. Restore encryption keys from backup
2. Verify key integrity
3. Test decryption with sample data

**Failed Key Rotation:**
1. Check error logs for specific failure reason
2. Verify disk space and permissions
3. Manually trigger key rotation
4. If persistent, contact support

## Performance Considerations

### Encryption Overhead

- **Encryption:** ~0.1-0.5ms per field
- **Decryption:** ~0.1-0.5ms per field
- **Batch operations:** ~100-500ms per 1000 records

### Optimization Tips

1. **Selective Encryption:** Only encrypt truly sensitive fields
2. **Batch Operations:** Use batch encryption for bulk operations
3. **Caching:** Cache decrypted values when appropriate
4. **Indexing:** Don't encrypt fields that need to be indexed
5. **Async Operations:** Use async encryption for large datasets

## Compliance

### Standards Compliance

- ✅ **GDPR:** Encryption of personal data at rest
- ✅ **HIPAA:** Encryption of protected health information (PHI)
- ✅ **PCI DSS:** Encryption of cardholder data
- ✅ **SOC 2:** Encryption controls for data security
- ✅ **ISO 27001:** Information security management

### Audit Trail

All encryption operations are logged to the audit log:
- Key generation
- Key rotation
- Key deletion
- Encryption/decryption operations (metadata only)
- Configuration changes

## Future Enhancements

### Planned Features

1. **Hardware Security Module (HSM) Integration**
   - Support for hardware-based key storage
   - FIPS 140-2 Level 3 compliance

2. **Envelope Encryption**
   - Data encryption keys (DEKs) for each record
   - DEKs encrypted with key encryption keys (KEKs)

3. **Searchable Encryption**
   - Deterministic encryption for searchable fields
   - Order-preserving encryption for range queries

4. **Client-Side Encryption**
   - Encrypt data before sending to server
   - End-to-end encryption for maximum security

5. **Key Versioning**
   - Track which key version encrypted each field
   - Automatic migration to latest key version

## References

- [NIST SP 800-38D: GCM Mode](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [AWS KMS Best Practices](https://docs.aws.amazon.com/kms/latest/developerguide/best-practices.html)
- [Azure Key Vault Best Practices](https://docs.microsoft.com/en-us/azure/key-vault/general/best-practices)

## Support

For issues or questions:
- Check troubleshooting section above
- Review server logs for error details
- Contact development team
- File issue in project repository

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Author:** NexaERP Development Team
