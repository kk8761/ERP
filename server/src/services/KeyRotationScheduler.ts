import cron from 'node-cron';
import { keyManagementService } from './KeyManagementService';

/**
 * Key Rotation Scheduler
 * 
 * Automatically checks and rotates encryption keys every 90 days.
 * Runs daily at 2 AM to check for keys that need rotation.
 */

export class KeyRotationScheduler {
  private static instance: KeyRotationScheduler;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

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
  public start(): void {
    if (this.cronJob) {
      console.log('Key rotation scheduler is already running');
      return;
    }

    // Run daily at 2 AM
    this.cronJob = cron.schedule('0 2 * * *', async () => {
      await this.checkAndRotateKeys();
    });

    console.log('✓ Key rotation scheduler started (runs daily at 2 AM)');

    // Also check immediately on startup
    this.checkAndRotateKeys().catch(error => {
      console.error('Initial key rotation check failed:', error);
    });
  }

  /**
   * Stop the key rotation scheduler
   */
  public stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('✓ Key rotation scheduler stopped');
    }
  }

  /**
   * Check and rotate keys if needed
   */
  private async checkAndRotateKeys(): Promise<void> {
    if (this.isRunning) {
      console.log('Key rotation check already in progress, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      console.log('='.repeat(60));
      console.log(`Key Rotation Check - ${new Date().toISOString()}`);
      console.log('='.repeat(60));

      // Get rotation status
      const status = keyManagementService.getRotationStatus();
      console.log(`Active Keys: ${status.activeKeys}`);
      console.log(`Keys Needing Rotation: ${status.keysNeedingRotation}`);

      if (status.keysNeedingRotation === 0) {
        console.log('✓ No keys need rotation at this time');
        
        if (status.nextRotationDate) {
          const daysUntilNext = Math.floor(
            (status.nextRotationDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
          );
          console.log(`Next rotation scheduled in ${daysUntilNext} days`);
        }
        
        console.log('='.repeat(60));
        return;
      }

      // Perform rotation
      console.log(`Rotating ${status.keysNeedingRotation} key(s)...`);
      const results = await keyManagementService.checkRotationSchedule();

      // Log results
      for (const result of results) {
        console.log(`✓ Rotated key: ${result.oldKeyId} → ${result.newKeyId}`);
        
        // Send notification (implement based on your notification system)
        await this.sendRotationNotification(result);
      }

      console.log(`✓ Successfully rotated ${results.length} key(s)`);
      console.log('='.repeat(60));

    } catch (error) {
      console.error('Key rotation check failed:', error);
      
      // Send alert (implement based on your alerting system)
      await this.sendRotationAlert(error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Send rotation notification
   */
  private async sendRotationNotification(result: any): Promise<void> {
    // TODO: Implement notification logic
    // This could send emails, Slack messages, or create system notifications
    console.log(`Notification: Key ${result.oldKeyId} rotated to ${result.newKeyId}`);
  }

  /**
   * Send rotation alert on failure
   */
  private async sendRotationAlert(error: any): Promise<void> {
    // TODO: Implement alert logic
    // This should alert administrators about rotation failures
    console.error('ALERT: Key rotation failed:', error.message);
  }

  /**
   * Manually trigger key rotation check
   */
  public async triggerRotationCheck(): Promise<void> {
    console.log('Manually triggering key rotation check...');
    await this.checkAndRotateKeys();
  }

  /**
   * Get scheduler status
   */
  public getStatus(): {
    isScheduled: boolean;
    isRunning: boolean;
    nextRun?: Date;
  } {
    return {
      isScheduled: this.cronJob !== null,
      isRunning: this.isRunning,
      // Cron job next run time (2 AM next day)
      nextRun: this.cronJob ? this.getNextRunTime() : undefined,
    };
  }

  /**
   * Calculate next run time (2 AM next day)
   */
  private getNextRunTime(): Date {
    const now = new Date();
    const next = new Date(now);
    next.setHours(2, 0, 0, 0);

    // If 2 AM today has passed, schedule for tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }
}

// Export singleton instance
export const keyRotationScheduler = KeyRotationScheduler.getInstance();
