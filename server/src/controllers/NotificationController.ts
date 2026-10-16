/**
 * Notification Controller
 * 
 * Handles HTTP requests for notification management
 * Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7, 27.8
 */

import { Request, Response } from 'express';
import * as NotificationService from '../services/notification.service';
import * as TemplateService from '../services/notification-template.service';
import * as EscalationService from '../services/escalation.service';
import * as DigestService from '../services/digest.service';
import * as PreferenceService from '../services/notification-preference.service';

/**
 * Create and send notification
 * POST /api/notifications
 * Requirements: 27.1, 27.2
 */
export async function createNotification(req: Request, res: Response) {
  try {
    const { userId, title, message, type, category, priority, actionUrl, actionLabel, metadata, templateCode, templateVariables, channels } = req.body;

    if (!userId || (!title && !templateCode)) {
      return res.status(400).json({
        success: false,
        error: 'userId and either title or templateCode are required',
      });
    }

    const notification = await NotificationService.createNotification(
      {
        userId,
        title,
        message,
        type,
        category,
        priority,
        actionUrl,
        actionLabel,
        metadata,
        templateCode,
        templateVariables,
      },
      {
        channels: channels || ['in_app'],
      }
    );

    res.json({
      success: true,
      data: notification,
      message: 'Notification created successfully',
    });
  } catch (error: any) {
    console.error('Error in createNotification:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get user notifications
 * GET /api/notifications
 * Requirements: 27.6
 */
export async function getUserNotifications(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { limit, offset, unreadOnly, category } = req.query;

    const result = await NotificationService.getUserNotifications(userId, {
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
      unreadOnly: unreadOnly === 'true',
      category: category as string,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in getUserNotifications:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get unread count
 * GET /api/notifications/unread-count
 * Requirements: 27.6
 */
export async function getUnreadCount(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const count = await NotificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error: any) {
    console.error('Error in getUnreadCount:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 * Requirements: 27.6
 */
export async function markAsRead(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;

    await NotificationService.markAsRead(id, userId);

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error: any) {
    console.error('Error in markAsRead:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Mark all notifications as read
 * PUT /api/notifications/mark-all-read
 * Requirements: 27.6
 */
export async function markAllAsRead(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    await NotificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error: any) {
    console.error('Error in markAllAsRead:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get user notification preferences
 * GET /api/notifications/preferences
 * Requirements: 27.3
 */
export async function getPreferences(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { eventType } = req.query;

    let preferences;
    if (eventType) {
      preferences = await PreferenceService.getEventTypePreference(userId, eventType as string);
    } else {
      preferences = await PreferenceService.getAllUserPreferences(userId);
    }

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error: any) {
    console.error('Error in getPreferences:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Update user notification preferences
 * PUT /api/notifications/preferences/:eventType
 * Requirements: 27.3
 */
export async function updatePreferences(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { eventType } = req.params;
    const preferences = req.body;

    const updated = await PreferenceService.setEventTypePreference(
      userId,
      eventType,
      preferences
    );

    res.json({
      success: true,
      data: updated,
      message: 'Preferences updated successfully',
    });
  } catch (error: any) {
    console.error('Error in updatePreferences:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get delivery report
 * GET /api/notifications/delivery-report
 * Requirements: 27.7
 */
export async function getDeliveryReport(req: Request, res: Response) {
  try {
    const { startDate, endDate, channel, status } = req.query;

    const filters: any = {};

    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }

    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }

    if (channel) {
      filters.channel = channel as string;
    }

    if (status) {
      filters.status = status as string;
    }

    const report = await NotificationService.getDeliveryReport(filters);

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Error in getDeliveryReport:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Create notification template
 * POST /api/notifications/templates
 * Requirements: 27.4
 */
export async function createTemplate(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const template = await TemplateService.createTemplate(req.body, userId);

    res.json({
      success: true,
      data: template,
      message: 'Template created successfully',
    });
  } catch (error: any) {
    console.error('Error in createTemplate:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get templates
 * GET /api/notifications/templates
 * Requirements: 27.4
 */
export async function getTemplates(req: Request, res: Response) {
  try {
    const { eventType, category, language, isActive, isDraft } = req.query;

    const filters: any = {};

    if (eventType) filters.eventType = eventType as string;
    if (category) filters.category = category as string;
    if (language) filters.language = language as string;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (isDraft !== undefined) filters.isDraft = isDraft === 'true';

    const templates = await TemplateService.getTemplates(filters);

    res.json({
      success: true,
      data: templates,
    });
  } catch (error: any) {
    console.error('Error in getTemplates:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get template by ID
 * GET /api/notifications/templates/:id
 * Requirements: 27.4
 */
export async function getTemplateById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const template = await TemplateService.getTemplates();
    const found = template.find((t: any) => t.id === id);

    if (!found) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    res.json({
      success: true,
      data: found,
    });
  } catch (error: any) {
    console.error('Error in getTemplateById:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Update template
 * PUT /api/notifications/templates/:id
 * Requirements: 27.4
 */
export async function updateTemplate(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { changeDescription, ...updates } = req.body;

    const template = await TemplateService.updateTemplate(
      id,
      updates,
      changeDescription,
      userId
    );

    res.json({
      success: true,
      data: template,
      message: 'Template updated successfully',
    });
  } catch (error: any) {
    console.error('Error in updateTemplate:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Delete template
 * DELETE /api/notifications/templates/:id
 * Requirements: 27.4
 */
export async function deleteTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await TemplateService.deleteTemplate(id);

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error: any) {
    console.error('Error in deleteTemplate:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get template versions
 * GET /api/notifications/templates/:id/versions
 * Requirements: 27.4
 */
export async function getTemplateVersions(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const versions = await TemplateService.getTemplateVersions(id);

    res.json({
      success: true,
      data: versions,
    });
  } catch (error: any) {
    console.error('Error in getTemplateVersions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Restore template to specific version
 * POST /api/notifications/templates/:id/restore/:version
 * Requirements: 27.4
 */
export async function restoreTemplateVersion(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const { id, version } = req.params;

    const template = await TemplateService.restoreTemplateVersion(
      id,
      parseInt(version),
      userId
    );

    res.json({
      success: true,
      data: template,
      message: `Template restored to version ${version}`,
    });
  } catch (error: any) {
    console.error('Error in restoreTemplateVersion:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Publish template (convert draft to active)
 * POST /api/notifications/templates/:id/publish
 * Requirements: 27.4
 */
export async function publishTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const template = await TemplateService.publishTemplate(id);

    res.json({
      success: true,
      data: template,
      message: 'Template published successfully',
    });
  } catch (error: any) {
    console.error('Error in publishTemplate:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Activate/Deactivate template
 * PUT /api/notifications/templates/:id/active
 * Requirements: 27.4
 */
export async function setTemplateActive(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isActive must be a boolean',
      });
    }

    const template = await TemplateService.setTemplateActive(id, isActive);

    res.json({
      success: true,
      data: template,
      message: `Template ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error: any) {
    console.error('Error in setTemplateActive:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Preview template with sample variables
 * POST /api/notifications/templates/:id/preview
 * Requirements: 27.4
 */
export async function previewTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { sampleVariables } = req.body;

    // Get template
    const templates = await TemplateService.getTemplates();
    const template = templates.find((t: any) => t.id === id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    const preview = TemplateService.previewTemplate(template, sampleVariables || {});

    res.json({
      success: true,
      data: preview,
    });
  } catch (error: any) {
    console.error('Error in previewTemplate:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get template by code
 * GET /api/notifications/templates/code/:code
 * Requirements: 27.4
 */
export async function getTemplateByCode(req: Request, res: Response) {
  try {
    const { code } = req.params;
    const { language } = req.query;

    const template = await TemplateService.getTemplateByCode(
      code,
      language as string
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error: any) {
    console.error('Error in getTemplateByCode:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Create escalation rule
 * POST /api/notifications/escalation-rules
 * Requirements: 27.5
 */
export async function createEscalationRule(req: Request, res: Response) {
  try {
    const rule = await EscalationService.createEscalationRule(req.body);

    res.json({
      success: true,
      data: rule,
      message: 'Escalation rule created successfully',
    });
  } catch (error: any) {
    console.error('Error in createEscalationRule:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get escalation rules
 * GET /api/notifications/escalation-rules
 * Requirements: 27.5
 */
export async function getEscalationRules(req: Request, res: Response) {
  try {
    const { eventType, isActive } = req.query;

    const filters: any = {};
    if (eventType) filters.eventType = eventType as string;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    const rules = await EscalationService.getEscalationRules(filters);

    res.json({
      success: true,
      data: rules,
    });
  } catch (error: any) {
    console.error('Error in getEscalationRules:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Acknowledge escalation
 * POST /api/notifications/escalations/:id/acknowledge
 * Requirements: 27.5
 */
export async function acknowledgeEscalation(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const escalation = await EscalationService.acknowledgeEscalation(id, userId);

    res.json({
      success: true,
      data: escalation,
      message: 'Escalation acknowledged',
    });
  } catch (error: any) {
    console.error('Error in acknowledgeEscalation:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get digest history
 * GET /api/notifications/digests
 * Requirements: 27.8
 */
export async function getDigestHistory(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { limit, offset, frequency } = req.query;

    const result = await DigestService.getUserDigestHistory(userId, {
      limit: limit ? parseInt(limit as string) : 30,
      offset: offset ? parseInt(offset as string) : 0,
      frequency: frequency as any,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in getDigestHistory:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Set global DND schedule
 * POST /api/notifications/preferences/dnd
 * Requirements: 27.3
 */
export async function setDNDSchedule(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { enabled, startTime, endTime, days } = req.body;

    const schedule = await PreferenceService.setGlobalDNDSchedule(userId, {
      enabled,
      startTime,
      endTime,
      days,
    });

    res.json({
      success: true,
      data: schedule,
      message: 'DND schedule updated successfully',
    });
  } catch (error: any) {
    console.error('Error in setDNDSchedule:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get global DND schedule
 * GET /api/notifications/preferences/dnd
 * Requirements: 27.3
 */
export async function getDNDSchedule(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const schedule = await PreferenceService.getGlobalDNDSchedule(userId);

    res.json({
      success: true,
      data: schedule,
    });
  } catch (error: any) {
    console.error('Error in getDNDSchedule:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Bulk update channels for multiple event types
 * POST /api/notifications/preferences/bulk-channels
 * Requirements: 27.3
 */
export async function bulkUpdateChannels(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        error: 'Updates must be an array',
      });
    }

    const results = await PreferenceService.bulkUpdateChannels(userId, updates);

    res.json({
      success: true,
      data: results,
      message: 'Channels updated successfully',
    });
  } catch (error: any) {
    console.error('Error in bulkUpdateChannels:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Delete preference for event type
 * DELETE /api/notifications/preferences/:eventType
 * Requirements: 27.3
 */
export async function deletePreference(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { eventType } = req.params;

    await PreferenceService.deleteEventTypePreference(userId, eventType);

    res.json({
      success: true,
      message: 'Preference deleted successfully',
    });
  } catch (error: any) {
    console.error('Error in deletePreference:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Reset preferences to defaults
 * POST /api/notifications/preferences/reset
 * Requirements: 27.3
 */
export async function resetPreferences(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { eventType } = req.body;

    await PreferenceService.resetToDefaults(userId, eventType);

    res.json({
      success: true,
      message: 'Preferences reset to defaults',
    });
  } catch (error: any) {
    console.error('Error in resetPreferences:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Check if user is in DND
 * GET /api/notifications/preferences/dnd-status
 * Requirements: 27.3
 */
export async function checkDNDStatus(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { eventType } = req.query;

    const inDND = await PreferenceService.isUserInDND(userId, eventType as string);

    res.json({
      success: true,
      data: { inDND },
    });
  } catch (error: any) {
    console.error('Error in checkDNDStatus:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

export default {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreferences,
  getDeliveryReport,
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  getTemplateVersions,
  restoreTemplateVersion,
  publishTemplate,
  setTemplateActive,
  previewTemplate,
  getTemplateByCode,
  createEscalationRule,
  getEscalationRules,
  acknowledgeEscalation,
  getDigestHistory,
};
