/**
 * Notification Tracking Service
 *
 * Tracks notification delivery status and engagement across all channels.
 * Provides delivery analytics (delivery rate, open rate, click rate) and
 * per-notification, per-channel tracking records.
 *
 * Requirements: 27.7
 */

import prisma from '../config/prisma';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'read';
export type NotificationChannel = 'email' | 'sms' | 'in_app' | 'push';

export interface TrackingEventPayload {
  deliveryId: string;
  /** Idempotency token from the provider (e.g. SendGrid event id) */
  providerEventId?: string;
  metadata?: Record<string, unknown>;
}

export interface DeliveryAnalytics {
  channel: string;
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  opened: number;
  clicked: number;
  deliveryRate: number;  // delivered / sent
  openRate: number;      // opened / delivered
  clickRate: number;     // clicked / opened
}

export interface OverallAnalytics {
  period: { startDate: Date; endDate: Date };
  byChannel: DeliveryAnalytics[];
  totals: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    opened: number;
    clicked: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  };
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function rate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100; // 2 decimal places
}

// ─── Core Tracking Ops ───────────────────────────────────────────────────────

/**
 * Record that a notification was successfully dispatched to a provider.
 * Requirements: 27.7
 */
export async function trackSent(payload: TrackingEventPayload) {
  const { deliveryId, metadata } = payload;

  return prisma.notificationDelivery.update({
    where: { id: deliveryId },
    data: {
      status: 'sent',
      sentAt: new Date(),
      metadata: metadata as any,
    },
  });
}

/**
 * Record that the provider confirmed the message was delivered to the recipient.
 * Requirements: 27.7
 */
export async function trackDelivered(payload: TrackingEventPayload) {
  const { deliveryId, metadata } = payload;

  return prisma.notificationDelivery.update({
    where: { id: deliveryId },
    data: {
      status: 'delivered',
      deliveredAt: new Date(),
      metadata: metadata as any,
    },
  });
}

/**
 * Record that the delivery attempt failed.
 * Increments retryCount and preserves the error message.
 * Requirements: 27.7
 */
export async function trackFailed(
  payload: TrackingEventPayload & { errorMessage?: string }
) {
  const { deliveryId, errorMessage, metadata } = payload;

  const current = await prisma.notificationDelivery.findUnique({
    where: { id: deliveryId },
    select: { retryCount: true },
  });

  return prisma.notificationDelivery.update({
    where: { id: deliveryId },
    data: {
      status: 'failed',
      failedAt: new Date(),
      errorMessage,
      retryCount: (current?.retryCount ?? 0) + 1,
      metadata: metadata as any,
    },
  });
}

/**
 * Record that the notification was opened / read by the recipient.
 * Each call increments the openCount; readAt is set on the first open.
 * Requirements: 27.7
 */
export async function trackOpened(payload: TrackingEventPayload) {
  const { deliveryId, metadata } = payload;

  const current = await prisma.notificationDelivery.findUnique({
    where: { id: deliveryId },
    select: { openCount: true, readAt: true, status: true },
  });

  const isFirstOpen = !current?.readAt;

  return prisma.notificationDelivery.update({
    where: { id: deliveryId },
    data: {
      status: 'read',
      readAt: isFirstOpen ? new Date() : current?.readAt,
      openCount: (current?.openCount ?? 0) + 1,
      metadata: metadata as any,
    },
  });
}

/**
 * Record that a tracked link inside the notification was clicked.
 * Requirements: 27.7
 */
export async function trackClicked(payload: TrackingEventPayload) {
  const { deliveryId, metadata } = payload;

  const current = await prisma.notificationDelivery.findUnique({
    where: { id: deliveryId },
    select: { clickCount: true },
  });

  return prisma.notificationDelivery.update({
    where: { id: deliveryId },
    data: {
      clickCount: (current?.clickCount ?? 0) + 1,
      metadata: metadata as any,
    },
  });
}

/**
 * Update the delivery status for a record directly (used by webhook handlers).
 * Requirements: 27.7
 */
export async function updateDeliveryStatus(
  deliveryId: string,
  status: DeliveryStatus,
  extra?: { errorMessage?: string; providerId?: string; provider?: string }
) {
  const timestamps: Record<string, Date> = {};

  if (status === 'sent') timestamps.sentAt = new Date();
  if (status === 'delivered') timestamps.deliveredAt = new Date();
  if (status === 'failed' || status === 'bounced') timestamps.failedAt = new Date();
  if (status === 'read') timestamps.readAt = new Date();

  return prisma.notificationDelivery.update({
    where: { id: deliveryId },
    data: {
      status,
      ...timestamps,
      ...(extra?.errorMessage && { errorMessage: extra.errorMessage }),
      ...(extra?.providerId && { providerId: extra.providerId }),
      ...(extra?.provider && { provider: extra.provider }),
    },
  });
}

// ─── Delivery Records Queries ────────────────────────────────────────────────

/**
 * Get all delivery records for a single notification with their current status.
 * Requirements: 27.7
 */
export async function getDeliveryRecords(notificationId: string) {
  return prisma.notificationDelivery.findMany({
    where: { notificationId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      channel: true,
      recipientAddress: true,
      status: true,
      sentAt: true,
      deliveredAt: true,
      readAt: true,
      failedAt: true,
      openCount: true,
      clickCount: true,
      retryCount: true,
      provider: true,
      providerId: true,
      errorMessage: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Get a single delivery record by id.
 * Requirements: 27.7
 */
export async function getDeliveryRecord(deliveryId: string) {
  return prisma.notificationDelivery.findUnique({
    where: { id: deliveryId },
    include: {
      notification: {
        select: { id: true, title: true, type: true, category: true, priority: true, userId: true },
      },
    },
  });
}

// ─── Analytics ───────────────────────────────────────────────────────────────

/**
 * Compute delivery analytics grouped by channel for the given time window.
 * Requirements: 27.7
 */
export async function getDeliveryAnalytics(filters: {
  startDate?: Date;
  endDate?: Date;
  channel?: NotificationChannel;
  notificationType?: string;
}): Promise<OverallAnalytics> {
  const { startDate, endDate, channel, notificationType } = filters;

  const now = new Date();
  const resolvedStart = startDate ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30d
  const resolvedEnd = endDate ?? now;

  const where: Record<string, any> = {
    createdAt: { gte: resolvedStart, lte: resolvedEnd },
  };

  if (channel) where.channel = channel;

  if (notificationType) {
    where.notification = { type: notificationType };
  }

  // Aggregate counts by channel + status
  const rows = await prisma.notificationDelivery.groupBy({
    by: ['channel', 'status'],
    where,
    _count: { _all: true },
    _sum: { openCount: true, clickCount: true },
  });

  // Total opens/clicks per channel (independent of status)
  const engagementRows = await prisma.notificationDelivery.groupBy({
    by: ['channel'],
    where,
    _sum: { openCount: true, clickCount: true },
  });

  const engagementByChannel = new Map(
    engagementRows.map((r) => [
      r.channel,
      { opens: r._sum.openCount ?? 0, clicks: r._sum.clickCount ?? 0 },
    ])
  );

  // Build per-channel buckets
  const channelMap = new Map<string, Record<DeliveryStatus, number> & { channel: string }>();

  for (const row of rows) {
    const ch = row.channel;
    if (!channelMap.has(ch)) {
      channelMap.set(ch, {
        channel: ch,
        pending: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        bounced: 0,
        read: 0,
      });
    }
    const bucket = channelMap.get(ch)!;
    const st = row.status as DeliveryStatus;
    if (st in bucket) {
      (bucket as any)[st] += row._count._all;
    }
  }

  const byChannel: DeliveryAnalytics[] = [];

  for (const [ch, counts] of channelMap.entries()) {
    const total =
      counts.pending + counts.sent + counts.delivered + counts.failed + counts.bounced + counts.read;
    const sent = counts.sent + counts.delivered + counts.read; // sent encompasses downstream states
    const delivered = counts.delivered + counts.read;
    const failed = counts.failed + counts.bounced;
    const eng = engagementByChannel.get(ch) ?? { opens: 0, clicks: 0 };

    byChannel.push({
      channel: ch,
      total,
      sent,
      delivered,
      failed,
      bounced: counts.bounced,
      opened: eng.opens,
      clicked: eng.clicks,
      deliveryRate: rate(delivered, sent),
      openRate: rate(eng.opens, delivered),
      clickRate: rate(eng.clicks, eng.opens),
    });
  }

  // Roll up totals
  const totals = byChannel.reduce(
    (acc, ch) => ({
      total: acc.total + ch.total,
      sent: acc.sent + ch.sent,
      delivered: acc.delivered + ch.delivered,
      failed: acc.failed + ch.failed,
      opened: acc.opened + ch.opened,
      clicked: acc.clicked + ch.clicked,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
    }),
    { total: 0, sent: 0, delivered: 0, failed: 0, opened: 0, clicked: 0, deliveryRate: 0, openRate: 0, clickRate: 0 }
  );

  totals.deliveryRate = rate(totals.delivered, totals.sent);
  totals.openRate = rate(totals.opened, totals.delivered);
  totals.clickRate = rate(totals.clicked, totals.opened);

  return {
    period: { startDate: resolvedStart, endDate: resolvedEnd },
    byChannel,
    totals,
  };
}

/**
 * Get a summary of delivery statuses for a single notification (all channels).
 * Requirements: 27.7
 */
export async function getNotificationDeliverySummary(notificationId: string) {
  const records = await prisma.notificationDelivery.findMany({
    where: { notificationId },
    select: {
      channel: true,
      status: true,
      sentAt: true,
      deliveredAt: true,
      readAt: true,
      failedAt: true,
      openCount: true,
      clickCount: true,
    },
  });

  const byChannel: Record<string, {
    status: string;
    sentAt: Date | null;
    deliveredAt: Date | null;
    readAt: Date | null;
    failedAt: Date | null;
    openCount: number;
    clickCount: number;
  }> = {};

  for (const r of records) {
    byChannel[r.channel] = {
      status: r.status,
      sentAt: r.sentAt,
      deliveredAt: r.deliveredAt,
      readAt: r.readAt,
      failedAt: r.failedAt,
      openCount: r.openCount,
      clickCount: r.clickCount,
    };
  }

  const allRead = records.length > 0 && records.every((r) => r.status === 'read');
  const anyDelivered = records.some((r) => ['delivered', 'read'].includes(r.status));
  const anyFailed = records.some((r) => ['failed', 'bounced'].includes(r.status));

  return {
    notificationId,
    channels: byChannel,
    overallStatus: allRead ? 'read' : anyDelivered ? 'delivered' : anyFailed ? 'failed' : 'pending',
    totalOpens: records.reduce((s, r) => s + r.openCount, 0),
    totalClicks: records.reduce((s, r) => s + r.clickCount, 0),
  };
}

export default {
  trackSent,
  trackDelivered,
  trackFailed,
  trackOpened,
  trackClicked,
  updateDeliveryStatus,
  getDeliveryRecords,
  getDeliveryRecord,
  getDeliveryAnalytics,
  getNotificationDeliverySummary,
};
