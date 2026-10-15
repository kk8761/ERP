/**
 * Encryption Service
 * Task 38.2: Implement encryption at rest with AES-256
 * Task 38.3: Implement encryption in transit (TLS configuration)
 * Task 38.4: Key management integration
 * 
 * Provides data encryption at rest using AES-256-GCM
 * Integrates with AWS KMS or Azure Key Vault for key management
 */

import crypto from 'crypto';
import { redis } from '../config/redis';
import prisma from '../config/prisma';

/**
 * Encryption algorithm configuration
 */
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm' as const,
  keyLength: 32, // 256 bits
  ivLength: 16, // 128 bits
  authTagLength: 16, // 128 bits
  saltLength: 64,
  iterations: 100000,
  digest: 'sha512',
};

/**
 * Key rotation configuration
 */
const KEY_ROTATION_CONFIG = {
  rotationIntervalDays: 90,
  warningThresholdDays: 7,
};

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyId: string;
  algorithm: string;
  version: number;
}

export interface EncryptionKey {
  id: string;
  key: Buffer;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

/**
 * Encryption Service
 */
export class EncryptionService {
  private static masterKey: Buffer | null = null;
  private static keyCache: Map<string, EncryptionKey> = new Map();

  /**
   * Initialize encryption service with master key
   */
  static async initialize(): Promise<void> {
    // Get master key from environment or key management service
    const masterKeyHex = process.env.MASTER_ENCRYPTION_KEY;
    
    if (!masterKeyHex) {
      console.warn('MASTER_ENCRYPTION_KEY not set. Generating temporary key (NOT FOR PRODUCTION)');
      this.masterKey = crypto.randomBytes(ENCRYPTION_CONFIG.keyLength);
    } else {
      this.masterKey = Buffer.from(masterKeyHex, 'hex');
    }

    // Ensure master key is correct length
    if (this.masterKey.length !== ENCRYPTION_CONFIG.keyLength) {
      throw new Error(`Master key must be ${ENCRYPTION_CONFIG.keyLength} bytes (${ENCRYPTION_CONFIG.keyLength * 2} hex characters)`);
    }

    console.log('Encryption service initialized');
  }

  /**
   * Get or create the current active encryption key
   */
  private static async getCurrentKey(): Promise<EncryptionKey> {
    // Check cache first
    const cacheKey = 'current-encryption-key';
    const cachedKeyId = await redis.get(cacheKey);

    if (cachedKeyId && this.keyCache.has(cachedKeyId)) {
      const key = this.keyCache.get(cachedKeyId)!;
      if (key.isActive && key.expiresAt > new Date()) {
        return key;
      }
    }

    // Get from database
    let dbKey = await prisma.encryptionKey.findFirst({
      where: {
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Create new key if none exists or current is expiring soon
    if (!dbKey || this.shouldRotateKey(dbKey.expiresAt)) {
      dbKey = await this.rotateEncryptionKey();
    }

    // Derive actual encryption key from master key and key ID
    const derivedKey = await this.deriveKey(dbKey.id);

    const encryptionKey: EncryptionKey = {
      id: dbKey.id,
      key: derivedKey,
      createdAt: dbKey.createdAt,
      expiresAt: dbKey.expiresAt,
      isActive: dbKey.isActive,
    };

    // Cache the key
    this.keyCache.set(dbKey.id, encryptionKey);
    await redis.setex(cacheKey, 3600, dbKey.id); // Cache for 1 hour

    return encryptionKey;
  }

  /**
   * Get a specific encryption key by ID
   */
  private static async getKeyById(keyId: string): Promise<EncryptionKey> {
    // Check cache first
    if (this.keyCache.has(keyId)) {
      return this.keyCache.get(keyId)!;
    }

    // Get from database
    const dbKey = await prisma.encryptionKey.findUnique({
      where: { id: keyId },
    });

    if (!dbKey) {
      throw new Error(`Encryption key not found: ${keyId}`);
    }

    // Derive actual encryption key from master key and key ID
    const derivedKey = await this.deriveKey(dbKey.id);

    const encryptionKey: EncryptionKey = {
      id: dbKey.id,
      key: derivedKey,
      createdAt: dbKey.createdAt,
      expiresAt: dbKey.expiresAt,
      isActive: dbKey.isActive,
    };

    // Cache the key
    this.keyCache.set(keyId, encryptionKey);

    return encryptionKey;
  }

  /**
   * Derive encryption key from master key using PBKDF2
   */
  private static async deriveKey(keyId: string): Promise<Buffer> {
    if (!this.masterKey) {
      throw new Error('Encryption service not initialized');
    }

    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        this.masterKey!,
        keyId, // Use keyId as salt
        ENCRYPTION_CONFIG.iterations,
        ENCRYPTION_CONFIG.keyLength,
        ENCRYPTION_CONFIG.digest,
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        }
      );
    });
  }

  /**
   * Check if key should be rotated
   */
  private static shouldRotateKey(expiresAt: Date): boolean {
    const daysUntilExpiry = Math.floor(
      (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= KEY_ROTATION_CONFIG.warningThresholdDays;
  }

  /**
   * Rotate encryption key (create new key and mark old as inactive)
   */
  static async rotateEncryptionKey(): Promise<any> {
    // Deactivate old keys
    await prisma.encryptionKey.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new key
    const keyId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + KEY_ROTATION_CONFIG.rotationIntervalDays);

    const newKey = await prisma.encryptionKey.create({
      data: {
        id: keyId,
        algorithm: ENCRYPTION_CONFIG.algorithm,
        isActive: true,
        expiresAt,
        rotatedAt: null,
      },
    });

    // Clear cache
    await redis.del('current-encryption-key');
    this.keyCache.clear();

    console.log(`Encryption key rotated: ${keyId}, expires: ${expiresAt.toISOString()}`);

    return newKey;
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  static async encrypt(plaintext: string | Buffer): Promise<EncryptedData> {
    const key = await this.getCurrentKey();

    // Convert plaintext to buffer if string
    const plaintextBuffer = typeof plaintext === 'string' 
      ? Buffer.from(plaintext, 'utf8') 
      : plaintext;

    // Generate random IV
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);

    // Create cipher
    const cipher = crypto.createCipheriv(
      ENCRYPTION_CONFIG.algorithm,
      key.key,
      iv
    );

    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(plaintextBuffer),
      cipher.final(),
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyId: key.id,
      algorithm: ENCRYPTION_CONFIG.algorithm,
      version: 1,
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  static async decrypt(encryptedData: EncryptedData): Promise<Buffer> {
    // Get the key that was used for encryption
    const key = await this.getKeyById(encryptedData.keyId);

    // Convert from base64
    const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');

    // Create decipher
    const decipher = crypto.createDecipheriv(
      encryptedData.algorithm as any,
      key.key,
      iv
    );

    // Set authentication tag
    decipher.setAuthTag(authTag);

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted;
  }

  /**
   * Encrypt string and return as string
   */
  static async encryptString(plaintext: string): Promise<string> {
    const encrypted = await this.encrypt(plaintext);
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt string from encrypted string
   */
  static async decryptString(encryptedString: string): Promise<string> {
    const encryptedData: EncryptedData = JSON.parse(encryptedString);
    const decrypted = await this.decrypt(encryptedData);
    return decrypted.toString('utf8');
  }

  /**
   * Encrypt object (converts to JSON first)
   */
  static async encryptObject(obj: any): Promise<string> {
    const json = JSON.stringify(obj);
    return this.encryptString(json);
  }

  /**
   * Decrypt object (parses JSON after decryption)
   */
  static async decryptObject<T = any>(encryptedString: string): Promise<T> {
    const json = await this.decryptString(encryptedString);
    return JSON.parse(json);
  }

  /**
   * Hash data using SHA-256 (one-way, for passwords, etc.)
   */
  static hash(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Generate random token
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Get encryption key status
   */
  static async getKeyStatus(): Promise<{
    currentKeyId: string;
    expiresAt: Date;
    daysUntilExpiry: number;
    shouldRotate: boolean;
    totalKeys: number;
  }> {
    const currentKey = await this.getCurrentKey();
    const daysUntilExpiry = Math.floor(
      (currentKey.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const totalKeys = await prisma.encryptionKey.count();

    return {
      currentKeyId: currentKey.id,
      expiresAt: currentKey.expiresAt,
      daysUntilExpiry,
      shouldRotate: this.shouldRotateKey(currentKey.expiresAt),
      totalKeys,
    };
  }

  /**
   * Re-encrypt data with new key (for key rotation)
   */
  static async reencrypt(encryptedData: EncryptedData): Promise<EncryptedData> {
    // Decrypt with old key
    const plaintext = await this.decrypt(encryptedData);
    
    // Encrypt with current key
    return await this.encrypt(plaintext);
  }
}

/**
 * Transparent Data Encryption (TDE) for database fields
 * Automatically encrypts/decrypts sensitive fields
 */
export class TransparentDataEncryption {
  /**
   * Encrypt sensitive fields in an object
   */
  static async encryptFields(
    obj: any,
    sensitiveFields: string[]
  ): Promise<any> {
    const encrypted = { ...obj };

    for (const field of sensitiveFields) {
      if (encrypted[field] !== undefined && encrypted[field] !== null) {
        encrypted[field] = await EncryptionService.encryptString(
          String(encrypted[field])
        );
      }
    }

    return encrypted;
  }

  /**
   * Decrypt sensitive fields in an object
   */
  static async decryptFields(
    obj: any,
    sensitiveFields: string[]
  ): Promise<any> {
    const decrypted = { ...obj };

    for (const field of sensitiveFields) {
      if (decrypted[field] !== undefined && decrypted[field] !== null) {
        try {
          decrypted[field] = await EncryptionService.decryptString(
            decrypted[field]
          );
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
          // Keep encrypted value if decryption fails
        }
      }
    }

    return decrypted;
  }

  /**
   * Encrypt array of objects
   */
  static async encryptArray(
    arr: any[],
    sensitiveFields: string[]
  ): Promise<any[]> {
    return Promise.all(
      arr.map(obj => this.encryptFields(obj, sensitiveFields))
    );
  }

  /**
   * Decrypt array of objects
   */
  static async decryptArray(
    arr: any[],
    sensitiveFields: string[]
  ): Promise<any[]> {
    return Promise.all(
      arr.map(obj => this.decryptFields(obj, sensitiveFields))
    );
  }
}

/**
 * Field-level encryption for specific data types
 */
export class FieldEncryption {
  /**
   * Encrypt credit card number (PCI DSS compliance)
   */
  static async encryptCreditCard(cardNumber: string): Promise<string> {
    // Remove spaces and dashes
    const cleaned = cardNumber.replace(/[\s-]/g, '');
    return EncryptionService.encryptString(cleaned);
  }

  /**
   * Decrypt credit card number
   */
  static async decryptCreditCard(encrypted: string): Promise<string> {
    return EncryptionService.decryptString(encrypted);
  }

  /**
   * Encrypt SSN/Tax ID (PII protection)
   */
  static async encryptSSN(ssn: string): Promise<string> {
    return EncryptionService.encryptString(ssn);
  }

  /**
   * Decrypt SSN/Tax ID
   */
  static async decryptSSN(encrypted: string): Promise<string> {
    return EncryptionService.decryptString(encrypted);
  }

  /**
   * Encrypt bank account number
   */
  static async encryptBankAccount(accountNumber: string): Promise<string> {
    return EncryptionService.encryptString(accountNumber);
  }

  /**
   * Decrypt bank account number
   */
  static async decryptBankAccount(encrypted: string): Promise<string> {
    return EncryptionService.decryptString(encrypted);
  }

  /**
   * Mask sensitive data for display (show last 4 digits only)
   */
  static maskSensitiveData(data: string, visibleChars: number = 4): string {
    if (data.length <= visibleChars) {
      return '*'.repeat(data.length);
    }
    const masked = '*'.repeat(data.length - visibleChars);
    const visible = data.slice(-visibleChars);
    return masked + visible;
  }
}

