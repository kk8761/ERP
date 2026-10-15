/**
 * Notification Service
 * 
 * Handles push notifications and local notifications
 * Implements requirement 22.2: mobile push notifications
 */

import notifee, {AndroidImportance} from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import {Platform} from 'react-native';
import ApiService from './api.service';
import {API_ENDPOINTS} from '../config/api';

class NotificationServiceClass {
  private fcmToken: string | null = null;

  /**
   * Initialize notification service
   */
  async initialize(): Promise<void> {
    // Request permission
    await this.requestPermission();

    // Get FCM token
    await this.getFCMToken();

    // Setup notification handlers
    this.setupNotificationHandlers();
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Notification permission granted');
      }

      return enabled;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Get FCM token
   */
  async getFCMToken(): Promise<string | null> {
    try {
      if (this.fcmToken) {
        return this.fcmToken;
      }

      this.fcmToken = await messaging().getToken();
      
      if (this.fcmToken) {
        // Register device with backend
        await this.registerDevice(this.fcmToken);
      }

      return this.fcmToken;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Register device with backend
   */
  private async registerDevice(token: string): Promise<void> {
    try {
      await ApiService.post(API_ENDPOINTS.NOTIFICATIONS.REGISTER_DEVICE, {
        token,
        platform: Platform.OS,
      });
    } catch (error) {
      console.error('Error registering device:', error);
    }
  }

  /**
   * Setup notification handlers
   */
  private setupNotificationHandlers(): void {
    // Foreground message handler
    messaging().onMessage(async remoteMessage => {
      console.log('Foreground message received:', remoteMessage);
      await this.displayNotification(remoteMessage);
    });

    // Background message handler
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Background message received:', remoteMessage);
      await this.displayNotification(remoteMessage);
    });

    // Notification opened handler
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification opened app:', remoteMessage);
      this.handleNotificationOpen(remoteMessage);
    });

    // Check if app was opened by notification
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('App opened by notification:', remoteMessage);
          this.handleNotificationOpen(remoteMessage);
        }
      });

    // Token refresh handler
    messaging().onTokenRefresh(async token => {
      this.fcmToken = token;
      await this.registerDevice(token);
    });
  }

  /**
   * Display notification using notifee
   */
  private async displayNotification(remoteMessage: any): Promise<void> {
    try {
      const channelId = await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
      });

      await notifee.displayNotification({
        title: remoteMessage.notification?.title || 'NexaERP',
        body: remoteMessage.notification?.body || '',
        android: {
          channelId,
          smallIcon: 'ic_launcher',
          importance: AndroidImportance.HIGH,
        },
        ios: {
          sound: 'default',
        },
        data: remoteMessage.data,
      });
    } catch (error) {
      console.error('Error displaying notification:', error);
    }
  }

  /**
   * Handle notification open
   */
  private handleNotificationOpen(remoteMessage: any): void {
    // Navigate to appropriate screen based on notification data
    const {type, id, approvalId} = remoteMessage.data || {};

    // This will be handled by the navigation service
    console.log('Handle notification open:', type, id, approvalId);
    
    // Store for navigation (will be picked up by App.tsx)
    if (type === 'approval' && approvalId) {
      this.pendingNavigation = {
        screen: 'ApprovalDetails',
        params: { approvalId },
      };
    }
  }

  private pendingNavigation: any = null;

  /**
   * Get and clear pending navigation
   */
  getPendingNavigation(): any {
    const nav = this.pendingNavigation;
    this.pendingNavigation = null;
    return nav;
  }

  /**
   * Display workflow approval notification
   */
  async displayApprovalNotification(
    title: string,
    body: string,
    approvalId: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    try {
      const channelId = await notifee.createChannel({
        id: 'approvals',
        name: 'Approvals',
        importance: AndroidImportance.HIGH,
      });

      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId,
          smallIcon: 'ic_launcher',
          importance: priority === 'high' ? AndroidImportance.HIGH : AndroidImportance.DEFAULT,
          color: priority === 'high' ? '#ef4444' : '#3b82f6',
          pressAction: {
            id: 'default',
          },
          actions: [
            {
              title: 'Approve',
              pressAction: {
                id: 'approve',
              },
            },
            {
              title: 'View',
              pressAction: {
                id: 'view',
              },
            },
          ],
        },
        ios: {
          sound: 'default',
          categoryId: 'approval',
        },
        data: {
          type: 'approval',
          approvalId,
          priority,
        },
      });
    } catch (error) {
      console.error('Error displaying approval notification:', error);
    }
  }

  /**
   * Setup workflow notification categories (iOS)
   */
  async setupWorkflowNotificationCategories(): Promise<void> {
    if (Platform.OS === 'ios') {
      try {
        await notifee.setNotificationCategories([
          {
            id: 'approval',
            actions: [
              {
                id: 'approve',
                title: 'Approve',
              },
              {
                id: 'view',
                title: 'View Details',
              },
            ],
          },
        ]);
      } catch (error) {
        console.error('Error setting up notification categories:', error);
      }
    }
  }

  /**
   * Schedule local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    timestamp: number,
  ): Promise<string> {
    try {
      const channelId = await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
      });

      const notificationId = await notifee.displayNotification({
        title,
        body,
        android: {
          channelId,
          smallIcon: 'ic_launcher',
        },
        ios: {
          sound: 'default',
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Cancel scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await notifee.cancelNotification(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    try {
      return await notifee.getBadgeCount();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await notifee.setBadgeCount(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await notifee.cancelAllNotifications();
      await this.setBadgeCount(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }
}

export const NotificationService = new NotificationServiceClass();
