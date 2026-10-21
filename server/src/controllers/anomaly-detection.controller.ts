/**
 * Anomaly Detection Controller
 * Task 38.6: Implement anomaly detection
 * 
 * Provides endpoints for:
 * - Analyzing user activity for anomalies
 * - Detecting suspicious patterns
 * - Getting anomaly statistics
 * - Managing automated responses
 */

import { Request, Response } from 'express';
import { AnomalyDetectionService, AnomalyType, AnomalySeverity } from '../services/anomaly-detection.service';

/**
 * Analyze user activity for anomalies
 */
export const analyzeUserActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, ipAddress, userAgent, resource, action } = req.body;

    if (!userId || !ipAddress || !userAgent) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, ipAddress, userAgent',
      });
      return;
    }

    const anomalies = await AnomalyDetectionService.analyzeUserActivity(userId, {
      ipAddress,
      userAgent,
      timestamp: new Date(),
      resource,
      action,
    });

    // Trigger automated responses for detected anomalies
    for (const anomaly of anomalies) {
      if (anomaly.isAnomaly) {
        await AnomalyDetectionService.respondToAnomaly(userId, anomaly);
      }
    }

    res.json({
      success: true,
      data: {
        anomaliesDetected: anomalies.filter(a => a.isAnomaly).length,
        anomalies: anomalies.filter(a => a.isAnomaly),
        allChecks: anomalies,
      },
    });
  } catch (error) {
    console.error('Error analyzing user activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze user activity',
    });
  }
};

/**
 * Detect failed login attempts
 */
export const detectFailedLogins = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, ipAddress } = req.body;

    if (!userId || !ipAddress) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, ipAddress',
      });
      return;
    }

    const result = await AnomalyDetectionService.detectFailedLoginAttempts(userId, ipAddress);

    // Trigger automated response if anomaly detected
    if (result.isAnomaly) {
      await AnomalyDetectionService.respondToAnomaly(userId, result);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error detecting failed logins:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect failed logins',
    });
  }
};

/**
 * Detect data exfiltration
 */
export const detectDataExfiltration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, recordsAccessed, timeWindowMinutes } = req.body;

    if (!userId || recordsAccessed === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, recordsAccessed',
      });
      return;
    }

    const result = await AnomalyDetectionService.detectDataExfiltration(
      userId,
      recordsAccessed,
      timeWindowMinutes
    );

    // Trigger automated response if anomaly detected
    if (result.isAnomaly) {
      await AnomalyDetectionService.respondToAnomaly(userId, result);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error detecting data exfiltration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect data exfiltration',
    });
  }
};

/**
 * Detect privilege escalation
 */
export const detectPrivilegeEscalation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, attemptedAction, attemptedResource } = req.body;

    if (!userId || !attemptedAction || !attemptedResource) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, attemptedAction, attemptedResource',
      });
      return;
    }

    const result = await AnomalyDetectionService.detectPrivilegeEscalation(
      userId,
      attemptedAction,
      attemptedResource
    );

    // Trigger automated response if anomaly detected
    if (result.isAnomaly) {
      await AnomalyDetectionService.respondToAnomaly(userId, result);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error detecting privilege escalation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect privilege escalation',
    });
  }
};

/**
 * Get anomaly detection statistics
 */
export const getStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    const statistics = await AnomalyDetectionService.getStatistics(days);

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error('Error getting anomaly statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get anomaly statistics',
    });
  }
};

/**
 * Update user behavior profile
 */
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter: userId',
      });
      return;
    }

    await AnomalyDetectionService.updateUserBehaviorProfile(userId);

    res.json({
      success: true,
      message: 'User behavior profile updated successfully',
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user profile',
    });
  }
};

/**
 * Manually trigger automated response
 */
export const triggerAutomatedResponse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, anomalyType, severity, reason } = req.body;

    if (!userId || !anomalyType || !severity) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, anomalyType, severity',
      });
      return;
    }

    const anomaly = {
      isAnomaly: true,
      anomalyType: anomalyType as AnomalyType,
      severity: severity as AnomalySeverity,
      score: 100,
      reason: reason || 'Manual trigger',
    };

    await AnomalyDetectionService.respondToAnomaly(userId, anomaly);

    res.json({
      success: true,
      message: 'Automated response triggered successfully',
    });
  } catch (error) {
    console.error('Error triggering automated response:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger automated response',
    });
  }
};

/**
 * Get anomaly types and severities (for UI)
 */
export const getAnomalyMetadata = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      data: {
        anomalyTypes: Object.values(AnomalyType),
        severities: Object.values(AnomalySeverity),
        thresholds: {
          failedLoginAttempts: 5,
          rapidRequestsPerMinute: 100,
          dataExfiltrationRecords: 1000,
        },
      },
    });
  } catch (error) {
    console.error('Error getting anomaly metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get anomaly metadata',
    });
  }
};
