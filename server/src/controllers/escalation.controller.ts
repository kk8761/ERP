/**
 * Escalation Controller
 *
 * HTTP handlers for alert escalation rule management and lifecycle operations.
 * Requirements: 27.5
 */

import { Request, Response } from 'express';
import * as EscalationService from '../services/escalation.service';

// ─── Helpers ────────────────────────────────────────────────

function userId(req: Request): string | undefined {
  return (req as any).user?.id;
}

function sendError(res: Response, status: number, message: string) {
  return res.status(status).json({ success: false, error: message });
}

// ─── Escalation Rules ────────────────────────────────────────

/**
 * Create an escalation rule
 * POST /api/escalations/rules
 * Requirements: 27.5
 */
export async function createEscalationRule(req: Request, res: Response) {
  try {
    const {
      name,
      description,
      eventType,
      alertType,
      priority,
      escalationDelay,
      maxEscalationLevel,
      escalationLevels,
      isActive,
    } = req.body;

    if (!name || !eventType || escalationDelay == null || !escalationLevels) {
      return sendError(
        res,
        400,
        'name, eventType, escalationDelay, and escalationLevels are required'
      );
    }

    if (!Array.isArray(escalationLevels) || escalationLevels.length === 0) {
      return sendError(res, 400, 'escalationLevels must be a non-empty array');
    }

    // Validate each level has required fields
    for (const level of escalationLevels) {
      if (
        level.level == null ||
        level.delay == null ||
        !Array.isArray(level.recipients) ||
        !Array.isArray(level.channels)
      ) {
        return sendError(
          res,
          400,
          'Each escalation level must have: level (number), delay (minutes), recipients (array), channels (array)'
        );
      }
    }

    const rule = await EscalationService.createEscalationRule({
      name,
      description,
      eventType,
      alertType,
      priority,
      escalationDelay,
      maxEscalationLevel,
      escalationLevels,
      isActive,
    });

    res.status(201).json({
      success: true,
      data: rule,
      message: 'Escalation rule created successfully',
    });
  } catch (error: any) {
    console.error('Error in createEscalationRule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * List escalation rules
 * GET /api/escalations/rules
 * Requirements: 27.5
 */
export async function getEscalationRules(req: Request, res: Response) {
  try {
    const { eventType, isActive } = req.query;

    const filters: any = {};
    if (eventType) filters.eventType = eventType as string;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    const rules = await EscalationService.getEscalationRules(filters);

    res.json({ success: true, data: rules });
  } catch (error: any) {
    console.error('Error in getEscalationRules:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update an escalation rule
 * PUT /api/escalations/rules/:id
 * Requirements: 27.5
 */
export async function updateEscalationRule(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      escalationDelay,
      maxEscalationLevel,
      escalationLevels,
      isActive,
    } = req.body;

    if (escalationLevels !== undefined) {
      if (!Array.isArray(escalationLevels) || escalationLevels.length === 0) {
        return sendError(res, 400, 'escalationLevels must be a non-empty array');
      }

      for (const level of escalationLevels) {
        if (
          level.level == null ||
          level.delay == null ||
          !Array.isArray(level.recipients) ||
          !Array.isArray(level.channels)
        ) {
          return sendError(
            res,
            400,
            'Each escalation level must have: level, delay, recipients, channels'
          );
        }
      }
    }

    const rule = await EscalationService.updateEscalationRule(id, {
      name,
      description,
      escalationDelay,
      maxEscalationLevel,
      escalationLevels,
      isActive,
    });

    res.json({
      success: true,
      data: rule,
      message: 'Escalation rule updated successfully',
    });
  } catch (error: any) {
    console.error('Error in updateEscalationRule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ─── Escalation Lifecycle ────────────────────────────────────

/**
 * Start escalation for an alert
 * POST /api/escalations/start
 * Requirements: 27.5
 */
export async function startEscalation(req: Request, res: Response) {
  try {
    const { ruleId, alertId, alertType, priority, metadata } = req.body;

    if (!ruleId || !alertId || !alertType || !priority) {
      return sendError(res, 400, 'ruleId, alertId, alertType, and priority are required');
    }

    const escalation = await EscalationService.startEscalation(
      ruleId,
      alertId,
      alertType,
      priority,
      metadata
    );

    res.status(201).json({
      success: true,
      data: escalation,
      message: 'Escalation started successfully',
    });
  } catch (error: any) {
    console.error('Error in startEscalation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Acknowledge an active escalation
 * POST /api/escalations/:id/acknowledge
 * Requirements: 27.5
 */
export async function acknowledgeEscalation(req: Request, res: Response) {
  try {
    const uid = userId(req);
    if (!uid) return sendError(res, 401, 'Unauthorized');

    const { id } = req.params;

    const escalation = await EscalationService.acknowledgeEscalation(id, uid);

    res.json({
      success: true,
      data: escalation,
      message: 'Escalation acknowledged',
    });
  } catch (error: any) {
    console.error('Error in acknowledgeEscalation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Resolve an escalation
 * POST /api/escalations/:id/resolve
 * Requirements: 27.5
 */
export async function resolveEscalation(req: Request, res: Response) {
  try {
    const uid = userId(req);
    if (!uid) return sendError(res, 401, 'Unauthorized');

    const { id } = req.params;

    const escalation = await EscalationService.resolveEscalation(id, uid);

    res.json({
      success: true,
      data: escalation,
      message: 'Escalation resolved',
    });
  } catch (error: any) {
    console.error('Error in resolveEscalation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Cancel an escalation
 * POST /api/escalations/:id/cancel
 * Requirements: 27.5
 */
export async function cancelEscalation(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const escalation = await EscalationService.cancelEscalation(id);

    res.json({
      success: true,
      data: escalation,
      message: 'Escalation cancelled',
    });
  } catch (error: any) {
    console.error('Error in cancelEscalation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ─── Escalation Queries ──────────────────────────────────────

/**
 * Get active escalations
 * GET /api/escalations/active
 * Requirements: 27.5
 */
export async function getActiveEscalations(req: Request, res: Response) {
  try {
    const { alertType, priority } = req.query;

    const filters: any = {};
    if (alertType) filters.alertType = alertType as string;
    if (priority) filters.priority = priority as string;

    const escalations = await EscalationService.getActiveEscalations(filters);

    res.json({ success: true, data: escalations });
  } catch (error: any) {
    console.error('Error in getActiveEscalations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get escalation history for a specific alert
 * GET /api/escalations/history/:alertId
 * Requirements: 27.5
 */
export async function getEscalationHistory(req: Request, res: Response) {
  try {
    const { alertId } = req.params;

    const history = await EscalationService.getEscalationHistory(alertId);

    res.json({ success: true, data: history });
  } catch (error: any) {
    console.error('Error in getEscalationHistory:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export default {
  createEscalationRule,
  getEscalationRules,
  updateEscalationRule,
  startEscalation,
  acknowledgeEscalation,
  resolveEscalation,
  cancelEscalation,
  getActiveEscalations,
  getEscalationHistory,
};
