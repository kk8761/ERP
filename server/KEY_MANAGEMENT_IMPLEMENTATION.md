# Key Management Implementation

## Overview

This document describes the implementation of enterprise-grade key management for NexaERP, providing secure encryption key storage, automatic rotation, and comprehensive usage tracking with support for AWS KMS and Azure Key Vault.

## Requirements Fulfilled

**Requirement 15.5: Key Management**

1. ✅ **Integrate with AWS KMS or Azure Key Vault**
   - AWS KMS integration with SDK v3
   - Azure Key Vault integration with Azure SDK
   - Automatic provider detection based on environment
   - Fallback to local storage for development

2. ✅ **Implement key rotation every 90 days**
   - Automatic key rotation scheduler
   - Configurable rotation interval (default: 90 days)
   - Manual rotation API endpoint
   - Notification before key expiration

3. ✅ **Track key usage and access**
   - Comprehensive usage logging
   - Operation tracking (encrypt, decrypt, rotate, create, delete)
   - Usage statistics and analytics
   - Audit trail for compliance

## Architecture

### Key Management Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Key Management Service                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Provider Layer                                     │     │
│  │  - AWS KMS Client                                   │     │
│  │  - Azure Key Vault Client                          │     │
│  │  - Local Storage (Development)                     │     │
│  └────────────────────┬───────────────────────────────┘     │
│                       │                                       │
│  ┌────────────────────┴───────────────────────────────┐     │
│  │  Key Operations                                     │     │
│  │  - generateDataKey()                                │     │
│  │  - encryptKey() / decryptKey()                     │     │
│  │  - rotateKey()                                      │     │
│  │  - deleteKey()                                      │     │
│  └────────────────────┬───────────────────────────────┘     │
│                       │                                       │
│  ┌────────────────────┴───────────────────────────────┐     │
│  │  Metadata Management                                │     │
│  │  - Key metadata storage                             │     │
│  │  - Usage tracking                                   │     │
│  │  - Expiration monitoring                            │     │
│  └────────────────────┬───────────────────────────────┘     │
│                       │                                       │
│  ┌────────────────────┴───────────────────────────────┐     │
│  │  Rotation Scheduler                                 │     │
│  │  - Automatic rotation (every 24 hours check)       │     │
│  │  - Expiration notifications                         │     │
│  │  - Policy enforcement                               │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Lifecycle

```
┌──────────────┐
│   Generate   │
│     Key      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Store Key   │
│  Metadata    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Use Key    │◄──────┐
│  (Encrypt/   │       │
│   Decrypt)   │       │
└──────┬───────┘       │
       │               │
       ▼               │
┌──────────────┐       │
│ Track Usage  │───────┘
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Monitor for  │
│  Expiration  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Rotate Key  │
│ (90 days or  │
│   manual)    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Deactivate   │
│   Old Key    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Delete Key  │
│ (after grace │
│   period)    │
└──────────────┘
```

## Components

### 1. KeyManagementService

**Location**: `server/src/services/KeyManagementService.ts`

**Purpose**: Core service for managing encryption keys with multi-provider support.

**Key Features**:
- Singleton pattern for centralized key management
- Multi-provider support (AWS KMS, Azure Key Vault, Local)
- Automatic provider detection
- Key generation and rotation
- Usage tracking and auditing
- Rotation policy management

**Key Methods**:

```typescript
// Initialize service
async initialize(): Promise<void>

// Generate new data encryption key
async generateDataKey(): Promise<{ keyId: string; key: Buffer }>

// Encrypt/decrypt keys (key wrapping)
async encryptKey(plainKey: Buffer, keyId: string): Promise<Buffer>
async decryptKey(encryptedKey: Buffer, keyId: string): Promise<Buffer>

// Rotate encryption key
async rotateKey(oldKeyId: string): Promise<{ keyId: string; key: Buffer }>

// Delete key (schedule for deletion)
async deleteKey(keyId: string): Promise<void>

// Get key metadata and statistics
getKeyMetadata(keyId: string): KeyMetadata | undefined
getAllKeysMetadata(): KeyMetadata[]
getKeyUsageLogs(keyId?: string, limit?: number): KeyUsageLog[]
getKeyUsageStats(keyId: string): UsageStats

// Rotation management
getKeysNeedingRotation(): KeyMetadata[]
updateRotationPolicy(policy: Partial<KeyRotationPolicy>): void
getRotationPolicy(): KeyRotationPolicy

// Provider information
getProviderInfo(): ProviderInfo
```

### 2. KeyManagementController

**Location**: `server/src/controllers/KeyManagementController.ts`

**Purpose**: HTTP request handlers for key management operations.

**Endpoints**:

```typescript
GET    /api/keys                    - Get all keys metadata
GET    /api/keys/:keyId             - Get specific key metadata
GET    /api/keys/:keyId/usage       - Get key usage logs
POST   /api/keys/:keyId/rotate      - Rotate encryption key
DELETE /api/keys/:keyId             - Delete key
GET    /api/keys/rotation/needed    - Get keys needing rotation
GET    /api/keys/rotation/policy    - Get rotation policy
PUT    /api/keys/rotation/policy    - Update rotation policy
GET    /api/keys/usage/all          - Get all key usage logs
POST   /api/keys/generate           - Generate new key
GET    /api/keys/provider/info      - Get provider information
GET    /api/keys/dashboard          - Get dashboard data
```

### 3. Key Management Routes

**Location**: `server/src/routes/keyManagementRoutes.ts`

**Purpose**: Route definitions with authentication middleware.

**Security**:
- All routes require authentication
- Admin role required (to be implemented)
- Audit logging for all operations

## Data Models

### KeyMetadata

```typescript
interface KeyMetadata {
  id: string;                    // Unique key identifier
  provider: KeyProvider;         // AWS_KMS, AZURE_KEY_VAULT, or LOCAL
  createdAt: Date;              // Key creation timestamp
  expiresAt: Date;              // Key expiration timestamp
  rotatedAt?: Date;             // Last rotation timestamp
  isActive: boolean;            // Whether key is currently active
  usageCount: number;           // Total number of operations
  lastUsedAt?: Date;            // Last usage timestamp
  version: number;              // Key version number
  arn?: string;                 // AWS KMS ARN (if applicable)
  vaultUrl?: string;            // Azure Key Vault URL (if applicable)
}
```

### KeyUsageLog

```typescript
interface KeyUsageLog {
  keyId: string;                           // Key identifier
  operation: 'encrypt' | 'decrypt' |       // Operation type
             'rotate' | 'create' | 'delete';
  timestamp: Date;                         // Operation timestamp
  userId?: string;                         // User who performed operation
  ipAddress?: string;                      // IP address of request
  success: boolean;                        // Whether operation succeeded
  errorMessage?: string;                   // Error message if failed
}
```

### KeyRotationPolicy

```typescript
interface KeyRotationPolicy {
  enabled: boolean;              // Whether rotation is enabled
  rotationIntervalDays: number;  // Days between rotations (default: 90)
  autoRotate: boolean;           // Whether to auto-rotate
  notifyBeforeDays: number;      // Days before expiry to notify (default: 7)
}
```

## Provider Integration

### AWS KMS Integration

**Setup**:

1. Install AWS SDK:
```bash
npm install @aws-sdk/client-kms
```

2. Configure environment variables:
```bash
AWS_KMS_KEY_ID=your-kms-key-id
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

3. The service will automatically detect and use AWS KMS.

**Features**:
- Hardware Security Module (HSM) backed
- FIPS 140-2 Level 2 validated
- Automatic key rotation support
- CloudTrail audit logging
- IAM-based access control

**Key Operations**:
```typescript
// Generate data key
const command = new GenerateDataKeyCommand({
  KeyId: process.env.AWS_KMS_KEY_ID,
  KeySpec: 'AES_256',
});

// Encrypt
const encryptCommand = new EncryptCommand({
  KeyId: process.env.AWS_KMS_KEY_ID,
  Plaintext: plaintext,
});

// Decrypt
const decryptCommand = new DecryptCommand({
  CiphertextBlob: ciphertext,
});
```

### Azure Key Vault Integration

**Setup**:

1. Install Azure SDK:
```bash
npm install @azure/keyvault-secrets @azure/identity
```

2. Configure environment variables:
```bash
AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
```

3. The service will automatically detect and use Azure Key Vault.

**Features**:
- Hardware Security Module (HSM) backed
- FIPS 140-2 Level 2 validated
- Automatic key rotation support
- Azure Monitor audit logging
- Azure RBAC access control

**Key Operations**:
```typescript
// Initialize client
const credential = new DefaultAzureCredential();
const client = new SecretClient(vaultUrl, credential);

// Store key
await client.setSecret(keyId, key.toString('base64'));

// Retrieve key
const secret = await client.getSecret(keyId);
```

### Local Storage (Development Only)

**Setup**:
- No configuration required
- Automatically used if AWS/Azure not configured

**Features**:
- Filesystem-based storage
- Manual key rotation
- Basic audit logging
- **⚠ NOT FOR PRODUCTION USE**

## Key Rotation

### Automatic Rotation

The service includes an automatic rotation scheduler that:

1. Checks for expiring keys every 24 hours
2. Rotates keys that have expired
3. Sends notifications for keys expiring within 7 days
4. Maintains old keys for decryption of existing data

**Configuration**:
```typescript
// Update rotation policy
keyManagementService.updateRotationPolicy({
  enabled: true,
  rotationIntervalDays: 90,
  autoRotate: true,
  notifyBeforeDays: 7,
});
```

### Manual Rotation

Keys can be manually rotated via API:

```bash
POST /api/keys/:keyId/rotate
```

**Process**:
1. Generate new encryption key
2. Mark old key as inactive
3. Update metadata with rotation timestamp
4. Log rotation operation
5. Return new key ID

### Rotation Best Practices

1. **Never delete old keys immediately** - They're needed to decrypt existing data
2. **Re-encrypt data with new keys** - Gradually migrate to new keys
3. **Monitor rotation status** - Check dashboard for keys needing rotation
4. **Test rotation process** - Verify in staging before production
5. **Maintain key history** - Keep audit trail of all rotations

## Usage Tracking

### Tracked Operations

- **create**: Key generation
- **encrypt**: Key encryption (wrapping)
- **decrypt**: Key decryption (unwrapping)
- **rotate**: Key rotation
- **delete**: Key deletion

### Usage Logs

All operations are logged with:
- Key ID
- Operation type
- Timestamp
- User ID (if available)
- IP address (if available)
- Success/failure status
- Error message (if failed)

### Usage Statistics

For each key, the service tracks:
- Total usage count
- Encrypt operations count
- Decrypt operations count
- Last used timestamp
- Average usage per day

**Example**:
```typescript
const stats = keyManagementService.getKeyUsageStats(keyId);
console.log(stats);
// {
//   totalUsage: 1523,
//   encryptOperations: 892,
//   decryptOperations: 631,
//   lastUsed: 2026-05-26T10:30:00.000Z,
//   averageUsagePerDay: 16.9
// }
```

## API Usage Examples

### Get All Keys

```bash
GET /api/keys
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "keys": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "provider": "aws-kms",
        "createdAt": "2026-02-26T00:00:00.000Z",
        "expiresAt": "2026-05-27T00:00:00.000Z",
        "isActive": true,
        "usageCount": 1523,
        "lastUsedAt": "2026-05-26T10:30:00.000Z",
        "version": 1,
        "daysUntilExpiry": 1
      }
    ],
    "totalKeys": 1,
    "activeKeys": 1
  }
}
```

### Rotate Key

```bash
POST /api/keys/:keyId/rotate
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "message": "Key rotated successfully",
  "data": {
    "oldKeyId": "550e8400-e29b-41d4-a716-446655440000",
    "newKeyId": "660e8400-e29b-41d4-a716-446655440001"
  }
}
```

### Get Key Usage

```bash
GET /api/keys/:keyId/usage?limit=10
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "keyId": "550e8400-e29b-41d4-a716-446655440000",
        "operation": "encrypt",
        "timestamp": "2026-05-26T10:30:00.000Z",
        "success": true
      }
    ],
    "stats": {
      "totalUsage": 1523,
      "encryptOperations": 892,
      "decryptOperations": 631,
      "lastUsed": "2026-05-26T10:30:00.000Z",
      "averageUsagePerDay": 16.9
    },
    "total": 10
  }
}
```

### Update Rotation Policy

```bash
PUT /api/keys/rotation/policy
Authorization: Bearer <token>
Content-Type: application/json

{
  "rotationIntervalDays": 60,
  "notifyBeforeDays": 14
}
```

**Response**:
```json
{
  "success": true,
  "message": "Rotation policy updated successfully",
  "data": {
    "enabled": true,
    "rotationIntervalDays": 60,
    "autoRotate": true,
    "notifyBeforeDays": 14
  }
}
```

### Get Dashboard

```bash
GET /api/keys/dashboard
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalKeys": 5,
      "activeKeys": 1,
      "keysNeedingRotation": 1,
      "totalUsage": 7615,
      "successRate": "99.8%"
    },
    "provider": {
      "provider": "aws-kms",
      "isProduction": true,
      "features": [
        "Hardware Security Module (HSM)",
        "Automatic key rotation",
        "Audit logging via CloudTrail",
        "FIPS 140-2 Level 2 validated"
      ]
    },
    "policy": {
      "enabled": true,
      "rotationIntervalDays": 90,
      "autoRotate": true,
      "notifyBeforeDays": 7
    },
    "recentActivity": [...],
    "keysNeedingRotation": [...]
  }
}
```

## Integration with Encryption Service

The Key Management Service integrates with the existing Encryption Service:

```typescript
import { keyManagementService } from './services/KeyManagementService';
import { encryptionService } from './services/EncryptionService';

// Initialize both services
await keyManagementService.initialize();
await encryptionService.initialize();

// Generate new data encryption key
const { keyId, key } = await keyManagementService.generateDataKey();

// Use key with encryption service
const encrypted = encryptionService.encrypt('sensitive data');

// Track usage automatically
// keyManagementService tracks all encrypt/decrypt operations
```

## Security Considerations

### Access Control

1. **Authentication Required**: All endpoints require valid JWT token
2. **Admin Role Required**: Key management operations restricted to admins
3. **Audit Logging**: All operations logged for compliance
4. **IP Whitelisting**: Consider restricting access by IP (optional)

### Key Protection

1. **Never expose keys in logs**: Keys are never logged or returned in API responses
2. **Use HSM in production**: Always use AWS KMS or Azure Key Vault
3. **Encrypt keys at rest**: Keys stored locally are encrypted with master key
4. **Rotate regularly**: Follow 90-day rotation policy
5. **Monitor usage**: Track unusual access patterns

### Compliance

1. **FIPS 140-2**: AWS KMS and Azure Key Vault are FIPS validated
2. **SOX Compliance**: Audit trail for all key operations
3. **GDPR**: Key deletion support for data erasure
4. **PCI DSS**: Secure key management for payment data

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Key Expiration**: Alert when keys expire within 7 days
2. **Rotation Failures**: Alert on failed rotation attempts
3. **Usage Anomalies**: Alert on unusual usage patterns
4. **Provider Errors**: Alert on AWS/Azure API failures
5. **Audit Log Gaps**: Alert if logging fails

### Dashboard Metrics

- Total keys
- Active keys
- Keys needing rotation
- Total usage count
- Success rate
- Recent activity
- Provider status

## Testing

### Unit Tests

Run key management tests:
```bash
npm test -- key-management.test.ts
```

**Test Coverage**:
- Key generation
- Key rotation
- Usage tracking
- Rotation policy
- Provider integration
- Error handling
- Key lifecycle

### Integration Tests

**AWS KMS Tests**:
```bash
# Set AWS credentials
export AWS_KMS_KEY_ID=your-key-id
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key

# Run tests
npm test -- key-management.test.ts
```

**Azure Key Vault Tests**:
```bash
# Set Azure credentials
export AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
export AZURE_TENANT_ID=your-tenant-id
export AZURE_CLIENT_ID=your-client-id
export AZURE_CLIENT_SECRET=your-client-secret

# Run tests
npm test -- key-management.test.ts
```

## Deployment

### Environment Variables

**AWS KMS**:
```bash
AWS_KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**Azure Key Vault**:
```bash
AZURE_KEY_VAULT_URL=https://nexaerp-keyvault.vault.azure.net/
AZURE_TENANT_ID=12345678-1234-1234-1234-123456789012
AZURE_CLIENT_ID=12345678-1234-1234-1234-123456789012
AZURE_CLIENT_SECRET=your-client-secret
```

### Production Checklist

- [ ] Configure AWS KMS or Azure Key Vault
- [ ] Set up IAM/RBAC permissions
- [ ] Enable audit logging
- [ ] Configure rotation policy
- [ ] Set up monitoring and alerts
- [ ] Test key rotation process
- [ ] Document key recovery procedures
- [ ] Train operations team
- [ ] Implement backup procedures
- [ ] Review security policies

## Troubleshooting

### Common Issues

**Issue: "AWS KMS client not initialized"**
- **Cause**: Missing AWS credentials or KMS key ID
- **Solution**: Set AWS_KMS_KEY_ID, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY

**Issue: "Azure Key Vault client not initialized"**
- **Cause**: Missing Azure credentials or vault URL
- **Solution**: Set AZURE_KEY_VAULT_URL and Azure authentication credentials

**Issue: "Cannot delete active key"**
- **Cause**: Attempting to delete a key that is currently active
- **Solution**: Rotate to a new key first, then delete the old key

**Issue: "Key not found"**
- **Cause**: Trying to use a key that has been deleted
- **Solution**: Check key metadata and use an active key

### Recovery Procedures

**Lost Master Key**:
1. If master key is lost, encrypted keys cannot be recovered
2. Generate new master key
3. Generate new encryption keys
4. Re-encrypt all data with new keys

**Provider Outage**:
1. Service will fail gracefully
2. Implement retry logic with exponential backoff
3. Consider multi-region deployment
4. Maintain local cache of frequently used keys

## Future Enhancements

1. **Multi-Region Support**: Replicate keys across regions
2. **Key Versioning**: Support multiple versions of same key
3. **Key Sharing**: Share keys across tenants (with controls)
4. **Hardware Token Support**: Integrate with YubiKey, etc.
5. **Quantum-Resistant Algorithms**: Prepare for post-quantum cryptography
6. **Key Escrow**: Support for key recovery by authorized parties
7. **Automated Re-encryption**: Background job to re-encrypt data with new keys

## References

- [AWS KMS Documentation](https://docs.aws.amazon.com/kms/)
- [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)
- [NIST Key Management Guidelines](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [FIPS 140-2 Standard](https://csrc.nist.gov/publications/detail/fips/140/2/final)

---

## Conclusion

The Key Management Service provides enterprise-grade encryption key management with support for AWS KMS and Azure Key Vault, automatic 90-day rotation, and comprehensive usage tracking. The implementation fulfills all requirements for secure key management (Requirement 15.5) and provides a foundation for compliance with SOX, GDPR, PCI DSS, and other regulations.
