/**
 * Notification Tracking Controller
 *
 * HTTP handlers for notification delivery tracking and analytics.
 * All logic is delegated to notification-tracking.service.
 *
 * Requirements: 27.7
 */

import { Request, Response } from 'express';
import * as TrackingService from '../services/notification-tracking.service';
import type { DeliveryStatus, NotificationChannel } from '../services/notification-tracking.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getUserId(req: Request): string | undefined {
  return (req as any).user?.id ?? (req as any).user?.userId;
}

// ─── Delivery Record Handlers ─────────────────────────────────────────────

/**
 * GET /api/notification-tracking/delivery/:deliveryId
 *
 * Returns a single delivery record with its parent notification info.
 * Requirements: 27.7
 */
export async function getDeliveryRecord(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { deliveryId } = req.params;
    const record = await TrackingService.getDeliveryRecord(deliveryId);

    if (!record) {
      res.status(404).json({ success: false, error: 'Delivery record not found' });
      return;
    }

    res.json({
      success: true,
      data: record,
      message: 'Delivery record retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error getting delivery record:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve delivery record' });
  }
}

/**
 * GET /api/notification-tracking/notifications/:notificationId/deliveries
 *
 * Returns all delivery records for a notification across every channel.
 * Requirements: 27.7
 */
export async function getDeliveryRecords(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { notificationId } = req.params;
    const records = await TrackingService.getDeliveryRecords(notificationId);

    res.json({
      success: true,
      data: records,
      message: 'Delivery records retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error getting delivery records:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve delivery records' });
  }
}

/**
 * GET /api/notification-tracking/notifications/:notificationId/summary
 *
 * Returns a per-channel delivery summary and overall engagement counts
 * for a single notification.
 * Requirements: 27.7
 */
export async function getDeliverySummary(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { notificationId } = req.params;
    const summary = await TrackingService.getNotificationDeliverySummary(notificationId);

    res.json({
      success: true,
      data: summary,
      message: 'Delivery summary retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error getting delivery summary:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve delivery summary' });
  }
}

// ─── Status Update Handlers ───────────────────────────────────────────────

/**
 * PATCH /api/notification-tracking/delivery/:deliveryId/status
 *
 * Update the delivery status for a record.
 * Body: { status: DeliveryStatus, errorMessage?, providerId?, provider? }
 * Requirements: 27.7
 */
export async function updateDeliveryStatus(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { deliveryId } = req.params;
    const { status, errorMessage, providerId, provider } = req.body as {
      status: DeliveryStatus;
      errorMessage?: string;
      providerId?: string;
      provider?: string;
    };

    const validStatuses: DeliveryStatus[] = ['pending', 'sent', 'delivered', 'failed', 'bounced', 'read'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    const record = await TrackingService.updateDeliveryStatus(deliveryId, status, {
      errorMessage,
      providerId,
      provider,
    });

    res.json({
      success: true,
      data: record,
      message: `Delivery status updated to "${status}"`,
    });
  } catch (error: any) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({ success: false, error: 'Failed to update delivery status' });
  }
}

// ─── Engagement Event Handlers ────────────────────────────────────────────

/**
 * POST /api/notification-tracking/delivery/:deliveryId/open
 *
 * Record an open/read event. Increments openCount and sets readAt on first open.
 * Requirements: 27.7
 */
export async function trackOpen(req: Request, res: Response): Promise<void> {
  try {
    const { deliveryId } = req.params;
    const metadata = req.body?.metadata;

    const record = await TrackingService.trackOpened({ deliveryId, metadata });

    res.json({
      success: true,
      data: { openCount: record.openCount, readAt: record.readAt },
      message: 'Open event recorded',
    });
  } catch (error: any) {
    console.error('Error tracking open event:', error);
    res.status(500).json({ success: false, error: 'Failed to record open event' });
  }
}

/**
 * POST /api/notification-tracking/delivery/:deliveryId/click
 *
 * Record a link-click event. Increments clickCount.
 * Requirements: 27.7
 */
export async function trackClick(req: Request, res: Response): Promise<void> {
  try {
    const { deliveryId } = req.params;
    const metadata = req.body?.metadata;

    const record = await TrackingService.trackClicked({ deliveryId, metadata });

    res.json({
      success: true,
      data: { clickCount: record.clickCount },
      message: 'Click event recorded',
    });
  } catch (error: any) {
    console.error('Error tracking click event:', error);
    res.status(500).json({ success: false, error: 'Failed to record click event' });
  }
}

// ─── Analytics Handlers ───────────────────────────────────────────────────

/**
 * GET /api/notification-tracking/analytics
 *
 * Returns delivery analytics grouped by channel for the specified period.
 *
 * Query params:
 *   startDate       {ISO date string} – default 30 days ago
 *   endDate         {ISO date string} – default now
 *   channel         {string}          – filter to a single channel
 *   notificationType {string}         – filter by notification type
 *
 * Requirements: 27.7
 */
export async function getAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { startDate, endDate, channel, notificationType } = req.query as Record<string, string | undefined>;

    const filters: Parameters<typeof TrackingService.getDeliveryAnalytics>[0] = {};

    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) filters.startDate = d;
    }

    if (endDate) {
      const d = new Date(endDate);
      if (!isNaN(d.getTime())) filters.endDate = d;
    }

    const validChannels: NotificationChannel[] = ['email', 'sms', 'in_app', 'push'];
    if (channel && validChannels.includes(channel as NotificationChannel)) {
      filters.channel = channel as NotificationChannel;
    }

    if (notificationType) {
      filters.notificationType = notificationType;
    }

    const analytics = await TrackingService.getDeliveryAnalytics(filters);

    res.json({
      success: true,
      data: analytics,
      message: 'Delivery analytics retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error getting delivery analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve delivery analytics' });
  }
}

// ─── Webhook Handler ──────────────────────────────────────────────────────

/**
 * POST /api/notification-tracking/webhook
 *
 * Generic inbound webhook for provider delivery events (SendGrid, Twilio, etc.).
 * Expects an array of events: { deliveryId, event, errorMessage?, metadata? }
 *
 * event values: 'sent' | 'delivered' | 'failed' | 'bounced' | 'open' | 'click'
 *
 * Requirements: 27.7
 */
export async function handleWebhook(req: Request, res: Response): Promise<void> {
  try {
    const events: Array<{
      deliveryId: string;
      event: string;
      errorMessage?: string;
      metadata?: Record<string, unknown>;
    }> = Array.isArray(req.body) ? req.body : [req.body];

    const results = await Promise.allSettled(
      events.map(async (ev) => {
        const { deliveryId, event, errorMessage, metadata } = ev;

        switch (event) {
          case 'sent':
            return TrackingService.trackSent({ deliveryId, metadata });
          case 'delivered':
            return TrackingService.trackDelivered({ deliveryId, metadata });
          case 'failed':
          case 'bounce':
          case 'bounced':
            return TrackingService.trackFailed({ deliveryId, errorMessage, metadata });
          case 'open':
          case 'opened':
            return TrackingService.trackOpened({ deliveryId, metadata });
          case 'click':
          case 'clicked':
            return TrackingService.trackClicked({ deliveryId, metadata });
          default:
            throw new Error(`Unknown event type: ${event}`);
        }
      })
    );

    const processed = results.filter((r) => r.status === 'fulfilled').length;
    const errored = results.filter((r) => r.status === 'rejected').length;

    res.json({
      success: true,
      data: { processed, errored, total: events.length },
      message: `Processed ${processed}/${events.length} webhook events`,
    });
  } catch (error: any) {
    console.error('Error handling tracking webhook:', error);
    res.status(500).json({ success: false, error: 'Failed to process webhook events' });
  }
}
