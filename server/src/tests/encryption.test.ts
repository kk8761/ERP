/**
 * Encryption Service Tests
 * Task 38.2: Implement encryption at rest
 * 
 * Tests for AES-256-GCM encryption, key management, and transparent data encryption.
 * 
 * **Validates: Requirements 15.3**
 * - THE System SHALL encrypt all data at rest using AES-256
 * - WHEN encryption keys are managed, THE System SHALL rotate keys every 90 days
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { encryptionService } from '../services/EncryptionService';
import {
  encryptBeforeSave,
  decryptAfterRead,
  encryptField,
  decryptField,
  isEncrypted,
  SENSITIVE_FIELDS,
} from '../utils/databaseEncryption';
import fs from 'fs/promises';
import path from 'path';

describe('Encryption Service', () => {
  const KEYS_DIR = path.join(process.cwd(), 'keys');
  const TEST_PLAINTEXT = 'Sensitive customer data that must be encrypted';

  beforeAll(async () => {
    // Initialize encryption service
    await encryptionService.initialize();
  });

  afterAll(async () => {
    // Cleanup test keys (optional - comment out to preserve keys)
    // await fs.rm(KEYS_DIR, { recursive: true, force: true });
  });

  describe('Basic Encryption and Decryption', () => {
    it('should encrypt plaintext data', () => {
      const encrypted = encryptionService.encrypt(TEST_PLAINTEXT);

      expect(encrypted).toBeDefined();
      expect(encrypted.data).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.keyId).toBeDefined();
      expect(encrypted.algorithm).toBe('aes-256-gcm');
    });

    it('should decrypt encrypted data back to original plaintext', () => {
      const encrypted = encryptionService.encrypt(TEST_PLAINTEXT);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(TEST_PLAINTEXT);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const encrypted1 = encryptionService.encrypt(TEST_PLAINTEXT);
      const encrypted2 = encryptionService.encrypt(TEST_PLAINTEXT);

      expect(encrypted1.data).not.toBe(encrypted2.data);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should fail to decrypt with tampered ciphertext', () => {
      const encrypted = encryptionService.encrypt(TEST_PLAINTEXT);
      
      // Tamper with the data
      const tamperedData = encrypted.data.slice(0, -1) + 'X';
      const tampered = { ...encrypted, data: tamperedData };

      expect(() => {
        encryptionService.decrypt(tampered);
      }).toThrow();
    });

    it('should fail to decrypt with tampered auth tag', () => {
      const encrypted = encryptionService.encrypt(TEST_PLAINTEXT);
      
      // Tamper with the auth tag
      const tamperedAuthTag = encrypted.authTag.slice(0, -1) + 'X';
      const tampered = { ...encrypted, authTag: tamperedAuthTag };

      expect(() => {
        encryptionService.decrypt(tampered);
      }).toThrow();
    });
  });

  describe('Field-Level Encryption', () => {
    it('should encrypt a field value as JSON string', () => {
      const email = 'user@example.com';
      const encryptedField = encryptionService.encryptField(email);

      expect(typeof encryptedField).toBe('string');
      expect(() => JSON.parse(encryptedField)).not.toThrow();
      
      const parsed = JSON.parse(encryptedField);
      expect(parsed.data).toBeDefined();
      expect(parsed.iv).toBeDefined();
      expect(parsed.authTag).toBeDefined();
      expect(parsed.keyId).toBeDefined();
    });

    it('should decrypt a field value back to original', () => {
      const email = 'user@example.com';
      const encryptedField = encryptionService.encryptField(email);
      const decryptedField = encryptionService.decryptField(encryptedField);

      expect(decryptedField).toBe(email);
    });

    it('should handle special characters in field values', () => {
      const specialChars = 'Test@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~';
      const encrypted = encryptionService.encryptField(specialChars);
      const decrypted = encryptionService.decryptField(encrypted);

      expect(decrypted).toBe(specialChars);
    });

    it('should handle unicode characters in field values', () => {
      const unicode = '你好世界 🔐 مرحبا العالم';
      const encrypted = encryptionService.encryptField(unicode);
      const decrypted = encryptionService.decryptField(encrypted);

      expect(decrypted).toBe(unicode);
    });
  });

  describe('Object Encryption', () => {
    it('should encrypt sensitive fields in an object', () => {
      const user = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        role: 'admin',
      };

      const encrypted = encryptionService.encryptObject(user, ['email', 'phone']);

      expect(encrypted.id).toBe(user.id);
      expect(encrypted.name).toBe(user.name);
      expect(encrypted.role).toBe(user.role);
      expect(encrypted.email).not.toBe(user.email);
      expect(encrypted.phone).not.toBe(user.phone);
      expect(isEncrypted(encrypted.email)).toBe(true);
      expect(isEncrypted(encrypted.phone)).toBe(true);
    });

    it('should decrypt sensitive fields in an object', () => {
      const user = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        role: 'admin',
      };

      const encrypted = encryptionService.encryptObject(user, ['email', 'phone']);
      const decrypted = encryptionService.decryptObject(encrypted, ['email', 'phone']);

      expect(decrypted).toEqual(user);
    });

    it('should handle null and undefined values in objects', () => {
      const user = {
        id: '123',
        name: 'John Doe',
        email: null,
        phone: undefined,
        address: 'Test Address',
      };

      const encrypted = encryptionService.encryptObject(user, ['email', 'phone', 'address']);

      expect(encrypted.email).toBeNull();
      expect(encrypted.phone).toBeUndefined();
      expect(encrypted.address).not.toBe(user.address);
    });
  });

  describe('Key Management', () => {
    it('should have an active encryption key', () => {
      const keyInfo = encryptionService.getKeyInfo();

      expect(keyInfo.activeKeyId).toBeDefined();
      expect(keyInfo.activeKeyId).not.toBeNull();
      expect(keyInfo.totalKeys).toBeGreaterThan(0);
    });

    it('should provide key information with expiration details', () => {
      const keyInfo = encryptionService.getKeyInfo();

      expect(keyInfo.keys).toBeDefined();
      expect(keyInfo.keys.length).toBeGreaterThan(0);

      const activeKey = keyInfo.keys.find(k => k.id === keyInfo.activeKeyId);
      expect(activeKey).toBeDefined();
      expect(activeKey?.isActive).toBe(true);
      expect(activeKey?.createdAt).toBeInstanceOf(Date);
      expect(activeKey?.expiresAt).toBeInstanceOf(Date);
      expect(typeof activeKey?.daysUntilExpiry).toBe('number');
    });

    it('should rotate encryption key', async () => {
      const keyInfoBefore = encryptionService.getKeyInfo();
      const oldKeyId = keyInfoBefore.activeKeyId;

      const newKeyId = await encryptionService.rotateKey();

      const keyInfoAfter = encryptionService.getKeyInfo();

      expect(newKeyId).toBeDefined();
      expect(newKeyId).not.toBe(oldKeyId);
      expect(keyInfoAfter.activeKeyId).toBe(newKeyId);
      expect(keyInfoAfter.totalKeys).toBe(keyInfoBefore.totalKeys + 1);
    });

    it('should decrypt data encrypted with old key after rotation', async () => {
      const plaintext = 'Data encrypted before key rotation';
      
      // Encrypt with current key
      const encrypted = encryptionService.encrypt(plaintext);
      const oldKeyId = encrypted.keyId;

      // Rotate key
      await encryptionService.rotateKey();

      // Should still be able to decrypt with old key
      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);

      // New encryptions should use new key
      const newEncrypted = encryptionService.encrypt(plaintext);
      expect(newEncrypted.keyId).not.toBe(oldKeyId);
    });

    it('should re-encrypt data with new key', async () => {
      const plaintext = 'Data to be re-encrypted';
      
      // Encrypt with current key
      const encrypted = encryptionService.encrypt(plaintext);
      const oldKeyId = encrypted.keyId;

      // Rotate key
      await encryptionService.rotateKey();

      // Re-encrypt with new key
      const reencrypted = await encryptionService.reencryptData(encrypted);

      expect(reencrypted.keyId).not.toBe(oldKeyId);
      expect(encryptionService.decrypt(reencrypted)).toBe(plaintext);
    });
  });

  describe('Database Encryption Utilities', () => {
    it('should identify sensitive fields for User model', () => {
      expect(SENSITIVE_FIELDS.User).toBeDefined();
      expect(SENSITIVE_FIELDS.User).toContain('email');
      expect(SENSITIVE_FIELDS.User).toContain('phone');
      expect(SENSITIVE_FIELDS.User).toContain('address');
    });

    it('should encrypt sensitive fields before saving to database', () => {
      const userData = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        role: 'admin',
      };

      const encrypted = encryptBeforeSave('User', userData);

      expect(encrypted.id).toBe(userData.id);
      expect(encrypted.name).toBe(userData.name);
      expect(encrypted.role).toBe(userData.role);
      expect(encrypted.email).not.toBe(userData.email);
      expect(encrypted.phone).not.toBe(userData.phone);
    });

    it('should decrypt sensitive fields after reading from database', () => {
      const userData = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        role: 'admin',
      };

      const encrypted = encryptBeforeSave('User', userData);
      const decrypted = decryptAfterRead('User', encrypted);

      expect(decrypted).toEqual(userData);
    });

    it('should correctly identify encrypted values', () => {
      const plainValue = 'plain text';
      const encryptedValue = encryptField('encrypted text');

      expect(isEncrypted(plainValue)).toBe(false);
      expect(isEncrypted(encryptedValue)).toBe(true);
    });

    it('should handle models without sensitive fields', () => {
      const data = {
        id: '123',
        name: 'Test Product',
        price: 99.99,
      };

      const encrypted = encryptBeforeSave('NonExistentModel', data);
      const decrypted = decryptAfterRead('NonExistentModel', encrypted);

      expect(encrypted).toEqual(data);
      expect(decrypted).toEqual(data);
    });
  });

  describe('Security Properties', () => {
    it('should use AES-256-GCM algorithm', () => {
      const encrypted = encryptionService.encrypt(TEST_PLAINTEXT);
      expect(encrypted.algorithm).toBe('aes-256-gcm');
    });

    it('should generate unique IV for each encryption', () => {
      const ivs = new Set();
      
      for (let i = 0; i < 100; i++) {
        const encrypted = encryptionService.encrypt(TEST_PLAINTEXT);
        ivs.add(encrypted.iv);
      }

      expect(ivs.size).toBe(100);
    });

    it('should include authentication tag for integrity verification', () => {
      const encrypted = encryptionService.encrypt(TEST_PLAINTEXT);
      
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.authTag.length).toBeGreaterThan(0);
    });

    it('should fail decryption if key is not found', () => {
      const encrypted = encryptionService.encrypt(TEST_PLAINTEXT);
      
      // Modify keyId to non-existent key
      const invalidEncrypted = { ...encrypted, keyId: 'non-existent-key-id' };

      expect(() => {
        encryptionService.decrypt(invalidEncrypted);
      }).toThrow(/key not found/i);
    });
  });

  describe('Performance', () => {
    it('should encrypt and decrypt 1000 records efficiently', () => {
      const startTime = Date.now();
      
      const records = Array.from({ length: 1000 }, (_, i) => ({
        id: `user-${i}`,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        phone: `+123456789${i}`,
      }));

      // Encrypt all records
      const encrypted = records.map(record => 
        encryptionService.encryptObject(record, ['email', 'phone'])
      );

      // Decrypt all records
      const decrypted = encrypted.map(record => 
        encryptionService.decryptObject(record, ['email', 'phone'])
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(decrypted).toEqual(records);
      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
      
      console.log(`Encrypted and decrypted 1000 records in ${duration}ms`);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string encryption', () => {
      const empty = '';
      const encrypted = encryptionService.encryptField(empty);
      const decrypted = encryptionService.decryptField(encrypted);

      expect(decrypted).toBe(empty);
    });

    it('should handle very long strings', () => {
      const longString = 'A'.repeat(10000);
      const encrypted = encryptionService.encryptField(longString);
      const decrypted = encryptionService.decryptField(encrypted);

      expect(decrypted).toBe(longString);
    });

    it('should handle JSON strings', () => {
      const jsonString = JSON.stringify({ key: 'value', nested: { data: 123 } });
      const encrypted = encryptionService.encryptField(jsonString);
      const decrypted = encryptionService.decryptField(encrypted);

      expect(decrypted).toBe(jsonString);
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(jsonString));
    });

    it('should handle newlines and whitespace', () => {
      const multiline = 'Line 1\nLine 2\r\nLine 3\tTabbed';
      const encrypted = encryptionService.encryptField(multiline);
      const decrypted = encryptionService.decryptField(encrypted);

      expect(decrypted).toBe(multiline);
    });
  });

  describe('Key Cleanup', () => {
    it('should cleanup expired keys beyond retention period', async () => {
      const keyInfoBefore = encryptionService.getKeyInfo();
      
      // Cleanup keys older than 365 days
      const removedCount = await encryptionService.cleanupExpiredKeys(365);

      const keyInfoAfter = encryptionService.getKeyInfo();

      expect(removedCount).toBeGreaterThanOrEqual(0);
      expect(keyInfoAfter.totalKeys).toBe(keyInfoBefore.totalKeys - removedCount);
    });

    it('should not remove active key during cleanup', async () => {
      const keyInfoBefore = encryptionService.getKeyInfo();
      const activeKeyId = keyInfoBefore.activeKeyId;

      await encryptionService.cleanupExpiredKeys(0); // Aggressive cleanup

      const keyInfoAfter = encryptionService.getKeyInfo();

      expect(keyInfoAfter.activeKeyId).toBe(activeKeyId);
      expect(keyInfoAfter.keys.find(k => k.id === activeKeyId)).toBeDefined();
    });
  });
});
