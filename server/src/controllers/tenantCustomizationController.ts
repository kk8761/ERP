/**
 * Tenant Customization Controller
 * 
 * Handles HTTP requests for tenant customization operations.
 */

import { Request, Response } from 'express';
import { tenantCustomizationService } from '../services/tenantCustomizationService';
import { CustomFieldDefinition, WorkflowDefinition } from '../types/tenant.types';

export class TenantCustomizationController {
  /**
   * Create custom field
   * POST /api/tenant/custom-fields
   */
  async createCustomField(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(401).json({ error: 'Tenant context required' });
      }

      const fieldDef: CustomFieldDefinition = req.body;
      const customField = await tenantCustomizationService.createCustomField(req.tenantId, fieldDef);

      return res.status(201).json({
        message: 'Custom field created successfully',
        customField
      });
    } catch (error) {
      console.error('Error creating custom field:', error);
      return res.status(500).json({
        error: 'Failed to create custom field',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get custom fields for entity
   * GET /api/tenant/custom-fields/:entityType
   */
  async getCustomFields(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(401).json({ error: 'Tenant context required' });
      }

      const { entityType } = req.params;
      const customFields = await tenantCustomizationService.getCustomFields(req.tenantId, entityType);

      return res.json({ customFields });
    } catch (error) {
      console.error('Error getting custom fields:', error);
      return res.status(500).json({
        error: 'Failed to get custom fields',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update custom field
   * PUT /api/tenant/custom-fields/:id
   */
  async updateCustomField(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(401).json({ error: 'Tenant context required' });
      }

      const { id } = req.params;
      const updates: Partial<CustomFieldDefinition> = req.body;

      const customField = await tenantCustomizationService.updateCustomField(req.tenantId, id, updates);

      return res.json({
        message: 'Custom field updated successfully',
        customField
      });
    } catch (error) {
      console.error('Error updating custom field:', error);
      return res.status(500).json({
        error: 'Failed to update custom field',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete custom field
   * DELETE /api/tenant/custom-fields/:id
   */
  async deleteCustomField(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(401).json({ error: 'Tenant context required' });
      }

      const { id } = req.params;
      await tenantCustomizationService.deleteCustomField(req.tenantId, id);

      return res.json({ message: 'Custom field deleted successfully' });
    } catch (error) {
      console.error('Error deleting custom field:', error);
      return res.status(500).json({
        error: 'Failed to delete custom field',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create workflow
   * POST /api/tenant/workflows
   */
  async createWorkflow(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(401).json({ error: 'Tenant context required' });
      }

      const workflowDef: WorkflowDefinition = req.body;
      const workflow = await tenantCustomizationService.createWorkflow(req.tenantId, workflowDef);

      return res.status(201).json({
        message: 'Workflow created successfully',
        workflow
      });
    } catch (error) {
      console.error('Error creating workflow:', error);
      return res.status(500).json({
        error: 'Failed to create workflow',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get workflows
   * GET /api/tenant/workflows
   */
  async getWorkflows(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(401).json({ error: 'Tenant context required' });
      }

      const { entityType } = req.query;
      const workflows = await tenantCustomizationService.getWorkflows(
        req.tenantId,
        entityType as string | undefined
      );

      return res.json({ workflows });
    } catch (error) {
      console.error('Error getting workflows:', error);
      return res.status(500).json({
        error: 'Failed to get workflows',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update workflow
   * PUT /api/tenant/workflows/:id
   */
  async updateWorkflow(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(401).json({ error: 'Tenant context required' });
      }

      const { id } = req.params;
      const updates: Partial<WorkflowDefinition> = req.body;

      const workflow = await tenantCustomizationService.updateWorkflow(req.tenantId, id, updates);

      return res.json({
        message: 'Workflow updated successfully',
        workflow
      });
    } catch (error) {
      console.error('Error updating workflow:', error);
      return res.status(500).json({
        error: 'Failed to update workflow',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Toggle workflow
   * POST /api/tenant/workflows/:id/toggle
   */
  async toggleWorkflow(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(401).json({ error: 'Tenant context required' });
      }

      const { id } = req.params;
      const { isActive } = req.body;

      const workflow = await tenantCustomizationService.toggleWorkflow(req.tenantId, id, isActive);

      return res.json({
        message: `Workflow ${isActive ? 'activated' : 'deactivated'} successfully`,
        workflow
      });
    } catch (error) {
      console.error('Error toggling workflow:', error);
      return res.status(500).json({
        error: 'Failed to toggle workflow',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete workflow
   * DELETE /api/tenant/workflows/:id
   */
  async deleteWorkflow(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(401).json({ error: 'Tenant context required' });
      }

      const { id } = req.params;
      await tenantCustomizationService.deleteWorkflow(req.tenantId, id);

      return res.json({ message: 'Workflow deleted successfully' });
    } catch (error) {
      console.error('Error deleting workflow:', error);
      return res.status(500).json({
        error: 'Failed to delete workflow',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Execute workflow
   * POST /api/tenant/workflows/:id/execute
   */
  async executeWorkflow(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(401).json({ error: 'Tenant context required' });
      }

      const { id } = req.params;
      const { triggerData } = req.body;

      const result = await tenantCustomizationService.executeWorkflow(req.tenantId, id, triggerData);

      return res.json({
        message: 'Workflow executed successfully',
        result
      });
    } catch (error) {
      console.error('Error executing workflow:', error);
      return res.status(500).json({
        error: 'Failed to execute workflow',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update branding
   * PUT /api/tenant/branding
   */
  async updateBranding(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(401).json({ error: 'Tenant context required' });
      }

      const branding = req.body;
      const tenant = await tenantCustomizationService.updateBranding(req.tenantId, branding);

      return res.json({
        message: 'Branding updated successfully',
        branding: {
          logo: tenant.logo,
          primaryColor: tenant.primaryColor,
          secondaryColor: tenant.secondaryColor,
          configuration: tenant.configuration
        }
      });
    } catch (error) {
      console.error('Error updating branding:', error);
      return res.status(500).json({
        error: 'Failed to update branding',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get branding
   * GET /api/tenant/branding
   */
  async getBranding(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(401).json({ error: 'Tenant context required' });
      }

      const branding = await tenantCustomizationService.getBranding(req.tenantId);

      return res.json({ branding });
    } catch (error) {
      console.error('Error getting branding:', error);
      return res.status(500).json({
        error: 'Failed to get branding',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const tenantCustomizationController = new TenantCustomizationController();
