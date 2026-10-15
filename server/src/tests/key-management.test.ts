import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { KeyManagementService, KeyProvider } from '../services/KeyManagementService';

/**
 * Key Management Service Tests
 * 
 * Tests key management functionality including:
 * - Key generation
 * - Key rotation
 * - Usage tracking
 * - Provider integration
 * 
 * Requirements: 15.5
 */

describe('KeyManagementService', () => {
  let kms: KeyManagementService;

  beforeAll(async () => {
    kms = KeyManagementService.getInstance();
    await kms.initialize();
  });

  describe('Key Generation', () => {
    it('should generate a new data encryption key', async () => {
      const result = await kms.generateDataKey();

      expect(result).toHaveProperty('keyId');
      expect(result).toHaveProperty('key');
      expect(result.keyId).toBeTruthy();
      expect(result.key).toBeInstanceOf(Buffer);
      expect(result.key.length).toBe(32); // 256-bit key
    });

    it('should store key metadata after generation', async () => {
      const { keyId } = await kms.generateDataKey();
      const metadata = kms.getKeyMetadata(keyId);

      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe(keyId);
      expect(metadata?.isActive).toBe(true);
      expect(metadata?.usageCount).toBe(0);
      expect(metadata?.version).toBe(1);
    });

    it('should set expiration date based on rotation policy', async () => {
      const policy = kms.getRotationPolicy();
      const { keyId } = await kms.generateDataKey();
      const metadata = kms.getKeyMetadata(keyId);

      expect(metadata).toBeDefined();
      
      const expectedExpiry = new Date(
        metadata!.createdAt.getTime() + policy.rotationIntervalDays * 24 * 60 * 60 * 1000
      );
      
      // Allow 1 second tolerance
      const timeDiff = Math.abs(metadata!.expiresAt.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(1000);
    });
  });

  describe('Key Rotation', () => {
    it('should rotate an active key', async () => {
      const { keyId: oldKeyId } = await kms.generateDataKey();
      const result = await kms.rotateKey(oldKeyId);

      expect(result).toHaveProperty('keyId');
      expect(result).toHaveProperty('key');
      expect(result.keyId).not.toBe(oldKeyId);

      const oldMetadata = kms.getKeyMetadata(oldKeyId);
      const newMetadata = kms.getKeyMetadata(result.keyId);

      expect(oldMetadata?.isActive).toBe(false);
      expect(oldMetadata?.rotatedAt).toBeDefined();
      expect(newMetadata?.isActive).toBe(true);
    });

    it('should identify keys needing rotation', async () => {
      // Create a key that expires soon
      const { keyId } = await kms.generateDataKey();
      const metadata = kms.getKeyMetadata(keyId);
      
      if (metadata) {
        // Manually set expiration to 5 days from now
        metadata.expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      }

      const keysNeedingRotation = kms.getKeysNeedingRotation();
      const needsRotation = keysNeedingRotation.some(k => k.id === keyId);

      expect(needsRotation).toBe(true);
    });
  });

  describe('Key Usage Tracking', () => {
    it('should track key usage during encryption', async () => {
      const { keyId, key } = await kms.generateDataKey();
      
      // Simulate encryption operations
      await kms.encryptKey(key, keyId);
      await kms.encryptKey(key, keyId);

      const metadata = kms.getKeyMetadata(keyId);
      expect(metadata?.usageCount).toBeGreaterThanOrEqual(2);
      expect(metadata?.lastUsedAt).toBeDefined();
    });

    it('should track key usage during decryption', async () => {
      const { keyId, key } = await kms.generateDataKey();
      
      // Simulate decryption operations
      const encrypted = await kms.encryptKey(key, keyId);
      await kms.decryptKey(encrypted, keyId);

      const metadata = kms.getKeyMetadata(keyId);
      expect(metadata?.usageCount).toBeGreaterThanOrEqual(2);
    });

    it('should log key operations', async () => {
      const { keyId } = await kms.generateDataKey();
      const logs = kms.getKeyUsageLogs(keyId);

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toHaveProperty('keyId');
      expect(logs[0]).toHaveProperty('operation');
      expect(logs[0]).toHaveProperty('timestamp');
      expect(logs[0]).toHaveProperty('success');
    });

    it('should calculate usage statistics', async () => {
      const { keyId, key } = await kms.generateDataKey();
      
      // Perform some operations
      await kms.encryptKey(key, keyId);
      await kms.encryptKey(key, keyId);
      const encrypted = await kms.encryptKey(key, keyId);
      await kms.decryptKey(encrypted, keyId);

      const stats = kms.getKeyUsageStats(keyId);

      expect(stats.totalUsage).toBeGreaterThanOrEqual(4);
      expect(stats.encryptOperations).toBeGreaterThanOrEqual(3);
      expect(stats.decryptOperations).toBeGreaterThanOrEqual(1);
      expect(stats.lastUsed).toBeDefined();
      expect(stats.averageUsagePerDay).toBeGreaterThan(0);
    });
  });

  describe('Rotation Policy', () => {
    it('should get current rotation policy', () => {
      const policy = kms.getRotationPolicy();

      expect(policy).toHaveProperty('enabled');
      expect(policy).toHaveProperty('rotationIntervalDays');
      expect(policy).toHaveProperty('autoRotate');
      expect(policy).toHaveProperty('notifyBeforeDays');
      expect(policy.rotationIntervalDays).toBe(90);
    });

    it('should update rotation policy', () => {
      const newPolicy = {
        enabled: true,
        rotationIntervalDays: 60,
        autoRotate: false,
        notifyBeforeDays: 14,
      };

      kms.updateRotationPolicy(newPolicy);
      const policy = kms.getRotationPolicy();

      expect(policy.rotationIntervalDays).toBe(60);
      expect(policy.autoRotate).toBe(false);
      expect(policy.notifyBeforeDays).toBe(14);

      // Reset to default
      kms.updateRotationPolicy({
        rotationIntervalDays: 90,
        autoRotate: true,
        notifyBeforeDays: 7,
      });
    });
  });

  describe('Provider Information', () => {
    it('should return provider information', () => {
      const info = kms.getProviderInfo();

      expect(info).toHaveProperty('provider');
      expect(info).toHaveProperty('isProduction');
      expect(info).toHaveProperty('features');
      expect(Array.isArray(info.features)).toBe(true);
      expect(info.features.length).toBeGreaterThan(0);
    });

    it('should identify local provider in test environment', () => {
      const info = kms.getProviderInfo();

      // In test environment without AWS/Azure credentials, should use local
      expect(info.provider).toBe(KeyProvider.LOCAL);
      expect(info.isProduction).toBe(false);
    });
  });

  describe('Key Metadata Management', () => {
    it('should retrieve all keys metadata', async () => {
      await kms.generateDataKey();
      await kms.generateDataKey();

      const allKeys = kms.getAllKeysMetadata();

      expect(Array.isArray(allKeys)).toBe(true);
      expect(allKeys.length).toBeGreaterThanOrEqual(2);
      expect(allKeys[0]).toHaveProperty('id');
      expect(allKeys[0]).toHaveProperty('provider');
      expect(allKeys[0]).toHaveProperty('createdAt');
      expect(allKeys[0]).toHaveProperty('expiresAt');
    });

    it('should retrieve specific key metadata', async () => {
      const { keyId } = await kms.generateDataKey();
      const metadata = kms.getKeyMetadata(keyId);

      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe(keyId);
    });

    it('should return undefined for non-existent key', () => {
      const metadata = kms.getKeyMetadata('non-existent-key-id');
      expect(metadata).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should log failed operations', async () => {
      const invalidKeyId = 'invalid-key-id';
      
      try {
        await kms.decryptKey(Buffer.from('invalid'), invalidKeyId);
      } catch (error) {
        // Expected to fail
      }

      const logs = kms.getKeyUsageLogs(invalidKeyId);
      const failedLogs = logs.filter(log => !log.success);

      expect(failedLogs.length).toBeGreaterThan(0);
      expect(failedLogs[0].errorMessage).toBeDefined();
    });

    it('should prevent deletion of active keys', async () => {
      const { keyId } = await kms.generateDataKey();

      await expect(kms.deleteKey(keyId)).rejects.toThrow(
        'Cannot delete active key'
      );
    });
  });

  describe('Key Lifecycle', () => {
    it('should complete full key lifecycle', async () => {
      // 1. Generate key
      const { keyId: key1 } = await kms.generateDataKey();
      let metadata = kms.getKeyMetadata(key1);
      expect(metadata?.isActive).toBe(true);

      // 2. Use key
      const { key } = await kms.generateDataKey();
      await kms.encryptKey(key, key1);
      metadata = kms.getKeyMetadata(key1);
      expect(metadata?.usageCount).toBeGreaterThan(0);

      // 3. Rotate key
      const { keyId: key2 } = await kms.rotateKey(key1);
      metadata = kms.getKeyMetadata(key1);
      expect(metadata?.isActive).toBe(false);
      expect(metadata?.rotatedAt).toBeDefined();

      const newMetadata = kms.getKeyMetadata(key2);
      expect(newMetadata?.isActive).toBe(true);

      // 4. Delete old key
      await kms.deleteKey(key1);
      const deletedMetadata = kms.getKeyMetadata(key1);
      expect(deletedMetadata).toBeUndefined();
    });
  });
});

/**
 * Integration Tests for AWS KMS
 * 
 * These tests require AWS credentials and KMS key ID to be configured.
 * Skip if not in AWS environment.
 */
describe('AWS KMS Integration', () => {
  const hasAWSConfig = process.env.AWS_KMS_KEY_ID && process.env.AWS_ACCESS_KEY_ID;

  it.skipIf(!hasAWSConfig)('should initialize with AWS KMS provider', async () => {
    const kms = KeyManagementService.getInstance();
    const info = kms.getProviderInfo();

    expect(info.provider).toBe(KeyProvider.AWS_KMS);
    expect(info.isProduction).toBe(true);
    expect(info.features).toContain('Hardware Security Module (HSM)');
  });

  it.skipIf(!hasAWSConfig)('should generate key using AWS KMS', async () => {
    const kms = KeyManagementService.getInstance();
    const result = await kms.generateDataKey();

    expect(result.keyId).toBeTruthy();
    expect(result.key).toBeInstanceOf(Buffer);
    expect(result.key.length).toBe(32);
  });
});

/**
 * Integration Tests for Azure Key Vault
 * 
 * These tests require Azure credentials and Key Vault URL to be configured.
 * Skip if not in Azure environment.
 */
describe('Azure Key Vault Integration', () => {
  const hasAzureConfig = process.env.AZURE_KEY_VAULT_URL;

  it.skipIf(!hasAzureConfig)('should initialize with Azure Key Vault provider', async () => {
    const kms = KeyManagementService.getInstance();
    const info = kms.getProviderInfo();

    expect(info.provider).toBe(KeyProvider.AZURE_KEY_VAULT);
    expect(info.isProduction).toBe(true);
    expect(info.features).toContain('Hardware Security Module (HSM)');
  });

  it.skipIf(!hasAzureConfig)('should generate key using Azure Key Vault', async () => {
    const kms = KeyManagementService.getInstance();
    const result = await kms.generateDataKey();

    expect(result.keyId).toBeTruthy();
    expect(result.key).toBeInstanceOf(Buffer);
    expect(result.key.length).toBe(32);
  });
});
