/**
 * Notification Tracking Routes
 *
 * Endpoints for delivery status tracking, engagement events (open/click),
 * per-notification delivery summaries, and analytics.
 *
 * Base path: /api/notification-tracking
 *
 * Requirements: 27.7
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as TrackingController from '../controllers/notification-tracking.controller';

const router = Router();

// ─── Webhook ──────────────────────────────────────────────────────────────
// No auth required — secured by provider shared secret in production.
// Must be registered before the authenticate middleware block.

/**
 * POST /api/notification-tracking/webhook
 *
 * Inbound delivery events from email/SMS providers (SendGrid, Twilio, etc.).
 * Accepts a single event object or an array of event objects.
 * Requirements: 27.7
 */
router.post('/webhook', TrackingController.handleWebhook);

// ─── All remaining routes require JWT authentication ──────────────────────
router.use(authenticate);

// ─── Analytics ────────────────────────────────────────────────────────────

/**
 * GET /api/notification-tracking/analytics
 *
 * Delivery analytics aggregated by channel.
 * Query params: startDate, endDate, channel, notificationType
 * Requirements: 27.7
 */
router.get('/analytics', TrackingController.getAnalytics);

// ─── Notification-level summaries ─────────────────────────────────────────

/**
 * GET /api/notification-tracking/notifications/:notificationId/deliveries
 *
 * All delivery records for a notification (one per channel attempt).
 * Requirements: 27.7
 */
router.get('/notifications/:notificationId/deliveries', TrackingController.getDeliveryRecords);

/**
 * GET /api/notification-tracking/notifications/:notificationId/summary
 *
 * Per-channel delivery summary with overall engagement counts.
 * Requirements: 27.7
 */
router.get('/notifications/:notificationId/summary', TrackingController.getDeliverySummary);

// ─── Delivery record operations ────────────────────────────────────────────

/**
 * GET /api/notification-tracking/delivery/:deliveryId
 *
 * Single delivery record with its parent notification info.
 * Requirements: 27.7
 */
router.get('/delivery/:deliveryId', TrackingController.getDeliveryRecord);

/**
 * PATCH /api/notification-tracking/delivery/:deliveryId/status
 *
 * Update the delivery status (pending → sent → delivered → read / failed / bounced).
 * Body: { status, errorMessage?, providerId?, provider? }
 * Requirements: 27.7
 */
router.patch('/delivery/:deliveryId/status', TrackingController.updateDeliveryStatus);

/**
 * POST /api/notification-tracking/delivery/:deliveryId/open
 *
 * Record an open/read engagement event.
 * Body: { metadata? }
 * Requirements: 27.7
 */
router.post('/delivery/:deliveryId/open', TrackingController.trackOpen);

/**
 * POST /api/notification-tracking/delivery/:deliveryId/click
 *
 * Record a link-click engagement event.
 * Body: { metadata? }
 * Requirements: 27.7
 */
router.post('/delivery/:deliveryId/click', TrackingController.trackClick);

export default router;
