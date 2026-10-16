/**
 * Device Trust Routes
 * API endpoints for device trust management and zero-trust security
 * Task 38.1: Device trust verification
 */

import { Router } from 'express';
import {
  getUserDevices,
  registerCurrentDevice,
  trustDevice,
  untrustDevice,
  removeDevice,
  getUserSecurityEvents,
  detectAnomalies,
  getCurrentDeviceTrust,
  getBlockedIPs,
  blockIP,
  unblockIP,
} from '../controllers/device-trust.controller';
import { authenticate } from '../middleware/auth';
import { enforceZeroTrustAuth } from '../middleware/zero-trust.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

const router = Router();

// ─── User Device Management ────────────────────────────────

/**
 * GET /api/device-trust/devices
 * Get all trusted devices for the current user
 */
router.get('/devices', authenticate, getUserDevices);

/**
 * POST /api/device-trust/devices/register
 * Register current device as trusted
 */
router.post('/devices/register', authenticate, registerCurrentDevice);

/**
 * PUT /api/device-trust/devices/:deviceId/trust
 * Mark a device as explicitly trusted
 */
router.put('/devices/:deviceId/trust', authenticate, trustDevice);

/**
 * PUT /api/device-trust/devices/:deviceId/untrust
 * Revoke trust for a device
 */
router.put('/devices/:deviceId/untrust', authenticate, untrustDevice);

/**
 * DELETE /api/device-trust/devices/:deviceId
 * Remove a device from trusted devices
 */
router.delete('/devices/:deviceId', authenticate, removeDevice);

/**
 * GET /api/device-trust/current
 * Get current device trust status
 */
router.get('/current', authenticate, getCurrentDeviceTrust);

// ─── Security Events ───────────────────────────────────────

/**
 * GET /api/device-trust/events
 * Get security events for the current user
 */
router.get('/events', authenticate, getUserSecurityEvents);

/**
 * GET /api/device-trust/anomalies
 * Detect anomalous activity for the current user
 */
router.get('/anomalies', authenticate, detectAnomalies);

// ─── Admin: IP Blocking ────────────────────────────────────

/**
 * GET /api/device-trust/admin/blocked-ips
 * Get all blocked IP addresses (Admin only)
 */
router.get(
  '/admin/blocked-ips',
  authenticate,
  enforceZeroTrustAuth,
  requirePermission('read', 'security'),
  getBlockedIPs
);

/**
 * POST /api/device-trust/admin/blocked-ips
 * Block an IP address (Admin only)
 */
router.post(
  '/admin/blocked-ips',
  authenticate,
  enforceZeroTrustAuth,
  requirePermission('create', 'security'),
  blockIP
);

/**
 * DELETE /api/device-trust/admin/blocked-ips/:ipAddress
 * Unblock an IP address (Admin only)
 */
router.delete(
  '/admin/blocked-ips/:ipAddress',
  authenticate,
  enforceZeroTrustAuth,
  requirePermission('delete', 'security'),
  unblockIP
);

export default router;
