/**
 * Notification Center Service
 *
 * Provides the in-app notification inbox with pagination, filtering,
 * unread badge counts, and bulk read operations.
 *
 * Delegates storage to the existing Prisma Notification model and
 * delegates delivery side-effects to the notification.service.
 *
 * Requirements: 27.6
 */

import prisma from '../config/prisma';
import { markAsRead, markAllAsRead, getUnreadCount } from './notification.service';

export type NotificationSortField = 'createdAt' | 'priority' | 'isRead';
export type SortOrder = 'asc' | 'desc';

export interface NotificationCenterFilters {
  /** Filter by in-app notification type (e.g. 'general', 'workflow', 'system', 'alert') */
  type?: string;
  /** Filter by business category (e.g. 'order', 'inventory', 'approval', 'system') */
  category?: string;
  /** Filter by priority level */
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  /** When true, only unread notifications are returned */
  unreadOnly?: boolean;
}

export interface NotificationCenterQuery extends NotificationCenterFilters {
  page?: number;
  pageSize?: number;
  sortBy?: NotificationSortField;
  sortOrder?: SortOrder;
}

export interface NotificationCenterItem {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string | null;
  priority: string;
  isRead: boolean;
  readAt: Date | null;
  actionUrl: string | null;
  actionLabel: string | null;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
}

export interface NotificationCenterPage {
  items: NotificationCenterItem[];
  /** Total notifications matching the current filter (across all pages) */
  total: number;
  /** Number of unread notifications for the user (ignores current filter) */
  unreadCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Retrieve a paginated, filtered list of notifications for a user.
 * Requirements: 27.6
 */
export async function getNotificationCenterPage(
  userId: string,
  query: NotificationCenterQuery = {}
): Promise<NotificationCenterPage> {
  const {
    page = DEFAULT_PAGE,
    pageSize = DEFAULT_PAGE_SIZE,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    type,
    category,
    priority,
    unreadOnly = false,
  } = query;

  // Clamp page size to prevent excessive queries
  const clampedPageSize = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE);
  const clampedPage = Math.max(page, 1);
  const skip = (clampedPage - 1) * clampedPageSize;

  const where: Record<string, any> = { userId };

  if (unreadOnly) {
    where.isRead = false;
  }
  if (type) {
    where.type = type;
  }
  if (category) {
    where.category = category;
  }
  if (priority) {
    where.priority = priority;
  }

  // Exclude expired notifications from the inbox view
  where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      take: clampedPageSize,
      skip,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        category: true,
        priority: true,
        isRead: true,
        readAt: true,
        actionUrl: true,
        actionLabel: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
      },
    }),
    prisma.notification.count({ where }),
    getUnreadCount(userId),
  ]);

  const totalPages = Math.ceil(total / clampedPageSize);

  return {
    items,
    total,
    unreadCount,
    page: clampedPage,
    pageSize: clampedPageSize,
    totalPages,
    hasNext: clampedPage < totalPages,
    hasPrev: clampedPage > 1,
  };
}

/**
 * Get a single notification by id for a specific user.
 * Requirements: 27.6
 */
export async function getNotificationById(
  notificationId: string,
  userId: string
): Promise<NotificationCenterItem | null> {
  return prisma.notification.findFirst({
    where: { id: notificationId, userId },
    select: {
      id: true,
      title: true,
      message: true,
      type: true,
      category: true,
      priority: true,
      isRead: true,
      readAt: true,
      actionUrl: true,
      actionLabel: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
      expiresAt: true,
    },
  });
}

/**
 * Mark a single notification as read and return the updated item.
 * Re-uses the shared markAsRead from notification.service.
 * Requirements: 27.6
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<{ updated: boolean; unreadCount: number }> {
  const result = await markAsRead(notificationId, userId);
  const unreadCount = await getUnreadCount(userId);
  return {
    updated: result.count > 0,
    unreadCount,
  };
}

/**
 * Mark all notifications as read, optionally filtered by type/category.
 * Requirements: 27.6
 */
export async function markAllNotificationsRead(
  userId: string,
  filters?: Pick<NotificationCenterFilters, 'type' | 'category'>
): Promise<{ updated: number; unreadCount: number }> {
  const where: Record<string, any> = { userId, isRead: false };

  if (filters?.type) {
    where.type = filters.type;
  }
  if (filters?.category) {
    where.category = filters.category;
  }

  const result = await prisma.notification.updateMany({
    where,
    data: { isRead: true, readAt: new Date() },
  });

  const unreadCount = await getUnreadCount(userId);
  return { updated: result.count, unreadCount };
}

/**
 * Return only the unread count badge value.
 * Lightweight endpoint for polling.
 * Requirements: 27.6
 */
export async function getUnreadBadgeCount(userId: string): Promise<number> {
  return getUnreadCount(userId);
}

/**
 * Return distinct types and categories present in the user's notifications,
 * used to populate the filter dropdowns in the notification center UI.
 * Requirements: 27.6
 */
export async function getNotificationFilterOptions(userId: string): Promise<{
  types: string[];
  categories: string[];
  priorities: string[];
}> {
  const [typeRows, categoryRows, priorityRows] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      select: { type: true },
      distinct: ['type'],
    }),
    prisma.notification.findMany({
      where: { userId, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
    }),
    prisma.notification.findMany({
      where: { userId },
      select: { priority: true },
      distinct: ['priority'],
    }),
  ]);

  return {
    types: typeRows.map((r) => r.type),
    categories: categoryRows.map((r) => r.category as string),
    priorities: priorityRows.map((r) => r.priority),
  };
}

export default {
  getNotificationCenterPage,
  getNotificationById,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadBadgeCount,
  getNotificationFilterOptions,
};
