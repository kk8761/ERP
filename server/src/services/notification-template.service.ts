/**
 * Notification Template Service
 * 
 * Manages notification templates with versioning and multi-language support
 * Requirements: 27.4
 */

import prisma from '../config/prisma';

export interface TemplateData {
  name: string;
  code: string;
  description?: string;
  subject: string;
  body: string;
  htmlBody?: string;
  smsBody?: string;
  pushTitle?: string;
  pushBody?: string;
  eventType: string;
  category?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  language?: string;
  actionUrl?: string;
  actionLabel?: string;
  variables?: any;
  isDraft?: boolean;
}

/**
 * Create a new notification template
 * Requirements: 27.4
 */
export async function createTemplate(data: TemplateData, createdBy?: string) {
  try {
    // Check if template code already exists
    const existing = await prisma.notificationTemplate.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new Error(`Template with code '${data.code}' already exists`);
    }

    // Create template
    const template = await prisma.notificationTemplate.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        subject: data.subject,
        body: data.body,
        htmlBody: data.htmlBody,
        smsBody: data.smsBody,
        pushTitle: data.pushTitle,
        pushBody: data.pushBody,
        eventType: data.eventType,
        category: data.category || 'general',
        priority: data.priority || 'normal',
        language: data.language || 'en',
        actionUrl: data.actionUrl,
        actionLabel: data.actionLabel,
        variables: data.variables,
        version: 1,
        isActive: !data.isDraft,
        isDraft: data.isDraft || false,
        createdBy,
      },
    });

    // Create first version
    await prisma.notificationTemplateVersion.create({
      data: {
        templateId: template.id,
        version: 1,
        subject: data.subject,
        body: data.body,
        htmlBody: data.htmlBody,
        smsBody: data.smsBody,
        pushTitle: data.pushTitle,
        pushBody: data.pushBody,
        variables: data.variables,
        changeDescription: 'Initial version',
        createdBy,
      },
    });

    return template;
  } catch (error: any) {
    console.error('Error creating template:', error);
    throw new Error(`Failed to create template: ${error.message}`);
  }
}

/**
 * Update a notification template (creates new version)
 * Requirements: 27.4
 */
export async function updateTemplate(
  templateId: string,
  updates: Partial<TemplateData>,
  changeDescription?: string,
  updatedBy?: string
) {
  try {
    const template = await prisma.notificationTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    const newVersion = template.version + 1;

    // Update template
    const updated = await prisma.notificationTemplate.update({
      where: { id: templateId },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description && { description: updates.description }),
        ...(updates.subject && { subject: updates.subject }),
        ...(updates.body && { body: updates.body }),
        ...(updates.htmlBody !== undefined && { htmlBody: updates.htmlBody }),
        ...(updates.smsBody !== undefined && { smsBody: updates.smsBody }),
        ...(updates.pushTitle !== undefined && { pushTitle: updates.pushTitle }),
        ...(updates.pushBody !== undefined && { pushBody: updates.pushBody }),
        ...(updates.eventType && { eventType: updates.eventType }),
        ...(updates.category && { category: updates.category }),
        ...(updates.priority && { priority: updates.priority }),
        ...(updates.language && { language: updates.language }),
        ...(updates.actionUrl !== undefined && { actionUrl: updates.actionUrl }),
        ...(updates.actionLabel !== undefined && { actionLabel: updates.actionLabel }),
        ...(updates.variables !== undefined && { variables: updates.variables }),
        ...(updates.isDraft !== undefined && { isDraft: updates.isDraft }),
        version: newVersion,
      },
    });

    // Create version record
    await prisma.notificationTemplateVersion.create({
      data: {
        templateId: template.id,
        version: newVersion,
        subject: updates.subject || template.subject,
        body: updates.body || template.body,
        htmlBody: updates.htmlBody !== undefined ? updates.htmlBody : template.htmlBody,
        smsBody: updates.smsBody !== undefined ? updates.smsBody : template.smsBody,
        pushTitle: updates.pushTitle !== undefined ? updates.pushTitle : template.pushTitle,
        pushBody: updates.pushBody !== undefined ? updates.pushBody : template.pushBody,
        variables: updates.variables !== undefined ? updates.variables : template.variables,
        changeDescription,
        createdBy: updatedBy,
      },
    });

    return updated;
  } catch (error: any) {
    console.error('Error updating template:', error);
    throw new Error(`Failed to update template: ${error.message}`);
  }
}

/**
 * Get template by code
 * Requirements: 27.4
 */
export async function getTemplateByCode(code: string, language?: string) {
  try {
    return await prisma.notificationTemplate.findFirst({
      where: {
        code,
        language: language || 'en',
        isActive: true,
        isDraft: false,
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 5,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting template by code:', error);
    return null;
  }
}

/**
 * Get all templates
 * Requirements: 27.4
 */
export async function getTemplates(filters?: {
  eventType?: string;
  category?: string;
  language?: string;
  isActive?: boolean;
  isDraft?: boolean;
}) {
  try {
    const where: any = {};

    if (filters?.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.language) {
      where.language = filters.language;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.isDraft !== undefined) {
      where.isDraft = filters.isDraft;
    }

    return await prisma.notificationTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting templates:', error);
    throw new Error(`Failed to get templates: ${error.message}`);
  }
}

/**
 * Get template version history
 * Requirements: 27.4
 */
export async function getTemplateVersions(templateId: string) {
  try {
    return await prisma.notificationTemplateVersion.findMany({
      where: { templateId },
      orderBy: { version: 'desc' },
    });
  } catch (error: any) {
    console.error('Error getting template versions:', error);
    throw new Error(`Failed to get template versions: ${error.message}`);
  }
}

/**
 * Restore template to specific version
 * Requirements: 27.4
 */
export async function restoreTemplateVersion(
  templateId: string,
  versionNumber: number,
  restoredBy?: string
) {
  try {
    const version = await prisma.notificationTemplateVersion.findUnique({
      where: {
        templateId_version: {
          templateId,
          version: versionNumber,
        },
      },
    });

    if (!version) {
      throw new Error('Version not found');
    }

    return await updateTemplate(
      templateId,
      {
        subject: version.subject,
        body: version.body,
        htmlBody: version.htmlBody || undefined,
        smsBody: version.smsBody || undefined,
        pushTitle: version.pushTitle || undefined,
        pushBody: version.pushBody || undefined,
        variables: version.variables,
      },
      `Restored from version ${versionNumber}`,
      restoredBy
    );
  } catch (error: any) {
    console.error('Error restoring template version:', error);
    throw new Error(`Failed to restore template version: ${error.message}`);
  }
}

/**
 * Activate/Deactivate template
 * Requirements: 27.4
 */
export async function setTemplateActive(templateId: string, isActive: boolean) {
  try {
    return await prisma.notificationTemplate.update({
      where: { id: templateId },
      data: { isActive },
    });
  } catch (error: any) {
    console.error('Error setting template active state:', error);
    throw new Error(`Failed to set template active state: ${error.message}`);
  }
}

/**
 * Publish draft template
 * Requirements: 27.4
 */
export async function publishTemplate(templateId: string) {
  try {
    return await prisma.notificationTemplate.update({
      where: { id: templateId },
      data: {
        isDraft: false,
        isActive: true,
      },
    });
  } catch (error: any) {
    console.error('Error publishing template:', error);
    throw new Error(`Failed to publish template: ${error.message}`);
  }
}

/**
 * Delete template
 * Requirements: 27.4
 */
export async function deleteTemplate(templateId: string) {
  try {
    // Check if template is in use
    const notificationCount = await prisma.notification.count({
      where: { templateId },
    });

    if (notificationCount > 0) {
      throw new Error('Cannot delete template that has been used in notifications');
    }

    // Delete versions first
    await prisma.notificationTemplateVersion.deleteMany({
      where: { templateId },
    });

    // Delete template
    return await prisma.notificationTemplate.delete({
      where: { id: templateId },
    });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    throw new Error(`Failed to delete template: ${error.message}`);
  }
}

/**
 * Preview template with sample variables
 * Requirements: 27.4
 */
export function previewTemplate(
  template: any,
  sampleVariables: Record<string, any>
): {
  subject: string;
  body: string;
  htmlBody?: string;
  smsBody?: string;
  pushTitle?: string;
  pushBody?: string;
} {
  const renderField = (field: string | null) => {
    if (!field) return '';
    
    let rendered = field;
    Object.keys(sampleVariables).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, String(sampleVariables[key] || ''));
    });
    return rendered;
  };

  return {
    subject: renderField(template.subject),
    body: renderField(template.body),
    htmlBody: template.htmlBody ? renderField(template.htmlBody) : undefined,
    smsBody: template.smsBody ? renderField(template.smsBody) : undefined,
    pushTitle: template.pushTitle ? renderField(template.pushTitle) : undefined,
    pushBody: template.pushBody ? renderField(template.pushBody) : undefined,
  };
}

/**
 * Validate template variables
 * Requirements: 27.4
 */
export function validateTemplateVariables(
  template: string,
  declaredVariables: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Find all variables in template
  const variableMatches = template.match(/{{\\s*([^}]+)\\s*}}/g) || [];
  const usedVariables = variableMatches.map(match => 
    match.replace(/{{|}}/g, '').trim()
  );

  // Check for undeclared variables
  const undeclared = usedVariables.filter(v => !declaredVariables.includes(v));
  if (undeclared.length > 0) {
    errors.push(`Undeclared variables: ${undeclared.join(', ')}`);
  }

  // Check for unused declared variables
  const unused = declaredVariables.filter(v => !usedVariables.includes(v));
  if (unused.length > 0) {
    errors.push(`Unused declared variables: ${unused.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  createTemplate,
  updateTemplate,
  getTemplateByCode,
  getTemplates,
  getTemplateVersions,
  restoreTemplateVersion,
  setTemplateActive,
  publishTemplate,
  deleteTemplate,
  previewTemplate,
  validateTemplateVariables,
};
