# Key Management System Guide

## Overview

The Key Management System provides enterprise-grade encryption key management with AWS KMS and Azure Key Vault integration. It implements automatic key rotation every 90 days, comprehensive usage tracking, and full audit logging to meet security compliance requirements (Requirement 15.5).

## Features

- **Multi-Provider Support**: AWS KMS, Azure Key Vault, or local keys (development)
- **Automatic Key Rotation**: 90-day rotation policy with automated scheduling
- **Usage Tracking**: Comprehensive tracking of all encryption/decryption operations
- **Audit Logging**: Complete audit trail for compliance and security monitoring
- **Key Lifecycle Management**: Create, rotate, expire, and delete keys
- **Performance Monitoring**: Track operation duration and success rates
- **Admin Dashboard**: Web-based interface for key management

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Key Management Service                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   AWS KMS    │  │ Azure Key    │  │    LOCAL     │      │
│  │  Integration │  │    Vault     │  │  (Dev Only)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Key Rotation Engine                         │   │
│  │  - 90-day rotation policy                            │   │
│  │  - Automatic rotation scheduling                     │   │
│  │  - Expiry warnings (7 days)                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Usage Tracking & Audit Logging             │   │
│  │  - Encryption/decryption operations                  │   │
│  │  - Key creation/rotation/deletion                    │   │
│  │  - User context and IP tracking                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │   PostgreSQL     │
                  │  - EncryptionKey │
                  │  - KeyAuditLog   │
                  │  - KeyAccessLog  │
                  └──────────────────┘
```

## Setup

### 1. AWS KMS Configuration

Set the following environment variables:

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

### 2. Azure Key Vault Configuration

Set the following environment variable:

```bash
AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
```

Azure authentication uses DefaultAzureCredential, which supports:
- Environment variables (AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID)
- Managed Identity (when running in Azure)
- Azure CLI credentials
- Visual Studio Code credentials

### 3. Local Development (No Cloud Provider)

If neither AWS nor Azure is configured, the system will use local key management (development only).

**⚠️ WARNING**: Local keys are stored on the filesystem and should NOT be used in production.

### 4. Initialize Key Management

Run the initialization script to create the first encryption key:

```bash
npm run init:key-management
```

This will:
- Detect the configured provider (AWS KMS, Azure Key Vault, or LOCAL)
- Create an initial encryption key
- Test encryption/decryption
- Set up automatic rotation schedule

### 5. Set Up Automatic Key Rotation

The system includes cron jobs for automatic key management:

- **Key Rotation Check**: Daily at 2:00 AM UTC
- **Expiry Warnings**: Daily at 9:00 AM UTC
- **Usage Monitoring**: Every 6 hours

These cron jobs are automatically started when the server starts.

To manually run key rotation:

```bash
npm run rotate:keys
```

## Usage

### Creating a New Key

```typescript
import { keyManagementService } from './services/KeyManagementService';

const keyMetadata = await keyManagementService.createKey('Description of key purpose');

console.log('Key created:', keyMetadata.keyId);
```

### Encrypting Data

```typescript
const plaintext = 'Sensitive data to encrypt';
const encrypted = await keyManagementService.encryptData(keyId, plaintext);

console.log('Encrypted:', encrypted);
```

### Decrypting Data

```typescript
const decrypted = await keyManagementService.decryptData(keyId, encrypted);

console.log('Decrypted:', decrypted);
```

### Rotating a Key

```typescript
const result = await keyManagementService.rotateKey(keyId);

console.log('Old key:', result.oldKeyId);
console.log('New key:', result.newKeyId);
```

### Getting Key Information

```typescript
const keyInfo = await keyManagementService.getKeyInfo(keyId);

console.log('Key status:', keyInfo.status);
console.log('Usage count:', keyInfo.usageCount);
console.log('Next rotation:', keyInfo.nextRotationAt);
```

### Getting Usage Statistics

```typescript
const stats = await keyManagementService.getKeyUsageStats(keyId);

console.log('Total operations:', stats.totalUsage);
console.log('Encryptions:', stats.encryptionCount);
console.log('Decryptions:', stats.decryptionCount);
console.log('Failed operations:', stats.failedOperations);
```

## API Endpoints

All endpoints require admin authentication.

### List All Keys

```http
GET /api/admin/keys
Query Parameters:
  - status: Filter by key status (ACTIVE, EXPIRED, etc.)
```

### Get Key Dashboard

```http
GET /api/admin/keys/dashboard
```

Returns:
- Summary statistics (total keys, active keys, expiring keys)
- Usage statistics (total operations, success rate)
- Expiring keys list
- Recent keys

### Create New Key

```http
POST /api/admin/keys
Body:
{
  "description": "Optional key description"
}
```

### Get Key Information

```http
GET /api/admin/keys/:keyId
```

### Rotate Key

```http
POST /api/admin/keys/:keyId/rotate
```

### Rotate All Keys

```http
POST /api/admin/keys/rotate-all
```

### Get Key Usage Statistics

```http
GET /api/admin/keys/:keyId/usage
Query Parameters:
  - startDate: Optional start date (ISO 8601)
  - endDate: Optional end date (ISO 8601)
```

### Test Key

```http
POST /api/admin/keys/:keyId/test
Body:
{
  "plaintext": "Optional test message"
}
```

### Delete Key

```http
DELETE /api/admin/keys/:keyId
Body:
{
  "pendingDays": 30  // Days until deletion (default: 30)
}
```

## Database Schema

### EncryptionKey

Stores metadata for all encryption keys.

```sql
CREATE TABLE "EncryptionKey" (
  id              UUID PRIMARY KEY,
  keyId           VARCHAR(255) UNIQUE NOT NULL,
  keyArn          VARCHAR(500),           -- AWS KMS ARN
  keyVaultUrl     VARCHAR(500),           -- Azure Key Vault URL
  keyName         VARCHAR(255),           -- Azure Key Vault key name
  type            VARCHAR(50) DEFAULT 'DATA_ENCRYPTION',
  provider        VARCHAR(50) DEFAULT 'LOCAL',
  algorithm       VARCHAR(50) DEFAULT 'aes-256-gcm',
  status          VARCHAR(50) DEFAULT 'ACTIVE',
  version         INTEGER DEFAULT 1,
  isActive        BOOLEAN DEFAULT true,
  createdAt       TIMESTAMP DEFAULT NOW(),
  expiresAt       TIMESTAMP NOT NULL,
  lastRotatedAt   TIMESTAMP,
  nextRotationAt  TIMESTAMP NOT NULL,
  rotationDays    INTEGER DEFAULT 90,
  usageCount      INTEGER DEFAULT 0,
  lastUsedAt      TIMESTAMP,
  updatedAt       TIMESTAMP DEFAULT NOW()
);
```

### KeyAuditLog

Tracks all key management events for compliance.

```sql
CREATE TABLE "KeyAuditLog" (
  id              UUID PRIMARY KEY,
  keyId           UUID REFERENCES "EncryptionKey"(id),
  eventType       VARCHAR(100) NOT NULL,
  usageType       VARCHAR(50),
  success         BOOLEAN DEFAULT true,
  errorMessage    TEXT,
  metadata        JSONB,
  userId          UUID,
  ipAddress       VARCHAR(45),
  userAgent       TEXT,
  timestamp       TIMESTAMP DEFAULT NOW()
);
```

### KeyAccessLog

Detailed audit trail for all key usage operations.

```sql
CREATE TABLE "KeyAccessLog" (
  id              UUID PRIMARY KEY,
  keyId           UUID REFERENCES "EncryptionKey"(id),
  action          VARCHAR(50) NOT NULL,
  success         BOOLEAN DEFAULT true,
  errorMessage    TEXT,
  userId          UUID,
  ipAddress       VARCHAR(45),
  userAgent       TEXT,
  durationMs      INTEGER,
  dataSize        INTEGER,
  timestamp       TIMESTAMP DEFAULT NOW(),
  metadata        JSONB
);
```

## Key Rotation Policy

### Automatic Rotation

Keys are automatically rotated every 90 days:

1. **Day 0**: Key created with 90-day expiration
2. **Day 83**: Warning notification sent (7 days before expiration)
3. **Day 90**: Automatic rotation triggered
   - New key created and marked as ACTIVE
   - Old key marked as EXPIRED
   - Old key retained for decrypting existing data
4. **Day 455** (365 days after expiration): Old key eligible for deletion

### Manual Rotation

Keys can be manually rotated at any time:

```bash
npm run rotate:keys
```

Or via API:

```bash
curl -X POST http://localhost:5000/api/admin/keys/{keyId}/rotate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Rotation Process

1. Verify old key exists and is active
2. Mark old key as ROTATING
3. Create new key with same configuration
4. Mark new key as ACTIVE
5. Mark old key as EXPIRED
6. Log rotation event
7. Update all references to use new key

## Monitoring and Alerts

### Key Expiry Warnings

The system sends warnings when keys are expiring within 7 days:

- Daily check at 9:00 AM UTC
- Notifications sent to administrators
- Dashboard displays expiring keys

### Usage Monitoring

The system monitors key usage patterns every 6 hours:

- High failure rate detection (>100 failed operations)
- Inactive key detection (>30 days without use)
- Anomaly detection for unusual usage patterns

### Audit Logging

All key operations are logged:

- Key creation, rotation, deletion
- Encryption and decryption operations
- Failed operations with error messages
- User context (user ID, IP address, user agent)
- Performance metrics (duration, data size)

## Security Best Practices

### 1. Use Cloud Key Management

Always use AWS KMS or Azure Key Vault in production:

- Keys are stored in hardware security modules (HSMs)
- Keys never leave the cloud provider's infrastructure
- Automatic key backup and disaster recovery
- Compliance certifications (FIPS 140-2, etc.)

### 2. Implement Least Privilege

Restrict key management permissions:

- Only administrators can create/rotate/delete keys
- Application services can only encrypt/decrypt
- Use separate keys for different data types
- Implement key usage policies

### 3. Monitor Key Usage

Regularly review key usage logs:

- Check for unusual access patterns
- Monitor failed operation rates
- Review key access by user and IP
- Set up alerts for suspicious activity

### 4. Rotate Keys Regularly

Follow the 90-day rotation policy:

- Automate rotation with cron jobs
- Test rotation process regularly
- Maintain old keys for data decryption
- Document rotation procedures

### 5. Audit Compliance

Maintain comprehensive audit trails:

- Log all key operations
- Retain logs for required period (7 years)
- Provide audit reports for compliance
- Implement log integrity protection

## Troubleshooting

### Key Rotation Failures

If key rotation fails:

1. Check provider connectivity (AWS KMS, Azure Key Vault)
2. Verify credentials and permissions
3. Review error logs in KeyAuditLog table
4. Manually create new key if needed
5. Update application to use new key

### Encryption Failures

If encryption operations fail:

1. Verify key exists and is ACTIVE
2. Check provider connectivity
3. Review key permissions
4. Check for rate limiting
5. Review error logs

### High Failure Rates

If seeing high failure rates:

1. Check provider service status
2. Verify network connectivity
3. Review rate limits and quotas
4. Check for invalid data formats
5. Review application logs

## Compliance

The Key Management System meets the following compliance requirements:

### Requirement 15.5: Key Management

- ✅ Integration with AWS KMS or Azure Key Vault
- ✅ Automatic key rotation every 90 days
- ✅ Comprehensive key usage tracking
- ✅ Full audit logging for all operations
- ✅ Key lifecycle management
- ✅ Secure key storage and access control

### Additional Compliance Features

- **GDPR**: Encryption of personal data at rest
- **HIPAA**: Secure key management for healthcare data
- **PCI DSS**: Key rotation and access logging
- **SOX**: Audit trail for financial data encryption
- **ISO 27001**: Information security management

## Performance

### Encryption Performance

- AWS KMS: ~50-100ms per operation
- Azure Key Vault: ~50-100ms per operation
- Local: ~1-5ms per operation (development only)

### Optimization Tips

1. **Batch Operations**: Encrypt multiple fields in one call
2. **Caching**: Cache decrypted data when appropriate
3. **Async Operations**: Use async/await for non-blocking operations
4. **Connection Pooling**: Reuse provider connections
5. **Monitoring**: Track operation duration and optimize slow operations

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review audit logs for error details
3. Check provider service status
4. Contact system administrators
5. Review AWS KMS or Azure Key Vault documentation

## References

- [AWS KMS Documentation](https://docs.aws.amazon.com/kms/)
- [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)
- [NIST Key Management Guidelines](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
