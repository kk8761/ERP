import express, { Request, Response } from 'express';
import { encryptionService } from '../services/EncryptionService';
import { reencryptModelData } from '../utils/databaseEncryption';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Encryption Management Routes
 * 
 * Admin-only routes for managing encryption keys and operations.
 * Requires authentication and admin role.
 */

/**
 * GET /api/encryption/keys
 * Get encryption key information
 */
router.get('/keys', async (req: Request, res: Response) => {
  try {
    const keyInfo = encryptionService.getKeyInfo();

    res.json({
      success: true,
      data: {
        activeKeyId: keyInfo.activeKeyId,
        totalKeys: keyInfo.totalKeys,
        keys: keyInfo.keys.map(key => ({
          id: key.id,
          createdAt: key.createdAt,
          expiresAt: key.expiresAt,
          isActive: key.isActive,
          daysUntilExpiry: key.daysUntilExpiry,
          status: key.daysUntilExpiry <= 0 
            ? 'expired' 
            : key.daysUntilExpiry <= 7 
            ? 'expiring-soon' 
            : 'active',
        })),
      },
    });
  } catch (error) {
    console.error('Error getting key information:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get key information',
    });
  }
});

/**
 * POST /api/encryption/rotate
 * Rotate encryption key
 */
router.post('/rotate', async (req: Request, res: Response) => {
  try {
    const { reencryptData } = req.body;

    // Rotate key
    const newKeyId = await encryptionService.rotateKey();

    // Re-encrypt data if requested
    let reencryptedCount = 0;
    if (reencryptData) {
      // This is a long-running operation, should be done in background
      // For now, we'll just acknowledge the request
      res.json({
        success: true,
        message: 'Key rotation initiated. Data re-encryption in progress.',
        data: {
          newKeyId,
          reencryptionStatus: 'in-progress',
        },
      });

      // Start re-encryption in background (in production, use a job queue)
      // For demo purposes, we'll just log it
      console.log('Background re-encryption would start here');
      return;
    }

    res.json({
      success: true,
      message: 'Encryption key rotated successfully',
      data: {
        newKeyId,
        reencryptedRecords: reencryptedCount,
      },
    });
  } catch (error) {
    console.error('Error rotating encryption key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rotate encryption key',
    });
  }
});

/**
 * POST /api/encryption/reencrypt/:model
 * Re-encrypt data for a specific model
 */
router.post('/reencrypt/:model', async (req: Request, res: Response) => {
  try {
    const { model } = req.params;
    const { batchSize = 100 } = req.body;

    // Validate model name
    const validModels = [
      'User',
      'Customer',
      'Employee',
      'BankAccount',
      'PaymentMethod',
      'Invoice',
      'Payroll',
      'MedicalRecord',
      'Contract',
    ];

    if (!validModels.includes(model)) {
      return res.status(400).json({
        success: false,
        error: `Invalid model name. Valid models: ${validModels.join(', ')}`,
      });
    }

    // Re-encrypt model data
    const count = await reencryptModelData(prisma, model, batchSize);

    res.json({
      success: true,
      message: `Re-encrypted ${count} ${model} records`,
      data: {
        model,
        reencryptedRecords: count,
      },
    });
  } catch (error) {
    console.error('Error re-encrypting model data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to re-encrypt model data',
    });
  }
});

/**
 * POST /api/encryption/cleanup
 * Cleanup expired encryption keys
 */
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const { retentionDays = 365 } = req.body;

    const removedCount = await encryptionService.cleanupExpiredKeys(retentionDays);

    res.json({
      success: true,
      message: `Cleaned up ${removedCount} expired keys`,
      data: {
        removedKeys: removedCount,
        retentionDays,
      },
    });
  } catch (error) {
    console.error('Error cleaning up expired keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup expired keys',
    });
  }
});

/**
 * POST /api/encryption/test
 * Test encryption/decryption
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { plaintext = 'Test encryption data' } = req.body;

    // Encrypt
    const encrypted = encryptionService.encrypt(plaintext);

    // Decrypt
    const decrypted = encryptionService.decrypt(encrypted);

    // Verify
    const isValid = plaintext === decrypted;

    res.json({
      success: true,
      message: 'Encryption test completed',
      data: {
        plaintext,
        encrypted: {
          keyId: encrypted.keyId,
          algorithm: encrypted.algorithm,
          dataLength: encrypted.data.length,
        },
        decrypted,
        isValid,
      },
    });
  } catch (error) {
    console.error('Error testing encryption:', error);
    res.status(500).json({
      success: false,
      error: 'Encryption test failed',
    });
  }
});

/**
 * GET /api/encryption/health
 * Check encryption service health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const keyInfo = encryptionService.getKeyInfo();
    
    // Check if active key exists
    if (!keyInfo.activeKeyId) {
      return res.status(503).json({
        success: false,
        error: 'No active encryption key',
        data: {
          status: 'unhealthy',
          reason: 'no-active-key',
        },
      });
    }

    // Check if active key is expiring soon
    const activeKey = keyInfo.keys.find(k => k.id === keyInfo.activeKeyId);
    if (activeKey && activeKey.daysUntilExpiry <= 7) {
      return res.json({
        success: true,
        data: {
          status: 'warning',
          reason: 'key-expiring-soon',
          daysUntilExpiry: activeKey.daysUntilExpiry,
          message: 'Active encryption key expires soon. Consider rotating.',
        },
      });
    }

    res.json({
      success: true,
      data: {
        status: 'healthy',
        activeKeyId: keyInfo.activeKeyId,
        totalKeys: keyInfo.totalKeys,
      },
    });
  } catch (error) {
    console.error('Error checking encryption health:', error);
    res.status(503).json({
      success: false,
      error: 'Encryption service unhealthy',
      data: {
        status: 'unhealthy',
        reason: 'service-error',
      },
    });
  }
});

export default router;
