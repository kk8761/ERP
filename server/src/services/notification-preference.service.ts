/**
 * Notification Preference Service
 * 
 * Manages user notification preferences including channel selection and DND schedules
 * Requirements: 27.3
 * Task: 41.2
 */

import { PrismaClient } from '@prisma/client';
import { AuditService } from './audit.service';

const prisma = new PrismaClient();

// ===== Types and Interfaces =====

export type NotificationChannel = 'email' | 'sms' | 'in_app' | 'push';

export interface PreferenceData {
  enableEmail?: boolean;
  enableSMS?: boolean;
  enableInApp?: boolean;
  enablePush?: boolean;
  channels?: NotificationChannel[];
  dndEnabled?: boolean;
  dndStartTime?: string;
  dndEndTime?: string;
  dndDays?: string[];
  digestEnabled?: boolean;
  digestFrequency?: 'daily' | 'weekly';
  digestTime?: string;
  digestDay?: string;
}

export interface DNDSchedule {
  enabled: boolean;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  days: string[]; // ['monday', 'tuesday', etc.]
}

export interface EventTypePreference {
  eventType: string;
  channels: NotificationChannel[];
  dndOverride?: boolean; // If true, send even during DND
}

// ===== Validation Functions =====

/**
 * Validate time format (HH:MM)
 */
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Validate day of week
 */
function isValidDay(day: string): boolean {
  const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return validDays.includes(day.toLowerCase());
}

/**
 * Validate notification channel
 */
function isValidChannel(channel: string): boolean {
  const validChannels: NotificationChannel[] = ['email', 'sms', 'in_app', 'push'];
  return validChannels.includes(channel as NotificationChannel);
}

/**
 * Validate DND schedule
 */
export function validateDNDSchedule(schedule: Partial<DNDSchedule>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (schedule.enabled) {
    // Validate start time
    if (!schedule.startTime) {
      errors.push('Start time is required when DND is enabled');
    } else if (!isValidTimeFormat(schedule.startTime)) {
      errors.push('Start time must be in HH:MM format (e.g., "22:00")');
    }

    // Validate end time
    if (!schedule.endTime) {
      errors.push('End time is required when DND is enabled');
    } else if (!isValidTimeFormat(schedule.endTime)) {
      errors.push('End time must be in HH:MM format (e.g., "08:00")');
    }

    // Validate days
    if (!schedule.days || schedule.days.length === 0) {
      errors.push('At least one day must be selected for DND schedule');
    } else {
      const invalidDays = schedule.days.filter(day => !isValidDay(day));
      if (invalidDays.length > 0) {
        errors.push(`Invalid days: ${invalidDays.join(', ')}. Valid days are: monday-sunday`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate preference data
 */
export function validatePreferenceData(data: PreferenceData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate channels if provided
  if (data.channels) {
    if (!Array.isArray(data.channels)) {
      errors.push('Channels must be an array');
    } else {
      const invalidChannels = data.channels.filter(ch => !isValidChannel(ch));
      if (invalidChannels.length > 0) {
        errors.push(`Invalid channels: ${invalidChannels.join(', ')}. Valid channels are: email, sms, in_app, push`);
      }
    }
  }

  // Validate DND schedule
  if (data.dndEnabled) {
    const dndValidation = validateDNDSchedule({
      enabled: data.dndEnabled,
      startTime: data.dndStartTime,
      endTime: data.dndEndTime,
      days: data.dndDays,
    });

    if (!dndValidation.valid) {
      errors.push(...dndValidation.errors);
    }
  }

  // Validate digest preferences
  if (data.digestEnabled) {
    if (!data.digestFrequency) {
      errors.push('Digest frequency is required when digest is enabled');
    } else if (!['daily', 'weekly'].includes(data.digestFrequency)) {
      errors.push('Digest frequency must be "daily" or "weekly"');
    }

    if (data.digestFrequency === 'daily') {
      if (!data.digestTime) {
        errors.push('Digest time is required for daily digests');
      } else if (!isValidTimeFormat(data.digestTime)) {
        errors.push('Digest time must be in HH:MM format');
      }
    }

    if (data.digestFrequency === 'weekly') {
      if (!data.digestDay) {
        errors.push('Digest day is required for weekly digests');
      } else if (!isValidDay(data.digestDay)) {
        errors.push('Invalid digest day. Valid days are: monday-sunday');
      }

      if (!data.digestTime) {
        errors.push('Digest time is required for weekly digests');
      } else if (!isValidTimeFormat(data.digestTime)) {
        errors.push('Digest time must be in HH:MM format');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ===== CRUD Operations =====

/**
 * Get all preferences for a user
 * Requirements: 27.3
 */
export async function getAllUserPreferences(userId: string) {
  try {
    const preferences = await prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: { eventType: 'asc' },
    });

    return preferences;
  } catch (error: any) {
    console.error('Error getting user preferences:', error);
    throw new Error(`Failed to get user preferences: ${error.message}`);
  }
}

/**
 * Get preference for specific event type
 * Requirements: 27.3
 */
export async function getEventTypePreference(userId: string, eventType: string) {
  try {
    const preference = await prisma.notificationPreference.findUnique({
      where: {
        userId_eventType: {
          userId,
          eventType,
        },
      },
    });

    return preference;
  } catch (error: any) {
    console.error('Error getting event type preference:', error);
    throw new Error(`Failed to get preference: ${error.message}`);
  }
}

/**
 * Create or update preference for event type
 * Requirements: 27.3
 */
export async function setEventTypePreference(
  userId: string,
  eventType: string,
  preferenceData: PreferenceData
) {
  try {
    // Validate input
    const validation = validatePreferenceData(preferenceData);
    if (!validation.valid) {
      throw new Error(`Invalid preference data: ${validation.errors.join(', ')}`);
    }

    // Prepare data for upsert
    const data: any = {};

    if (preferenceData.enableEmail !== undefined) data.enableEmail = preferenceData.enableEmail;
    if (preferenceData.enableSMS !== undefined) data.enableSMS = preferenceData.enableSMS;
    if (preferenceData.enableInApp !== undefined) data.enableInApp = preferenceData.enableInApp;
    if (preferenceData.enablePush !== undefined) data.enablePush = preferenceData.enablePush;
    if (preferenceData.channels !== undefined) data.channels = preferenceData.channels;
    if (preferenceData.dndEnabled !== undefined) data.dndEnabled = preferenceData.dndEnabled;
    if (preferenceData.dndStartTime !== undefined) data.dndStartTime = preferenceData.dndStartTime;
    if (preferenceData.dndEndTime !== undefined) data.dndEndTime = preferenceData.dndEndTime;
    if (preferenceData.dndDays !== undefined) data.dndDays = preferenceData.dndDays;
    if (preferenceData.digestEnabled !== undefined) data.digestEnabled = preferenceData.digestEnabled;
    if (preferenceData.digestFrequency !== undefined) data.digestFrequency = preferenceData.digestFrequency;
    if (preferenceData.digestTime !== undefined) data.digestTime = preferenceData.digestTime;
    if (preferenceData.digestDay !== undefined) data.digestDay = preferenceData.digestDay;

    const preference = await prisma.notificationPreference.upsert({
      where: {
        userId_eventType: {
          userId,
          eventType,
        },
      },
      update: data,
      create: {
        userId,
        eventType,
        ...data,
      },
    });

    // Audit log the preference change
    await AuditService.log({
      userId,
      action: 'UPDATE_NOTIFICATION_PREFERENCE',
      entity: 'NotificationPreference',
      entityId: preference.id,
      details: {
        eventType,
        changes: preferenceData,
      },
    });

    return preference;
  } catch (error: any) {
    console.error('Error setting event type preference:', error);
    throw new Error(`Failed to set preference: ${error.message}`);
  }
}

/**
 * Delete preference for event type
 * Requirements: 27.3
 */
export async function deleteEventTypePreference(userId: string, eventType: string) {
  try {
    await prisma.notificationPreference.delete({
      where: {
        userId_eventType: {
          userId,
          eventType,
        },
      },
    });

    // Audit log the deletion
    await AuditService.log({
      userId,
      action: 'DELETE_NOTIFICATION_PREFERENCE',
      entity: 'NotificationPreference',
      details: {
        eventType,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting preference:', error);
    throw new Error(`Failed to delete preference: ${error.message}`);
  }
}

/**
 * Set global DND schedule (applies to all event types unless overridden)
 * Requirements: 27.3
 */
export async function setGlobalDNDSchedule(userId: string, schedule: DNDSchedule) {
  try {
    // Validate schedule
    const validation = validateDNDSchedule(schedule);
    if (!validation.valid) {
      throw new Error(`Invalid DND schedule: ${validation.errors.join(', ')}`);
    }

    // Update or create a global preference entry
    const preference = await prisma.notificationPreference.upsert({
      where: {
        userId_eventType: {
          userId,
          eventType: 'global',
        },
      },
      update: {
        dndEnabled: schedule.enabled,
        dndStartTime: schedule.startTime,
        dndEndTime: schedule.endTime,
        dndDays: schedule.days,
      },
      create: {
        userId,
        eventType: 'global',
        dndEnabled: schedule.enabled,
        dndStartTime: schedule.startTime,
        dndEndTime: schedule.endTime,
        dndDays: schedule.days,
      },
    });

    // Audit log the DND schedule change
    await AuditService.log({
      userId,
      action: 'UPDATE_DND_SCHEDULE',
      entity: 'NotificationPreference',
      entityId: preference.id,
      details: {
        schedule,
      },
    });

    return preference;
  } catch (error: any) {
    console.error('Error setting global DND schedule:', error);
    throw new Error(`Failed to set DND schedule: ${error.message}`);
  }
}

/**
 * Get global DND schedule
 * Requirements: 27.3
 */
export async function getGlobalDNDSchedule(userId: string) {
  try {
    const preference = await prisma.notificationPreference.findUnique({
      where: {
        userId_eventType: {
          userId,
          eventType: 'global',
        },
      },
    });

    if (!preference) {
      return null;
    }

    return {
      enabled: preference.dndEnabled,
      startTime: preference.dndStartTime || '',
      endTime: preference.dndEndTime || '',
      days: preference.dndDays || [],
    };
  } catch (error: any) {
    console.error('Error getting global DND schedule:', error);
    return null;
  }
}

/**
 * Bulk update channels for multiple event types
 * Requirements: 27.3
 */
export async function bulkUpdateChannels(
  userId: string,
  updates: Array<{ eventType: string; channels: NotificationChannel[] }>
) {
  try {
    // Validate all updates first
    for (const update of updates) {
      const validation = validatePreferenceData({ channels: update.channels });
      if (!validation.valid) {
        throw new Error(`Invalid channels for ${update.eventType}: ${validation.errors.join(', ')}`);
      }
    }

    // Perform bulk update
    const results = await Promise.all(
      updates.map(update =>
        prisma.notificationPreference.upsert({
          where: {
            userId_eventType: {
              userId,
              eventType: update.eventType,
            },
          },
          update: {
            channels: update.channels,
          },
          create: {
            userId,
            eventType: update.eventType,
            channels: update.channels,
          },
        })
      )
    );

    // Audit log the bulk update
    await AuditService.log({
      userId,
      action: 'BULK_UPDATE_NOTIFICATION_CHANNELS',
      entity: 'NotificationPreference',
      details: {
        updates,
        count: updates.length,
      },
    });

    return results;
  } catch (error: any) {
    console.error('Error bulk updating channels:', error);
    throw new Error(`Failed to bulk update channels: ${error.message}`);
  }
}

/**
 * Check if user is currently in DND period
 * Requirements: 27.3
 */
export async function isUserInDND(userId: string, eventType?: string): Promise<boolean> {
  try {
    // Check event-specific preference first
    let preference = null;
    if (eventType) {
      preference = await getEventTypePreference(userId, eventType);
    }

    // Fall back to global preference if no event-specific preference
    if (!preference) {
      preference = await prisma.notificationPreference.findUnique({
        where: {
          userId_eventType: {
            userId,
            eventType: 'global',
          },
        },
      });
    }

    if (!preference || !preference.dndEnabled) {
      return false;
    }

    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM

    // Check if today is a DND day
    if (preference.dndDays && !preference.dndDays.includes(currentDay)) {
      return false;
    }

    // Check time range
    if (preference.dndStartTime && preference.dndEndTime) {
      const startTime = preference.dndStartTime;
      const endTime = preference.dndEndTime;

      // Handle overnight DND periods (e.g., 22:00 to 08:00)
      if (startTime > endTime) {
        return currentTime >= startTime || currentTime <= endTime;
      } else {
        return currentTime >= startTime && currentTime <= endTime;
      }
    }

    return false;
  } catch (error: any) {
    console.error('Error checking DND status:', error);
    return false;
  }
}

/**
 * Get effective channels for a user and event type
 * Considers both preferences and DND status
 * Requirements: 27.3
 */
export async function getEffectiveChannels(
  userId: string,
  eventType: string,
  priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
): Promise<NotificationChannel[]> {
  try {
    const preference = await getEventTypePreference(userId, eventType);
    const inDND = await isUserInDND(userId, eventType);

    // If in DND and not urgent, only use in-app
    if (inDND && priority !== 'urgent') {
      return ['in_app'];
    }

    // Use preference channels if set
    if (preference && preference.channels && preference.channels.length > 0) {
      return preference.channels as NotificationChannel[];
    }

    // Default to in-app only
    return ['in_app'];
  } catch (error: any) {
    console.error('Error getting effective channels:', error);
    return ['in_app'];
  }
}

/**
 * Reset preferences to defaults for a user
 * Requirements: 27.3
 */
export async function resetToDefaults(userId: string, eventType?: string) {
  try {
    if (eventType) {
      // Reset specific event type
      await prisma.notificationPreference.delete({
        where: {
          userId_eventType: {
            userId,
            eventType,
          },
        },
      });

      // Audit log
      await AuditService.log({
        userId,
        action: 'RESET_NOTIFICATION_PREFERENCE',
        entity: 'NotificationPreference',
        details: {
          eventType,
        },
      });
    } else {
      // Reset all preferences
      await prisma.notificationPreference.deleteMany({
        where: { userId },
      });

      // Audit log
      await AuditService.log({
        userId,
        action: 'RESET_ALL_NOTIFICATION_PREFERENCES',
        entity: 'NotificationPreference',
        details: {
          scope: 'all',
        },
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error resetting preferences:', error);
    throw new Error(`Failed to reset preferences: ${error.message}`);
  }
}

export default {
  getAllUserPreferences,
  getEventTypePreference,
  setEventTypePreference,
  deleteEventTypePreference,
  setGlobalDNDSchedule,
  getGlobalDNDSchedule,
  bulkUpdateChannels,
  isUserInDND,
  getEffectiveChannels,
  resetToDefaults,
  validateDNDSchedule,
  validatePreferenceData,
};
