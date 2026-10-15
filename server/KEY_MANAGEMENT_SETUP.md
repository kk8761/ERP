# Key Management Setup Guide

This guide explains how to set up and configure the Key Management Service for NexaERP.

## Overview

The Key Management Service provides enterprise-grade encryption key management with support for:
- **AWS KMS** (Key Management Service)
- **Azure Key Vault**
- **Local storage** (development only)

Features:
- Automatic key rotation every 90 days
- Key usage tracking and audit logging
- Multiple key purposes (data encryption, token signing, database encryption, file encryption)
- Comprehensive API for key lifecycle management

## Prerequisites

### For AWS KMS

1. AWS Account with KMS access
2. IAM user with the following permissions:
   - `kms:CreateKey`
   - `kms:DescribeKey`
   - `kms:Encrypt`
   - `kms:Decrypt`
   - `kms:EnableKeyRotation`
   - `kms:GetKeyRotationStatus`
   - `kms:ScheduleKeyDeletion`

### For Azure Key Vault

1. Azure subscription
2. Azure Key Vault instance
3. Service Principal or Managed Identity with permissions:
   - `Key Vault Crypto Officer` role
   - Or custom role with: `keys/create`, `keys/encrypt`, `keys/decrypt`, `keys/read`

## Environment Configuration

### Option 1: AWS KMS

Add to your `.env` file:

```env
# Key Management Configuration
KEY_PROVIDER=aws-kms
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
```

### Option 2: Azure Key Vault

Add to your `.env` file:

```env
# Key Management Configuration
KEY_PROVIDER=azure-keyvault
AZURE_KEY_VAULT_URL=https://your-vault-name.vault.azure.net/

# Azure authentication (one of the following):
# Option A: Service Principal
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
AZURE_TENANT_ID=your_tenant_id

# Option B: Managed Identity (when running in Azure)
# No additional credentials needed
```

### Option 3: Local Storage (Development Only)

Add to your `.env` file:

```env
# Key Management Configuration
KEY_PROVIDER=local
```

**⚠️ WARNING:** Local storage is NOT secure for production use. Keys are stored on the filesystem.

## Installation

1. **Install dependencies** (already included in package.json):
   ```bash
   npm install
   ```

2. **Initialize Key Management Service**:
   ```bash
   npm run init:key-management
   ```

   This will:
   - Initialize the key management service
   - Create keys for all purposes (data encryption, token signing, database encryption, file encryption)
   - Display key information and rotation schedule

## Key Rotation

### Manual Rotation

Rotate keys manually:

```bash
npm run rotate:keys
```

### Automated Rotation (Recommended)

Set up a cron job to rotate keys automatically:

**Linux/macOS:**

```bash
# Edit crontab
crontab -e

# Add this line to run daily at 2 AM
0 2 * * * cd /path/to/nexaerp/server && npm run rotate:keys >> /var/log/nexaerp-key-rotation.log 2>&1
```

**Windows (Task Scheduler):**

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Daily at 2:00 AM
4. Action: Start a program
5. Program: `npm`
6. Arguments: `run rotate:keys`
7. Start in: `C:\path\to\nexaerp\server`

## API Endpoints

All endpoints require authentication and admin role.

### Get Dashboard
```http
GET /api/key-management/dashboard
```

Returns overview of all keys, rotation schedule, and statistics.

### List All Keys
```http
GET /api/key-management/keys
```

### Get Key Details
```http
GET /api/key-management/keys/:keyId
```

### Create New Key
```http
POST /api/key-management/keys
Content-Type: application/json

{
  "purpose": "data-encryption",
  "algorithm": "AES-256-GCM"
}
```

**Valid purposes:**
- `data-encryption`
- `token-signing`
- `database-encryption`
- `file-encryption`

### Rotate Key
```http
POST /api/key-management/keys/:keyId/rotate
```

### Disable Key
```http
POST /api/key-management/keys/:keyId/disable
```

### Delete Key
```http
DELETE /api/key-management/keys/:keyId
```

Note: Only disabled or expired keys can be deleted.

### Get Key Usage Statistics
```http
GET /api/key-management/keys/:keyId/usage
```

### Get Rotation Schedule
```http
GET /api/key-management/rotation-schedule
```

### Get Active Key for Purpose
```http
GET /api/key-management/active-key/:purpose
```

## Usage in Application Code

### Encrypt Data

```typescript
import { keyManagementService, KeyPurpose } from './services/KeyManagementService';

// Get active key for data encryption
const key = keyManagementService.getActiveKeyForPurpose(KeyPurpose.DATA_ENCRYPTION);

if (!key) {
  throw new Error('No active encryption key available');
}

// Encrypt data
const plaintext = Buffer.from('sensitive data', 'utf-8');
const ciphertext = await keyManagementService.encryptData(key.id, plaintext);

// Store ciphertext and key ID together
const encryptedRecord = {
  data: ciphertext.toString('base64'),
  keyId: key.id,
};
```

### Decrypt Data

```typescript
import { keyManagementService } from './services/KeyManagementService';

// Retrieve encrypted record
const encryptedRecord = {
  data: 'base64_encoded_ciphertext',
  keyId: 'key-uuid',
};

// Decrypt data
const ciphertext = Buffer.from(encryptedRecord.data, 'base64');
const plaintext = await keyManagementService.decryptData(
  encryptedRecord.keyId,
  ciphertext
);

const decryptedData = plaintext.toString('utf-8');
```

## Key Lifecycle

1. **Creation**: Keys are created with a 90-day expiration
2. **Active**: Key is used for encryption and decryption
3. **Rotation**: After 90 days, a new key is created and the old key is marked as expired
4. **Expired**: Old keys are kept for decrypting existing data but not used for new encryption
5. **Disabled**: Keys can be manually disabled if compromised
6. **Deleted**: Expired or disabled keys can be soft-deleted (metadata retained)

## Monitoring

### Check Key Status

```bash
# View all keys and their status
npm run init:key-management
```

### View Rotation Schedule

Access the dashboard endpoint or run:

```bash
npm run rotate:keys
```

This will show upcoming rotations without performing them.

### Key Usage Logs

Key usage is logged to `keys/key-usage.log`:

```json
{"keyId":"uuid","operation":"encrypt","timestamp":"2024-01-01T00:00:00.000Z","success":true}
{"keyId":"uuid","operation":"decrypt","timestamp":"2024-01-01T00:01:00.000Z","success":true}
```

## Security Best Practices

1. **Never commit keys to version control**
   - Add `keys/` directory to `.gitignore`
   - Use environment variables for cloud provider credentials

2. **Use cloud KMS in production**
   - AWS KMS or Azure Key Vault provide hardware security modules (HSM)
   - Automatic key rotation and audit logging
   - Compliance certifications (FIPS 140-2, etc.)

3. **Rotate keys regularly**
   - Set up automated rotation (cron job)
   - Monitor rotation schedule
   - Test key rotation in staging environment

4. **Monitor key usage**
   - Review key usage logs regularly
   - Set up alerts for unusual activity
   - Track failed decryption attempts

5. **Restrict access**
   - Only admins should access key management endpoints
   - Use separate AWS/Azure accounts for production
   - Enable MFA for cloud provider access

6. **Backup and disaster recovery**
   - Keys are automatically backed up in cloud KMS
   - For local keys, ensure `keys/` directory is backed up securely
   - Test key recovery procedures

## Troubleshooting

### "Master key not initialized"

Run initialization:
```bash
npm run init:key-management
```

### "AWS KMS client not initialized"

Check environment variables:
- `KEY_PROVIDER=aws-kms`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### "Azure Key Vault client not initialized"

Check environment variables:
- `KEY_PROVIDER=azure-keyvault`
- `AZURE_KEY_VAULT_URL`
- Azure authentication credentials

### "No active key found for purpose"

Create a key for the purpose:
```bash
npm run init:key-management
```

Or via API:
```bash
curl -X POST http://localhost:5000/api/key-management/keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"purpose":"data-encryption"}'
```

### Key rotation fails

1. Check cloud provider credentials
2. Verify IAM/RBAC permissions
3. Check network connectivity
4. Review error logs

## Compliance

The Key Management Service helps meet compliance requirements:

- **GDPR**: Encryption at rest with key rotation
- **HIPAA**: Secure key management and audit logging
- **PCI DSS**: Key rotation every 90 days, usage tracking
- **SOC 2**: Comprehensive audit logs and access controls

## Support

For issues or questions:
1. Check logs in `keys/key-usage.log`
2. Review error messages in console output
3. Verify environment configuration
4. Contact system administrator

## References

- [AWS KMS Documentation](https://docs.aws.amazon.com/kms/)
- [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)
- [NIST Key Management Guidelines](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
