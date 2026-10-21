/**
 * Key Rotation Scheduler Service
 * Task 38.2: Implement encryption at rest - Automatic key rotation
 * 
 * Automatically rotates encryption keys every 90 days as per requirement 15.3:
 * "WHEN encryption keys are managed, THE System SHALL rotate keys every 90 days"
 * 
 * Features:
 * - Automatic key rotation based on expiration
 * - Daily checks for expiring keys
 * - Warning notifications 7 days before expiration
 * - Audit logging of all rotation events
 * - Graceful error handling and retry logic
 */

import { EncryptionService } from './encryption.service';
import { KeyManagementService } from './key-management.service';
import { encryptionService } from './EncryptionService';
import prisma from '../config/prisma';

export interface KeyRotationConfig {
  enabled: boolean;
  checkIntervalHours: number; // How often to check for expiring keys
  warningThresholdDays: number; // Days before expiration to send warnings
  autoRotate: boolean; // Automatically rotate expired keys
  retryAttempts: number; // Number of retry attempts on failure
  retryDelayMinutes: number; // Delay between retry attempts
}

export class KeyRotationScheduler {
  private static instance: KeyRotationScheduler;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private config: KeyRotationConfig = {
    enabled: true,
    checkIntervalHours: 24, // Check daily
    warningThresholdDays: 7,
    autoRotate: true,
    retryAttempts: 3,
    retryDelayMinutes: 5,
  };

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): KeyRotationScheduler {
    if (!KeyRotationScheduler.instance) {
      KeyRotationScheduler.instance = new KeyRotationScheduler();
    }
    return KeyRotationScheduler.instance;
  }

  /**
   * Start the key rotation scheduler
   */
  public start(config?: Partial<KeyRotationConfig>): void {
    if (this.isRunning) {
      console.log('⚠️  Key rotation scheduler is already running');
      return;
    }

    // Merge custom config with defaults
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (!this.config.enabled) {
      console.log('ℹ️  Key rotation scheduler is disabled');
      return;
    }

    console.log('🔐 Starting key rotation scheduler...');
    console.log(`   Check interval: ${this.config.checkIntervalHours} hours`);
    console.log(`   Warning threshold: ${this.config.warningThresholdDays} days`);
    console.log(`   Auto-rotate: ${this.config.autoRotate ? 'enabled' : 'disabled'}`);

    // Run initial check after 1 minute
    setTimeout(() => {
      this.checkAndRotateKeys().catch(error => {
        console.error('❌ Initial key rotation check failed:', error);
      });
    }, 60 * 1000);

    // Schedule periodic checks
    const intervalMs = this.config.checkIntervalHours * 60 * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.checkAndRotateKeys().catch(error => {
        console.error('❌ Scheduled key rotation check failed:', error);
      });
    }, intervalMs);

    this.isRunning = true;
    console.log('✅ Key rotation scheduler started');
  }

  /**
   * Stop the key rotation scheduler
   */
  public stop(): void {
    if (!this.isRunning) {
      console.log('⚠️  Key rotation scheduler is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('✅ Key rotation scheduler stopped');
  }

  /**
   * Check for expiring keys and rotate if necessary
   */
  public async checkAndRotateKeys(): Promise<void> {
    try {
      console.log('🔍 Checking encryption keys for rotation...');

      // Check both encryption service implementations
      await this.checkEncryptionServiceKeys();
      await this.checkKeyManagementServiceKeys();

      console.log('✅ Key rotation check completed');
    } catch (error) {
      console.error('❌ Key rotation check failed:', error);
      throw error;
    }
  }

  /**
   * Check keys in EncryptionService (encryption.service.ts)
   */
  private async checkEncryptionServiceKeys(): Promise<void> {
    try {
      const status = await EncryptionService.getKeyStatus();

      console.log(`   Current key: ${status.currentKeyId}`);
      console.log(`   Days until expiry: ${status.daysUntilExpiry}`);

      // Send warning if key is expiring soon
      if (status.daysUntilExpiry <= this.config.warningThresholdDays && status.daysUntilExpiry > 0) {
        await this.sendExpirationWarning(
          status.currentKeyId,
          status.daysUntilExpiry,
          status.expiresAt
        );
      }

      // Rotate if expired or should rotate
      if (status.shouldRotate && this.config.autoRotate) {
        console.log('⚠️  Key rotation required');
        await this.rotateKeyWithRetry('EncryptionService');
      }
    } catch (error) {
      console.error('❌ Failed to check EncryptionService keys:', error);
      throw error;
    }
  }

  /**
   * Check keys in KeyManagementService (key-management.service.ts)
   */
  private async checkKeyManagementServiceKeys(): Promise<void> {
    try {
      // Get expiring keys
      const expiringKeys = await KeyManagementService.getExpiringKeys();
      
      if (expiringKeys.length > 0) {
        console.log(`   Found ${expiringKeys.length} expiring key(s)`);
        
        for (const key of expiringKeys) {
          const daysUntilExpiry = Math.floor(
            (key.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
          );
          
          await this.sendExpirationWarning(key.id, daysUntilExpiry, key.expiresAt);
        }
      }

      // Get expired keys
      const expiredKeys = await KeyManagementService.getExpiredKeys();
      
      if (expiredKeys.length > 0 && this.config.autoRotate) {
        console.log(`   Found ${expiredKeys.length} expired key(s)`);
        
        for (const key of expiredKeys) {
          console.log(`   Rotating expired key: ${key.id}`);
          await this.rotateKeyWithRetry('KeyManagementService', key.id);
        }
      }
    } catch (error) {
      console.error('❌ Failed to check KeyManagementService keys:', error);
      throw error;
    }
  }

  /**
   * Rotate key with retry logic
   */
  private async rotateKeyWithRetry(
    service: 'EncryptionService' | 'KeyManagementService',
    keyId?: string
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`   Rotation attempt ${attempt}/${this.config.retryAttempts}...`);

        if (service === 'EncryptionService') {
          await EncryptionService.rotateEncryptionKey();
        } else if (keyId) {
          await KeyManagementService.rotateKey(keyId);
        }

        console.log('   ✅ Key rotation successful');
        
        // Log successful rotation
        await this.logRotationEvent(service, keyId, 'SUCCESS');
        
        return; // Success, exit retry loop
      } catch (error) {
        lastError = error as Error;
        console.error(`   ❌ Rotation attempt ${attempt} failed:`, error);

        if (attempt < this.config.retryAttempts) {
          const delayMs = this.config.retryDelayMinutes * 60 * 1000;
          console.log(`   ⏳ Retrying in ${this.config.retryDelayMinutes} minutes...`);
          await this.delay(delayMs);
        }
      }
    }

    // All attempts failed
    console.error(`   ❌ Key rotation failed after ${this.config.retryAttempts} attempts`);
    await this.logRotationEvent(service, keyId, 'FAILED', lastError?.message);
    
    // Send alert to administrators
    await this.sendRotationFailureAlert(service, keyId, lastError);
  }

  /**
   * Send expiration warning
   */
  private async sendExpirationWarning(
    keyId: string,
    daysUntilExpiry: number,
    expiresAt: Date
  ): Promise<void> {
    console.log(`   ⚠️  WARNING: Key ${keyId} expires in ${daysUntilExpiry} days (${expiresAt.toISOString()})`);

    // Log warning event
    await this.logRotationEvent('Warning', keyId, 'EXPIRING_SOON', 
      `Key expires in ${daysUntilExpiry} days`);

    // TODO: Send email/notification to administrators
    // This could integrate with a notification service
  }

  /**
   * Send rotation failure alert
   */
  private async sendRotationFailureAlert(
    service: string,
    keyId: string | undefined,
    error: Error | null
  ): Promise<void> {
    console.error('   🚨 ALERT: Key rotation failed!');
    console.error(`      Service: ${service}`);
    console.error(`      Key ID: ${keyId || 'N/A'}`);
    console.error(`      Error: ${error?.message || 'Unknown error'}`);

    // TODO: Send urgent alert to administrators
    // This should integrate with alerting systems (email, Slack, PagerDuty, etc.)
  }

  /**
   * Log rotation event to audit log
   */
  private async logRotationEvent(
    service: string,
    keyId: string | undefined,
    status: string,
    details?: string
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: 'KEY_ROTATION',
          entity: 'EncryptionKey',
          entityId: keyId || 'N/A',
          details: {
            service,
            status,
            details,
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to log rotation event:', error);
      // Don't throw - logging failure shouldn't stop rotation
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get scheduler status
   */
  public getStatus(): {
    isRunning: boolean;
    config: KeyRotationConfig;
    nextCheckTime: Date | null;
  } {
    let nextCheckTime: Date | null = null;
    
    if (this.isRunning && this.intervalId) {
      const intervalMs = this.config.checkIntervalHours * 60 * 60 * 1000;
      nextCheckTime = new Date(Date.now() + intervalMs);
    }

    return {
      isRunning: this.isRunning,
      config: this.config,
      nextCheckTime,
    };
  }

  /**
   * Update scheduler configuration
   */
  public updateConfig(config: Partial<KeyRotationConfig>): void {
    const wasRunning = this.isRunning;
    
    if (wasRunning) {
      this.stop();
    }

    this.config = { ...this.config, ...config };

    if (wasRunning && this.config.enabled) {
      this.start();
    }

    console.log('✅ Key rotation scheduler configuration updated');
  }

  /**
   * Force immediate key rotation check (manual trigger)
   */
  public async forceCheck(): Promise<void> {
    console.log('🔐 Forcing immediate key rotation check...');
    await this.checkAndRotateKeys();
  }
}

// Export singleton instance
export const keyRotationScheduler = KeyRotationScheduler.getInstance();
