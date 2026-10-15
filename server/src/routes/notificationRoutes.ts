/**
 * Notification Routes
 * 
 * Defines API endpoints for notification management
 * Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7, 27.8
 */

import { Router } from 'express';
import * as NotificationController from '../controllers/NotificationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ===== Notification Management =====

/**
 * Create and send notification
 * POST /api/notifications
 * Requirements: 27.1, 27.2
 */
router.post('/', NotificationController.createNotification);

/**
 * Get user notifications
 * GET /api/notifications
 * Requirements: 27.6
 */
router.get('/', NotificationController.getUserNotifications);

/**
 * Get unread count
 * GET /api/notifications/unread-count
 * Requirements: 27.6
 */
router.get('/unread-count', NotificationController.getUnreadCount);

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 * Requirements: 27.6
 */
router.put('/:id/read', NotificationController.markAsRead);

/**
 * Mark all notifications as read
 * PUT /api/notifications/mark-all-read
 * Requirements: 27.6
 */
router.put('/mark-all-read', NotificationController.markAllAsRead);

// ===== Notification Preferences =====

/**
 * Get user notification preferences
 * GET /api/notifications/preferences
 * Requirements: 27.3
 */
router.get('/preferences', NotificationController.getPreferences);

/**
 * Update user notification preferences
 * PUT /api/notifications/preferences/:eventType
 * Requirements: 27.3
 */
router.put('/preferences/:eventType', NotificationController.updatePreferences);

/**
 * Delete preference for event type
 * DELETE /api/notifications/preferences/:eventType
 * Requirements: 27.3
 */
router.delete('/preferences/:eventType', NotificationController.deletePreference);

/**
 * Reset preferences to defaults
 * POST /api/notifications/preferences/reset
 * Requirements: 27.3
 */
router.post('/preferences/reset', NotificationController.resetPreferences);

/**
 * Set global DND schedule
 * POST /api/notifications/preferences/dnd
 * Requirements: 27.3
 */
router.post('/preferences/dnd', NotificationController.setDNDSchedule);

/**
 * Get global DND schedule
 * GET /api/notifications/preferences/dnd
 * Requirements: 27.3
 */
router.get('/preferences/dnd', NotificationController.getDNDSchedule);

/**
 * Check if user is in DND
 * GET /api/notifications/preferences/dnd-status
 * Requirements: 27.3
 */
router.get('/preferences/dnd-status', NotificationController.checkDNDStatus);

/**
 * Bulk update channels for multiple event types
 * POST /api/notifications/preferences/bulk-channels
 * Requirements: 27.3
 */
router.post('/preferences/bulk-channels', NotificationController.bulkUpdateChannels);

// ===== Notification Templates =====

/**
 * Get template by code
 * GET /api/notifications/templates/code/:code
 * Requirements: 27.4
 */
router.get('/templates/code/:code', NotificationController.getTemplateByCode);

/**
 * Create notification template
 * POST /api/notifications/templates
 * Requirements: 27.4
 */
router.post('/templates', NotificationController.createTemplate);

/**
 * Get templates
 * GET /api/notifications/templates
 * Requirements: 27.4
 */
router.get('/templates', NotificationController.getTemplates);

/**
 * Get template by ID
 * GET /api/notifications/templates/:id
 * Requirements: 27.4
 */
router.get('/templates/:id', NotificationController.getTemplateById);

/**
 * Update template
 * PUT /api/notifications/templates/:id
 * Requirements: 27.4
 */
router.put('/templates/:id', NotificationController.updateTemplate);

/**
 * Delete template
 * DELETE /api/notifications/templates/:id
 * Requirements: 27.4
 */
router.delete('/templates/:id', NotificationController.deleteTemplate);

/**
 * Get template versions
 * GET /api/notifications/templates/:id/versions
 * Requirements: 27.4
 */
router.get('/templates/:id/versions', NotificationController.getTemplateVersions);

/**
 * Restore template to specific version
 * POST /api/notifications/templates/:id/restore/:version
 * Requirements: 27.4
 */
router.post('/templates/:id/restore/:version', NotificationController.restoreTemplateVersion);

/**
 * Publish template (convert draft to active)
 * POST /api/notifications/templates/:id/publish
 * Requirements: 27.4
 */
router.post('/templates/:id/publish', NotificationController.publishTemplate);

/**
 * Activate/Deactivate template
 * PUT /api/notifications/templates/:id/active
 * Requirements: 27.4
 */
router.put('/templates/:id/active', NotificationController.setTemplateActive);

/**
 * Preview template with sample variables
 * POST /api/notifications/templates/:id/preview
 * Requirements: 27.4
 */
router.post('/templates/:id/preview', NotificationController.previewTemplate);

// ===== Escalation Management =====

/**
 * Create escalation rule
 * POST /api/notifications/escalation-rules
 * Requirements: 27.5
 */
router.post('/escalation-rules', NotificationController.createEscalationRule);

/**
 * Get escalation rules
 * GET /api/notifications/escalation-rules
 * Requirements: 27.5
 */
router.get('/escalation-rules', NotificationController.getEscalationRules);

/**
 * Acknowledge escalation
 * POST /api/notifications/escalations/:id/acknowledge
 * Requirements: 27.5
 */
router.post('/escalations/:id/acknowledge', NotificationController.acknowledgeEscalation);

// ===== Delivery Reporting =====

/**
 * Get delivery report
 * GET /api/notifications/delivery-report
 * Requirements: 27.7
 */
router.get('/delivery-report', NotificationController.getDeliveryReport);

// ===== Digest Management =====

/**
 * Get digest history
 * GET /api/notifications/digests
 * Requirements: 27.8
 */
router.get('/digests', NotificationController.getDigestHistory);

export default router;
