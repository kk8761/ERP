/**
 * Encryption Routes
 * Task 38.2: API routes for encryption key management
 */

import { Router } from 'express';
import * as encryptionController from '../controllers/encryption.controller';
import { authMiddleware } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac.middleware';

const router = Router();

// All encryption routes require authentication and admin permissions
router.use(authMiddleware);
router.use(checkPermission('encryption', 'manage')); // Only admins can manage encryption

/**
 * @route   GET /api/encryption/status
 * @desc    Get current encryption key status
 * @access  Admin
 */
router.get('/status', encryptionController.getKeyStatus);

/**
 * @route   GET /api/encryption/dashboard
 * @desc    Get key management dashboard data
 * @access  Admin
 */
router.get('/dashboard', encryptionController.getDashboard);

/**
 * @route   GET /api/encryption/keys
 * @desc    Get all active encryption keys
 * @access  Admin
 */
router.get('/keys', encryptionController.getAllActiveKeys);

/**
 * @route   GET /api/encryption/keys/expiring
 * @desc    Get keys expiring soon
 * @access  Admin
 */
router.get('/keys/expiring', encryptionController.getExpiringKeys);

/**
 * @route   GET /api/encryption/keys/expired
 * @desc    Get expired keys
 * @access  Admin
 */
router.get('/keys/expired', encryptionController.getExpiredKeys);

/**
 * @route   GET /api/encryption/keys/:keyId
 * @desc    Get key metadata by ID
 * @access  Admin
 */
router.get('/keys/:keyId', encryptionController.getKeyMetadata);

/**
 * @route   GET /api/encryption/keys/:keyId/stats
 * @desc    Get key usage statistics
 * @access  Admin
 */
router.get('/keys/:keyId/stats', encryptionController.getKeyUsageStats);

/**
 * @route   POST /api/encryption/keys
 * @desc    Create a new encryption key
 * @access  Admin
 */
router.post('/keys', encryptionController.createKey);

/**
 * @route   POST /api/encryption/rotate
 * @desc    Rotate encryption key manually
 * @access  Admin
 */
router.post('/rotate', encryptionController.rotateKey);

/**
 * @route   POST /api/encryption/keys/:keyId/revoke
 * @desc    Revoke an encryption key
 * @access  Admin
 */
router.post('/keys/:keyId/revoke', encryptionController.revokeKey);

/**
 * @route   PUT /api/encryption/rotation-policy
 * @desc    Update key rotation policy
 * @access  Admin
 */
router.put('/rotation-policy', encryptionController.updateRotationPolicy);

/**
 * @route   POST /api/encryption/check-rotate
 * @desc    Check and rotate expired keys manually
 * @access  Admin
 */
router.post('/check-rotate', encryptionController.checkAndRotateExpiredKeys);

/**
 * @route   POST /api/encryption/encrypt
 * @desc    Encrypt a value (for testing/admin purposes)
 * @access  Admin
 */
router.post('/encrypt', encryptionController.encryptValue);

/**
 * @route   POST /api/encryption/decrypt
 * @desc    Decrypt a value (for testing/admin purposes)
 * @access  Admin
 */
router.post('/decrypt', encryptionController.decryptValue);

export default router;
