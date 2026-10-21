/**
 * Escalation Service
 * 
 * Handles alert escalation for unacknowledged notifications
 * Requirements: 27.5
 */

import { PrismaClient } from '@prisma/client';
import { createNotification } from './notification.service';

const prisma = new PrismaClient();

export interface EscalationLevel {
  level: number;
  delay: number; // Minutes
  recipients: string[]; // User IDs
  channels: ('email' | 'sms' | 'in_app' | 'push')[];
  message?: string;
}

/**
 * Create an escalation rule
 * Requirements: 27.5
 */
export async function createEscalationRule(data: {
  name: string;
  description?: string;
  eventType: string;
  alertType?: string;
  priority?: string;
  escalationDelay: number;
  maxEscalationLevel?: number;
  escalationLevels: EscalationLevel[];
  isActive?: boolean;
}) {
  try {
    return await prisma.escalationRule.create({
      data: {
        name: data.name,
        description: data.description,
        eventType: data.eventType,
        alertType: data.alertType,
        priority: data.priority || 'high',
        escalationDelay: data.escalationDelay,
        maxEscalationLevel: data.maxEscalationLevel || 3,
        escalationLevels: data.escalationLevels as any,
        isActive: data.isActive !== false,
      },
    });
  } catch (error: any) {
    console.error('Error creating escalation rule:', error);
    throw new Error(`Failed to create escalation rule: ${error.message}`);
  }
}

/**
 * Start alert escalation
 * Requirements: 27.5
 */
export async function startEscalation(
  ruleId: string,
  alertId: string,
  alertType: string,
  priority: string,
  metadata?: any
) {
  try {
    const rule = await prisma.escalationRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule || !rule.isActive) {
      throw new Error('Escalation rule not found or inactive');
    }

    // Create escalation record
    const escalation = await prisma.alertEscalation.create({
      data: {
        ruleId,
        alertId,
        alertType,
        priority,
        currentLevel: 0,
        status: 'active',
        escalationLog: [],
        metadata,
      },
    });

    // Schedule first escalation level
    await scheduleEscalation(escalation.id, 1, rule.escalationDelay);

    return escalation;
  } catch (error: any) {
    console.error('Error starting escalation:', error);
    throw new Error(`Failed to start escalation: ${error.message}`);
  }
}

/**
 * Schedule escalation level
 * Requirements: 27.5
 */
async function scheduleEscalation(
  escalationId: string,
  level: number,
  delayMinutes: number
) {
  // In production, this would use a job queue like Bull or Agenda
  // For now, using setTimeout as a simple implementation
  setTimeout(async () => {
    await executeEscalation(escalationId, level);
  }, delayMinutes * 60 * 1000);
}

/**
 * Execute escalation level
 * Requirements: 27.5
 */
async function executeEscalation(escalationId: string, level: number) {
  try {
    const escalation = await prisma.alertEscalation.findUnique({
      where: { id: escalationId },
      include: { rule: true },
    });

    if (!escalation || escalation.status !== 'active') {
      console.log(`Escalation ${escalationId} is not active, skipping level ${level}`);
      return;
    }

    const rule = escalation.rule;
    const escalationLevels = rule.escalationLevels as any as EscalationLevel[];
    const levelConfig = escalationLevels.find(l => l.level === level);

    if (!levelConfig) {
      console.log(`No configuration found for level ${level}`);
      return;
    }

    // Send notifications to escalation recipients
    const notificationPromises = levelConfig.recipients.map(userId => 
      createNotification(
        {
          userId,
          title: `ESCALATION Level ${level}: ${escalation.alertType}`,
          message: levelConfig.message || 
            `Alert ${escalation.alertId} has been escalated to level ${level} due to no acknowledgment.`,
          type: 'alert',
          category: 'escalation',
          priority: 'urgent',
          metadata: {
            escalationId: escalation.id,
            alertId: escalation.alertId,
            level,
          },
        },
        {
          channels: levelConfig.channels,
          forceDelivery: true, // Bypass DND for escalations
        }
      )
    );

    await Promise.allSettled(notificationPromises);

    // Update escalation record
    const escalationLog = (escalation.escalationLog as any) || [];
    escalationLog.push({
      level,
      timestamp: new Date().toISOString(),
      recipients: levelConfig.recipients,
      channels: levelConfig.channels,
    });

    await prisma.alertEscalation.update({
      where: { id: escalationId },
      data: {
        currentLevel: level,
        escalationLog: escalationLog as any,
      },
    });

    // Schedule next level if not at max
    if (level < rule.maxEscalationLevel && level < escalationLevels.length) {
      const nextLevel = escalationLevels.find(l => l.level === level + 1);
      if (nextLevel) {
        await scheduleEscalation(escalationId, level + 1, nextLevel.delay);
      }
    }
  } catch (error: any) {
    console.error('Error executing escalation:', error);
  }
}

/**
 * Acknowledge escalation
 * Requirements: 27.5
 */
export async function acknowledgeEscalation(
  escalationId: string,
  userId: string
) {
  try {
    const escalation = await prisma.alertEscalation.update({
      where: { id: escalationId },
      data: {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      },
    });

    // Log acknowledgment
    const escalationLog = (escalation.escalationLog as any) || [];
    escalationLog.push({
      action: 'acknowledged',
      timestamp: new Date().toISOString(),
      userId,
    });

    await prisma.alertEscalation.update({
      where: { id: escalationId },
      data: {
        escalationLog: escalationLog as any,
      },
    });

    return escalation;
  } catch (error: any) {
    console.error('Error acknowledging escalation:', error);
    throw new Error(`Failed to acknowledge escalation: ${error.message}`);
  }
}

/**
 * Resolve escalation
 * Requirements: 27.5
 */
export async function resolveEscalation(
  escalationId: string,
  userId: string
) {
  try {
    const escalation = await prisma.alertEscalation.update({
      where: { id: escalationId },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: userId,
      },
    });

    // Log resolution
    const escalationLog = (escalation.escalationLog as any) || [];
    escalationLog.push({
      action: 'resolved',
      timestamp: new Date().toISOString(),
      userId,
    });

    await prisma.alertEscalation.update({
      where: { id: escalationId },
      data: {
        escalationLog: escalationLog as any,
      },
    });

    return escalation;
  } catch (error: any) {
    console.error('Error resolving escalation:', error);
    throw new Error(`Failed to resolve escalation: ${error.message}`);
  }
}

/**
 * Get escalation history for an alert
 * Requirements: 27.5
 */
export async function getEscalationHistory(alertId: string) {
  try {
    return await prisma.alertEscalation.findMany({
      where: { alertId },
      include: { rule: true },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error: any) {
    console.error('Error getting escalation history:', error);
    throw new Error(`Failed to get escalation history: ${error.message}`);
  }
}

/**
 * Get active escalations
 * Requirements: 27.5
 */
export async function getActiveEscalations(filters?: {
  alertType?: string;
  priority?: string;
}) {
  try {
    const where: any = { status: 'active' };

    if (filters?.alertType) {
      where.alertType = filters.alertType;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    return await prisma.alertEscalation.findMany({
      where,
      include: { rule: true },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error: any) {
    console.error('Error getting active escalations:', error);
    throw new Error(`Failed to get active escalations: ${error.message}`);
  }
}

/**
 * Cancel escalation
 * Requirements: 27.5
 */
export async function cancelEscalation(escalationId: string) {
  try {
    return await prisma.alertEscalation.update({
      where: { id: escalationId },
      data: { status: 'cancelled' },
    });
  } catch (error: any) {
    console.error('Error cancelling escalation:', error);
    throw new Error(`Failed to cancel escalation: ${error.message}`);
  }
}

/**
 * Get escalation rules
 * Requirements: 27.5
 */
export async function getEscalationRules(filters?: {
  eventType?: string;
  isActive?: boolean;
}) {
  try {
    const where: any = {};

    if (filters?.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return await prisma.escalationRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  } catch (error: any) {
    console.error('Error getting escalation rules:', error);
    throw new Error(`Failed to get escalation rules: ${error.message}`);
  }
}

/**
 * Update escalation rule
 * Requirements: 27.5
 */
export async function updateEscalationRule(
  ruleId: string,
  updates: Partial<{
    name: string;
    description: string;
    escalationDelay: number;
    maxEscalationLevel: number;
    escalationLevels: EscalationLevel[];
    isActive: boolean;
  }>
) {
  try {
    return await prisma.escalationRule.update({
      where: { id: ruleId },
      data: {
        ...updates,
        escalationLevels: updates.escalationLevels as any,
      },
    });
  } catch (error: any) {
    console.error('Error updating escalation rule:', error);
    throw new Error(`Failed to update escalation rule: ${error.message}`);
  }
}

export default {
  createEscalationRule,
  startEscalation,
  acknowledgeEscalation,
  resolveEscalation,
  getEscalationHistory,
  getActiveEscalations,
  cancelEscalation,
  getEscalationRules,
  updateEscalationRule,
};
