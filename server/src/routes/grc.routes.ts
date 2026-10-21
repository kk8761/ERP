/**
 * GRC Routes
 * API endpoints for Governance, Risk & Compliance module
 */

import { Router } from 'express';
import grcController from '../controllers/grc.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// ==================== Risk Management Routes ====================

// Get all risks with optional filtering
router.get('/risks', grcController.getRisks.bind(grcController));

// Get risk statistics
router.get('/risks/statistics', grcController.getRiskStatistics.bind(grcController));

// Get risk heat map
router.get('/risks/heatmap', grcController.getRiskHeatMap.bind(grcController));

// Get risk by ID
router.get('/risks/:id', grcController.getRiskById.bind(grcController));

// Create new risk
router.post('/risks', grcController.createRisk.bind(grcController));

// Update risk assessment (likelihood and impact)
router.put('/risks/:id/assess', grcController.assessRisk.bind(grcController));

// Update risk status
router.put('/risks/:id/status', grcController.updateRiskStatus.bind(grcController));

// Delete risk
router.delete('/risks/:id', grcController.deleteRisk.bind(grcController));

// Add mitigation to risk
router.post('/risks/:id/mitigations', grcController.addMitigation.bind(grcController));

// Update mitigation
router.put(
  '/risks/:id/mitigations/:mitigationId',
  grcController.updateMitigation.bind(grcController)
);

// ==================== Compliance Management Routes ====================

// Get compliance statistics
router.get('/compliance/statistics', grcController.getComplianceStatistics.bind(grcController));

// Get all compliance requirements with optional filtering
router.get('/compliance', grcController.getComplianceRequirements.bind(grcController));

// Get compliance requirement by ID
router.get('/compliance/:id', grcController.getComplianceRequirementById.bind(grcController));

// Create compliance requirement
router.post('/compliance', grcController.createComplianceRequirement.bind(grcController));

// Update compliance requirement status
router.put('/compliance/:id/status', grcController.updateComplianceStatus.bind(grcController));

// Delete compliance requirement
router.delete('/compliance/:id', grcController.deleteComplianceRequirement.bind(grcController));

// Add control to compliance requirement
router.post('/compliance/:id/controls', grcController.addControl.bind(grcController));

// Update control
router.put(
  '/compliance/:id/controls/:controlId',
  grcController.updateControl.bind(grcController)
);

// Delete control
router.delete(
  '/compliance/:id/controls/:controlId',
  grcController.deleteControl.bind(grcController)
);

// Add evidence to control
router.post(
  '/compliance/:id/controls/:controlId/evidence',
  grcController.addControlEvidence.bind(grcController)
);

// Remove evidence from control
router.delete(
  '/compliance/:id/controls/:controlId/evidence/:evidenceId',
  grcController.removeControlEvidence.bind(grcController)
);

// Assess control effectiveness
router.post(
  '/compliance/:id/controls/:controlId/assess',
  grcController.assessControlEffectiveness.bind(grcController)
);

// ==================== Audit Management Routes ====================

// Get audit statistics
router.get('/audits/statistics', grcController.getAuditStatistics.bind(grcController));

// Get all audit plans with optional filtering
router.get('/audits', grcController.getAuditPlans.bind(grcController));

// Get audit plan by ID
router.get('/audits/:id', grcController.getAuditPlanById.bind(grcController));

// Create audit plan
router.post('/audits', grcController.createAuditPlan.bind(grcController));

// Update audit plan
router.put('/audits/:id', grcController.updateAuditPlan.bind(grcController));

// Update audit status
router.put('/audits/:id/status', grcController.updateAuditStatus.bind(grcController));

// Delete audit plan
router.delete('/audits/:id', grcController.deleteAuditPlan.bind(grcController));

// Add finding to audit
router.post('/audits/:id/findings', grcController.addAuditFinding.bind(grcController));

// Update finding remediation status
router.put(
  '/audits/:id/findings/:findingId/remediation',
  grcController.updateFindingRemediation.bind(grcController)
);

// ==================== Compliance Reporting Routes ====================
// Task 27.4: Implement compliance reporting

// Generate SOX compliance report
router.get('/reports/sox', grcController.generateSOXReport.bind(grcController));

// Generate GDPR compliance report
router.get('/reports/gdpr', grcController.generateGDPRReport.bind(grcController));

// Generate custom compliance report
router.get('/reports/custom', grcController.generateCustomReport.bind(grcController));

export default router;
