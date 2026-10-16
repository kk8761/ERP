import { Request, Response } from 'express';
import { keyManagementService } from '../services/KeyManagementService';

/**
 * Key Management Controller
 * 
 * Handles HTTP requests for key management operations:
 * - View key metadata and statistics
 * - Rotate encryption keys
 * - Track key usage
 * - Manage rotation policies
 * 
 * Requirements: 15.5
 */

export class KeyManagementController {
  /**
   * Get all keys metadata
   * GET /api/keys
   */
  public async getAllKeys(req: Request, res: Response): Promise<void> {
    try {
      const keys = keyManagementService.getAllKeysMetadata();
      
      res.json({
        success: true,
        data: {
          keys: keys.map(key => ({
            id: key.id,
            provider: key.provider,
            createdAt: key.createdAt,
            expiresAt: key.expiresAt,
            rotatedAt: key.rotatedAt,
            isActive: key.isActive,
            usageCount: key.usageCount,
            lastUsedAt: key.lastUsedAt,
            version: key.version,
            daysUntilExpiry: Math.floor(
              (key.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
            ),
          })),
          totalKeys: keys.length,
          activeKeys: keys.filter(k => k.isActive).length,
        },
      });
    } catch (error) {
      console.error('Error getting keys:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve keys',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get specific key metadata
   * GET /api/keys/:keyId
   */
  public async getKey(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params;
      const metadata = keyManagementService.getKeyMetadata(keyId);

      if (!metadata) {
        res.status(404).json({
          success: false,
          error: 'Key not found',
        });
        return;
      }

      const stats = keyManagementService.getKeyUsageStats(keyId);

      res.json({
        success: true,
        data: {
          metadata: {
            id: metadata.id,
            provider: metadata.provider,
            createdAt: metadata.createdAt,
            expiresAt: metadata.expiresAt,
            rotatedAt: metadata.rotatedAt,
            isActive: metadata.isActive,
            version: metadata.version,
            daysUntilExpiry: Math.floor(
              (metadata.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
            ),
          },
          stats,
        },
      });
    } catch (error) {
      console.error('Error getting key:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve key',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get key usage logs
   * GET /api/keys/:keyId/usage
   */
  public async getKeyUsage(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      const logs = keyManagementService.getKeyUsageLogs(keyId, limit);
      const stats = keyManagementService.getKeyUsageStats(keyId);

      res.json({
        success: true,
        data: {
          logs,
          stats,
          total: logs.length,
        },
      });
    } catch (error) {
      console.error('Error getting key usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve key usage',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get all key usage logs
   * GET /api/keys/usage/all
   */
  public async getAllKeyUsage(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = keyManagementService.getKeyUsageLogs(undefined, limit);

      res.json({
        success: true,
        data: {
          logs,
          total: logs.length,
        },
      });
    } catch (error) {
      console.error('Error getting all key usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve key usage logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Rotate encryption key
   * POST /api/keys/:keyId/rotate
   */
  public async rotateKey(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params;
      const metadata = keyManagementService.getKeyMetadata(keyId);

      if (!metadata) {
        res.status(404).json({
          success: false,
          error: 'Key not found',
        });
        return;
      }

      if (!metadata.isActive) {
        res.status(400).json({
          success: false,
          error: 'Cannot rotate inactive key',
        });
        return;
      }

      const result = await keyManagementService.rotateKey(keyId);

      res.json({
        success: true,
        message: 'Key rotated successfully',
        data: {
          oldKeyId: keyId,
          newKeyId: result.keyId,
        },
      });
    } catch (error) {
      console.error('Error rotating key:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to rotate key',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get keys that need rotation
   * GET /api/keys/rotation/needed
   */
  public async getKeysNeedingRotation(req: Request, res: Response): Promise<void> {
    try {
      const keys = keyManagementService.getKeysNeedingRotation();

      res.json({
        success: true,
        data: {
          keys: keys.map(key => ({
            id: key.id,
            provider: key.provider,
            createdAt: key.createdAt,
            expiresAt: key.expiresAt,
            daysUntilExpiry: Math.floor(
              (key.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
            ),
            usageCount: key.usageCount,
          })),
          total: keys.length,
        },
      });
    } catch (error) {
      console.error('Error getting keys needing rotation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve keys needing rotation',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get rotation policy
   * GET /api/keys/rotation/policy
   */
  public async getRotationPolicy(req: Request, res: Response): Promise<void> {
    try {
      const policy = keyManagementService.getRotationPolicy();

      res.json({
        success: true,
        data: policy,
      });
    } catch (error) {
      console.error('Error getting rotation policy:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve rotation policy',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update rotation policy
   * PUT /api/keys/rotation/policy
   */
  public async updateRotationPolicy(req: Request, res: Response): Promise<void> {
    try {
      const { enabled, rotationIntervalDays, autoRotate, notifyBeforeDays } = req.body;

      const updates: any = {};
      if (typeof enabled === 'boolean') updates.enabled = enabled;
      if (typeof rotationIntervalDays === 'number') updates.rotationIntervalDays = rotationIntervalDays;
      if (typeof autoRotate === 'boolean') updates.autoRotate = autoRotate;
      if (typeof notifyBeforeDays === 'number') updates.notifyBeforeDays = notifyBeforeDays;

      keyManagementService.updateRotationPolicy(updates);
      const policy = keyManagementService.getRotationPolicy();

      res.json({
        success: true,
        message: 'Rotation policy updated successfully',
        data: policy,
      });
    } catch (error) {
      console.error('Error updating rotation policy:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update rotation policy',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete a key
   * DELETE /api/keys/:keyId
   */
  public async deleteKey(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params;
      
      await keyManagementService.deleteKey(keyId);

      res.json({
        success: true,
        message: 'Key scheduled for deletion',
        data: {
          keyId,
        },
      });
    } catch (error) {
      console.error('Error deleting key:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete key',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get provider information
   * GET /api/keys/provider/info
   */
  public async getProviderInfo(req: Request, res: Response): Promise<void> {
    try {
      const info = keyManagementService.getProviderInfo();

      res.json({
        success: true,
        data: info,
      });
    } catch (error) {
      console.error('Error getting provider info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve provider information',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Generate a new data encryption key
   * POST /api/keys/generate
   */
  public async generateKey(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = await keyManagementService.generateDataKey();

      res.json({
        success: true,
        message: 'Data encryption key generated successfully',
        data: {
          keyId,
        },
      });
    } catch (error) {
      console.error('Error generating key:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate key',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get key management dashboard data
   * GET /api/keys/dashboard
   */
  public async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const allKeys = keyManagementService.getAllKeysMetadata();
      const keysNeedingRotation = keyManagementService.getKeysNeedingRotation();
      const recentLogs = keyManagementService.getKeyUsageLogs(undefined, 50);
      const policy = keyManagementService.getRotationPolicy();
      const providerInfo = keyManagementService.getProviderInfo();

      // Calculate statistics
      const activeKeys = allKeys.filter(k => k.isActive);
      const totalUsage = allKeys.reduce((sum, k) => sum + k.usageCount, 0);
      const successfulOps = recentLogs.filter(log => log.success).length;
      const failedOps = recentLogs.filter(log => !log.success).length;

      res.json({
        success: true,
        data: {
          summary: {
            totalKeys: allKeys.length,
            activeKeys: activeKeys.length,
            keysNeedingRotation: keysNeedingRotation.length,
            totalUsage,
            successRate: recentLogs.length > 0 
              ? ((successfulOps / recentLogs.length) * 100).toFixed(2) + '%'
              : 'N/A',
          },
          provider: providerInfo,
          policy,
          recentActivity: recentLogs.slice(0, 10),
          keysNeedingRotation: keysNeedingRotation.map(key => ({
            id: key.id,
            expiresAt: key.expiresAt,
            daysUntilExpiry: Math.floor(
              (key.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
            ),
          })),
        },
      });
    } catch (error) {
      console.error('Error getting dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard data',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// Export controller instance
export const keyManagementController = new KeyManagementController();
