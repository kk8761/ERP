/**
 * Digest Notification Controller
 *
 * HTTP request/response handling for digest notification endpoints.
 * All business logic is delegated to digest-notification.service.
 *
 * Requirements: 27.8
 */

import { Request, Response } from 'express';
import * as DigestService from '../services/digest-notification.service';
import type { DigestFrequency } from '../services/digest-notification.service';

const VALID_FREQUENCIES: DigestFrequency[] = ['immediate', 'hourly', 'daily', 'weekly'];

function isValidFrequency(f: unknown): f is DigestFrequency {
  return typeof f === 'string' && (VALID_FREQUENCIES as string[]).includes(f);
}

// ─── Preferences ─────────────────────────────────────────────────────────────

/**
 * GET /api/digest-notifications/preferences
 * List the user's digest preferences across all event types.
 * Requirements: 27.8
 */
export async function getDigestPreferences(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const preferences = await DigestService.getUserDigestPreferences(userId);

    res.json({
      success: true,
      data: preferences,
      message: 'Digest preferences retrieved',
    });
  } catch (error: any) {
    console.error('Error in getDigestPreferences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PUT /api/digest-notifications/preferences/:eventType
 * Create or update digest preferences for a specific event type.
 * Requirements: 27.8
 */
export async function setDigestPreference(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { eventType } = req.params;
    if (!eventType) {
      res.status(400).json({ success: false, error: 'eventType param is required' });
      return;
    }

    const { digestEnabled, digestFrequency, digestTime, digestDay } = req.body;

    if (typeof digestEnabled !== 'boolean') {
      res.status(400).json({ success: false, error: 'digestEnabled must be a boolean' });
      return;
    }

    if (digestFrequency && !isValidFrequency(digestFrequency)) {
      res.status(400).json({
        success: false,
        error: `digestFrequency must be one of: ${VALID_FREQUENCIES.join(', ')}`,
      });
      return;
    }

    const preference = await DigestService.setDigestPreference(userId, eventType, {
      digestEnabled,
      digestFrequency: digestFrequency ?? 'daily',
      digestTime,
      digestDay,
    });

    res.json({
      success: true,
      data: preference,
      message: 'Digest preference updated',
    });
  } catch (error: any) {
    console.error('Error in setDigestPreference:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PUT /api/digest-notifications/preferences/bulk
 * Apply the same digest settings to all event types for the user.
 * Requirements: 27.8
 */
export async function bulkSetDigestPreferences(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { digestEnabled, digestFrequency, digestTime, digestDay } = req.body;

    if (typeof digestEnabled !== 'boolean') {
      res.status(400).json({ success: false, error: 'digestEnabled must be a boolean' });
      return;
    }

    if (digestFrequency && !isValidFrequency(digestFrequency)) {
      res.status(400).json({
        success: false,
        error: `digestFrequency must be one of: ${VALID_FREQUENCIES.join(', ')}`,
      });
      return;
    }

    const result = await DigestService.bulkSetDigestPreferences(userId, {
      digestEnabled,
      digestFrequency: digestFrequency ?? 'daily',
      digestTime,
      digestDay,
    });

    res.json({
      success: true,
      data: result,
      message: `Updated digest preferences for ${result.updated} event type(s)`,
    });
  } catch (error: any) {
    console.error('Error in bulkSetDigestPreferences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ─── Digest History ───────────────────────────────────────────────────────────

/**
 * GET /api/digest-notifications
 * List the user's digest history with optional filters.
 * Query params: limit, offset, frequency, status
 * Requirements: 27.8
 */
export async function getDigestHistory(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const {
      limit,
      offset,
      frequency,
      status,
    } = req.query;

    if (frequency && !isValidFrequency(frequency)) {
      res.status(400).json({
        success: false,
        error: `frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`,
      });
      return;
    }

    const result = await DigestService.getUserDigestHistory(userId, {
      limit: limit ? parseInt(limit as string, 10) : 30,
      offset: offset ? parseInt(offset as string, 10) : 0,
      frequency: frequency as DigestFrequency | undefined,
      status: status as string | undefined,
    });

    res.json({
      success: true,
      data: result,
      message: 'Digest history retrieved',
    });
  } catch (error: any) {
    console.error('Error in getDigestHistory:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/digest-notifications/:id
 * Get a single digest record by ID.
 * Requirements: 27.8
 */
export async function getDigestById(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const digest = await DigestService.getDigestById(id, userId);

    if (!digest) {
      res.status(404).json({ success: false, error: 'Digest not found' });
      return;
    }

    res.json({
      success: true,
      data: digest,
      message: 'Digest retrieved',
    });
  } catch (error: any) {
    console.error('Error in getDigestById:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ─── Trigger / Preview ────────────────────────────────────────────────────────

/**
 * POST /api/digest-notifications/trigger
 * Manually trigger a digest for the authenticated user.
 * Body: { frequency: "immediate" | "hourly" | "daily" | "weekly" }
 * Requirements: 27.8
 */
export async function triggerDigest(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { frequency } = req.body;

    if (!isValidFrequency(frequency)) {
      res.status(400).json({
        success: false,
        error: `frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`,
      });
      return;
    }

    const result = await DigestService.triggerDigestForUser(userId, frequency);

    res.json({
      success: true,
      data: result,
      message: result.notificationCount > 0
        ? `Digest triggered with ${result.notificationCount} notification(s)`
        : 'No notifications in the current period',
    });
  } catch (error: any) {
    console.error('Error in triggerDigest:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/digest-notifications/preview
 * Preview what the current digest would look like without sending.
 * Query params: frequency (default: "daily")
 * Requirements: 27.8
 */
export async function previewDigest(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { frequency = 'daily' } = req.query;

    if (!isValidFrequency(frequency)) {
      res.status(400).json({
        success: false,
        error: `frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`,
      });
      return;
    }

    const preview = await DigestService.previewDigest(userId, frequency);

    if (!preview) {
      res.json({
        success: true,
        data: null,
        message: 'No notifications in the current period — digest would be empty',
      });
      return;
    }

    res.json({
      success: true,
      data: preview,
      message: 'Digest preview generated',
    });
  } catch (error: any) {
    console.error('Error in previewDigest:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/digest-notifications/:id/resend
 * Re-queue and resend a previously failed digest.
 * Requirements: 27.8
 */
export async function resendDigest(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const digest = await DigestService.getDigestById(id, userId);
    if (!digest) {
      res.status(404).json({ success: false, error: 'Digest not found' });
      return;
    }

    if (digest.status === 'sent') {
      res.status(409).json({
        success: false,
        error: 'Digest has already been sent. Trigger a new digest instead.',
      });
      return;
    }

    // Reset to pending so sendDigestById will process it
    await (await import('../config/prisma')).default.digestNotification.update({
      where: { id },
      data: { status: 'pending' },
    });

    const sent = await DigestService.sendDigestById(id);

    res.json({
      success: sent,
      data: { digestId: id, sent },
      message: sent ? 'Digest resent successfully' : 'Failed to resend digest',
    });
  } catch (error: any) {
    console.error('Error in resendDigest:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export default {
  getDigestPreferences,
  setDigestPreference,
  bulkSetDigestPreferences,
  getDigestHistory,
  getDigestById,
  triggerDigest,
  previewDigest,
  resendDigest,
};
