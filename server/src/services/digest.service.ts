/**
 * Digest Notification Service
 * 
 * Handles batching and sending of digest notifications
 * Requirements: 27.8
 */

import { PrismaClient } from '@prisma/client';
import { sendEmail } from '../utils/email';

const prisma = new PrismaClient();

/**
 * Generate daily digest for a user
 * Requirements: 27.8
 */
export async function generateDailyDigest(userId: string) {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    return await generateDigest(userId, 'daily', startOfDay, endOfDay);
  } catch (error: any) {
    console.error('Error generating daily digest:', error);
    throw new Error(`Failed to generate daily digest: ${error.message}`);
  }
}

/**
 * Generate weekly digest for a user
 * Requirements: 27.8
 */
export async function generateWeeklyDigest(userId: string) {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return await generateDigest(userId, 'weekly', startOfWeek, endOfWeek);
  } catch (error: any) {
    console.error('Error generating weekly digest:', error);
    throw new Error(`Failed to generate weekly digest: ${error.message}`);
  }
}

/**
 * Generate digest for a specific period
 * Requirements: 27.8
 */
async function generateDigest(
  userId: string,
  frequency: 'daily' | 'weekly',
  periodStart: Date,
  periodEnd: Date
) {
  try {
    // Get notifications for the period
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (notifications.length === 0) {
      console.log(`No notifications for user ${userId} in digest period`);
      return null;
    }

    // Group notifications by category
    const categorySummary: Record<string, any> = {};
    notifications.forEach(notif => {
      const category = notif.category || 'general';
      if (!categorySummary[category]) {
        categorySummary[category] = {
          count: 0,
          unread: 0,
          urgent: 0,
          notifications: [],
        };
      }
      categorySummary[category].count++;
      if (!notif.isRead) categorySummary[category].unread++;
      if (notif.priority === 'urgent') categorySummary[category].urgent++;
      categorySummary[category].notifications.push({
        id: notif.id,
        title: notif.title,
        message: notif.message,
        priority: notif.priority,
        createdAt: notif.createdAt,
      });
    });

    // Generate HTML and text content
    const { htmlContent, textContent, subject } = generateDigestContent(
      notifications,
      categorySummary,
      frequency,
      periodStart,
      periodEnd
    );

    // Create digest record
    const digest = await prisma.digestNotification.create({
      data: {
        userId,
        frequency,
        periodStart,
        periodEnd,
        notificationCount: notifications.length,
        notificationIds: notifications.map(n => n.id),
        categories: categorySummary as any,
        status: 'pending',
        subject,
        htmlContent,
        textContent,
      },
    });

    return digest;
  } catch (error: any) {
    console.error('Error generating digest:', error);
    throw new Error(`Failed to generate digest: ${error.message}`);
  }
}

/**
 * Generate digest content (HTML and text)
 * Requirements: 27.8
 */
function generateDigestContent(
  notifications: any[],
  categorySummary: Record<string, any>,
  frequency: string,
  periodStart: Date,
  periodEnd: Date
) {
  const subject = `Your ${frequency} notification digest - ${notifications.length} notifications`;

  // Generate HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .category { margin: 20px 0; }
        .category-title { font-size: 18px; font-weight: bold; color: #667eea; margin-bottom: 10px; }
        .notification { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; border-radius: 4px; }
        .notification.urgent { border-left-color: #dc3545; }
        .notification.high { border-left-color: #fd7e14; }
        .notification-title { font-weight: bold; margin-bottom: 5px; }
        .notification-meta { font-size: 12px; color: #666; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Digest</h1>
          <p>${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}</p>
        </div>
        
        <div class="summary">
          <h2>Summary</h2>
          <p><strong>${notifications.length}</strong> notifications across <strong>${Object.keys(categorySummary).length}</strong> categories</p>
          <ul>
            ${Object.entries(categorySummary).map(([category, data]: [string, any]) => `
              <li>${category}: ${data.count} total, ${data.unread} unread${data.urgent > 0 ? `, ${data.urgent} urgent` : ''}</li>
            `).join('')}
          </ul>
        </div>

        ${Object.entries(categorySummary).map(([category, data]: [string, any]) => `
          <div class="category">
            <div class="category-title">${category.charAt(0).toUpperCase() + category.slice(1)} (${data.count})</div>
            ${data.notifications.slice(0, 10).map((notif: any) => `
              <div class="notification ${notif.priority}">
                <div class="notification-title">${notif.title}</div>
                <div>${notif.message.substring(0, 200)}${notif.message.length > 200 ? '...' : ''}</div>
                <div class="notification-meta">
                  ${new Date(notif.createdAt).toLocaleString()} | Priority: ${notif.priority}
                </div>
              </div>
            `).join('')}
            ${data.count > 10 ? `<p><em>And ${data.count - 10} more...</em></p>` : ''}
          </div>
        `).join('')}

        <div class="footer">
          <p>This is an automated digest. You can customize your notification preferences in your account settings.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Generate text content
  const textContent = `
Your ${frequency} Notification Digest
${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}

SUMMARY
-------
${notifications.length} notifications across ${Object.keys(categorySummary).length} categories

${Object.entries(categorySummary).map(([category, data]: [string, any]) => 
  `- ${category}: ${data.count} total, ${data.unread} unread${data.urgent > 0 ? `, ${data.urgent} urgent` : ''}`
).join('\n')}

NOTIFICATIONS
-------------
${Object.entries(categorySummary).map(([category, data]: [string, any]) => `
${category.toUpperCase()} (${data.count})
${data.notifications.slice(0, 10).map((notif: any) => `
  • ${notif.title}
    ${notif.message.substring(0, 200)}${notif.message.length > 200 ? '...' : ''}
    ${new Date(notif.createdAt).toLocaleString()} | Priority: ${notif.priority}
`).join('\n')}
${data.count > 10 ? `  And ${data.count - 10} more...` : ''}
`).join('\n')}

---
This is an automated digest. You can customize your notification preferences in your account settings.
  `.trim();

  return { htmlContent, textContent, subject };
}

/**
 * Send digest to user
 * Requirements: 27.8
 */
export async function sendDigest(digestId: string) {
  try {
    const digest = await prisma.digestNotification.findUnique({
      where: { id: digestId },
    });

    if (!digest || digest.status !== 'pending') {
      throw new Error('Digest not found or already sent');
    }

    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: digest.userId },
      select: { email: true, name: true },
    });

    if (!user?.email) {
      throw new Error('User email not found');
    }

    // Send email
    const result = await sendEmail({
      to: user.email,
      subject: digest.subject || 'Your notification digest',
      html: digest.htmlContent || '',
      text: digest.textContent || '',
    });

    // Update digest status
    await prisma.digestNotification.update({
      where: { id: digestId },
      data: {
        status: result.success ? 'sent' : 'failed',
        sentAt: result.success ? new Date() : undefined,
      },
    });

    return result;
  } catch (error: any) {
    console.error('Error sending digest:', error);
    
    // Mark as failed
    await prisma.digestNotification.updateMany({
      where: { id: digestId, status: 'pending' },
      data: { status: 'failed' },
    });

    throw new Error(`Failed to send digest: ${error.message}`);
  }
}

/**
 * Process all pending digests
 * Requirements: 27.8
 */
export async function processPendingDigests(frequency: 'daily' | 'weekly') {
  try {
    // Get users with digest preferences enabled
    const preferences = await prisma.notificationPreference.findMany({
      where: {
        digestEnabled: true,
        digestFrequency: frequency,
      },
    });

    const uniqueUserIds = [...new Set(preferences.map(p => p.userId))];

    console.log(`Processing ${frequency} digests for ${uniqueUserIds.length} users`);

    const results = [];

    for (const userId of uniqueUserIds) {
      try {
        // Generate digest
        const digest = frequency === 'daily' 
          ? await generateDailyDigest(userId)
          : await generateWeeklyDigest(userId);

        if (digest) {
          // Send digest
          await sendDigest(digest.id);
          results.push({ userId, success: true });
        } else {
          results.push({ userId, success: true, message: 'No notifications to digest' });
        }
      } catch (error: any) {
        console.error(`Error processing digest for user ${userId}:`, error);
        results.push({ userId, success: false, error: error.message });
      }
    }

    return results;
  } catch (error: any) {
    console.error('Error processing pending digests:', error);
    throw new Error(`Failed to process digests: ${error.message}`);
  }
}

/**
 * Get digest history for user
 * Requirements: 27.8
 */
export async function getUserDigestHistory(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    frequency?: 'daily' | 'weekly';
  } = {}
) {
  try {
    const { limit = 30, offset = 0, frequency } = options;

    const where: any = { userId };
    if (frequency) {
      where.frequency = frequency;
    }

    const [digests, total] = await Promise.all([
      prisma.digestNotification.findMany({
        where,
        orderBy: { periodEnd: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.digestNotification.count({ where }),
    ]);

    return {
      digests,
      total,
      hasMore: offset + limit < total,
    };
  } catch (error: any) {
    console.error('Error getting digest history:', error);
    throw new Error(`Failed to get digest history: ${error.message}`);
  }
}

/**
 * Customize digest preferences for user
 * Requirements: 27.8
 */
export async function updateDigestPreferences(
  userId: string,
  eventType: string,
  preferences: {
    digestEnabled?: boolean;
    digestFrequency?: 'daily' | 'weekly';
    digestTime?: string;
    digestDay?: string;
  }
) {
  try {
    return await prisma.notificationPreference.upsert({
      where: {
        userId_eventType: {
          userId,
          eventType,
        },
      },
      update: preferences,
      create: {
        userId,
        eventType,
        ...preferences,
      },
    });
  } catch (error: any) {
    console.error('Error updating digest preferences:', error);
    throw new Error(`Failed to update digest preferences: ${error.message}`);
  }
}

export default {
  generateDailyDigest,
  generateWeeklyDigest,
  sendDigest,
  processPendingDigests,
  getUserDigestHistory,
  updateDigestPreferences,
};
