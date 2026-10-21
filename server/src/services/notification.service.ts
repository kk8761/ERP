/**
 * Notification Service
 * 
 * Comprehensive notification and alerting system
 * Supports email, SMS, in-app, and push notifications
 * Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7, 27.8
 */

import prisma from '../config/prisma';
import { sendEmail } from '../utils/email';
import { sendSMS } from '../utils/sms';

export interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type?: string;
  category?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
  actionLabel?: string;
  metadata?: any;
  templateCode?: string;
  templateVariables?: Record<string, any>;
  expiresAt?: Date;
}

export interface NotificationDeliveryOptions {
  channels?: ('email' | 'sms' | 'in_app' | 'push')[];
  forceDelivery?: boolean; // Bypass user preferences
  emailAddress?: string;
  phoneNumber?: string;
}

/**
 * Create and send a notification
 * Requirements: 27.1, 27.2
 */
export async function createNotification(
  data: NotificationData,
  deliveryOptions?: NotificationDeliveryOptions
) {
  try {
    // Use template if provided
    let notificationContent = {
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl,
      actionLabel: data.actionLabel,
    };

    let templateId: string | undefined;

    if (data.templateCode) {
      const template = await getActiveTemplate(data.templateCode, data.templateVariables);
      if (template) {
        notificationContent = {
          title: template.subject,
          message: template.body,
          actionUrl: template.actionUrl || data.actionUrl,
          actionLabel: template.actionLabel || data.actionLabel,
        };
        templateId = template.id;
      }
    }

    // Create the notification
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: notificationContent.title,
        message: notificationContent.message,
        type: data.type || 'general',
        category: data.category,
        priority: data.priority || 'normal',
        actionUrl: notificationContent.actionUrl,
        actionLabel: notificationContent.actionLabel,
        metadata: data.metadata,
        templateId,
        expiresAt: data.expiresAt,
      },
    });

    // Deliver notification through appropriate channels
    await deliverNotification(notification.id, deliveryOptions);

    return notification;
  } catch (error: any) {
    console.error('Error creating notification:', error);
    throw new Error(`Failed to create notification: ${error.message}`);
  }
}

/**
 * Deliver notification through specified channels
 * Requirements: 27.2, 27.3, 27.7
 */
export async function deliverNotification(
  notificationId: string,
  options?: NotificationDeliveryOptions
) {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      include: { template: true },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    // Get user preferences
    const preferences = await getUserPreferences(notification.userId, notification.type);

    // Determine channels to use
    let channels = options?.channels || ['in_app'];
    
    if (!options?.forceDelivery && preferences) {
      // Check if we're in DND period
      if (isInDNDPeriod(preferences)) {
        // Only deliver urgent notifications during DND
        if (notification.priority !== 'urgent') {
          channels = ['in_app']; // Only in-app during DND
        }
      }

      // Apply user preferences
      if (!Array.isArray(preferences) && preferences.channels && preferences.channels.length > 0) {
        channels = preferences.channels as any[];
      }
    }

    // In-app notification is always created
    await prisma.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: 'in_app',
        recipientAddress: notification.userId,
        status: 'delivered',
        deliveredAt: new Date(),
      },
    });

    // Deliver to other channels
    const deliveryPromises = [];

    if (channels.includes('email') && (options?.emailAddress || (preferences && !Array.isArray(preferences) && preferences.enableEmail))) {
      deliveryPromises.push(sendEmailNotification(notification, options?.emailAddress));
    }

    if (channels.includes('sms') && (options?.phoneNumber || (preferences && !Array.isArray(preferences) && preferences.enableSMS))) {
      deliveryPromises.push(sendSMSNotification(notification, options?.phoneNumber));
    }

    if (channels.includes('push') && (preferences && !Array.isArray(preferences) && preferences.enablePush)) {
      deliveryPromises.push(sendPushNotification(notification));
    }

    await Promise.allSettled(deliveryPromises);

    return { success: true, channels };
  } catch (error: any) {
    console.error('Error delivering notification:', error);
    throw new Error(`Failed to deliver notification: ${error.message}`);
  }
}

/**
 * Send email notification
 * Requirements: 27.2, 27.7
 */
async function sendEmailNotification(notification: any, emailAddress?: string) {
  try {
    // Get user email if not provided
    if (!emailAddress) {
      const user = await prisma.user.findUnique({
        where: { id: notification.userId },
        select: { email: true },
      });
      emailAddress = user?.email;
    }

    if (!emailAddress) {
      throw new Error('No email address available');
    }

    const delivery = await prisma.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: 'email',
        recipientAddress: emailAddress,
        status: 'pending',
      },
    });

    // Send email using utility
    const htmlBody = notification.template?.htmlBody || 
      `<div>
        <h2>${notification.title}</h2>
        <p>${notification.message}</p>
        ${notification.actionUrl ? `<a href="${notification.actionUrl}">${notification.actionLabel || 'View Details'}</a>` : ''}
      </div>`;

    const result = await sendEmail({
      to: emailAddress,
      subject: notification.title,
      html: htmlBody,
      text: notification.message,
    });

    // Update delivery status
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: result.success ? 'sent' : 'failed',
        sentAt: result.success ? new Date() : undefined,
        errorMessage: result.success ? undefined : result.error,
        providerId: result.messageId,
      },
    });

    return result;
  } catch (error: any) {
    console.error('Error sending email notification:', error);
    await prisma.notificationDelivery.updateMany({
      where: {
        notificationId: notification.id,
        channel: 'email',
        status: 'pending',
      },
      data: {
        status: 'failed',
        failedAt: new Date(),
        errorMessage: error.message,
      },
    });
    throw error;
  }
}

/**
 * Send SMS notification
 * Requirements: 27.2, 27.7
 */
async function sendSMSNotification(notification: any, phoneNumber?: string) {
  try {
    // Get user phone if not provided
    if (!phoneNumber) {
      const user = await prisma.user.findUnique({
        where: { id: notification.userId },
        select: { phone: true },
      });
      phoneNumber = user?.phone || undefined;
    }

    if (!phoneNumber) {
      throw new Error('No phone number available');
    }

    const delivery = await prisma.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: 'sms',
        recipientAddress: phoneNumber,
        status: 'pending',
      },
    });

    // Use SMS-specific body if available from template
    const smsBody = notification.template?.smsBody || 
      `${notification.title}: ${notification.message.substring(0, 160)}`;

    const result = await sendSMS({
      to: phoneNumber,
      message: smsBody,
    });

    // Update delivery status
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: result.success ? 'sent' : 'failed',
        sentAt: result.success ? new Date() : undefined,
        errorMessage: result.success ? undefined : result.error,
        providerId: result.messageId,
      },
    });

    return result;
  } catch (error: any) {
    console.error('Error sending SMS notification:', error);
    await prisma.notificationDelivery.updateMany({
      where: {
        notificationId: notification.id,
        channel: 'sms',
        status: 'pending',
      },
      data: {
        status: 'failed',
        failedAt: new Date(),
        errorMessage: error.message,
      },
    });
    throw error;
  }
}

/**
 * Send push notification
 * Requirements: 27.2, 27.7
 */
async function sendPushNotification(notification: any) {
  try {
    // This is a placeholder for push notification integration
    // Would integrate with FCM, APNS, or similar service
    
    const delivery = await prisma.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: 'push',
        recipientAddress: notification.userId,
        status: 'pending',
      },
    });

    // TODO: Implement actual push notification sending
    console.log('Push notification would be sent here');

    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}

/**
 * Get user notification preferences
 * Requirements: 27.3
 */
export async function getUserPreferences(userId: string, eventType?: string) {
  try {
    if (eventType) {
      return await prisma.notificationPreference.findUnique({
        where: {
          userId_eventType: {
            userId,
            eventType,
          },
        },
      });
    }

    return await prisma.notificationPreference.findMany({
      where: { userId },
    });
  } catch (error: any) {
    console.error('Error getting user preferences:', error);
    return null;
  }
}

/**
 * Update user notification preferences
 * Requirements: 27.3
 */
export async function updateUserPreferences(
  userId: string,
  eventType: string,
  preferences: any
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
    console.error('Error updating user preferences:', error);
    throw new Error(`Failed to update preferences: ${error.message}`);
  }
}

/**
 * Check if current time is in DND period
 * Requirements: 27.3
 */
function isInDNDPeriod(preferences: any): boolean {
  if (!preferences.dndEnabled) return false;

  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM

  // Check if today is a DND day
  if (preferences.dndDays && !preferences.dndDays.includes(currentDay)) {
    return false;
  }

  // Check time range
  if (preferences.dndStartTime && preferences.dndEndTime) {
    const startTime = preferences.dndStartTime;
    const endTime = preferences.dndEndTime;

    // Handle overnight DND periods
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  return false;
}

/**
 * Get active template with rendered content
 * Requirements: 27.4
 */
async function getActiveTemplate(code: string, variables?: Record<string, any>) {
  try {
    const template = await prisma.notificationTemplate.findFirst({
      where: {
        code,
        isActive: true,
        isDraft: false,
      },
    });

    if (!template || !variables) return template;

    // Render template with variables
    const rendered = {
      ...template,
      subject: renderTemplate(template.subject, variables),
      body: renderTemplate(template.body, variables),
      htmlBody: template.htmlBody ? renderTemplate(template.htmlBody, variables) : null,
      smsBody: template.smsBody ? renderTemplate(template.smsBody, variables) : null,
      pushTitle: template.pushTitle ? renderTemplate(template.pushTitle, variables) : null,
      pushBody: template.pushBody ? renderTemplate(template.pushBody, variables) : null,
      actionUrl: template.actionUrl ? renderTemplate(template.actionUrl, variables) : null,
    };

    return rendered;
  } catch (error: any) {
    console.error('Error getting template:', error);
    return null;
  }
}

/**
 * Render template string with variables
 * Requirements: 27.4
 */
function renderTemplate(template: string, variables: Record<string, any>): string {
  let rendered = template;
  
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(regex, String(variables[key] || ''));
  });

  return rendered;
}

/**
 * Mark notification as read
 * Requirements: 27.6
 */
export async function markAsRead(notificationId: string, userId: string) {
  try {
    const notification = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Update in-app delivery record
    await prisma.notificationDelivery.updateMany({
      where: {
        notificationId,
        channel: 'in_app',
      },
      data: {
        readAt: new Date(),
        status: 'read',
      },
    });

    return notification;
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    throw new Error(`Failed to mark as read: ${error.message}`);
  }
}

/**
 * Mark all notifications as read
 * Requirements: 27.6
 */
export async function markAllAsRead(userId: string) {
  try {
    return await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error('Error marking all as read:', error);
    throw new Error(`Failed to mark all as read: ${error.message}`);
  }
}

/**
 * Get notifications for user
 * Requirements: 27.6
 */
export async function getUserNotifications(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    category?: string;
  } = {}
) {
  try {
    const { limit = 50, offset = 0, unreadOnly = false, category } = options;

    const where: any = { userId };
    
    if (unreadOnly) {
      where.isRead = false;
    }
    
    if (category) {
      where.category = category;
    }

    const [notifications, unreadCount, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          deliveryRecords: {
            where: { channel: 'in_app' },
            take: 1,
          },
        },
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      unreadCount,
      total,
      hasMore: offset + limit < total,
    };
  } catch (error: any) {
    console.error('Error getting user notifications:', error);
    throw new Error(`Failed to get notifications: ${error.message}`);
  }
}

/**
 * Get unread count for user
 * Requirements: 27.6
 */
export async function getUnreadCount(userId: string) {
  try {
    return await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  } catch (error: any) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

/**
 * Track notification delivery status
 * Requirements: 27.7
 */
export async function updateDeliveryStatus(
  deliveryId: string,
  status: string,
  metadata?: any
) {
  try {
    return await prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        status,
        deliveredAt: status === 'delivered' ? new Date() : undefined,
        failedAt: status === 'failed' ? new Date() : undefined,
        readAt: status === 'read' ? new Date() : undefined,
        metadata,
      },
    });
  } catch (error: any) {
    console.error('Error updating delivery status:', error);
    throw new Error(`Failed to update delivery status: ${error.message}`);
  }
}

/**
 * Get notification delivery report
 * Requirements: 27.7
 */
export async function getDeliveryReport(filters: {
  startDate?: Date;
  endDate?: Date;
  channel?: string;
  status?: string;
}) {
  try {
    const where: any = {};

    if (filters.startDate) {
      where.createdAt = { ...where.createdAt, gte: filters.startDate };
    }

    if (filters.endDate) {
      where.createdAt = { ...where.createdAt, lte: filters.endDate };
    }

    if (filters.channel) {
      where.channel = filters.channel;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const [deliveries, summary] = await Promise.all([
      prisma.notificationDelivery.findMany({
        where,
        include: {
          notification: {
            select: {
              title: true,
              type: true,
              category: true,
              priority: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.notificationDelivery.groupBy({
        by: ['channel', 'status'],
        where,
        _count: true,
      }),
    ]);

    return {
      deliveries,
      summary,
    };
  } catch (error: any) {
    console.error('Error getting delivery report:', error);
    throw new Error(`Failed to get delivery report: ${error.message}`);
  }
}

export default {
  createNotification,
  deliverNotification,
  getUserPreferences,
  updateUserPreferences,
  markAsRead,
  markAllAsRead,
  getUserNotifications,
  getUnreadCount,
  updateDeliveryStatus,
  getDeliveryReport,
};
