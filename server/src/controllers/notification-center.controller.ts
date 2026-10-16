/**
 * Notification Center Controller
 *
 * HTTP handlers for the in-app notification inbox.
 * Thin layer — all business logic lives in notification-center.service.
 *
 * Requirements: 27.6
 */

import { Request, Response } from 'express';
import * as NotificationCenterService from '../services/notification-center.service';
import type { NotificationSortField, SortOrder } from '../services/notification-center.service';

// ─── Helpers ───────────────────────────────────────────────────────────────

function getUserId(req: Request): string | undefined {
  return (req as any).user?.id ?? (req as any).user?.userId;
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = parseInt(value as string, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// ─── Handlers ──────────────────────────────────────────────────────────────

/**
 * GET /api/notification-center
 *
 * Returns a paginated list of the authenticated user's in-app notifications
 * with optional filtering by type, category, priority, and read status.
 *
 * Query params:
 *   page        {number}  – page number, default 1
 *   pageSize    {number}  – items per page, default 20, max 100
 *   sortBy      {string}  – 'createdAt' | 'priority' | 'isRead', default 'createdAt'
 *   sortOrder   {string}  – 'asc' | 'desc', default 'desc'
 *   type        {string}  – filter by notification type
 *   category    {string}  – filter by category
 *   priority    {string}  – filter by priority
 *   unreadOnly  {boolean} – 'true' to show only unread notifications
 *
 * Requirements: 27.6
 */
export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const validSortFields: NotificationSortField[] = ['createdAt', 'priority', 'isRead'];
    const validSortOrders: SortOrder[] = ['asc', 'desc'];

    const sortBy = validSortFields.includes(req.query.sortBy as NotificationSortField)
      ? (req.query.sortBy as NotificationSortField)
      : 'createdAt';

    const sortOrder = validSortOrders.includes(req.query.sortOrder as SortOrder)
      ? (req.query.sortOrder as SortOrder)
      : 'desc';

    const result = await NotificationCenterService.getNotificationCenterPage(userId, {
      page: parsePositiveInt(req.query.page, 1),
      pageSize: parsePositiveInt(req.query.pageSize, 20),
      sortBy,
      sortOrder,
      type: req.query.type as string | undefined,
      category: req.query.category as string | undefined,
      priority: req.query.priority as 'low' | 'normal' | 'high' | 'urgent' | undefined,
      unreadOnly: req.query.unreadOnly === 'true',
    });

    res.json({
      success: true,
      data: result,
      message: 'Notifications retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error getting notification center page:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve notifications',
    });
  }
}

/**
 * GET /api/notification-center/unread-count
 *
 * Returns the unread notification badge count for the authenticated user.
 * Designed as a lightweight polling endpoint.
 *
 * Requirements: 27.6
 */
export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const count = await NotificationCenterService.getUnreadBadgeCount(userId);

    res.json({
      success: true,
      data: { unreadCount: count },
      message: 'Unread count retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve unread count',
    });
  }
}

/**
 * GET /api/notification-center/:id
 *
 * Retrieve a single notification by id (must belong to the authenticated user).
 *
 * Requirements: 27.6
 */
export async function getNotificationById(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const notification = await NotificationCenterService.getNotificationById(id, userId);

    if (!notification) {
      res.status(404).json({ success: false, error: 'Notification not found' });
      return;
    }

    res.json({
      success: true,
      data: notification,
      message: 'Notification retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error getting notification by id:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve notification',
    });
  }
}

/**
 * PATCH /api/notification-center/:id/read
 *
 * Mark a single notification as read. Returns the updated unread count.
 *
 * Requirements: 27.6
 */
export async function markAsRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const result = await NotificationCenterService.markNotificationRead(id, userId);

    res.json({
      success: true,
      data: result,
      message: result.updated ? 'Notification marked as read' : 'Notification was already read',
    });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
    });
  }
}

/**
 * PATCH /api/notification-center/mark-all-read
 *
 * Mark all (or a filtered subset of) the authenticated user's notifications as read.
 *
 * Optional body:
 *   type     {string} – restrict to notifications of this type
 *   category {string} – restrict to notifications of this category
 *
 * Requirements: 27.6
 */
export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { type, category } = req.body as { type?: string; category?: string };

    const result = await NotificationCenterService.markAllNotificationsRead(userId, {
      type,
      category,
    });

    res.json({
      success: true,
      data: result,
      message: `${result.updated} notification(s) marked as read`,
    });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
    });
  }
}

/**
 * GET /api/notification-center/filter-options
 *
 * Returns the distinct types, categories, and priorities available for
 * the authenticated user's notifications (populates filter dropdowns).
 *
 * Requirements: 27.6
 */
export async function getFilterOptions(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const options = await NotificationCenterService.getNotificationFilterOptions(userId);

    res.json({
      success: true,
      data: options,
      message: 'Filter options retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error getting filter options:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve filter options',
    });
  }
}
