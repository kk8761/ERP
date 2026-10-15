/**
 * Compliance Reporting Routes
 * 
 * API routes for IFRS, GAAP, and country-specific compliance reports.
 * 
 * Requirements:
 * - 10.7: Support IFRS and GAAP standards
 * - 18.6: Use country-specific templates
 */

import { Router } from 'express';
import { ComplianceReportingController } from '../controllers/compliance-reporting.controller';
import { requirePermission } from '../middleware/rbac.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

// ─── IFRS Reporting ───────────────────────────────────────────────────────

router.get('/ifrs',
  requirePermission('read', 'financial_statement'),
  auditLog('GENERATE', 'ifrs_report'),
  ComplianceReportingController.generateIFRSReport
);

// ─── GAAP Reporting ───────────────────────────────────────────────────────

router.get('/gaap',
  requirePermission('read', 'financial_statement'),
  auditLog('GENERATE', 'gaap_report'),
  ComplianceReportingController.generateGAAPReport
);

// ─── Country-Specific Reporting ───────────────────────────────────────────

router.get('/country/:countryCode',
  requirePermission('read', 'financial_statement'),
  auditLog('GENERATE', 'country_specific_report'),
  ComplianceReportingController.generateCountrySpecificReport
);

router.get('/countries',
  requirePermission('read', 'financial_statement'),
  ComplianceReportingController.getSupportedCountries
);

export default router;
