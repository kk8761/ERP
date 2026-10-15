/**
 * Escalation Routes
 *
 * API endpoints for alert escalation rule management and lifecycle operations.
 * Requirements: 27.5
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as EscalationController from '../controllers/escalation.controller';

const router = Router();

// All escalation endpoints require authentication
router.use(authMiddleware);

// ─── Escalation Rules ─────────────────────────────────────────────────────────

/**
 * Create a new escalation rule
 * POST /api/escalations/rules
 *
 * Body:
 *   name            string  (required)
 *   eventType       string  (required) – e.g. "stock_alert", "payment_overdue"
 *   escalationDelay number  (required) – initial delay in minutes before first escalation
 *   escalationLevels array  (required) – [{level, delay, recipients, channels, message?}]
 *   description?    string
 *   alertType?      string
 *   priority?       string  default "high"
 *   maxEscalationLevel? number default 3
 *   isActive?       boolean default true
 *
 * Requirements: 27.5
 */
router.post('/rules', EscalationController.createEscalationRule);

/**
 * List escalation rules
 * GET /api/escalations/rules?eventType=&isActive=
 * Requirements: 27.5
 */
router.get('/rules', EscalationController.getEscalationRules);

/**
 * Update an escalation rule
 * PUT /api/escalations/rules/:id
 * Requirements: 27.5
 */
router.put('/rules/:id', EscalationController.updateEscalationRule);

// ─── Escalation Lifecycle ─────────────────────────────────────────────────────

/**
 * Start escalation tracking for an unacknowledged alert
 * POST /api/escalations/start
 *
 * Body: { ruleId, alertId, alertType, priority, metadata? }
 * Requirements: 27.5
 */
router.post('/start', EscalationController.startEscalation);

/**
 * Acknowledge an active escalation (stops further escalation)
 * POST /api/escalations/:id/acknowledge
 * Requirements: 27.5
 */
router.post('/:id/acknowledge', EscalationController.acknowledgeEscalation);

/**
 * Resolve an escalation
 * POST /api/escalations/:id/resolve
 * Requirements: 27.5
 */
router.post('/:id/resolve', EscalationController.resolveEscalation);

/**
 * Cancel an escalation without marking it resolved
 * POST /api/escalations/:id/cancel
 * Requirements: 27.5
 */
router.post('/:id/cancel', EscalationController.cancelEscalation);

// ─── Escalation Queries ───────────────────────────────────────────────────────

/**
 * Get all currently active escalations
 * GET /api/escalations/active?alertType=&priority=
 * Requirements: 27.5
 */
router.get('/active', EscalationController.getActiveEscalations);

/**
 * Get full escalation history for a specific alert
 * GET /api/escalations/history/:alertId
 * Requirements: 27.5
 */
router.get('/history/:alertId', EscalationController.getEscalationHistory);

export default router;
