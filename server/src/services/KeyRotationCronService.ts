import cron from 'node-cron';
import { keyManagementService } from './KeyManagementService';

/**
 * Key Rotation Cron Service
 * 
 * Automatically checks and rotates encryption keys based on the rotation policy.
 * Runs daily at 2:00 AM to check for keys that need rotation.
 * 
 * Features:
 * - Daily automatic key rotation checks
 * - Configurable schedule via environment variable
 * - Email notifications for rotation events (if configured)
 * - Detailed logging of rotation activities
 */

export class KeyRotationCronService {
  private static instance: KeyRotationCronService;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): KeyRotationCronService {
    if (!KeyRotationCronService.instance) {
      KeyRotationCronService.instance = new KeyRotationCronService();
    }
    return KeyRotationCronService.instance;
  }

  /**
   * Start the cron job
   */
  public start(): void {
    if (this.cronJob) {
      console.log('⚠ Key rotation cron job is already running');
      return;
    }

    // Get schedule from environment or use default (daily at 2:00 AM)
    const schedule = process.env.KEY_ROTATION_CRON_SCHEDULE || '0 2 * * *';
    
    console.log(`Starting key rotation cron job (schedule: ${schedule})`);

    this.cronJob = cron.schedule(schedule, async () => {
      await this.runRotationCheck();
    });

    console.log('✓ Key rotation cron job started');
  }

  /**
   * Stop the cron job
   */
  public stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('✓ Key rotation cron job stopped');
    }
  }

  /**
   * Run rotation check manually
   */
  public async runRotationCheck(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠ Key rotation check is already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('\n=== Key Rotation Check Started ===');
      console.log(`Time: ${new Date().toISOString()}`);

      // Get rotation policy
      const policy = keyManagementService.getRotationPolicy();
      
      if (!policy.enabled) {
        console.log('⚠ Key rotation is disabled in policy, skipping check');
        return;
      }

      console.log('Rotation Policy:');
      console.log(`  Enabled: ${policy.enabled}`);
      console.log(`  Interval: ${policy.rotationIntervalDays} days`);
      console.log(`  Auto Rotate: ${policy.autoRotate}`);
      console.log(`  Notify Before: ${policy.notifyBeforeDays} days`);
      console.log();

      // Get all active keys
      const allKeys = keyManagementService.getAllKeysMetadata();
      const activeKeys = allKeys.filter(key => key.status === 'active');

      console.log(`Total keys: ${allKeys.length}`);
      console.log(`Active keys: ${activeKeys.length}`);
      console.log();

      if (activeKeys.length === 0) {
        console.log('No active keys found');
        return;
      }

      // Check each key for rotation
      const now = new Date();
      const keysNeedingRotation: string[] = [];
      const keysNearRotation: string[] = [];

      for (const key of activeKeys) {
        const daysUntilRotation = Math.floor(
          (key.nextRotationAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        if (daysUntilRotation <= 0) {
          keysNeedingRotation.push(key.keyId);
          console.log(`⚠ Key ${key.keyId} (${key.alias || 'no alias'}) needs rotation`);
        } else if (daysUntilRotation <= policy.notifyBeforeDays) {
          keysNearRotation.push(key.keyId);
          console.log(`⚠ Key ${key.keyId} (${key.alias || 'no alias'}) needs rotation in ${daysUntilRotation} days`);
        }
      }

      console.log();

      // Rotate keys if auto-rotation is enabled
      if (policy.autoRotate && keysNeedingRotation.length > 0) {
        console.log(`Auto-rotating ${keysNeedingRotation.length} key(s)...`);
        console.log();

        let successCount = 0;
        let failureCount = 0;

        for (const keyId of keysNeedingRotation) {
          try {
            const oldKey = keyManagementService.getKeyMetadata(keyId);
            console.log(`Rotating key: ${keyId} (${oldKey?.alias || 'no alias'})...`);
            
            const newKey = await keyManagementService.rotateKey(keyId);
            
            console.log(`✓ Rotated to new key: ${newKey.keyId}`);
            console.log(`  Version: ${newKey.version}`);
            console.log(`  Next rotation: ${newKey.nextRotationAt.toISOString()}`);
            console.log();

            successCount++;

            // Send notification if configured
            await this.sendRotationNotification(oldKey?.alias || keyId, newKey.keyId);

          } catch (error) {
            console.error(`✗ Failed to rotate key ${keyId}:`, error);
            console.log();
            failureCount++;

            // Send failure notification if configured
            await this.sendRotationFailureNotification(keyId, error);
          }
        }

        console.log('Rotation Summary:');
        console.log(`  Successful: ${successCount}`);
        console.log(`  Failed: ${failureCount}`);
        console.log();

      } else if (!policy.autoRotate && keysNeedingRotation.length > 0) {
        console.log(`⚠ ${keysNeedingRotation.length} key(s) need rotation but auto-rotation is disabled`);
        console.log('Enable auto-rotation or manually rotate keys using the rotation script');
        console.log();

        // Send notification about keys needing manual rotation
        await this.sendManualRotationNotification(keysNeedingRotation);
      }

      // Send notifications for keys near rotation
      if (keysNearRotation.length > 0) {
        console.log(`ℹ ${keysNearRotation.length} key(s) will need rotation soon`);
        await this.sendUpcomingRotationNotification(keysNearRotation);
      }

      const duration = Date.now() - startTime;
      console.log(`=== Key Rotation Check Complete (${duration}ms) ===\n`);

    } catch (error) {
      console.error('✗ Key rotation check failed:', error);
      
      // Send critical error notification
      await this.sendCriticalErrorNotification(error);
      
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Send rotation success notification
   */
  private async sendRotationNotification(oldKeyId: string, newKeyId: string): Promise<void> {
    // TODO: Implement email/Slack notification
    // This would integrate with your notification service
    console.log(`[Notification] Key rotated: ${oldKeyId} -> ${newKeyId}`);
  }

  /**
   * Send rotation failure notification
   */
  private async sendRotationFailureNotification(keyId: string, error: any): Promise<void> {
    // TODO: Implement email/Slack notification
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`[Notification] Key rotation failed: ${keyId} - ${errorMessage}`);
  }

  /**
   * Send manual rotation notification
   */
  private async sendManualRotationNotification(keyIds: string[]): Promise<void> {
    // TODO: Implement email/Slack notification
    console.log(`[Notification] ${keyIds.length} key(s) need manual rotation`);
  }

  /**
   * Send upcoming rotation notification
   */
  private async sendUpcomingRotationNotification(keyIds: string[]): Promise<void> {
    // TODO: Implement email/Slack notification
    console.log(`[Notification] ${keyIds.length} key(s) will need rotation soon`);
  }

  /**
   * Send critical error notification
   */
  private async sendCriticalErrorNotification(error: any): Promise<void> {
    // TODO: Implement email/Slack notification
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`[Notification] Critical error in key rotation: ${errorMessage}`);
  }

  /**
   * Get cron job status
   */
  public getStatus(): {
    isRunning: boolean;
    isCheckInProgress: boolean;
    schedule: string;
  } {
    return {
      isRunning: this.cronJob !== null,
      isCheckInProgress: this.isRunning,
      schedule: process.env.KEY_ROTATION_CRON_SCHEDULE || '0 2 * * *',
    };
  }
}

// Export singleton instance
export const keyRotationCronService = KeyRotationCronService.getInstance();
