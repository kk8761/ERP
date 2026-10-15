/**
 * Digest Notification Routes
 *
 * Registers all HTTP endpoints for the digest notification feature.
 * All routes require authentication via authMiddleware.
 *
 * Base path: /api/digest-notifications
 * Requirements: 27.8
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as DigestController from '../controllers/digest-notification.controller';

const router = Router();

// All routes require authentication
router.use(authenticate as any);

// ─── Preferences ─────────────────────────────────────────────────────────────

/**
 * GET /api/digest-notifications/preferences
 * List digest preferences for the authenticated user.
 * Requirements: 27.8
 */
router.get('/preferences', DigestController.getDigestPreferences);

/**
 * PUT /api/digest-notifications/preferences/bulk
 * Apply one set of digest settings to all event types.
 * Requirements: 27.8
 */
router.put('/preferences/bulk', DigestController.bulkSetDigestPreferences);

/**
 * PUT /api/digest-notifications/preferences/:eventType
 * Create or update digest preferences for a specific event type.
 * Requirements: 27.8
 */
router.put('/preferences/:eventType', DigestController.setDigestPreference);

// ─── Preview / Trigger ────────────────────────────────────────────────────────

/**
 * GET /api/digest-notifications/preview
 * Preview the current digest without sending.
 * Query: frequency (immediate|hourly|daily|weekly, default: daily)
 * Requirements: 27.8
 */
router.get('/preview', DigestController.previewDigest);

/**
 * POST /api/digest-notifications/trigger
 * Manually trigger a digest send for the authenticated user.
 * Body: { frequency: "immediate" | "hourly" | "daily" | "weekly" }
 * Requirements: 27.8
 */
router.post('/trigger', DigestController.triggerDigest);

// ─── Digest History ───────────────────────────────────────────────────────────

/**
 * GET /api/digest-notifications
 * List digest history for the authenticated user.
 * Query: limit, offset, frequency, status
 * Requirements: 27.8
 */
router.get('/', DigestController.getDigestHistory);

/**
 * GET /api/digest-notifications/:id
 * Get a specific digest record by ID.
 * Requirements: 27.8
 */
router.get('/:id', DigestController.getDigestById);

/**
 * POST /api/digest-notifications/:id/resend
 * Re-queue and resend a failed digest.
 * Requirements: 27.8
 */
router.post('/:id/resend', DigestController.resendDigest);

export default router;
