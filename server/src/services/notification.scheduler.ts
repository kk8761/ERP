/**
 * Notification Scheduler
 * 
 * Handles scheduled tasks for notifications
 * - Processes daily/weekly digests
 * - Cleans up expired notifications
 * Requirements: 27.8
 */

import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import * as DigestNotificationService from './digest-notification.service';

const prisma = new PrismaClient();

/**
 * Initialize notification scheduled tasks
 */
export function initializeNotificationScheduler() {
  console.log('Initializing notification scheduler...');

  // Process immediate digests every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const results = await DigestNotificationService.processPendingDigests('immediate');
      if (results.length > 0) {
        console.log(`Immediate digests processed: ${results.length} user(s)`);
      }
    } catch (error) {
      console.error('Error processing immediate digests:', error);
    }
  });

  // Process hourly digests every hour at :00
  cron.schedule('0 * * * *', async () => {
    console.log('Running hourly digest processing...');
    try {
      const results = await DigestNotificationService.processPendingDigests('hourly');
      console.log(`Hourly digests processed: ${results.length} user(s)`);
    } catch (error) {
      console.error('Error processing hourly digests:', error);
    }
  });

  // Process daily digests every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily digest processing...');
    try {
      const results = await DigestNotificationService.processPendingDigests('daily');
      console.log(`Daily digests processed: ${results.length} user(s)`);
    } catch (error) {
      console.error('Error processing daily digests:', error);
    }
  });

  // Process weekly digests every Monday at 9:00 AM
  cron.schedule('0 9 * * 1', async () => {
    console.log('Running weekly digest processing...');
    try {
      const results = await DigestNotificationService.processPendingDigests('weekly');
      console.log(`Weekly digests processed: ${results.length} user(s)`);
    } catch (error) {
      console.error('Error processing weekly digests:', error);
    }
  });

  // Clean up expired notifications every day at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Cleaning up expired notifications...');
    try {
      const result = await cleanupExpiredNotifications();
      console.log(`Expired notifications cleaned up: ${result.count}`);
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
    }
  });

  // Archive old read notifications every week on Sunday at 3:00 AM
  cron.schedule('0 3 * * 0', async () => {
    console.log('Archiving old read notifications...');
    try {
      const result = await archiveOldNotifications();
      console.log(`Old notifications archived: ${result.count}`);
    } catch (error) {
      console.error('Error archiving old notifications:', error);
    }
  });

  console.log('Notification scheduler initialized successfully');
}

/**
 * Clean up expired notifications
 */
async function cleanupExpiredNotifications() {
  try {
    const now = new Date();

    const result = await prisma.notification.deleteMany({
      where: {
        expiresAt: {
          lte: now,
        },
      },
    });

    return result;
  } catch (error: any) {
    console.error('Error cleaning up expired notifications:', error);
    throw error;
  }
}

/**
 * Archive old read notifications (older than 90 days)
 */
async function archiveOldNotifications() {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // In a production system, you might move these to an archive table
    // For now, we'll just delete them
    const result = await prisma.notification.deleteMany({
      where: {
        isRead: true,
        readAt: {
          lte: ninetyDaysAgo,
        },
      },
    });

    return result;
  } catch (error: any) {
    console.error('Error archiving old notifications:', error);
    throw error;
  }
}

/**
 * Manual trigger for daily digest processing
 */
export async function triggerDailyDigestProcessing() {
  try {
    console.log('Manually triggering daily digest processing...');
    const results = await DigestNotificationService.processPendingDigests('daily');
    return {
      success: true,
      processed: results.length,
      results,
    };
  } catch (error: any) {
    console.error('Error in manual daily digest processing:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Manual trigger for weekly digest processing
 */
export async function triggerWeeklyDigestProcessing() {
  try {
    console.log('Manually triggering weekly digest processing...');
    const results = await DigestNotificationService.processPendingDigests('weekly');
    return {
      success: true,
      processed: results.length,
      results,
    };
  } catch (error: any) {
    console.error('Error in manual weekly digest processing:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  initializeNotificationScheduler,
  triggerDailyDigestProcessing,
  triggerWeeklyDigestProcessing,
};
