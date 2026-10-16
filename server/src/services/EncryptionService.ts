import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

/**
 * Encryption Service
 * 
 * Provides AES-256-GCM encryption at rest for sensitive data.
 * Implements transparent data encryption with secure key management.
 * 
 * Features:
 * - AES-256-GCM encryption algorithm
 * - Automatic key rotation every 90 days
 * - Secure key storage with master key encryption
 * - Field-level encryption for sensitive data
 * - Transparent encryption/decryption
 */

interface EncryptionKey {
  id: string;
  key: Buffer;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

interface EncryptedData {
  data: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  authTag: string; // Base64 encoded authentication tag
  keyId: string; // ID of the key used for encryption
  algorithm: string;
}

export class EncryptionService {
  private static instance: EncryptionService;
  private masterKey: Buffer | null = null;
  private encryptionKeys: Map<string, EncryptionKey> = new Map();
  private activeKeyId: string | null = null;
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly IV_LENGTH = 16; // 128 bits
  private readonly KEY_ROTATION_DAYS = 90;
  private readonly KEYS_DIR = path.join(process.cwd(), 'keys');
  private readonly MASTER_KEY_FILE = path.join(this.KEYS_DIR, 'master.key');
  private readonly KEYS_FILE = path.join(this.KEYS_DIR, 'encryption.keys');

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Initialize encryption service
   * Loads or generates master key and encryption keys
   */
  public async initialize(): Promise<void> {
    try {
      // Ensure keys directory exists
      await fs.mkdir(this.KEYS_DIR, { recursive: true, mode: 0o700 });

      // Load or generate master key
      await this.loadOrGenerateMasterKey();

      // Load or generate encryption keys
      await this.loadOrGenerateEncryptionKeys();

      // Check if key rotation is needed
      await this.checkKeyRotation();

      console.log('✓ Encryption service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize encryption service:', error);
      throw new Error('Encryption service initialization failed');
    }
  }

  /**
   * Load or generate master key
   * Master key is used to encrypt encryption keys at rest
   */
  private async loadOrGenerateMasterKey(): Promise<void> {
    try {
      // Try to load existing master key
      const keyData = await fs.readFile(this.MASTER_KEY_FILE);
      this.masterKey = Buffer.from(keyData);
      console.log('✓ Master key loaded from file');
    } catch (error) {
      // Generate new master key if not found
      console.log('Generating new master key...');
      this.masterKey = crypto.randomBytes(this.KEY_LENGTH);
      
      // Save master key with restricted permissions
      await fs.writeFile(this.MASTER_KEY_FILE, this.masterKey, { mode: 0o600 });
      console.log('✓ Master key generated and saved');
      
      // In production, this should be stored in a secure key management service (KMS)
      console.warn('⚠ WARNING: Master key stored on filesystem. Use AWS KMS, Azure Key Vault, or HashiCorp Vault in production.');
    }
  }

  /**
   * Load or generate encryption keys
   */
  private async loadOrGenerateEncryptionKeys(): Promise<void> {
    try {
      // Try to load existing keys
      const encryptedKeysData = await fs.readFile(this.KEYS_FILE, 'utf-8');
      const encryptedKeys = JSON.parse(encryptedKeysData);

      // Decrypt and load keys
      for (const encryptedKey of encryptedKeys) {
        const key = this.decryptKey(encryptedKey);
        this.encryptionKeys.set(key.id, key);
        
        if (key.isActive) {
          this.activeKeyId = key.id;
        }
      }

      console.log(`✓ Loaded ${this.encryptionKeys.size} encryption keys`);
    } catch (error) {
      // Generate initial encryption key if not found
      console.log('Generating initial encryption key...');
      await this.generateNewEncryptionKey();
    }
  }

  /**
   * Generate a new encryption key
   */
  private async generateNewEncryptionKey(): Promise<string> {
    const keyId = crypto.randomUUID();
    const key = crypto.randomBytes(this.KEY_LENGTH);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.KEY_ROTATION_DAYS * 24 * 60 * 60 * 1000);

    const encryptionKey: EncryptionKey = {
      id: keyId,
      key,
      createdAt: now,
      expiresAt,
      isActive: true,
    };

    // Deactivate previous active key
    if (this.activeKeyId) {
      const oldKey = this.encryptionKeys.get(this.activeKeyId);
      if (oldKey) {
        oldKey.isActive = false;
      }
    }

    // Set new key as active
    this.encryptionKeys.set(keyId, encryptionKey);
    this.activeKeyId = keyId;

    // Save keys to file
    await this.saveEncryptionKeys();

    console.log(`✓ Generated new encryption key: ${keyId}`);
    return keyId;
  }

  /**
   * Save encryption keys to file (encrypted with master key)
   */
  private async saveEncryptionKeys(): Promise<void> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    const encryptedKeys = Array.from(this.encryptionKeys.values()).map(key => 
      this.encryptKey(key)
    );

    await fs.writeFile(
      this.KEYS_FILE,
      JSON.stringify(encryptedKeys, null, 2),
      { mode: 0o600 }
    );
  }

  /**
   * Encrypt an encryption key with the master key
   */
  private encryptKey(key: EncryptionKey): any {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.masterKey, iv);

    const keyData = JSON.stringify({
      id: key.id,
      key: key.key.toString('base64'),
      createdAt: key.createdAt.toISOString(),
      expiresAt: key.expiresAt.toISOString(),
      isActive: key.isActive,
    });

    let encrypted = cipher.update(keyData, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return {
      data: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  /**
   * Decrypt an encryption key with the master key
   */
  private decryptKey(encryptedKey: any): EncryptionKey {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    const iv = Buffer.from(encryptedKey.iv, 'base64');
    const authTag = Buffer.from(encryptedKey.authTag, 'base64');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.masterKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedKey.data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    const keyData = JSON.parse(decrypted);

    return {
      id: keyData.id,
      key: Buffer.from(keyData.key, 'base64'),
      createdAt: new Date(keyData.createdAt),
      expiresAt: new Date(keyData.expiresAt),
      isActive: keyData.isActive,
    };
  }

  /**
   * Check if key rotation is needed
   */
  private async checkKeyRotation(): Promise<void> {
    if (!this.activeKeyId) {
      return;
    }

    const activeKey = this.encryptionKeys.get(this.activeKeyId);
    if (!activeKey) {
      return;
    }

    const now = new Date();
    const daysUntilExpiry = Math.floor(
      (activeKey.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (daysUntilExpiry <= 0) {
      console.log('⚠ Active encryption key expired, rotating...');
      await this.rotateKey();
    } else if (daysUntilExpiry <= 7) {
      console.warn(`⚠ Active encryption key expires in ${daysUntilExpiry} days`);
    }
  }

  /**
   * Rotate encryption key
   */
  public async rotateKey(): Promise<string> {
    console.log('Rotating encryption key...');
    const newKeyId = await this.generateNewEncryptionKey();
    console.log(`✓ Key rotation complete. New key ID: ${newKeyId}`);
    return newKeyId;
  }

  /**
   * Encrypt data using active encryption key
   */
  public encrypt(plaintext: string): EncryptedData {
    if (!this.activeKeyId) {
      throw new Error('No active encryption key');
    }

    const key = this.encryptionKeys.get(this.activeKeyId);
    if (!key) {
      throw new Error('Active encryption key not found');
    }

    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return {
      data: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyId: key.id,
      algorithm: this.ALGORITHM,
    };
  }

  /**
   * Decrypt data using the key that was used for encryption
   */
  public decrypt(encryptedData: EncryptedData): string {
    const key = this.encryptionKeys.get(encryptedData.keyId);
    if (!key) {
      throw new Error(`Encryption key not found: ${encryptedData.keyId}`);
    }

    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt a field value (convenience method)
   */
  public encryptField(value: string): string {
    const encrypted = this.encrypt(value);
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt a field value (convenience method)
   */
  public decryptField(encryptedValue: string): string {
    const encrypted: EncryptedData = JSON.parse(encryptedValue);
    return this.decrypt(encrypted);
  }

  /**
   * Encrypt an object's sensitive fields
   */
  public encryptObject<T extends Record<string, any>>(
    obj: T,
    sensitiveFields: (keyof T)[]
  ): T {
    const encrypted = { ...obj };

    for (const field of sensitiveFields) {
      if (obj[field] !== null && obj[field] !== undefined) {
        encrypted[field] = this.encryptField(String(obj[field])) as any;
      }
    }

    return encrypted;
  }

  /**
   * Decrypt an object's sensitive fields
   */
  public decryptObject<T extends Record<string, any>>(
    obj: T,
    sensitiveFields: (keyof T)[]
  ): T {
    const decrypted = { ...obj };

    for (const field of sensitiveFields) {
      if (obj[field] !== null && obj[field] !== undefined) {
        try {
          decrypted[field] = this.decryptField(String(obj[field])) as any;
        } catch (error) {
          console.error(`Failed to decrypt field ${String(field)}:`, error);
          // Keep encrypted value if decryption fails
        }
      }
    }

    return decrypted;
  }

  /**
   * Get encryption key information
   */
  public getKeyInfo(): {
    activeKeyId: string | null;
    totalKeys: number;
    keys: Array<{
      id: string;
      createdAt: Date;
      expiresAt: Date;
      isActive: boolean;
      daysUntilExpiry: number;
    }>;
  } {
    const now = new Date();
    const keys = Array.from(this.encryptionKeys.values()).map(key => ({
      id: key.id,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      isActive: key.isActive,
      daysUntilExpiry: Math.floor(
        (key.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      ),
    }));

    return {
      activeKeyId: this.activeKeyId,
      totalKeys: this.encryptionKeys.size,
      keys,
    };
  }

  /**
   * Re-encrypt data with new key (for key rotation)
   */
  public async reencryptData(encryptedData: EncryptedData): Promise<EncryptedData> {
    // Decrypt with old key
    const plaintext = this.decrypt(encryptedData);
    
    // Encrypt with new active key
    return this.encrypt(plaintext);
  }

  /**
   * Cleanup expired keys (keep for decryption of old data)
   */
  public async cleanupExpiredKeys(retentionDays: number = 365): Promise<number> {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
    let removedCount = 0;

    for (const [keyId, key] of this.encryptionKeys.entries()) {
      // Don't remove active key
      if (key.isActive) {
        continue;
      }

      // Remove if expired and past retention period
      if (key.expiresAt < cutoffDate) {
        this.encryptionKeys.delete(keyId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      await this.saveEncryptionKeys();
      console.log(`✓ Cleaned up ${removedCount} expired encryption keys`);
    }

    return removedCount;
  }
}

// Export singleton instance
export const encryptionService = EncryptionService.getInstance();
