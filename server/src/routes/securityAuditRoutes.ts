import { Router } from 'express';
import { securityAuditController } from '../controllers/SecurityAuditController';

const router = Router();

/**
 * @route   POST /api/security-audit/schedule
 * @desc    Schedule a security audit
 * @access  Admin only
 */
router.post('/schedule', securityAuditController.scheduleAudit.bind(securityAuditController));

/**
 * @route   POST /api/security-audit/vulnerability-scan
 * @desc    Conduct vulnerability scan
 * @access  Admin only
 */
router.post('/vulnerability-scan', securityAuditController.conductVulnerabilityScan.bind(securityAuditController));

/**
 * @route   POST /api/security-audit/penetration-test
 * @desc    Track penetration test results
 * @access  Admin only
 */
router.post('/penetration-test', securityAuditController.trackPenetrationTest.bind(securityAuditController));

/**
 * @route   POST /api/security-audit/findings
 * @desc    Create a security finding
 * @access  Admin only
 */
router.post('/findings', securityAuditController.createFinding.bind(securityAuditController));

/**
 * @route   PUT /api/security-audit/findings/:findingId/status
 * @desc    Update finding status
 * @access  Admin only
 */
router.put('/findings/:findingId/status', securityAuditController.updateFindingStatus.bind(securityAuditController));

/**
 * @route   GET /api/security-audit/findings/severity/:severity
 * @desc    Get findings by severity
 * @access  Admin only
 */
router.get('/findings/severity/:severity', securityAuditController.getFindingsBySeverity.bind(securityAuditController));

/**
 * @route   GET /api/security-audit/findings/open
 * @desc    Get open findings
 * @access  Admin only
 */
router.get('/findings/open', securityAuditController.getOpenFindings.bind(securityAuditController));

/**
 * @route   GET /api/security-audit/findings/status/:status
 * @desc    Get findings by status
 * @access  Admin only
 */
router.get('/findings/status/:status', securityAuditController.getFindingsByStatus.bind(securityAuditController));

/**
 * @route   GET /api/security-audit/findings/overdue
 * @desc    Get overdue findings
 * @access  Admin only
 */
router.get('/findings/overdue', securityAuditController.getOverdueFindings.bind(securityAuditController));

/**
 * @route   GET /api/security-audit/report/:auditId
 * @desc    Generate audit report
 * @access  Admin only
 */
router.get('/report/:auditId', securityAuditController.generateAuditReport.bind(securityAuditController));

/**
 * @route   GET /api/security-audit/metrics
 * @desc    Get audit dashboard metrics
 * @access  Admin only
 */
router.get('/metrics', securityAuditController.getAuditMetrics.bind(securityAuditController));

export default router;
