/**
 * Tenant Customization Service
 * 
 * Handles tenant-specific customizations including custom fields,
 * workflows, and branding.
 */

import { PrismaClient } from '@prisma/client';
import { CustomFieldDefinition, WorkflowDefinition } from '../types/tenant.types';

const prisma = new PrismaClient();

export class TenantCustomizationService {
  /**
   * Create custom field for tenant
   */
  async createCustomField(tenantId: string, fieldDef: CustomFieldDefinition) {
    try {
      // Validate field definition
      if (!fieldDef.entityType || !fieldDef.fieldName || !fieldDef.fieldLabel) {
        throw new Error('entityType, fieldName, and fieldLabel are required');
      }

      // Check if field already exists
      const existing = await prisma.tenantCustomField.findUnique({
        where: {
          tenantId_entityType_fieldName: {
            tenantId,
            entityType: fieldDef.entityType,
            fieldName: fieldDef.fieldName
          }
        }
      });

      if (existing) {
        throw new Error(`Custom field ${fieldDef.fieldName} already exists for ${fieldDef.entityType}`);
      }

      // Create custom field
      const customField = await prisma.tenantCustomField.create({
        data: {
          tenantId,
          entityType: fieldDef.entityType,
          fieldName: fieldDef.fieldName,
          fieldLabel: fieldDef.fieldLabel,
          fieldType: fieldDef.fieldType,
          options: fieldDef.options || [],
          isRequired: fieldDef.isRequired || false,
          defaultValue: fieldDef.defaultValue,
          validationRules: fieldDef.validationRules as any,
          displayOrder: fieldDef.displayOrder || 0,
          helpText: fieldDef.helpText,
          isActive: true
        }
      });

      return customField;
    } catch (error) {
      console.error('Error creating custom field:', error);
      throw error;
    }
  }

  /**
   * Get custom fields for entity type
   */
  async getCustomFields(tenantId: string, entityType: string) {
    try {
      const customFields = await prisma.tenantCustomField.findMany({
        where: {
          tenantId,
          entityType,
          isActive: true
        },
        orderBy: {
          displayOrder: 'asc'
        }
      });

      return customFields;
    } catch (error) {
      console.error('Error getting custom fields:', error);
      throw error;
    }
  }

  /**
   * Update custom field
   */
  async updateCustomField(
    tenantId: string,
    fieldId: string,
    updates: Partial<CustomFieldDefinition>
  ) {
    try {
      const customField = await prisma.tenantCustomField.update({
        where: {
          id: fieldId,
          tenantId // Ensure tenant owns this field
        },
        data: {
          fieldLabel: updates.fieldLabel,
          options: updates.options,
          isRequired: updates.isRequired,
          defaultValue: updates.defaultValue,
          validationRules: updates.validationRules as any,
          displayOrder: updates.displayOrder,
          helpText: updates.helpText
        }
      });

      return customField;
    } catch (error) {
      console.error('Error updating custom field:', error);
      throw error;
    }
  }

  /**
   * Delete custom field
   */
  async deleteCustomField(tenantId: string, fieldId: string) {
    try {
      // Soft delete by setting isActive to false
      const customField = await prisma.tenantCustomField.update({
        where: {
          id: fieldId,
          tenantId
        },
        data: {
          isActive: false
        }
      });

      return customField;
    } catch (error) {
      console.error('Error deleting custom field:', error);
      throw error;
    }
  }

  /**
   * Create tenant workflow
   */
  async createWorkflow(tenantId: string, workflowDef: WorkflowDefinition) {
    try {
      // Validate workflow definition
      if (!workflowDef.name || !workflowDef.entityType || !workflowDef.triggerType) {
        throw new Error('name, entityType, and triggerType are required');
      }

      if (!workflowDef.actions || workflowDef.actions.length === 0) {
        throw new Error('At least one action is required');
      }

      // Create workflow
      const workflow = await prisma.tenantWorkflow.create({
        data: {
          tenantId,
          name: workflowDef.name,
          description: workflowDef.description,
          entityType: workflowDef.entityType,
          triggerType: workflowDef.triggerType,
          triggerConditions: workflowDef.triggerConditions as any,
          actions: workflowDef.actions as any,
          isActive: true
        }
      });

      return workflow;
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  }

  /**
   * Get tenant workflows
   */
  async getWorkflows(tenantId: string, entityType?: string) {
    try {
      const where: any = {
        tenantId,
        isActive: true
      };

      if (entityType) {
        where.entityType = entityType;
      }

      const workflows = await prisma.tenantWorkflow.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        }
      });

      return workflows;
    } catch (error) {
      console.error('Error getting workflows:', error);
      throw error;
    }
  }

  /**
   * Update workflow
   */
  async updateWorkflow(
    tenantId: string,
    workflowId: string,
    updates: Partial<WorkflowDefinition>
  ) {
    try {
      const workflow = await prisma.tenantWorkflow.update({
        where: {
          id: workflowId,
          tenantId
        },
        data: {
          name: updates.name,
          description: updates.description,
          triggerConditions: updates.triggerConditions as any,
          actions: updates.actions as any
        }
      });

      return workflow;
    } catch (error) {
      console.error('Error updating workflow:', error);
      throw error;
    }
  }

  /**
   * Toggle workflow active status
   */
  async toggleWorkflow(tenantId: string, workflowId: string, isActive: boolean) {
    try {
      const workflow = await prisma.tenantWorkflow.update({
        where: {
          id: workflowId,
          tenantId
        },
        data: {
          isActive
        }
      });

      return workflow;
    } catch (error) {
      console.error('Error toggling workflow:', error);
      throw error;
    }
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(tenantId: string, workflowId: string) {
    try {
      await prisma.tenantWorkflow.delete({
        where: {
          id: workflowId,
          tenantId
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting workflow:', error);
      throw error;
    }
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(
    tenantId: string,
    workflowId: string,
    triggerData: any
  ) {
    const startedAt = new Date();

    try {
      const workflow = await prisma.tenantWorkflow.findUnique({
        where: {
          id: workflowId,
          tenantId
        }
      });

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      if (!workflow.isActive) {
        throw new Error('Workflow is not active');
      }

      // Create execution record
      const execution = await prisma.tenantWorkflowExecution.create({
        data: {
          workflowId,
          tenantId,
          triggerData: triggerData as any,
          status: 'running',
          startedAt
        }
      });

      let actionsExecuted = 0;
      let actionsFailed = 0;
      const executionLog: any[] = [];

      // Execute each action
      for (const action of workflow.actions as any[]) {
        try {
          const actionResult = await this.executeWorkflowAction(action, triggerData);
          actionsExecuted++;
          executionLog.push({
            action: action.type,
            status: 'success',
            result: actionResult
          });
        } catch (error) {
          actionsFailed++;
          executionLog.push({
            action: action.type,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Update execution record
      const completedAt = new Date();
      await prisma.tenantWorkflowExecution.update({
        where: { id: execution.id },
        data: {
          status: actionsFailed > 0 ? 'failed' : 'completed',
          actionsExecuted,
          actionsFailed,
          executionLog: executionLog as any,
          completedAt,
          duration: completedAt.getTime() - startedAt.getTime()
        }
      });

      // Update workflow execution count
      await prisma.tenantWorkflow.update({
        where: { id: workflowId },
        data: {
          executionCount: { increment: 1 },
          lastExecutedAt: new Date()
        }
      });

      return {
        executionId: execution.id,
        status: actionsFailed > 0 ? 'failed' : 'completed',
        actionsExecuted,
        actionsFailed,
        executionLog
      };
    } catch (error) {
      console.error('Error executing workflow:', error);
      throw error;
    }
  }

  /**
   * Execute a single workflow action
   */
  private async executeWorkflowAction(action: any, triggerData: any): Promise<any> {
    switch (action.type) {
      case 'email':
        // TODO: Integrate with email service
        console.log('Sending email:', action.config);
        return { sent: true };

      case 'notification':
        // TODO: Integrate with notification service
        console.log('Sending notification:', action.config);
        return { sent: true };

      case 'webhook':
        // TODO: Call webhook
        console.log('Calling webhook:', action.config);
        return { called: true };

      case 'update_field':
        // TODO: Update field in database
        console.log('Updating field:', action.config);
        return { updated: true };

      case 'create_record':
        // TODO: Create record in database
        console.log('Creating record:', action.config);
        return { created: true };

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Update tenant branding
   */
  async updateBranding(
    tenantId: string,
    branding: {
      logo?: string;
      primaryColor?: string;
      secondaryColor?: string;
      configuration?: any;
    }
  ) {
    try {
      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          logo: branding.logo,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          configuration: branding.configuration as any
        }
      });

      return tenant;
    } catch (error) {
      console.error('Error updating branding:', error);
      throw error;
    }
  }

  /**
   * Get tenant branding
   */
  async getBranding(tenantId: string) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          logo: true,
          primaryColor: true,
          secondaryColor: true,
          configuration: true
        }
      });

      return tenant;
    } catch (error) {
      console.error('Error getting branding:', error);
      throw error;
    }
  }
}

export const tenantCustomizationService = new TenantCustomizationService();
