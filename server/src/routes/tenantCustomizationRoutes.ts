/**
 * Tenant Customization Routes
 * 
 * Defines API endpoints for tenant customization operations.
 */

import { Router } from 'express';
import { tenantCustomizationController } from '../controllers/tenantCustomizationController';
import { tenantContextMiddleware, requireTenant } from '../middleware/tenantContext';

const router = Router();

// All routes require tenant context
router.use(tenantContextMiddleware);
router.use(requireTenant);

// Custom Fields
router.post('/tenant/custom-fields', tenantCustomizationController.createCustomField.bind(tenantCustomizationController));
router.get('/tenant/custom-fields/:entityType', tenantCustomizationController.getCustomFields.bind(tenantCustomizationController));
router.put('/tenant/custom-fields/:id', tenantCustomizationController.updateCustomField.bind(tenantCustomizationController));
router.delete('/tenant/custom-fields/:id', tenantCustomizationController.deleteCustomField.bind(tenantCustomizationController));

// Workflows
router.post('/tenant/workflows', tenantCustomizationController.createWorkflow.bind(tenantCustomizationController));
router.get('/tenant/workflows', tenantCustomizationController.getWorkflows.bind(tenantCustomizationController));
router.put('/tenant/workflows/:id', tenantCustomizationController.updateWorkflow.bind(tenantCustomizationController));
router.post('/tenant/workflows/:id/toggle', tenantCustomizationController.toggleWorkflow.bind(tenantCustomizationController));
router.delete('/tenant/workflows/:id', tenantCustomizationController.deleteWorkflow.bind(tenantCustomizationController));
router.post('/tenant/workflows/:id/execute', tenantCustomizationController.executeWorkflow.bind(tenantCustomizationController));

// Branding
router.put('/tenant/branding', tenantCustomizationController.updateBranding.bind(tenantCustomizationController));
router.get('/tenant/branding', tenantCustomizationController.getBranding.bind(tenantCustomizationController));

export default router;
