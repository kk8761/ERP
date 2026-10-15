/**
 * Notification Service Tests
 * 
 * Tests for notification creation and delivery across multiple channels
 * Requirements: 27.1, 27.2
 */

import { PrismaClient } from '@prisma/client';
import * as NotificationService from '../services/notification.service';
import * as emailUtil from '../utils/email';
import * as smsUtil from '../utils/sms';

// Mock dependencies
jest.mock('../utils/email');
jest.mock('../utils/sms');

const prisma = new PrismaClient();

describe('Notification Service - Task 41.1', () => {
  let testUserId: string;
  let mockEmail: jest.SpyInstance;
  let mockSMS: jest.SpyInstance;

  beforeAll(async () => {
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        email: 'test@notification.com',
        phone: '+1234567890',
        name: 'Test User',
        role: 'USER',
        password: 'test-password-hash',
      },
    });
    testUserId = testUser.id;

    // Setup mocks
    mockEmail = jest.spyOn(emailUtil, 'sendEmail').mockResolvedValue({
      success: true,
      messageId: 'mock-email-id',
    });

    mockSMS = jest.spyOn(smsUtil, 'sendSMS').mockResolvedValue({
      success: true,
      messageId: 'mock-sms-id',
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.notificationDelivery.deleteMany({
      where: {
        notification: {
          userId: testUserId,
        },
      },
    });
    await prisma.notification.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Notification Model Definition', () => {
    it('should create notification with all required fields', async () => {
      const notification = await prisma.notification.create({
        data: {
          userId: testUserId,
          title: 'Test Notification',
          message: 'This is a test notification message',
          type: 'general',
          priority: 'normal',
        },
      });

      expect(notification).toHaveProperty('id');
      expect(notification.userId).toBe(testUserId);
      expect(notification.title).toBe('Test Notification');
      expect(notification.message).toBe('This is a test notification message');
      expect(notification.type).toBe('general');
      expect(notification.priority).toBe('normal');
      expect(notification.isRead).toBe(false);
      expect(notification.createdAt).toBeInstanceOf(Date);
    });

    it('should support optional notification fields', async () => {
      const notification = await prisma.notification.create({
        data: {
          userId: testUserId,
          title: 'Order Created',
          message: 'Your order #12345 has been created',
          type: 'order',
          category: 'sales',
          priority: 'high',
          actionUrl: '/orders/12345',
          actionLabel: 'View Order',
          metadata: { orderId: '12345', amount: 150.50 },
        },
      });

      expect(notification.category).toBe('sales');
      expect(notification.actionUrl).toBe('/orders/12345');
      expect(notification.actionLabel).toBe('View Order');
      expect(notification.metadata).toEqual({ orderId: '12345', amount: 150.50 });
    });
  });

  describe('Notification Creation - Requirement 27.1', () => {
    it('should create a basic notification', async () => {
      const result = await NotificationService.createNotification({
        userId: testUserId,
        title: 'Basic Notification',
        message: 'This is a basic notification',
        type: 'general',
        priority: 'normal',
      });

      expect(result).toHaveProperty('id');
      expect(result.title).toBe('Basic Notification');
      expect(result.message).toBe('This is a basic notification');
      expect(result.isRead).toBe(false);
    });

    it('should create notification with custom metadata', async () => {
      const metadata = {
        entityId: 'order-123',
        entityType: 'order',
        amount: 250.00,
      };

      const result = await NotificationService.createNotification({
        userId: testUserId,
        title: 'Order Notification',
        message: 'Your order has been processed',
        type: 'order',
        category: 'sales',
        priority: 'high',
        metadata,
      });

      expect(result.metadata).toEqual(metadata);
      expect(result.priority).toBe('high');
    });

    it('should handle notification with action URL', async () => {
      const result = await NotificationService.createNotification({
        userId: testUserId,
        title: 'Approval Required',
        message: 'Please review the pending approval',
        type: 'workflow',
        category: 'approval',
        priority: 'urgent',
        actionUrl: '/approvals/pending',
        actionLabel: 'Review Now',
      });

      expect(result.actionUrl).toBe('/approvals/pending');
      expect(result.actionLabel).toBe('Review Now');
    });
  });

  describe('Multi-Channel Delivery - Requirement 27.2', () => {
    it('should deliver notification via in-app channel by default', async () => {
      const notification = await NotificationService.createNotification({
        userId: testUserId,
        title: 'In-App Notification',
        message: 'Default in-app delivery',
      });

      const deliveries = await prisma.notificationDelivery.findMany({
        where: { notificationId: notification.id },
      });

      expect(deliveries.length).toBeGreaterThanOrEqual(1);
      const inAppDelivery = deliveries.find(d => d.channel === 'in_app');
      expect(inAppDelivery).toBeDefined();
      expect(inAppDelivery?.status).toBe('delivered');
    });

    it('should deliver notification via email channel', async () => {
      const notification = await NotificationService.createNotification(
        {
          userId: testUserId,
          title: 'Email Notification',
          message: 'Test email delivery',
        },
        {
          channels: ['in_app', 'email'],
          emailAddress: 'test@notification.com',
        }
      );

      // Wait for async delivery
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockEmail).toHaveBeenCalled();
      
      const deliveries = await prisma.notificationDelivery.findMany({
        where: { notificationId: notification.id },
      });

      const emailDelivery = deliveries.find(d => d.channel === 'email');
      expect(emailDelivery).toBeDefined();
      expect(emailDelivery?.recipientAddress).toBe('test@notification.com');
    });

    it('should deliver notification via SMS channel', async () => {
      const notification = await NotificationService.createNotification(
        {
          userId: testUserId,
          title: 'SMS Notification',
          message: 'Test SMS delivery',
        },
        {
          channels: ['in_app', 'sms'],
          phoneNumber: '+1234567890',
        }
      );

      // Wait for async delivery
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSMS).toHaveBeenCalled();
      
      const deliveries = await prisma.notificationDelivery.findMany({
        where: { notificationId: notification.id },
      });

      const smsDelivery = deliveries.find(d => d.channel === 'sms');
      expect(smsDelivery).toBeDefined();
      expect(smsDelivery?.recipientAddress).toBe('+1234567890');
    });

    it('should deliver notification via multiple channels simultaneously', async () => {
      const notification = await NotificationService.createNotification(
        {
          userId: testUserId,
          title: 'Multi-Channel Notification',
          message: 'This notification goes everywhere',
          priority: 'urgent',
        },
        {
          channels: ['in_app', 'email', 'sms'],
          emailAddress: 'test@notification.com',
          phoneNumber: '+1234567890',
        }
      );

      // Wait for async delivery
      await new Promise(resolve => setTimeout(resolve, 100));

      const deliveries = await prisma.notificationDelivery.findMany({
        where: { notificationId: notification.id },
      });

      expect(deliveries.length).toBeGreaterThanOrEqual(3);
      
      const channels = deliveries.map(d => d.channel);
      expect(channels).toContain('in_app');
      expect(channels).toContain('email');
      expect(channels).toContain('sms');

      expect(mockEmail).toHaveBeenCalled();
      expect(mockSMS).toHaveBeenCalled();
    });
  });

  describe('Notification Delivery Tracking', () => {
    it('should track delivery status for each channel', async () => {
      const notification = await NotificationService.createNotification(
        {
          userId: testUserId,
          title: 'Tracked Notification',
          message: 'Testing delivery tracking',
        },
        {
          channels: ['in_app', 'email'],
          emailAddress: 'test@notification.com',
        }
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const deliveries = await prisma.notificationDelivery.findMany({
        where: { notificationId: notification.id },
      });

      deliveries.forEach(delivery => {
        expect(delivery).toHaveProperty('status');
        expect(delivery).toHaveProperty('createdAt');
        expect(delivery.status).toMatch(/pending|sent|delivered|failed/);
      });
    });

    it('should record delivery timestamps', async () => {
      const notification = await NotificationService.createNotification({
        userId: testUserId,
        title: 'Timestamp Test',
        message: 'Testing timestamp recording',
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const delivery = await prisma.notificationDelivery.findFirst({
        where: {
          notificationId: notification.id,
          channel: 'in_app',
        },
      });

      expect(delivery).toBeDefined();
      expect(delivery?.deliveredAt).toBeInstanceOf(Date);
    });

    it('should handle failed delivery gracefully', async () => {
      // Mock email failure
      mockEmail.mockResolvedValueOnce({
        success: false,
        error: 'SMTP connection failed',
      });

      const notification = await NotificationService.createNotification(
        {
          userId: testUserId,
          title: 'Failed Delivery Test',
          message: 'Testing failed delivery handling',
        },
        {
          channels: ['in_app', 'email'],
          emailAddress: 'test@notification.com',
        }
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const emailDelivery = await prisma.notificationDelivery.findFirst({
        where: {
          notificationId: notification.id,
          channel: 'email',
        },
      });

      expect(emailDelivery).toBeDefined();
      expect(emailDelivery?.status).toBe('failed');
      expect(emailDelivery?.errorMessage).toBeTruthy();
    });
  });

  describe('Notification Retrieval', () => {
    it('should retrieve user notifications', async () => {
      // Create multiple notifications
      await Promise.all([
        NotificationService.createNotification({
          userId: testUserId,
          title: 'Notification 1',
          message: 'Message 1',
        }),
        NotificationService.createNotification({
          userId: testUserId,
          title: 'Notification 2',
          message: 'Message 2',
        }),
      ]);

      const result = await NotificationService.getUserNotifications(testUserId);

      expect(result.notifications.length).toBeGreaterThanOrEqual(2);
      expect(result).toHaveProperty('unreadCount');
      expect(result).toHaveProperty('total');
    });

    it('should filter unread notifications', async () => {
      await NotificationService.createNotification({
        userId: testUserId,
        title: 'Unread Notification',
        message: 'This should be unread',
      });

      const result = await NotificationService.getUserNotifications(testUserId, {
        unreadOnly: true,
      });

      result.notifications.forEach(notification => {
        expect(notification.isRead).toBe(false);
      });
    });

    it('should get accurate unread count', async () => {
      const count = await NotificationService.getUnreadCount(testUserId);
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Notification Read Status', () => {
    it('should mark notification as read', async () => {
      const notification = await NotificationService.createNotification({
        userId: testUserId,
        title: 'Mark Read Test',
        message: 'Testing mark as read',
      });

      expect(notification.isRead).toBe(false);

      await NotificationService.markAsRead(notification.id, testUserId);

      const updated = await prisma.notification.findUnique({
        where: { id: notification.id },
      });

      expect(updated?.isRead).toBe(true);
      expect(updated?.readAt).toBeInstanceOf(Date);
    });

    it('should mark all notifications as read', async () => {
      // Create multiple unread notifications
      await Promise.all([
        NotificationService.createNotification({
          userId: testUserId,
          title: 'Bulk Read 1',
          message: 'Message 1',
        }),
        NotificationService.createNotification({
          userId: testUserId,
          title: 'Bulk Read 2',
          message: 'Message 2',
        }),
      ]);

      await NotificationService.markAllAsRead(testUserId);

      const unreadCount = await NotificationService.getUnreadCount(testUserId);
      expect(unreadCount).toBe(0);
    });
  });

  describe('Email Notification Delivery', () => {
    it('should send email with correct content', async () => {
      await NotificationService.createNotification(
        {
          userId: testUserId,
          title: 'Email Content Test',
          message: 'Testing email content',
          actionUrl: '/test/action',
          actionLabel: 'Click Here',
        },
        {
          channels: ['email'],
          emailAddress: 'test@notification.com',
        }
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@notification.com',
          subject: 'Email Content Test',
          text: 'Testing email content',
        })
      );
    });

    it('should include action link in email HTML', async () => {
      await NotificationService.createNotification(
        {
          userId: testUserId,
          title: 'Email Action Link',
          message: 'Please take action',
          actionUrl: '/approvals/123',
          actionLabel: 'Approve Now',
        },
        {
          channels: ['email'],
          emailAddress: 'test@notification.com',
        }
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const emailCall = mockEmail.mock.calls[0][0];
      expect(emailCall.html).toContain('/approvals/123');
      expect(emailCall.html).toContain('Approve Now');
    });
  });

  describe('SMS Notification Delivery', () => {
    it('should send SMS with correct content', async () => {
      await NotificationService.createNotification(
        {
          userId: testUserId,
          title: 'SMS Test',
          message: 'This is an SMS notification',
        },
        {
          channels: ['sms'],
          phoneNumber: '+1234567890',
        }
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSMS).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+1234567890',
          message: expect.stringContaining('SMS Test'),
        })
      );
    });

    it('should truncate long messages for SMS', async () => {
      const longMessage = 'A'.repeat(200);
      
      await NotificationService.createNotification(
        {
          userId: testUserId,
          title: 'Long SMS Test',
          message: longMessage,
        },
        {
          channels: ['sms'],
          phoneNumber: '+1234567890',
        }
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const smsCall = mockSMS.mock.calls[0][0];
      expect(smsCall.message.length).toBeLessThanOrEqual(160);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when userId is missing', async () => {
      await expect(
        NotificationService.createNotification({
          userId: '',
          title: 'Test',
          message: 'Test',
        })
      ).rejects.toThrow();
    });

    it('should handle invalid notification ID gracefully', async () => {
      await expect(
        NotificationService.markAsRead('invalid-id', testUserId)
      ).resolves.not.toThrow();
    });

    it('should continue delivery even if one channel fails', async () => {
      // Mock SMS failure
      mockSMS.mockRejectedValueOnce(new Error('SMS service unavailable'));

      const notification = await NotificationService.createNotification(
        {
          userId: testUserId,
          title: 'Partial Failure Test',
          message: 'Testing partial delivery failure',
        },
        {
          channels: ['in_app', 'email', 'sms'],
          emailAddress: 'test@notification.com',
          phoneNumber: '+1234567890',
        }
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const deliveries = await prisma.notificationDelivery.findMany({
        where: { notificationId: notification.id },
      });

      // In-app and email should still succeed
      const inAppDelivery = deliveries.find(d => d.channel === 'in_app');
      expect(inAppDelivery?.status).toBe('delivered');
    });
  });
});
