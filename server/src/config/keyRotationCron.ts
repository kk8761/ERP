import cron from 'node-cron';
import { keyManagementService } from '../services/KeyManagementService';

/**
 * Key Rotation Cron Job
 * 
 * Automatically checks and rotates encryption keys every day at 2 AM.
 * This ensures compliance with the 90-day key rotation policy (Requirement 15.5).
 * 
 * Schedule: Daily at 2:00 AM
 * Cron Expression: 0 2 * * *
 */

export function setupKeyRotationCron() {
  // Run daily at 2:00 AM
  const task = cron.schedule('0 2 * * *', async () => {
    console.log('='.repeat(60));
    console.log('Scheduled Key Rotation Check');
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    try {
      const results = await keyManagementService.checkAndRotateKeys();

      if (results.length === 0) {
        console.log('✓ No keys require rotation at this time');
      } else {
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;

        console.log(`✓ Rotation check complete: ${successCount} successful, ${failureCount} failed`);

        if (failureCount > 0) {
          console.error('⚠ Some key rotations failed. Manual intervention may be required.');
          // TODO: Send alert notification to administrators
        }
      }
    } catch (error) {
      console.error('✗ Scheduled key rotation check failed:', error);
      // TODO: Send critical alert to administrators
    }

    console.log('='.repeat(60));
  }, {
    scheduled: true,
    timezone: 'UTC',
  });

  console.log('✓ Key rotation cron job scheduled (daily at 2:00 AM UTC)');

  return task;
}

/**
 * Setup key expiry warning cron job
 * 
 * Checks for keys expiring within 7 days and sends warnings.
 * Runs daily at 9:00 AM.
 */
export function setupKeyExpiryWarningCron() {
  const task = cron.schedule('0 9 * * *', async () => {
    try {
      const allKeys = await keyManagementService.listKeys();
      const now = new Date();
      const warningThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

      const expiringKeys = allKeys.filter(key => {
        if (key.status !== 'ACTIVE') return false;
        const timeUntilExpiry = key.nextRotationAt.getTime() - now.getTime();
        return timeUntilExpiry > 0 && timeUntilExpiry <= warningThreshold;
      });

      if (expiringKeys.length > 0) {
        console.warn('⚠ Key Expiry Warning:');
        for (const key of expiringKeys) {
          const daysUntilExpiry = Math.floor(
            (key.nextRotationAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
          );
          console.warn(`  - Key ${key.keyId} expires in ${daysUntilExpiry} days`);
        }
        // TODO: Send warning notification to administrators
      }
    } catch (error) {
      console.error('✗ Key expiry warning check failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC',
  });

  console.log('✓ Key expiry warning cron job scheduled (daily at 9:00 AM UTC)');

  return task;
}

/**
 * Setup key usage monitoring cron job
 * 
 * Monitors key usage patterns and detects anomalies.
 * Runs every 6 hours.
 */
export function setupKeyUsageMonitoringCron() {
  const task = cron.schedule('0 */6 * * *', async () => {
    try {
      const allKeys = await keyManagementService.listKeys();

      for (const key of allKeys) {
        const stats = await keyManagementService.getKeyUsageStats(key.keyId);

        // Check for unusual usage patterns
        if (stats.failedOperations > 100) {
          console.warn(`⚠ High failure rate detected for key ${key.keyId}: ${stats.failedOperations} failed operations`);
          // TODO: Send alert notification
        }

        // Check for inactive keys
        if (key.status === 'ACTIVE' && stats.lastUsed) {
          const daysSinceLastUse = Math.floor(
            (Date.now() - stats.lastUsed.getTime()) / (24 * 60 * 60 * 1000)
          );

          if (daysSinceLastUse > 30) {
            console.warn(`⚠ Key ${key.keyId} has not been used in ${daysSinceLastUse} days`);
            // TODO: Consider marking as inactive
          }
        }
      }
    } catch (error) {
      console.error('✗ Key usage monitoring check failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC',
  });

  console.log('✓ Key usage monitoring cron job scheduled (every 6 hours)');

  return task;
}

/**
 * Initialize all key management cron jobs
 */
export function initializeKeyManagementCrons() {
  console.log('Initializing key management cron jobs...');
  
  setupKeyRotationCron();
  setupKeyExpiryWarningCron();
  setupKeyUsageMonitoringCron();
  
  console.log('✓ All key management cron jobs initialized');
}
