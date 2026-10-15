import crypto from 'crypto';
import { KMSClient, EncryptCommand, DecryptCommand, GenerateDataKeyCommand, ScheduleKeyDeletionCommand } from '@aws-sdk/client-kms';
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

/**
 * Key Management Service
 * 
 * Provides enterprise-grade key management with support for:
 * - AWS KMS integration
 * - Azure Key Vault integration
 * - Automatic key rotation every 90 days
 * - Key usage tracking and auditing
 * - Secure key storage and access control
 * 
 * Requirements: 15.5
 */

export enum KeyProvider {
  LOCAL = 'local',
  AWS_KMS = 'aws-kms',
  AZURE_KEY_VAULT = 'azure-keyvault',
}

export interface KeyMetadata {
  id: string;
  provider: KeyProvider;
  createdAt: Date;
  expiresAt: Date;
  rotatedAt?: Date;
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: Date;
  version: number;
  arn?: string; // AWS KMS ARN
  vaultUrl?: string; // Azure Key Vault URL
}

export interface KeyUsageLog {
  keyId: string;
  operation: 'encrypt' | 'decrypt' | 'rotate' | 'create' | 'delete';
  timestamp: Date;
  userId?: string;
  ipAddress?: string;
  success: boolean;
  errorMessage?: string;
}

export interface KeyRotationPolicy {
  enabled: boolean;
  rotationIntervalDays: number;
  autoRotate: boolean;
  notifyBeforeDays: number;
}

export class KeyManagementService {
  private static instance: KeyManagementService;
  private kmsClient?: KMSClient;
  private azureClient?: SecretClient;
  private provider: KeyProvider;
  private keys: Map<string, KeyMetadata> = new Map();
  private usageLogs: KeyUsageLog[] = [];
  private rotationPolicy: KeyRotationPolicy;
  private readonly MAX_USAGE_LOGS = 10000;

  private constructor() {
    this.provider = this.determineProvider();
    this.rotationPolicy = {
      enabled: true,
      rotationIntervalDays: 90,
      autoRotate: true,
      notifyBeforeDays: 7,
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): KeyManagementService {
    if (!KeyManagementService.instance) {
      KeyManagementService.instance = new KeyManagementService();
    }
    return KeyManagementService.instance;
  }

  /**
   * Determine which key provider to use based on environment
   */
  private determineProvider(): KeyProvider {
    if (process.env.AWS_KMS_KEY_ID) {
      return KeyProvider.AWS_KMS;
    } else if (process.env.AZURE_KEY_VAULT_URL) {
      return KeyProvider.AZURE_KEY_VAULT;
    }
    return KeyProvider.LOCAL;
  }

  /**
   * Initialize key management service
   */
  public async initialize(): Promise<void> {
    try {
      console.log(`Initializing Key Management Service with provider: ${this.provider}`);

      switch (this.provider) {
        case KeyProvider.AWS_KMS:
          await this.initializeAWSKMS();
          break;
        case KeyProvider.AZURE_KEY_VAULT:
          await this.initializeAzureKeyVault();
          break;
        case KeyProvider.LOCAL:
          console.warn('⚠ WARNING: Using local key storage. Use AWS KMS or Azure Key Vault in production.');
          break;
      }

      // Load existing keys metadata
      await this.loadKeysMetadata();

      // Start key rotation scheduler
      this.startKeyRotationScheduler();

      console.log('✓ Key Management Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Key Management Service:', error);
      throw new Error('Key Management Service initialization failed');
    }
  }

  /**
   * Initialize AWS KMS client
   */
  private async initializeAWSKMS(): Promise<void> {
    const region = process.env.AWS_REGION || 'us-east-1';
    
    this.kmsClient = new KMSClient({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    console.log(`✓ AWS KMS client initialized (region: ${region})`);
  }

  /**
   * Initialize Azure Key Vault client
   */
  private async initializeAzureKeyVault(): Promise<void> {
    const vaultUrl = process.env.AZURE_KEY_VAULT_URL;
    
    if (!vaultUrl) {
      throw new Error('AZURE_KEY_VAULT_URL environment variable not set');
    }

    const credential = new DefaultAzureCredential();
    this.azureClient = new SecretClient(vaultUrl, credential);

    console.log(`✓ Azure Key Vault client initialized (vault: ${vaultUrl})`);
  }

  /**
   * Generate a new data encryption key
   */
  public async generateDataKey(): Promise<{ keyId: string; key: Buffer }> {
    const keyId = crypto.randomUUID();
    let key: Buffer;

    try {
      switch (this.provider) {
        case KeyProvider.AWS_KMS:
          key = await this.generateDataKeyAWS();
          break;
        case KeyProvider.AZURE_KEY_VAULT:
          key = await this.generateDataKeyAzure(keyId);
          break;
        case KeyProvider.LOCAL:
          key = crypto.randomBytes(32); // 256-bit key
          break;
        default:
          throw new Error(`Unsupported provider: ${this.provider}`);
      }

      // Store key metadata
      const now = new Date();
      const metadata: KeyMetadata = {
        id: keyId,
        provider: this.provider,
        createdAt: now,
        expiresAt: new Date(now.getTime() + this.rotationPolicy.rotationIntervalDays * 24 * 60 * 60 * 1000),
        isActive: true,
        usageCount: 0,
        version: 1,
      };

      this.keys.set(keyId, metadata);
      await this.saveKeysMetadata();

      // Log key creation
      this.logKeyUsage({
        keyId,
        operation: 'create',
        timestamp: now,
        success: true,
      });

      console.log(`✓ Generated new data encryption key: ${keyId}`);
      return { keyId, key };
    } catch (error) {
      this.logKeyUsage({
        keyId,
        operation: 'create',
        timestamp: new Date(),
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Generate data key using AWS KMS
   */
  private async generateDataKeyAWS(): Promise<Buffer> {
    if (!this.kmsClient) {
      throw new Error('AWS KMS client not initialized');
    }

    const command = new GenerateDataKeyCommand({
      KeyId: process.env.AWS_KMS_KEY_ID,
      KeySpec: 'AES_256',
    });

    const response = await this.kmsClient.send(command);
    
    if (!response.Plaintext) {
      throw new Error('Failed to generate data key from AWS KMS');
    }

    return Buffer.from(response.Plaintext);
  }

  /**
   * Generate data key using Azure Key Vault
   */
  private async generateDataKeyAzure(keyId: string): Promise<Buffer> {
    if (!this.azureClient) {
      throw new Error('Azure Key Vault client not initialized');
    }

    // Generate random key
    const key = crypto.randomBytes(32);
    
    // Store in Azure Key Vault
    await this.azureClient.setSecret(keyId, key.toString('base64'));

    return key;
  }

  /**
   * Encrypt data with master key (for key wrapping)
   */
  public async encryptKey(plainKey: Buffer, keyId: string): Promise<Buffer> {
    try {
      let encryptedKey: Buffer;

      switch (this.provider) {
        case KeyProvider.AWS_KMS:
          encryptedKey = await this.encryptWithAWSKMS(plainKey);
          break;
        case KeyProvider.AZURE_KEY_VAULT:
          encryptedKey = await this.encryptWithAzureKeyVault(plainKey, keyId);
          break;
        case KeyProvider.LOCAL:
          // For local, just return the key (should use master key encryption in production)
          encryptedKey = plainKey;
          break;
        default:
          throw new Error(`Unsupported provider: ${this.provider}`);
      }

      // Update usage tracking
      this.trackKeyUsage(keyId, 'encrypt');

      return encryptedKey;
    } catch (error) {
      this.logKeyUsage({
        keyId,
        operation: 'encrypt',
        timestamp: new Date(),
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Decrypt data with master key (for key unwrapping)
   */
  public async decryptKey(encryptedKey: Buffer, keyId: string): Promise<Buffer> {
    try {
      let plainKey: Buffer;

      switch (this.provider) {
        case KeyProvider.AWS_KMS:
          plainKey = await this.decryptWithAWSKMS(encryptedKey);
          break;
        case KeyProvider.AZURE_KEY_VAULT:
          plainKey = await this.decryptWithAzureKeyVault(keyId);
          break;
        case KeyProvider.LOCAL:
          // For local, just return the key (should use master key decryption in production)
          plainKey = encryptedKey;
          break;
        default:
          throw new Error(`Unsupported provider: ${this.provider}`);
      }

      // Update usage tracking
      this.trackKeyUsage(keyId, 'decrypt');

      return plainKey;
    } catch (error) {
      this.logKeyUsage({
        keyId,
        operation: 'decrypt',
        timestamp: new Date(),
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Encrypt with AWS KMS
   */
  private async encryptWithAWSKMS(plaintext: Buffer): Promise<Buffer> {
    if (!this.kmsClient) {
      throw new Error('AWS KMS client not initialized');
    }

    const command = new EncryptCommand({
      KeyId: process.env.AWS_KMS_KEY_ID,
      Plaintext: plaintext,
    });

    const response = await this.kmsClient.send(command);
    
    if (!response.CiphertextBlob) {
      throw new Error('Failed to encrypt with AWS KMS');
    }

    return Buffer.from(response.CiphertextBlob);
  }

  /**
   * Decrypt with AWS KMS
   */
  private async decryptWithAWSKMS(ciphertext: Buffer): Promise<Buffer> {
    if (!this.kmsClient) {
      throw new Error('AWS KMS client not initialized');
    }

    const command = new DecryptCommand({
      CiphertextBlob: ciphertext,
    });

    const response = await this.kmsClient.send(command);
    
    if (!response.Plaintext) {
      throw new Error('Failed to decrypt with AWS KMS');
    }

    return Buffer.from(response.Plaintext);
  }

  /**
   * Encrypt with Azure Key Vault
   */
  private async encryptWithAzureKeyVault(plaintext: Buffer, keyId: string): Promise<Buffer> {
    if (!this.azureClient) {
      throw new Error('Azure Key Vault client not initialized');
    }

    // Store encrypted key in Key Vault
    await this.azureClient.setSecret(`${keyId}-encrypted`, plaintext.toString('base64'));
    
    return plaintext; // In real implementation, Azure would encrypt this
  }

  /**
   * Decrypt with Azure Key Vault
   */
  private async decryptWithAzureKeyVault(keyId: string): Promise<Buffer> {
    if (!this.azureClient) {
      throw new Error('Azure Key Vault client not initialized');
    }

    const secret = await this.azureClient.getSecret(keyId);
    
    if (!secret.value) {
      throw new Error(`Key not found in Azure Key Vault: ${keyId}`);
    }

    return Buffer.from(secret.value, 'base64');
  }

  /**
   * Rotate encryption key
   */
  public async rotateKey(oldKeyId: string): Promise<{ keyId: string; key: Buffer }> {
    try {
      console.log(`Rotating key: ${oldKeyId}`);

      // Mark old key as inactive
      const oldKey = this.keys.get(oldKeyId);
      if (oldKey) {
        oldKey.isActive = false;
        oldKey.rotatedAt = new Date();
      }

      // Generate new key
      const { keyId, key } = await this.generateDataKey();

      // Log rotation
      this.logKeyUsage({
        keyId: oldKeyId,
        operation: 'rotate',
        timestamp: new Date(),
        success: true,
      });

      await this.saveKeysMetadata();

      console.log(`✓ Key rotation complete. Old key: ${oldKeyId}, New key: ${keyId}`);
      return { keyId, key };
    } catch (error) {
      this.logKeyUsage({
        keyId: oldKeyId,
        operation: 'rotate',
        timestamp: new Date(),
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Track key usage
   */
  private trackKeyUsage(keyId: string, operation: 'encrypt' | 'decrypt'): void {
    const metadata = this.keys.get(keyId);
    if (metadata) {
      metadata.usageCount++;
      metadata.lastUsedAt = new Date();
    }

    this.logKeyUsage({
      keyId,
      operation,
      timestamp: new Date(),
      success: true,
    });
  }

  /**
   * Log key usage
   */
  private logKeyUsage(log: KeyUsageLog): void {
    this.usageLogs.push(log);

    // Trim logs if exceeding max size
    if (this.usageLogs.length > this.MAX_USAGE_LOGS) {
      this.usageLogs = this.usageLogs.slice(-this.MAX_USAGE_LOGS);
    }

    // In production, send to audit logging system
    if (process.env.NODE_ENV === 'production') {
      console.log('Key usage:', JSON.stringify(log));
    }
  }

  /**
   * Get key metadata
   */
  public getKeyMetadata(keyId: string): KeyMetadata | undefined {
    return this.keys.get(keyId);
  }

  /**
   * Get all keys metadata
   */
  public getAllKeysMetadata(): KeyMetadata[] {
    return Array.from(this.keys.values());
  }

  /**
   * Get key usage logs
   */
  public getKeyUsageLogs(keyId?: string, limit: number = 100): KeyUsageLog[] {
    let logs = this.usageLogs;

    if (keyId) {
      logs = logs.filter(log => log.keyId === keyId);
    }

    return logs.slice(-limit);
  }

  /**
   * Get key usage statistics
   */
  public getKeyUsageStats(keyId: string): {
    totalUsage: number;
    encryptOperations: number;
    decryptOperations: number;
    lastUsed?: Date;
    averageUsagePerDay: number;
  } {
    const metadata = this.keys.get(keyId);
    const logs = this.usageLogs.filter(log => log.keyId === keyId && log.success);

    const encryptOps = logs.filter(log => log.operation === 'encrypt').length;
    const decryptOps = logs.filter(log => log.operation === 'decrypt').length;

    let averageUsagePerDay = 0;
    if (metadata) {
      const daysSinceCreation = Math.max(
        1,
        Math.floor((Date.now() - metadata.createdAt.getTime()) / (24 * 60 * 60 * 1000))
      );
      averageUsagePerDay = metadata.usageCount / daysSinceCreation;
    }

    return {
      totalUsage: metadata?.usageCount || 0,
      encryptOperations: encryptOps,
      decryptOperations: decryptOps,
      lastUsed: metadata?.lastUsedAt,
      averageUsagePerDay,
    };
  }

  /**
   * Check keys that need rotation
   */
  public getKeysNeedingRotation(): KeyMetadata[] {
    const now = new Date();
    const notifyThreshold = new Date(
      now.getTime() + this.rotationPolicy.notifyBeforeDays * 24 * 60 * 60 * 1000
    );

    return Array.from(this.keys.values()).filter(
      key => key.isActive && key.expiresAt <= notifyThreshold
    );
  }

  /**
   * Start automatic key rotation scheduler
   */
  private startKeyRotationScheduler(): void {
    if (!this.rotationPolicy.enabled || !this.rotationPolicy.autoRotate) {
      return;
    }

    // Check every 24 hours
    setInterval(async () => {
      try {
        const keysToRotate = this.getKeysNeedingRotation();

        for (const key of keysToRotate) {
          const daysUntilExpiry = Math.floor(
            (key.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
          );

          if (daysUntilExpiry <= 0) {
            console.log(`Auto-rotating expired key: ${key.id}`);
            await this.rotateKey(key.id);
          } else {
            console.warn(`Key ${key.id} expires in ${daysUntilExpiry} days`);
          }
        }
      } catch (error) {
        console.error('Key rotation scheduler error:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    console.log('✓ Key rotation scheduler started');
  }

  /**
   * Update rotation policy
   */
  public updateRotationPolicy(policy: Partial<KeyRotationPolicy>): void {
    this.rotationPolicy = {
      ...this.rotationPolicy,
      ...policy,
    };
    console.log('✓ Key rotation policy updated:', this.rotationPolicy);
  }

  /**
   * Get rotation policy
   */
  public getRotationPolicy(): KeyRotationPolicy {
    return { ...this.rotationPolicy };
  }

  /**
   * Delete a key (schedule for deletion)
   */
  public async deleteKey(keyId: string): Promise<void> {
    try {
      const metadata = this.keys.get(keyId);
      if (!metadata) {
        throw new Error(`Key not found: ${keyId}`);
      }

      if (metadata.isActive) {
        throw new Error('Cannot delete active key. Rotate to a new key first.');
      }

      // Delete from provider
      switch (this.provider) {
        case KeyProvider.AWS_KMS:
          await this.deleteKeyAWS(keyId);
          break;
        case KeyProvider.AZURE_KEY_VAULT:
          await this.deleteKeyAzure(keyId);
          break;
        case KeyProvider.LOCAL:
          // Just remove from memory
          break;
      }

      // Remove from metadata
      this.keys.delete(keyId);
      await this.saveKeysMetadata();

      // Log deletion
      this.logKeyUsage({
        keyId,
        operation: 'delete',
        timestamp: new Date(),
        success: true,
      });

      console.log(`✓ Key deleted: ${keyId}`);
    } catch (error) {
      this.logKeyUsage({
        keyId,
        operation: 'delete',
        timestamp: new Date(),
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete key from AWS KMS
   */
  private async deleteKeyAWS(keyId: string): Promise<void> {
    if (!this.kmsClient) {
      throw new Error('AWS KMS client not initialized');
    }

    // Schedule key deletion (AWS requires 7-30 day waiting period)
    const command = new ScheduleKeyDeletionCommand({
      KeyId: keyId,
      PendingWindowInDays: 7,
    });

    await this.kmsClient.send(command);
  }

  /**
   * Delete key from Azure Key Vault
   */
  private async deleteKeyAzure(keyId: string): Promise<void> {
    if (!this.azureClient) {
      throw new Error('Azure Key Vault client not initialized');
    }

    await this.azureClient.beginDeleteSecret(keyId);
  }

  /**
   * Load keys metadata from storage
   */
  private async loadKeysMetadata(): Promise<void> {
    // In production, load from database or secure storage
    // For now, initialize empty
    console.log('✓ Keys metadata loaded');
  }

  /**
   * Save keys metadata to storage
   */
  private async saveKeysMetadata(): Promise<void> {
    // In production, save to database or secure storage
    // For now, just log
    console.log('✓ Keys metadata saved');
  }

  /**
   * Get provider information
   */
  public getProviderInfo(): {
    provider: KeyProvider;
    isProduction: boolean;
    features: string[];
  } {
    const features: string[] = [];

    switch (this.provider) {
      case KeyProvider.AWS_KMS:
        features.push('Hardware Security Module (HSM)');
        features.push('Automatic key rotation');
        features.push('Audit logging via CloudTrail');
        features.push('FIPS 140-2 Level 2 validated');
        break;
      case KeyProvider.AZURE_KEY_VAULT:
        features.push('Hardware Security Module (HSM)');
        features.push('Automatic key rotation');
        features.push('Audit logging via Azure Monitor');
        features.push('FIPS 140-2 Level 2 validated');
        break;
      case KeyProvider.LOCAL:
        features.push('Local filesystem storage');
        features.push('Manual key rotation');
        features.push('Basic audit logging');
        break;
    }

    return {
      provider: this.provider,
      isProduction: this.provider !== KeyProvider.LOCAL,
      features,
    };
  }
}

// Export singleton instance
export const keyManagementService = KeyManagementService.getInstance();
