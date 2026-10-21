/**
 * Tenant Controller
 * 
 * Handles HTTP requests for tenant management operations including
 * creation, provisioning, configuration, and lifecycle management.
 */

import { Request, Response } from 'express';
import { tenantService } from '../services/tenantService';
import { CreateTenantDTO, UpdateTenantDTO, TenantProvisioningOptions } from '../types/tenant.types';

export class TenantController {
  /**
   * Create a new tenant
   * POST /api/tenants
   */
  async createTenant(req: Request, res: Response) {
    try {
      const data: CreateTenantDTO = req.body;

      // Validate required fields
      if (!data.name || !data.domain || !data.slug || !data.contactEmail) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'name, domain, slug, and contactEmail are required'
        });
      }

      // Create tenant
      const tenant = await tenantService.createTenant(data);

      // Provision tenant (async)
      const provisioningOptions: TenantProvisioningOptions = {
        seedData: req.body.seedData !== false,
        createDefaultRoles: req.body.createDefaultRoles !== false,
        createDefaultWorkflows: req.body.createDefaultWorkflows !== false,
        sendWelcomeEmail: req.body.sendWelcomeEmail !== false
      };

      // Start provisioning in background
      tenantService.provisionTenant(tenant.id, provisioningOptions)
        .catch(err => console.error('Error provisioning tenant:', err));

      return res.status(201).json({
        message: 'Tenant created successfully',
        tenant: {
          id: tenant.id,
          name: tenant.name,
          domain: tenant.domain,
          slug: tenant.slug,
          status: tenant.status,
          plan: tenant.plan
        }
      });
    } catch (error) {
      console.error('Error creating tenant:', error);
      return res.status(500).json({
        error: 'Failed to create tenant',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get tenant by ID
   * GET /api/tenants/:id
   */
  async getTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const tenant = await tenantService.getTenantById(id);

      if (!tenant) {
        return res.status(404).json({
          error: 'Tenant not found',
          message: `No tenant found with ID: ${id}`
        });
      }

      return res.json({ tenant });
    } catch (error) {
      console.error('Error getting tenant:', error);
      return res.status(500).json({
        error: 'Failed to get tenant',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get current tenant (from context)
   * GET /api/tenants/current
   */
  async getCurrentTenant(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(401).json({
          error: 'No tenant context',
          message: 'Tenant context not found in request'
        });
      }

      const tenant = await tenantService.getTenantById(req.tenantId);

      if (!tenant) {
        return res.status(404).json({
          error: 'Tenant not found',
          message: 'Current tenant not found'
        });
      }

      return res.json({ tenant });
    } catch (error) {
      console.error('Error getting current tenant:', error);
      return res.status(500).json({
        error: 'Failed to get current tenant',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update tenant
   * PUT /api/tenants/:id
   */
  async updateTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data: UpdateTenantDTO = req.body;

      const tenant = await tenantService.updateTenant(id, data);

      return res.json({
        message: 'Tenant updated successfully',
        tenant
      });
    } catch (error) {
      console.error('Error updating tenant:', error);
      return res.status(500).json({
        error: 'Failed to update tenant',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * List all tenants
   * GET /api/tenants
   */
  async listTenants(req: Request, res: Response) {
    try {
      const { status, plan, limit, offset } = req.query;

      const result = await tenantService.listTenants({
        status: status as any,
        plan: plan as any,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });

      return res.json(result);
    } catch (error) {
      console.error('Error listing tenants:', error);
      return res.status(500).json({
        error: 'Failed to list tenants',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Suspend tenant
   * POST /api/tenants/:id/suspend
   */
  async suspendTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const tenant = await tenantService.suspendTenant(id, reason);

      return res.json({
        message: 'Tenant suspended successfully',
        tenant
      });
    } catch (error) {
      console.error('Error suspending tenant:', error);
      return res.status(500).json({
        error: 'Failed to suspend tenant',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Reactivate tenant
   * POST /api/tenants/:id/reactivate
   */
  async reactivateTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const tenant = await tenantService.reactivateTenant(id);

      return res.json({
        message: 'Tenant reactivated successfully',
        tenant
      });
    } catch (error) {
      console.error('Error reactivating tenant:', error);
      return res.status(500).json({
        error: 'Failed to reactivate tenant',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Cancel tenant
   * POST /api/tenants/:id/cancel
   */
  async cancelTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const tenant = await tenantService.cancelTenant(id);

      return res.json({
        message: 'Tenant cancelled successfully',
        tenant
      });
    } catch (error) {
      console.error('Error cancelling tenant:', error);
      return res.status(500).json({
        error: 'Failed to cancel tenant',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get tenant metrics
   * GET /api/tenants/:id/metrics
   */
  async getTenantMetrics(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const metrics = await tenantService.getTenantMetrics(id);

      return res.json({ metrics });
    } catch (error) {
      console.error('Error getting tenant metrics:', error);
      return res.status(500).json({
        error: 'Failed to get tenant metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Provision tenant
   * POST /api/tenants/:id/provision
   */
  async provisionTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const options: TenantProvisioningOptions = req.body;

      const steps = await tenantService.provisionTenant(id, options);

      return res.json({
        message: 'Tenant provisioned successfully',
        steps
      });
    } catch (error) {
      console.error('Error provisioning tenant:', error);
      return res.status(500).json({
        error: 'Failed to provision tenant',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const tenantController = new TenantController();
