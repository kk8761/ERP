/**
 * Digest Notification Service
 *
 * Batches multiple notifications into a single summary email/message.
 * Supports configurable frequencies: immediate, hourly, daily, weekly.
 * Groups notifications by category/type in the digest.
 * Uses notification templates when available.
 *
 * Requirements: 27.8
 */

import prisma from '../config/prisma';
import { sendEmail } from '../utils/email';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DigestFrequency = 'immediate' | 'hourly' | 'daily' | 'weekly';

export interface DigestPreferenceInput {
  digestEnabled: boolean;
  digestFrequency: DigestFrequency;
  /** HH:MM — preferred time to receive the digest (daily/weekly) */
  digestTime?: string;
  /** Day of week for weekly digests, e.g. "monday" */
  digestDay?: string;
  /** Event types to include in this digest, empty means all */
  includedEventTypes?: string[];
  /** Categories to include, empty means all */
  includedCategories?: string[];
}

export interface DigestPreference {
  userId: string;
  eventType: string;
  digestEnabled: boolean;
  digestFrequency: string;
  digestTime?: string | null;
  digestDay?: string | null;
}

export interface NotificationGroup {
  category: string;
  count: number;
  unread: number;
  urgent: number;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    priority: string;
    type: string;
    createdAt: Date;
    actionUrl?: string | null;
  }>;
}

export interface DigestContent {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export interface DigestResult {
  userId: string;
  digestId: string;
  notificationCount: number;
  categories: string[];
  sent: boolean;
}

// ─── Digest Preference Management ──────────────────────────────────────────

/**
 * Get digest preferences for a user.
 * Returns all NotificationPreference records that have digest settings.
 * Requirements: 27.8
 */
export async function getUserDigestPreferences(userId: string): Promise<DigestPreference[]> {
  try {
    const prefs = await prisma.notificationPreference.findMany({
      where: { userId, digestEnabled: true },
      select: {
        userId: true,
        eventType: true,
        digestEnabled: true,
        digestFrequency: true,
        digestTime: true,
        digestDay: true,
      },
    });
    return prefs.map((p) => ({
      userId: p.userId,
      eventType: p.eventType,
      digestEnabled: p.digestEnabled,
      digestFrequency: p.digestFrequency,
      digestTime: p.digestTime,
      digestDay: p.digestDay,
    }));
  } catch (error: any) {
    console.error('Error getting digest preferences:', error);
    throw new Error(`Failed to get digest preferences: ${error.message}`);
  }
}

/**
 * Set digest preferences for a specific user + eventType combination.
 * Creates the NotificationPreference record if it does not exist.
 * Requirements: 27.8
 */
export async function setDigestPreference(
  userId: string,
  eventType: string,
  input: DigestPreferenceInput
): Promise<DigestPreference> {
  try {
    const validFrequencies: DigestFrequency[] = ['immediate', 'hourly', 'daily', 'weekly'];
    if (!validFrequencies.includes(input.digestFrequency)) {
      throw new Error(
        `Invalid digestFrequency '${input.digestFrequency}'. Must be one of: ${validFrequencies.join(', ')}`
      );
    }

    const updated = await prisma.notificationPreference.upsert({
      where: { userId_eventType: { userId, eventType } },
      update: {
        digestEnabled: input.digestEnabled,
        digestFrequency: input.digestFrequency,
        digestTime: input.digestTime ?? null,
        digestDay: input.digestDay ?? null,
      },
      create: {
        userId,
        eventType,
        digestEnabled: input.digestEnabled,
        digestFrequency: input.digestFrequency,
        digestTime: input.digestTime ?? null,
        digestDay: input.digestDay ?? null,
      },
    });

    return {
      userId: updated.userId,
      eventType: updated.eventType,
      digestEnabled: updated.digestEnabled,
      digestFrequency: updated.digestFrequency,
      digestTime: updated.digestTime,
      digestDay: updated.digestDay,
    };
  } catch (error: any) {
    console.error('Error setting digest preference:', error);
    throw new Error(`Failed to set digest preference: ${error.message}`);
  }
}

/**
 * Update digest preferences in bulk for a user (all event types at once).
 * Requirements: 27.8
 */
export async function bulkSetDigestPreferences(
  userId: string,
  input: DigestPreferenceInput
): Promise<{ updated: number }> {
  try {
    const result = await prisma.notificationPreference.updateMany({
      where: { userId },
      data: {
        digestEnabled: input.digestEnabled,
        digestFrequency: input.digestFrequency,
        digestTime: input.digestTime ?? null,
        digestDay: input.digestDay ?? null,
      },
    });
    return { updated: result.count };
  } catch (error: any) {
    console.error('Error bulk updating digest preferences:', error);
    throw new Error(`Failed to bulk update digest preferences: ${error.message}`);
  }
}

// ─── Digest Generation ──────────────────────────────────────────────────────

/**
 * Compute the period boundaries for a given frequency relative to now.
 * Requirements: 27.8
 */
export function computeDigestPeriod(
  frequency: DigestFrequency,
  referenceDate: Date = new Date()
): { periodStart: Date; periodEnd: Date } {
  const end = new Date(referenceDate);

  switch (frequency) {
    case 'immediate': {
      // Last 5 minutes
      const start = new Date(end);
      start.setMinutes(start.getMinutes() - 5);
      return { periodStart: start, periodEnd: end };
    }
    case 'hourly': {
      const start = new Date(end);
      start.setHours(start.getHours() - 1);
      return { periodStart: start, periodEnd: end };
    }
    case 'daily': {
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0);
      const periodEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
      return { periodStart: start, periodEnd };
    }
    case 'weekly': {
      const dayOfWeek = end.getDay(); // 0 = Sunday
      const start = new Date(end);
      start.setDate(end.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      const periodEnd = new Date(start);
      periodEnd.setDate(start.getDate() + 6);
      periodEnd.setHours(23, 59, 59, 999);
      return { periodStart: start, periodEnd };
    }
    default: {
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0);
      return { periodStart: start, periodEnd: end };
    }
  }
}

/**
 * Group notifications by category.
 * Requirements: 27.8
 */
export function groupNotificationsByCategory(
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    priority: string;
    category: string | null;
    type: string;
    isRead: boolean;
    createdAt: Date;
    actionUrl: string | null;
  }>
): Record<string, NotificationGroup> {
  const groups: Record<string, NotificationGroup> = {};

  for (const notif of notifications) {
    const key = notif.category || 'general';

    if (!groups[key]) {
      groups[key] = { category: key, count: 0, unread: 0, urgent: 0, notifications: [] };
    }

    groups[key].count++;
    if (!notif.isRead) groups[key].unread++;
    if (notif.priority === 'urgent') groups[key].urgent++;

    groups[key].notifications.push({
      id: notif.id,
      title: notif.title,
      message: notif.message,
      priority: notif.priority,
      type: notif.type,
      createdAt: notif.createdAt,
      actionUrl: notif.actionUrl,
    });
  }

  return groups;
}

/**
 * Render a digest notification template if one is configured for 'digest' event type.
 * Falls back to built-in HTML/text generation.
 * Requirements: 27.8
 */
async function renderDigestContent(
  groups: Record<string, NotificationGroup>,
  totalCount: number,
  frequency: DigestFrequency,
  periodStart: Date,
  periodEnd: Date
): Promise<DigestContent> {
  // Try to load the digest template from the DB
  try {
    const template = await prisma.notificationTemplate.findFirst({
      where: { code: `digest_${frequency}`, isActive: true, isDraft: false },
    });

    if (template) {
      const categorySummaryText = Object.entries(groups)
        .map(
          ([cat, g]) =>
            `${cat}: ${g.count} total, ${g.unread} unread${g.urgent > 0 ? `, ${g.urgent} urgent` : ''}`
        )
        .join('\n');

      const variables: Record<string, string> = {
        frequency: frequency.charAt(0).toUpperCase() + frequency.slice(1),
        totalCount: String(totalCount),
        categoryCount: String(Object.keys(groups).length),
        periodStart: periodStart.toLocaleDateString(),
        periodEnd: periodEnd.toLocaleDateString(),
        categorySummary: categorySummaryText,
      };

      const renderField = (field: string): string => {
        let rendered = field;
        Object.keys(variables).forEach((key) => {
          rendered = rendered.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), variables[key]);
        });
        return rendered;
      };

      return {
        subject: renderField(template.subject),
        htmlContent: template.htmlBody ? renderField(template.htmlBody) : buildHtmlDigest(groups, totalCount, frequency, periodStart, periodEnd),
        textContent: template.body ? renderField(template.body) : buildTextDigest(groups, totalCount, frequency, periodStart, periodEnd),
      };
    }
  } catch (_err) {
    // Template lookup failure is non-fatal — fall through to built-in renderer
  }

  return {
    subject: `Your ${frequency} notification digest — ${totalCount} notification${totalCount !== 1 ? 's' : ''}`,
    htmlContent: buildHtmlDigest(groups, totalCount, frequency, periodStart, periodEnd),
    textContent: buildTextDigest(groups, totalCount, frequency, periodStart, periodEnd),
  };
}

/**
 * Build the HTML body of a digest email.
 * Requirements: 27.8
 */
function buildHtmlDigest(
  groups: Record<string, NotificationGroup>,
  totalCount: number,
  frequency: DigestFrequency,
  periodStart: Date,
  periodEnd: Date
): string {
  const priorityColor: Record<string, string> = {
    urgent: '#dc3545',
    high: '#fd7e14',
    normal: '#667eea',
    low: '#6c757d',
  };

  const categoryBlocks = Object.entries(groups)
    .map(([category, group]) => {
      const notifItems = group.notifications
        .slice(0, 10)
        .map((n) => {
          const color = priorityColor[n.priority] || priorityColor.normal;
          const action = n.actionUrl
            ? `<a href="${n.actionUrl}" style="color:#667eea;font-size:12px;">View →</a>`
            : '';
          return `
          <div style="background:#fff;padding:12px 15px;margin:8px 0;border-left:4px solid ${color};border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-weight:600;margin-bottom:4px;">${escapeHtml(n.title)}</div>
            <div style="color:#555;font-size:14px;">${escapeHtml(n.message.substring(0, 200))}${n.message.length > 200 ? '…' : ''}</div>
            <div style="font-size:12px;color:#888;margin-top:4px;">
              ${new Date(n.createdAt).toLocaleString()} &middot; Priority: ${n.priority}
              ${action ? ` &middot; ${action}` : ''}
            </div>
          </div>`;
        })
        .join('');

      const overflow =
        group.count > 10
          ? `<p style="color:#888;font-size:13px;margin-top:8px;"><em>…and ${group.count - 10} more.</em></p>`
          : '';

      return `
        <div style="margin:24px 0;">
          <h3 style="color:#667eea;border-bottom:2px solid #667eea;padding-bottom:6px;text-transform:capitalize;">
            ${escapeHtml(category)} <span style="font-weight:400;font-size:14px;">(${group.count})</span>
          </h3>
          ${notifItems}
          ${overflow}
        </div>`;
    })
    .join('');

  const categorySummaryRows = Object.entries(groups)
    .map(
      ([cat, g]) =>
        `<li>${escapeHtml(cat)}: <strong>${g.count}</strong> total, ${g.unread} unread${g.urgent > 0 ? `, <span style="color:#dc3545;">${g.urgent} urgent</span>` : ''}</li>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Digest</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;color:#333;">
  <div style="max-width:620px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:28px 30px;">
      <h1 style="margin:0 0 6px 0;font-size:24px;">Your ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Digest</h1>
      <p style="margin:0;opacity:.85;font-size:14px;">${periodStart.toLocaleDateString()} – ${periodEnd.toLocaleDateString()}</p>
    </div>

    <div style="padding:24px 30px;">
      <div style="background:#f8f9fa;padding:16px;border-radius:8px;margin-bottom:20px;">
        <p style="margin:0 0 10px 0;font-weight:600;">Summary: ${totalCount} notification${totalCount !== 1 ? 's' : ''} across ${Object.keys(groups).length} categor${Object.keys(groups).length !== 1 ? 'ies' : 'y'}</p>
        <ul style="margin:0;padding-left:20px;line-height:1.8;">${categorySummaryRows}</ul>
      </div>

      ${categoryBlocks}

      <div style="text-align:center;padding:20px 0 10px;color:#888;font-size:13px;border-top:1px solid #eee;">
        <p>Manage your notification preferences in your account settings.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Build the plain-text body of a digest email.
 * Requirements: 27.8
 */
function buildTextDigest(
  groups: Record<string, NotificationGroup>,
  totalCount: number,
  frequency: DigestFrequency,
  periodStart: Date,
  periodEnd: Date
): string {
  const header = [
    `Your ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Notification Digest`,
    `${periodStart.toLocaleDateString()} – ${periodEnd.toLocaleDateString()}`,
    '',
    'SUMMARY',
    '-------',
    `${totalCount} notification${totalCount !== 1 ? 's' : ''} across ${Object.keys(groups).length} categories`,
    '',
    ...Object.entries(groups).map(
      ([cat, g]) =>
        `  • ${cat}: ${g.count} total, ${g.unread} unread${g.urgent > 0 ? `, ${g.urgent} urgent` : ''}`
    ),
    '',
  ].join('\n');

  const body = Object.entries(groups)
    .map(([cat, group]) => {
      const items = group.notifications
        .slice(0, 10)
        .map(
          (n) =>
            `  [${n.priority.toUpperCase()}] ${n.title}\n  ${n.message.substring(0, 200)}${n.message.length > 200 ? '…' : ''}\n  ${new Date(n.createdAt).toLocaleString()}`
        )
        .join('\n\n');
      const overflow = group.count > 10 ? `\n  …and ${group.count - 10} more.` : '';
      return `${cat.toUpperCase()} (${group.count})\n${'─'.repeat(40)}\n${items}${overflow}`;
    })
    .join('\n\n');

  return `${header}\nNOTIFICATIONS\n-------------\n${body}\n\n---\nManage your notification preferences in your account settings.`;
}

/** Minimal HTML entity escaping */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Digest Creation & Delivery ─────────────────────────────────────────────

/**
 * Create a DigestNotification record for a user + frequency + period.
 * Does NOT send the email — call sendDigestById afterwards.
 * Requirements: 27.8
 */
export async function createDigest(
  userId: string,
  frequency: DigestFrequency,
  periodStart: Date,
  periodEnd: Date
): Promise<{ digestId: string; notificationCount: number } | null> {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        message: true,
        priority: true,
        category: true,
        type: true,
        isRead: true,
        createdAt: true,
        actionUrl: true,
      },
    });

    if (notifications.length === 0) {
      return null;
    }

    const groups = groupNotificationsByCategory(notifications);

    const { subject, htmlContent, textContent } = await renderDigestContent(
      groups,
      notifications.length,
      frequency,
      periodStart,
      periodEnd
    );

    const digest = await prisma.digestNotification.create({
      data: {
        userId,
        frequency,
        periodStart,
        periodEnd,
        notificationCount: notifications.length,
        notificationIds: notifications.map((n) => n.id),
        categories: groups as any,
        status: 'pending',
        subject,
        htmlContent,
        textContent,
      },
    });

    return { digestId: digest.id, notificationCount: notifications.length };
  } catch (error: any) {
    console.error('Error creating digest:', error);
    throw new Error(`Failed to create digest: ${error.message}`);
  }
}

/**
 * Send a previously-created digest by its ID.
 * Requirements: 27.8
 */
export async function sendDigestById(digestId: string): Promise<boolean> {
  try {
    const digest = await prisma.digestNotification.findUnique({
      where: { id: digestId },
    });

    if (!digest) throw new Error('Digest not found');
    if (digest.status !== 'pending') {
      console.warn(`Digest ${digestId} has status '${digest.status}', skipping send`);
      return false;
    }

    const user = await prisma.user.findUnique({
      where: { id: digest.userId },
      select: { email: true, name: true },
    });

    if (!user?.email) {
      await prisma.digestNotification.update({
        where: { id: digestId },
        data: { status: 'failed' },
      });
      throw new Error('User email not found');
    }

    const result = await sendEmail({
      to: user.email,
      subject: digest.subject ?? 'Your notification digest',
      html: digest.htmlContent ?? '',
      text: digest.textContent ?? '',
    });

    await prisma.digestNotification.update({
      where: { id: digestId },
      data: {
        status: result.success ? 'sent' : 'failed',
        sentAt: result.success ? new Date() : undefined,
        deliveredAt: result.success ? new Date() : undefined,
      },
    });

    return result.success;
  } catch (error: any) {
    console.error(`Error sending digest ${digestId}:`, error);
    await prisma.digestNotification.updateMany({
      where: { id: digestId, status: 'pending' },
      data: { status: 'failed' },
    });
    throw new Error(`Failed to send digest: ${error.message}`);
  }
}

// ─── Bulk Processing (Scheduler-Facing) ─────────────────────────────────────

/**
 * Process pending digests for all users subscribed to the given frequency.
 * Called by the cron scheduler.
 * Requirements: 27.8
 */
export async function processPendingDigests(
  frequency: DigestFrequency
): Promise<Array<{ userId: string; success: boolean; digestId?: string; message?: string; error?: string }>> {
  try {
    const preferences = await prisma.notificationPreference.findMany({
      where: { digestEnabled: true, digestFrequency: frequency },
      select: { userId: true, digestTime: true, digestDay: true },
    });

    const uniqueUserIds = [...new Set(preferences.map((p) => p.userId))];
    console.log(`Processing ${frequency} digests for ${uniqueUserIds.length} user(s)`);

    const { periodStart, periodEnd } = computeDigestPeriod(frequency);

    const results: Array<{
      userId: string;
      success: boolean;
      digestId?: string;
      message?: string;
      error?: string;
    }> = [];

    for (const userId of uniqueUserIds) {
      try {
        const created = await createDigest(userId, frequency, periodStart, periodEnd);

        if (!created) {
          results.push({ userId, success: true, message: 'No notifications in period' });
          continue;
        }

        const sent = await sendDigestById(created.digestId);
        results.push({
          userId,
          success: sent,
          digestId: created.digestId,
          message: sent ? `Sent digest with ${created.notificationCount} notifications` : 'Failed to send',
        });
      } catch (error: any) {
        console.error(`Digest error for user ${userId}:`, error);
        results.push({ userId, success: false, error: error.message });
      }
    }

    return results;
  } catch (error: any) {
    console.error('Error processing pending digests:', error);
    throw new Error(`Failed to process ${frequency} digests: ${error.message}`);
  }
}

/**
 * Manually trigger a digest for a specific user.
 * Requirements: 27.8
 */
export async function triggerDigestForUser(
  userId: string,
  frequency: DigestFrequency
): Promise<DigestResult> {
  const { periodStart, periodEnd } = computeDigestPeriod(frequency);

  const created = await createDigest(userId, frequency, periodStart, periodEnd);

  if (!created) {
    return {
      userId,
      digestId: '',
      notificationCount: 0,
      categories: [],
      sent: false,
    };
  }

  const sent = await sendDigestById(created.digestId);

  const digest = await prisma.digestNotification.findUnique({
    where: { id: created.digestId },
    select: { categories: true },
  });

  const categoryKeys = digest?.categories
    ? Object.keys(digest.categories as Record<string, unknown>)
    : [];

  return {
    userId,
    digestId: created.digestId,
    notificationCount: created.notificationCount,
    categories: categoryKeys,
    sent,
  };
}

// ─── Digest History ──────────────────────────────────────────────────────────

/**
 * Retrieve the digest history for a user with pagination.
 * Requirements: 27.8
 */
export async function getUserDigestHistory(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    frequency?: DigestFrequency;
    status?: string;
  } = {}
): Promise<{
  digests: any[];
  total: number;
  hasMore: boolean;
}> {
  try {
    const { limit = 30, offset = 0, frequency, status } = options;

    const where: Record<string, any> = { userId };
    if (frequency) where.frequency = frequency;
    if (status) where.status = status;

    const [digests, total] = await Promise.all([
      prisma.digestNotification.findMany({
        where,
        orderBy: { periodEnd: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          frequency: true,
          periodStart: true,
          periodEnd: true,
          notificationCount: true,
          categories: true,
          status: true,
          sentAt: true,
          deliveredAt: true,
          subject: true,
          createdAt: true,
        },
      }),
      prisma.digestNotification.count({ where }),
    ]);

    return { digests, total, hasMore: offset + limit < total };
  } catch (error: any) {
    console.error('Error getting digest history:', error);
    throw new Error(`Failed to get digest history: ${error.message}`);
  }
}

/**
 * Get a single digest by ID for a user.
 * Requirements: 27.8
 */
export async function getDigestById(digestId: string, userId: string): Promise<any | null> {
  try {
    return await prisma.digestNotification.findFirst({
      where: { id: digestId, userId },
    });
  } catch (error: any) {
    console.error('Error fetching digest:', error);
    throw new Error(`Failed to fetch digest: ${error.message}`);
  }
}

// ─── Preview ─────────────────────────────────────────────────────────────────

/**
 * Preview what a digest would look like for a user without persisting.
 * Requirements: 27.8
 */
export async function previewDigest(
  userId: string,
  frequency: DigestFrequency
): Promise<{
  notificationCount: number;
  categories: Record<string, NotificationGroup>;
  subject: string;
  htmlContent: string;
  textContent: string;
  periodStart: Date;
  periodEnd: Date;
} | null> {
  const { periodStart, periodEnd } = computeDigestPeriod(frequency);

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      createdAt: { gte: periodStart, lte: periodEnd },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      message: true,
      priority: true,
      category: true,
      type: true,
      isRead: true,
      createdAt: true,
      actionUrl: true,
    },
  });

  if (notifications.length === 0) return null;

  const groups = groupNotificationsByCategory(notifications);
  const content = await renderDigestContent(groups, notifications.length, frequency, periodStart, periodEnd);

  return {
    notificationCount: notifications.length,
    categories: groups,
    periodStart,
    periodEnd,
    ...content,
  };
}

export default {
  getUserDigestPreferences,
  setDigestPreference,
  bulkSetDigestPreferences,
  computeDigestPeriod,
  groupNotificationsByCategory,
  createDigest,
  sendDigestById,
  processPendingDigests,
  triggerDigestForUser,
  getUserDigestHistory,
  getDigestById,
  previewDigest,
};
