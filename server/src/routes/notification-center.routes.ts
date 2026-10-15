/**
 * Notification Center Routes
 *
 * In-app notification inbox endpoints for the notification center UI.
 * All routes require authentication.
 *
 * Base path: /api/notification-center
 *
 * Requirements: 27.6
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as NotificationCenterController from '../controllers/notification-center.controller';

const router = Router();

// All notification center routes require a valid JWT
router.use(authenticate);

// ─── Inbox ─────────────────────────────────────────────────────────────────

/**
 * GET /api/notification-center
 *
 * Paginated notification inbox with filtering.
 *
 * Query params: page, pageSize, sortBy, sortOrder, type, category, priority, unreadOnly
 * Requirements: 27.6
 */
router.get('/', NotificationCenterController.getNotifications);

/**
 * GET /api/notification-center/unread-count
 *
 * Lightweight badge count endpoint for polling.
 * Requirements: 27.6
 */
router.get('/unread-count', NotificationCenterController.getUnreadCount);

/**
 * GET /api/notification-center/filter-options
 *
 * Returns distinct types, categories, and priorities for filter dropdowns.
 * Requirements: 27.6
 */
router.get('/filter-options', NotificationCenterController.getFilterOptions);

/**
 * PATCH /api/notification-center/mark-all-read
 *
 * Mark all (or a filtered subset of) notifications as read.
 * Optional body: { type?, category? }
 * Requirements: 27.6
 */
router.patch('/mark-all-read', NotificationCenterController.markAllAsRead);

/**
 * GET /api/notification-center/:id
 *
 * Retrieve a single notification by id.
 * Requirements: 27.6
 */
router.get('/:id', NotificationCenterController.getNotificationById);

/**
 * PATCH /api/notification-center/:id/read
 *
 * Mark a single notification as read.
 * Requirements: 27.6
 */
router.patch('/:id/read', NotificationCenterController.markAsRead);

export default router;
