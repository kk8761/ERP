/**
 * Certificate Management Routes
 * API endpoints for certificate lifecycle management
 */

import express, { Request, Response } from 'express';
import { certificateService } from '../services/certificate.service';
import { authMiddleware } from '../middleware/auth';
import { roleMiddleware } from '../middleware/role.middleware';
import { auditLogger } from '../services/audit.service';

const router = express.Router();

/**
 * Get certificate status
 * GET /api/certificates/status
 */
router.get(
  '/status',
  authMiddleware,
  roleMiddleware(['admin', 'security_admin']),
  async (req: Request, res: Response) => {
    try {
      const status = await certificateService.getCertificateStatus();
      
      res.json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      console.error('Error getting certificate status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get certificate status',
        details: error.message,
      });
    }
  }
);

/**
 * Get certificate information
 * GET /api/certificates/info
 */
router.get(
  '/info',
  authMiddleware,
  roleMiddleware(['admin', 'security_admin']),
  async (req: Request, res: Response) => {
    try {
      const info = await certificateService.getCertificateInfo(
        req.query.path as string
      );
      
      if (!info) {
        return res.status(404).json({
          success: false,
          error: 'Certificate not found',
        });
      }
      
      res.json({
        success: true,
        data: info,
      });
    } catch (error: any) {
      console.error('Error getting certificate info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get certificate info',
        details: error.message,
      });
    }
  }
);

/**
 * Validate certificate
 * POST /api/certificates/validate
 */
router.post(
  '/validate',
  authMiddleware,
  roleMiddleware(['admin', 'security_admin']),
  async (req: Request, res: Response) => {
    try {
      const { certPath, keyPath } = req.body;
      
      if (!certPath) {
        return res.status(400).json({
          success: false,
          error: 'Certificate path is required',
        });
      }
      
      const validation = await certificateService.validateCertificate(
        certPath,
        keyPath
      );
      
      await auditLogger.log({
        userId: (req as any).user?.id || 'unknown',
        action: 'certificate.validate',
        resource: 'tls_certificate',
        details: {
          certPath,
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      
      res.json({
        success: true,
        data: validation,
      });
    } catch (error: any) {
      console.error('Error validating certificate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate certificate',
        details: error.message,
      });
    }
  }
);

/**
 * Generate self-signed certificate (development only)
 * POST /api/certificates/generate
 */
router.post(
  '/generate',
  authMiddleware,
  roleMiddleware(['admin']),
  async (req: Request, res: Response) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          error: 'Self-signed certificate generation not allowed in production',
        });
      }
      
      const { commonName = 'localhost', validDays = 365 } = req.body;
      
      const success = await certificateService.generateSelfSignedCertificate(
        commonName,
        validDays
      );
      
      if (!success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to generate certificate',
        });
      }
      
      await auditLogger.log({
        userId: (req as any).user?.id || 'unknown',
        action: 'certificate.generate',
        resource: 'tls_certificate',
        details: {
          commonName,
          validDays,
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      
      res.json({
        success: true,
        message: 'Self-signed certificate generated successfully',
      });
    } catch (error: any) {
      console.error('Error generating certificate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate certificate',
        details: error.message,
      });
    }
  }
);

/**
 * Rotate certificate
 * POST /api/certificates/rotate
 */
router.post(
  '/rotate',
  authMiddleware,
  roleMiddleware(['admin', 'security_admin']),
  async (req: Request, res: Response) => {
    try {
      const { newCertPath, newKeyPath, backup = true } = req.body;
      
      if (!newCertPath || !newKeyPath) {
        return res.status(400).json({
          success: false,
          error: 'New certificate and key paths are required',
        });
      }
      
      const success = await certificateService.rotateCertificate(
        newCertPath,
        newKeyPath,
        backup
      );
      
      if (!success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to rotate certificate',
        });
      }
      
      await auditLogger.log({
        userId: (req as any).user?.id || 'unknown',
        action: 'certificate.rotate',
        resource: 'tls_certificate',
        details: {
          backup,
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      
      res.json({
        success: true,
        message: 'Certificate rotated successfully',
        warning: 'Server restart required for changes to take effect',
      });
    } catch (error: any) {
      console.error('Error rotating certificate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to rotate certificate',
        details: error.message,
      });
    }
  }
);

/**
 * Start certificate monitoring
 * POST /api/certificates/monitoring/start
 */
router.post(
  '/monitoring/start',
  authMiddleware,
  roleMiddleware(['admin', 'security_admin']),
  async (req: Request, res: Response) => {
    try {
      const { checkIntervalHours = 24 } = req.body;
      
      certificateService.startMonitoring(checkIntervalHours);
      
      await auditLogger.log({
        userId: (req as any).user?.id || 'unknown',
        action: 'certificate.monitoring_started',
        resource: 'tls_certificate',
        details: {
          checkIntervalHours,
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      
      res.json({
        success: true,
        message: 'Certificate monitoring started',
      });
    } catch (error: any) {
      console.error('Error starting certificate monitoring:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start certificate monitoring',
        details: error.message,
      });
    }
  }
);

/**
 * Stop certificate monitoring
 * POST /api/certificates/monitoring/stop
 */
router.post(
  '/monitoring/stop',
  authMiddleware,
  roleMiddleware(['admin', 'security_admin']),
  async (req: Request, res: Response) => {
    try {
      certificateService.stopMonitoring();
      
      await auditLogger.log({
        userId: (req as any).user?.id || 'unknown',
        action: 'certificate.monitoring_stopped',
        resource: 'tls_certificate',
        details: {},
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      
      res.json({
        success: true,
        message: 'Certificate monitoring stopped',
      });
    } catch (error: any) {
      console.error('Error stopping certificate monitoring:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stop certificate monitoring',
        details: error.message,
      });
    }
  }
);

export default router;
