/**
 * Tax Engine Routes
 * 
 * API endpoints for tax calculation and configuration
 * 
 * Requirements: 10.6, 18.2, 18.4
 */

import { Router } from 'express';
import * as taxEngineController from '../controllers/tax-engine.controller';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac.middleware';

const router = Router();

// All tax routes require authentication
router.use(authenticate);

/**
 * Tax Calculation Routes
 */

// Calculate tax for a transaction
router.post(
  '/calculate',
  checkPermission('tax', 'create'),
  taxEngineController.calculateTax
);

// Calculate tax for an existing invoice
router.post(
  '/calculate-invoice/:invoiceId',
  checkPermission('tax', 'create'),
  taxEngineController.calculateTaxForInvoice
);

// Get tax calculation history
router.get(
  '/history/:transactionId',
  checkPermission('tax', 'read'),
  taxEngineController.getTaxHistory
);

/**
 * Tax Configuration Routes
 */

// Get tax engine configuration
router.get(
  '/config',
  checkPermission('tax', 'read'),
  taxEngineController.getConfig
);

// Update tax engine configuration
router.put(
  '/config',
  checkPermission('tax', 'update'),
  taxEngineController.updateConfig
);

// Test tax engine connection
router.post(
  '/test-connection',
  checkPermission('tax', 'execute'),
  taxEngineController.testConnection
);

/**
 * Tax Rules Routes
 */

// Get all tax rules
router.get(
  '/rules',
  checkPermission('tax', 'read'),
  taxEngineController.getTaxRules
);

// Create tax rule
router.post(
  '/rules',
  checkPermission('tax', 'create'),
  taxEngineController.createTaxRule
);

// Update tax rule
router.put(
  '/rules/:id',
  checkPermission('tax', 'update'),
  taxEngineController.updateTaxRule
);

// Delete tax rule
router.delete(
  '/rules/:id',
  checkPermission('tax', 'delete'),
  taxEngineController.deleteTaxRule
);

/**
 * Tax Exemption Routes
 */

// Get tax exemptions
router.get(
  '/exemptions',
  checkPermission('tax', 'read'),
  taxEngineController.getTaxExemptions
);

// Create tax exemption
router.post(
  '/exemptions',
  checkPermission('tax', 'create'),
  taxEngineController.createTaxExemption
);

export default router;
