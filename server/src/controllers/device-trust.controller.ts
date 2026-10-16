/**
 * Device Trust Controller
 * Handles device trust management endpoints for zero-trust security
 * Task 38.1: Device trust verification
 */

import { Request, Response } from 'express';
import { DeviceTrustService, IPBlockingService, SecurityEventService } from '../services/device-trust.service';
import { ZeroTrustRequest } from '../middleware/zero-trust.middleware';

/**
 * Get all trusted devices for the current user
 */
export const getUserDevices = async (req: ZeroTrustRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const devices = await DeviceTrustService.getUserDevices(userId);

    res.json({
      success: true,
      data: devices,
    });
  } catch (error) {
    console.error('Get user devices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve devices',
    });
  }
};

/**
 * Register current device as trusted
 */
export const registerCurrentDevice = async (req: ZeroTrustRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { deviceName } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const deviceInfo = {
      userAgent: req.headers['user-agent'] || '',
      ipAddress: req.ip || req.socket.remoteAddress || '',
      acceptLanguage: req.headers['accept-language'],
      acceptEncoding: req.headers['accept-encoding'],
    };

    await DeviceTrustService.registerDevice(userId, deviceInfo, deviceName, false);

    // Log security event
    await SecurityEventService.logEvent({
      userId,
      eventType: 'DEVICE_REGISTERED',
      ipAddress: deviceInfo.ipAddress,
      deviceId: req.zeroTrust?.deviceId,
      success: true,
    });

    res.json({
      success: true,
      message: 'Device registered successfully',
    });
  } catch (error) {
    console.error('Register device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register device',
    });
  }
};

/**
 * Mark a device as explicitly trusted
 */
export const trustDevice = async (req: ZeroTrustRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { deviceId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    await DeviceTrustService.trustDevice(userId, deviceId);

    // Log security event
    await SecurityEventService.logEvent({
      userId,
      eventType: 'DEVICE_TRUSTED',
      ipAddress: req.ip || req.socket.remoteAddress || '',
      deviceId,
      success: true,
    });

    res.json({
      success: true,
      message: 'Device marked as trusted',
    });
  } catch (error) {
    console.error('Trust device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trust device',
    });
  }
};

/**
 * Revoke trust for a device
 */
export const untrustDevice = async (req: ZeroTrustRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { deviceId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    await DeviceTrustService.untrustDevice(userId, deviceId);

    // Log security event
    await SecurityEventService.logEvent({
      userId,
      eventType: 'DEVICE_UNTRUSTED',
      ipAddress: req.ip || req.socket.remoteAddress || '',
      deviceId,
      success: true,
    });

    res.json({
      success: true,
      message: 'Device trust revoked',
    });
  } catch (error) {
    console.error('Untrust device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke device trust',
    });
  }
};

/**
 * Remove a device from trusted devices
 */
export const removeDevice = async (req: ZeroTrustRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { deviceId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    await DeviceTrustService.removeDevice(userId, deviceId);

    // Log security event
    await SecurityEventService.logEvent({
      userId,
      eventType: 'DEVICE_REMOVED',
      ipAddress: req.ip || req.socket.remoteAddress || '',
      deviceId,
      success: true,
    });

    res.json({
      success: true,
      message: 'Device removed successfully',
    });
  } catch (error) {
    console.error('Remove device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove device',
    });
  }
};

/**
 * Get security events for the current user
 */
export const getUserSecurityEvents = async (req: ZeroTrustRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { limit = 100, eventType } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const events = await SecurityEventService.getUserEvents(
      userId,
      Number(limit),
      eventType as string
    );

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error('Get security events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security events',
    });
  }
};

/**
 * Detect anomalous activity for the current user
 */
export const detectAnomalies = async (req: ZeroTrustRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const anomalies = await SecurityEventService.detectAnomalies(userId);

    res.json({
      success: true,
      data: anomalies,
    });
  } catch (error) {
    console.error('Detect anomalies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect anomalies',
    });
  }
};

/**
 * Get current device trust status
 */
export const getCurrentDeviceTrust = async (req: ZeroTrustRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const deviceInfo = {
      userAgent: req.headers['user-agent'] || '',
      ipAddress: req.ip || req.socket.remoteAddress || '',
      acceptLanguage: req.headers['accept-language'],
      acceptEncoding: req.headers['accept-encoding'],
    };

    const trustResult = await DeviceTrustService.verifyDeviceTrust(userId, deviceInfo);

    res.json({
      success: true,
      data: trustResult,
    });
  } catch (error) {
    console.error('Get device trust error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get device trust status',
    });
  }
};

/**
 * Admin: Get all blocked IPs
 */
export const getBlockedIPs = async (req: Request, res: Response): Promise<void> => {
  try {
    const blockedIPs = await IPBlockingService.getBlockedIPs();

    res.json({
      success: true,
      data: blockedIPs,
    });
  } catch (error) {
    console.error('Get blocked IPs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve blocked IPs',
    });
  }
};

/**
 * Admin: Block an IP address
 */
export const blockIP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ipAddress, reason, expiresAt } = req.body;
    const blockedBy = req.user?.id || 'system';

    if (!ipAddress || !reason) {
      res.status(400).json({
        success: false,
        message: 'IP address and reason are required',
      });
      return;
    }

    await IPBlockingService.blockIP(
      ipAddress,
      reason,
      blockedBy,
      expiresAt ? new Date(expiresAt) : undefined
    );

    res.json({
      success: true,
      message: 'IP address blocked successfully',
    });
  } catch (error) {
    console.error('Block IP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to block IP address',
    });
  }
};

/**
 * Admin: Unblock an IP address
 */
export const unblockIP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ipAddress } = req.params;

    await IPBlockingService.unblockIP(ipAddress);

    res.json({
      success: true,
      message: 'IP address unblocked successfully',
    });
  } catch (error) {
    console.error('Unblock IP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unblock IP address',
    });
  }
};
