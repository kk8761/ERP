/**
 * Tenant Routes
 * 
 * Defines API endpoints for tenant management operations.
 */

import { Router } from 'express';
import { tenantController } from '../controllers/tenantController';
import { tenantContextMiddleware, requireTenant, requirePlan } from '../middleware/tenantContext';

const router = Router();

// Public routes (no tenant context required)
router.post('/tenants', tenantController.createTenant.bind(tenantController));

// Protected routes (require authentication - to be added)
// For now, these are accessible but should be protected with auth middleware

// List all tenants (admin only)
router.get('/tenants', tenantController.listTenants.bind(tenantController));

// Get specific tenant
router.get('/tenants/:id', tenantController.getTenant.bind(tenantController));

// Update tenant
router.put('/tenants/:id', tenantController.updateTenant.bind(tenantController));

// Tenant lifecycle management
router.post('/tenants/:id/suspend', tenantController.suspendTenant.bind(tenantController));
router.post('/tenants/:id/reactivate', tenantController.reactivateTenant.bind(tenantController));
router.post('/tenants/:id/cancel', tenantController.cancelTenant.bind(tenantController));

// Tenant provisioning
router.post('/tenants/:id/provision', tenantController.provisionTenant.bind(tenantController));

// Tenant metrics
router.get('/tenants/:id/metrics', tenantController.getTenantMetrics.bind(tenantController));

// Current tenant (requires tenant context)
router.get('/tenant/current', tenantContextMiddleware, requireTenant, tenantController.getCurrentTenant.bind(tenantController));

export default router;
