/**
 * Anomaly Detection Routes
 * Task 38.6: Implement anomaly detection
 */

import { Router } from 'express';
import * as anomalyController from '../controllers/anomaly-detection.controller';
import { authMiddleware } from '../middleware/auth';
import { rbacMiddleware } from '../middleware/rbac.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/anomaly-detection/analyze
 * @desc    Analyze user activity for anomalies
 * @access  Private (Security Admin)
 */
router.post(
  '/analyze',
  rbacMiddleware('security', 'analyze'),
  anomalyController.analyzeUserActivity
);

/**
 * @route   POST /api/anomaly-detection/detect-failed-logins
 * @desc    Detect failed login attempts
 * @access  Private (Security Admin)
 */
router.post(
  '/detect-failed-logins',
  rbacMiddleware('security', 'analyze'),
  anomalyController.detectFailedLogins
);

/**
 * @route   POST /api/anomaly-detection/detect-data-exfiltration
 * @desc    Detect data exfiltration patterns
 * @access  Private (Security Admin)
 */
router.post(
  '/detect-data-exfiltration',
  rbacMiddleware('security', 'analyze'),
  anomalyController.detectDataExfiltration
);

/**
 * @route   POST /api/anomaly-detection/detect-privilege-escalation
 * @desc    Detect privilege escalation attempts
 * @access  Private (Security Admin)
 */
router.post(
  '/detect-privilege-escalation',
  rbacMiddleware('security', 'analyze'),
  anomalyController.detectPrivilegeEscalation
);

/**
 * @route   GET /api/anomaly-detection/statistics
 * @desc    Get anomaly detection statistics
 * @access  Private (Security Admin)
 */
router.get(
  '/statistics',
  rbacMiddleware('security', 'read'),
  anomalyController.getStatistics
);

/**
 * @route   PUT /api/anomaly-detection/users/:userId/profile
 * @desc    Update user behavior profile
 * @access  Private (Security Admin)
 */
router.put(
  '/users/:userId/profile',
  rbacMiddleware('security', 'update'),
  anomalyController.updateUserProfile
);

/**
 * @route   POST /api/anomaly-detection/respond
 * @desc    Manually trigger automated response
 * @access  Private (Security Admin)
 */
router.post(
  '/respond',
  rbacMiddleware('security', 'execute'),
  anomalyController.triggerAutomatedResponse
);

/**
 * @route   GET /api/anomaly-detection/metadata
 * @desc    Get anomaly types and severities
 * @access  Private
 */
router.get(
  '/metadata',
  anomalyController.getAnomalyMetadata
);

export default router;
