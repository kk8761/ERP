/**
 * Encryption at Rest Tests
 * Task 38.2: Comprehensive tests for encryption at rest implementation
 * 
 * Tests cover:
 * - AES-256-GCM encryption/decryption
 * - Transparent data encryption
 * - Key management and rotation
 * - Field-level encryption
 * - Security properties
 * - Performance benchmarks
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { EncryptionService } from '../services/encryption.service';
import { KeyManagementService, KeyType, KeyProvider } from '../services/key-management.service';
import { TransparentDataEncryption, FieldEncryption } from '../services/encryption.service';
import { keyRotationScheduler } from '../services/key-rotation.scheduler';
import prisma from '../config/prisma';

describe('Encryption at Rest - Task 38.2', () => {
  beforeAll(async () => {
    // Initialize encryption services
    await EncryptionService.initialize();
    await KeyManagementService.initialize(KeyProvider.LOCAL);
  });

  afterAll(async () => {
    // Cleanup
    await prisma.$disconnect();
  });

  describe('Requirement 15.3: AES-256 Encryption', () => {
    it('should encrypt data using AES-256-GCM algorithm', async () => {
      const plaintext = 'Sensitive customer data';
      const encrypted = await EncryptionService.encrypt(plaintext);

      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.ciphertext).toBeTruthy();
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.authTag).toBeTruthy();
      expect(encrypted.keyId).toBeTruthy();
    });

    it('should decrypt data correctly', async () => {
      const plaintext = 'Sensitive customer data';
      const encrypted = await EncryptionService.encrypt(plaintext);
      const decrypted = await EncryptionService.decrypt(encrypted);

      expect(decrypted.toString('utf8')).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', async () => {
      const plaintext = 'Same data';
      const encrypted1 = await EncryptionService.encrypt(plaintext);
      const encrypted2 = await EncryptionService.encrypt(plaintext);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      
      // But both should decrypt to same plaintext
      const decrypted1 = await EncryptionService.decrypt(encrypted1);
      const decrypted2 = await EncryptionService.decrypt(encrypted2);
      expect(decrypted1.toString('utf8')).toBe(plaintext);
      expect(decrypted2.toString('utf8')).toBe(plaintext);
    });

    it('should handle various data types', async () => {
      const testCases = [
        'Simple string',
        '{"json": "object"}',
        '12345',
        'Special chars: !@#$%^&*()',
        'Unicode: 你好世界 🌍',
        '',
        'A'.repeat(10000), // Large data
      ];

      for (const testCase of testCases) {
        const encrypted = await EncryptionService.encrypt(testCase);
        const decrypted = await EncryptionService.decrypt(encrypted);
        expect(decrypted.toString('utf8')).toBe(testCase);
      }
    });
  });

  describe('Requirement 15.3: Key Rotation (90 days)', () => {
    it('should create encryption keys with 90-day expiration', async () => {
      const key = await KeyManagementService.createKey(KeyType.DATA_ENCRYPTION, 90);

      const expiryDays = Math.floor(
        (key.expiresAt.getTime() - key.createdAt.getTime()) / (24 * 60 * 60 * 1000)
      );

      expect(expiryDays).toBe(90);
    });

    it('should rotate encryption keys', async () => {
      const oldStatus = await EncryptionService.getKeyStatus();
      const oldKeyId = oldStatus.currentKeyId;

      await EncryptionService.rotateEncryptionKey();

      const newStatus = await EncryptionService.getKeyStatus();
      const newKeyId = newStatus.currentKeyId;

      expect(newKeyId).not.toBe(oldKeyId);
      expect(newStatus.totalKeys).toBeGreaterThan(oldStatus.totalKeys);
    });

    it('should decrypt data encrypted with old key after rotation', async () => {
      const plaintext = 'Data before rotation';
      const encrypted = await EncryptionService.encrypt(plaintext);
      const oldKeyId = encrypted.keyId;

      // Rotate key
      await EncryptionService.rotateEncryptionKey();

      // Should still decrypt with old key
      const decrypted = await EncryptionService.decrypt(encrypted);
      expect(decrypted.toString('utf8')).toBe(plaintext);
      expect(encrypted.keyId).toBe(oldKeyId);
    });

    it('should encrypt new data with new key after rotation', async () => {
      const oldStatus = await EncryptionService.getKeyStatus();
      const oldKeyId = oldStatus.currentKeyId;

      await EncryptionService.rotateEncryptionKey();

      const plaintext = 'Data after rotation';
      const encrypted = await EncryptionService.encrypt(plaintext);

      expect(encrypted.keyId).not.toBe(oldKeyId);
    });

    it('should re-encrypt data with new key', async () => {
      const plaintext = 'Data to re-encrypt';
      const oldEncrypted = await EncryptionService.encrypt(plaintext);
      const oldKeyId = oldEncrypted.keyId;

      await EncryptionService.rotateEncryptionKey();

      const newEncrypted = await EncryptionService.reencrypt(oldEncrypted);

      expect(newEncrypted.keyId).not.toBe(oldKeyId);
      const decrypted = await EncryptionService.decrypt(newEncrypted);
      expect(decrypted.toString('utf8')).toBe(plaintext);
    });
  });

  describe('Transparent Data Encryption', () => {
    it('should encrypt sensitive fields in an object', async () => {
      const user = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        ssn: '123-45-6789',
        salary: 75000,
      };

      const encrypted = await TransparentDataEncryption.encryptFields(
        user,
        ['email', 'ssn']
      );

      expect(encrypted.id).toBe(user.id);
      expect(encrypted.name).toBe(user.name);
      expect(encrypted.salary).toBe(user.salary);
      expect(encrypted.email).not.toBe(user.email);
      expect(encrypted.ssn).not.toBe(user.ssn);
    });

    it('should decrypt sensitive fields in an object', async () => {
      const user = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        ssn: '123-45-6789',
      };

      const encrypted = await TransparentDataEncryption.encryptFields(
        user,
        ['email', 'ssn']
      );

      const decrypted = await TransparentDataEncryption.decryptFields(
        encrypted,
        ['email', 'ssn']
      );

      expect(decrypted).toEqual(user);
    });

    it('should handle null and undefined values', async () => {
      const data = {
        id: '123',
        email: null,
        phone: undefined,
        address: 'Some address',
      };

      const encrypted = await TransparentDataEncryption.encryptFields(
        data,
        ['email', 'phone', 'address']
      );

      expect(encrypted.email).toBeNull();
      expect(encrypted.phone).toBeUndefined();
      expect(encrypted.address).not.toBe(data.address);
    });

    it('should encrypt arrays of objects', async () => {
      const users = [
        { id: '1', email: 'user1@example.com' },
        { id: '2', email: 'user2@example.com' },
        { id: '3', email: 'user3@example.com' },
      ];

      const encrypted = await TransparentDataEncryption.encryptArray(users, ['email']);

      expect(encrypted).toHaveLength(3);
      encrypted.forEach((user, index) => {
        expect(user.id).toBe(users[index].id);
        expect(user.email).not.toBe(users[index].email);
      });

      const decrypted = await TransparentDataEncryption.decryptArray(encrypted, ['email']);
      expect(decrypted).toEqual(users);
    });
  });

  describe('Field-Level Encryption', () => {
    it('should encrypt credit card numbers', async () => {
      const cardNumber = '4532-1234-5678-9010';
      const encrypted = await FieldEncryption.encryptCreditCard(cardNumber);

      expect(encrypted).not.toBe(cardNumber);
      expect(encrypted).not.toContain('4532');

      const decrypted = await FieldEncryption.decryptCreditCard(encrypted);
      expect(decrypted).toBe('4532123456789010'); // Cleaned format
    });

    it('should encrypt SSN/Tax ID', async () => {
      const ssn = '123-45-6789';
      const encrypted = await FieldEncryption.encryptSSN(ssn);

      expect(encrypted).not.toBe(ssn);

      const decrypted = await FieldEncryption.decryptSSN(encrypted);
      expect(decrypted).toBe(ssn);
    });

    it('should encrypt bank account numbers', async () => {
      const accountNumber = '1234567890';
      const encrypted = await FieldEncryption.encryptBankAccount(accountNumber);

      expect(encrypted).not.toBe(accountNumber);

      const decrypted = await FieldEncryption.decryptBankAccount(encrypted);
      expect(decrypted).toBe(accountNumber);
    });

    it('should mask sensitive data for display', () => {
      const testCases = [
        { input: '1234567890', expected: '******7890' },
        { input: '4532-1234-5678-9010', expected: '***************9010' },
        { input: '123-45-6789', expected: '*******6789' },
        { input: '123', expected: '***' },
      ];

      testCases.forEach(({ input, expected }) => {
        const masked = FieldEncryption.maskSensitiveData(input);
        expect(masked).toBe(expected);
      });
    });
  });

  describe('Key Management', () => {
    it('should track key usage', async () => {
      const key = await KeyManagementService.createKey(KeyType.DATA_ENCRYPTION);
      const initialUsage = key.usageCount;

      await KeyManagementService.trackKeyUsage(key.id);
      await KeyManagementService.trackKeyUsage(key.id);

      const metadata = await KeyManagementService.getKeyMetadata(key.id);
      expect(metadata?.usageCount).toBe(initialUsage + 2);
    });

    it('should get expiring keys', async () => {
      const expiringKeys = await KeyManagementService.getExpiringKeys();
      
      // All keys should expire within warning threshold
      expiringKeys.forEach(key => {
        const daysUntilExpiry = Math.floor(
          (key.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        );
        expect(daysUntilExpiry).toBeLessThanOrEqual(7);
      });
    });

    it('should revoke keys', async () => {
      const key = await KeyManagementService.createKey(KeyType.DATA_ENCRYPTION);
      
      await KeyManagementService.revokeKey(key.id, 'Test revocation');

      const metadata = await KeyManagementService.getKeyMetadata(key.id);
      expect(metadata?.status).toBe('REVOKED');
    });

    it('should get key usage statistics', async () => {
      const key = await KeyManagementService.createKey(KeyType.DATA_ENCRYPTION);
      
      await KeyManagementService.trackKeyUsage(key.id);

      const stats = await KeyManagementService.getKeyUsageStats(key.id);

      expect(stats.totalUsage).toBeGreaterThanOrEqual(1);
      expect(stats.last24Hours).toBeGreaterThanOrEqual(0);
      expect(stats.last7Days).toBeGreaterThanOrEqual(0);
      expect(stats.last30Days).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Key Rotation Scheduler', () => {
    it('should start and stop scheduler', () => {
      keyRotationScheduler.start({ enabled: true, checkIntervalHours: 24 });
      let status = keyRotationScheduler.getStatus();
      expect(status.isRunning).toBe(true);

      keyRotationScheduler.stop();
      status = keyRotationScheduler.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should check and rotate keys', async () => {
      await keyRotationScheduler.checkAndRotateKeys();
      // Should complete without errors
    });

    it('should update configuration', () => {
      keyRotationScheduler.updateConfig({
        checkIntervalHours: 12,
        warningThresholdDays: 5,
      });

      const status = keyRotationScheduler.getStatus();
      expect(status.config.checkIntervalHours).toBe(12);
      expect(status.config.warningThresholdDays).toBe(5);
    });
  });

  describe('Security Properties', () => {
    it('should fail decryption with tampered ciphertext', async () => {
      const plaintext = 'Secure data';
      const encrypted = await EncryptionService.encrypt(plaintext);

      // Tamper with ciphertext
      const tampered = {
        ...encrypted,
        ciphertext: encrypted.ciphertext.slice(0, -4) + 'XXXX',
      };

      await expect(EncryptionService.decrypt(tampered)).rejects.toThrow();
    });

    it('should fail decryption with tampered auth tag', async () => {
      const plaintext = 'Secure data';
      const encrypted = await EncryptionService.encrypt(plaintext);

      // Tamper with auth tag
      const tampered = {
        ...encrypted,
        authTag: encrypted.authTag.slice(0, -4) + 'XXXX',
      };

      await expect(EncryptionService.decrypt(tampered)).rejects.toThrow();
    });

    it('should fail decryption with wrong IV', async () => {
      const plaintext = 'Secure data';
      const encrypted1 = await EncryptionService.encrypt(plaintext);
      const encrypted2 = await EncryptionService.encrypt('Other data');

      // Use wrong IV
      const tampered = {
        ...encrypted1,
        iv: encrypted2.iv,
      };

      await expect(EncryptionService.decrypt(tampered)).rejects.toThrow();
    });

    it('should use authenticated encryption (GCM mode)', async () => {
      const plaintext = 'Data with integrity';
      const encrypted = await EncryptionService.encrypt(plaintext);

      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.authTag).toBeTruthy();
      expect(encrypted.authTag.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should encrypt data efficiently', async () => {
      const plaintext = 'Performance test data';
      const iterations = 1000;

      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        await EncryptionService.encrypt(plaintext);
      }
      const duration = Date.now() - start;

      console.log(`   Encrypted ${iterations} items in ${duration}ms`);
      console.log(`   Average: ${(duration / iterations).toFixed(2)}ms per encryption`);

      // Should complete 1000 encryptions in reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    it('should decrypt data efficiently', async () => {
      const plaintext = 'Performance test data';
      const encrypted = await EncryptionService.encrypt(plaintext);
      const iterations = 1000;

      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        await EncryptionService.decrypt(encrypted);
      }
      const duration = Date.now() - start;

      console.log(`   Decrypted ${iterations} items in ${duration}ms`);
      console.log(`   Average: ${(duration / iterations).toFixed(2)}ms per decryption`);

      // Should complete 1000 decryptions in reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    it('should handle large data efficiently', async () => {
      const plaintext = 'A'.repeat(1000000); // 1MB of data
      
      const encryptStart = Date.now();
      const encrypted = await EncryptionService.encrypt(plaintext);
      const encryptDuration = Date.now() - encryptStart;

      const decryptStart = Date.now();
      const decrypted = await EncryptionService.decrypt(encrypted);
      const decryptDuration = Date.now() - decryptStart;

      console.log(`   Encrypted 1MB in ${encryptDuration}ms`);
      console.log(`   Decrypted 1MB in ${decryptDuration}ms`);

      expect(decrypted.toString('utf8')).toBe(plaintext);
      expect(encryptDuration).toBeLessThan(1000); // 1 second
      expect(decryptDuration).toBeLessThan(1000); // 1 second
    });
  });

  describe('Integration Tests', () => {
    it('should work with string encryption/decryption', async () => {
      const plaintext = 'Test string';
      const encrypted = await EncryptionService.encryptString(plaintext);
      const decrypted = await EncryptionService.decryptString(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should work with object encryption/decryption', async () => {
      const obj = { name: 'John', age: 30, email: 'john@example.com' };
      const encrypted = await EncryptionService.encryptObject(obj);
      const decrypted = await EncryptionService.decryptObject(encrypted);

      expect(decrypted).toEqual(obj);
    });

    it('should get encryption key status', async () => {
      const status = await EncryptionService.getKeyStatus();

      expect(status.currentKeyId).toBeTruthy();
      expect(status.expiresAt).toBeInstanceOf(Date);
      expect(typeof status.daysUntilExpiry).toBe('number');
      expect(typeof status.shouldRotate).toBe('boolean');
      expect(status.totalKeys).toBeGreaterThan(0);
    });

    it('should get key management dashboard data', async () => {
      const dashboard = await KeyManagementService.getDashboardData();

      expect(dashboard.totalKeys).toBeGreaterThan(0);
      expect(dashboard.activeKeys).toBeGreaterThan(0);
      expect(dashboard.rotationPolicy).toBeTruthy();
      expect(Array.isArray(dashboard.recentActivity)).toBe(true);
    });
  });
});
