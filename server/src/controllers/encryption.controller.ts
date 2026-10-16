/**
 * Encryption Controller
 * Task 38.2: API endpoints for encryption key management
 */

import { Request, Response } from 'express';
import { EncryptionService } from '../services/encryption.service';
import { KeyManagementService, KeyType } from '../services/key-management.service';

/**
 * Get encryption key status
 */
export async function getKeyStatus(req: Request, res: Response): Promise<void> {
  try {
    const status = await EncryptionService.getKeyStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Get key status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get key status',
    });
  }
}

/**
 * Rotate encryption key manually
 */
export async function rotateKey(req: Request, res: Response): Promise<void> {
  try {
    const newKey = await EncryptionService.rotateEncryptionKey();

    res.json({
      success: true,
      message: 'Encryption key rotated successfully',
      data: {
        keyId: newKey.id,
        expiresAt: newKey.expiresAt,
      },
    });
  } catch (error) {
    console.error('Key rotation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rotate encryption key',
    });
  }
}

/**
 * Get all active encryption keys
 */
export async function getAllActiveKeys(req: Request, res: Response): Promise<void> {
  try {
    const keys = await KeyManagementService.getAllActiveKeys();

    res.json({
      success: true,
      data: keys,
    });
  } catch (error) {
    console.error('Get active keys error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active keys',
    });
  }
}

/**
 * Get key metadata by ID
 */
export async function getKeyMetadata(req: Request, res: Response): Promise<void> {
  try {
    const { keyId } = req.params;
    const metadata = await KeyManagementService.getKeyMetadata(keyId);

    if (!metadata) {
      res.status(404).json({
        success: false,
        error: 'Key not found',
      });
      return;
    }

    res.json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    console.error('Get key metadata error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get key metadata',
    });
  }
}

/**
 * Get key usage statistics
 */
export async function getKeyUsageStats(req: Request, res: Response): Promise<void> {
  try {
    const { keyId } = req.params;
    const stats = await KeyManagementService.getKeyUsageStats(keyId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get key usage stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get key usage statistics',
    });
  }
}

/**
 * Get keys expiring soon
 */
export async function getExpiringKeys(req: Request, res: Response): Promise<void> {
  try {
    const keys = await KeyManagementService.getExpiringKeys();

    res.json({
      success: true,
      data: keys,
    });
  } catch (error) {
    console.error('Get expiring keys error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get expiring keys',
    });
  }
}

/**
 * Get expired keys
 */
export async function getExpiredKeys(req: Request, res: Response): Promise<void> {
  try {
    const keys = await KeyManagementService.getExpiredKeys();

    res.json({
      success: true,
      data: keys,
    });
  } catch (error) {
    console.error('Get expired keys error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get expired keys',
    });
  }
}

/**
 * Create a new encryption key
 */
export async function createKey(req: Request, res: Response): Promise<void> {
  try {
    const { type, expiresInDays } = req.body;

    if (!type || !Object.values(KeyType).includes(type)) {
      res.status(400).json({
        success: false,
        error: 'Invalid key type',
      });
      return;
    }

    const key = await KeyManagementService.createKey(type, expiresInDays);

    res.json({
      success: true,
      message: 'Encryption key created successfully',
      data: key,
    });
  } catch (error) {
    console.error('Create key error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create encryption key',
    });
  }
}

/**
 * Revoke an encryption key
 */
export async function revokeKey(req: Request, res: Response): Promise<void> {
  try {
    const { keyId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({
        success: false,
        error: 'Revocation reason is required',
      });
      return;
    }

    await KeyManagementService.revokeKey(keyId, reason);

    res.json({
      success: true,
      message: 'Encryption key revoked successfully',
    });
  } catch (error) {
    console.error('Revoke key error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke encryption key',
    });
  }
}

/**
 * Update key rotation policy
 */
export async function updateRotationPolicy(req: Request, res: Response): Promise<void> {
  try {
    const { enabled, intervalDays, warningThresholdDays, autoRotate } = req.body;

    const policy: any = {};
    if (enabled !== undefined) policy.enabled = enabled;
    if (intervalDays !== undefined) policy.intervalDays = intervalDays;
    if (warningThresholdDays !== undefined) policy.warningThresholdDays = warningThresholdDays;
    if (autoRotate !== undefined) policy.autoRotate = autoRotate;

    await KeyManagementService.updateRotationPolicy(policy);

    res.json({
      success: true,
      message: 'Key rotation policy updated successfully',
    });
  } catch (error) {
    console.error('Update rotation policy error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update rotation policy',
    });
  }
}

/**
 * Get key management dashboard data
 */
export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const dashboard = await KeyManagementService.getDashboardData();

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard data',
    });
  }
}

/**
 * Check and rotate expired keys manually
 */
export async function checkAndRotateExpiredKeys(req: Request, res: Response): Promise<void> {
  try {
    await KeyManagementService.checkAndRotateExpiredKeys();

    res.json({
      success: true,
      message: 'Expired keys check completed',
    });
  } catch (error) {
    console.error('Check and rotate expired keys error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check and rotate expired keys',
    });
  }
}

/**
 * Encrypt a value (for testing/admin purposes)
 */
export async function encryptValue(req: Request, res: Response): Promise<void> {
  try {
    const { value } = req.body;

    if (!value) {
      res.status(400).json({
        success: false,
        error: 'Value is required',
      });
      return;
    }

    const encrypted = await EncryptionService.encryptString(value);

    res.json({
      success: true,
      data: { encrypted },
    });
  } catch (error) {
    console.error('Encrypt value error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to encrypt value',
    });
  }
}

/**
 * Decrypt a value (for testing/admin purposes)
 */
export async function decryptValue(req: Request, res: Response): Promise<void> {
  try {
    const { encrypted } = req.body;

    if (!encrypted) {
      res.status(400).json({
        success: false,
        error: 'Encrypted value is required',
      });
      return;
    }

    const decrypted = await EncryptionService.decryptString(encrypted);

    res.json({
      success: true,
      data: { decrypted },
    });
  } catch (error) {
    console.error('Decrypt value error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to decrypt value',
    });
  }
}
