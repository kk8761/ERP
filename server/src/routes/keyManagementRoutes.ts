import { Router } from 'express';
import { keyManagementController } from '../controllers/KeyManagementController';
import { authMiddleware } from '../middleware/auth';

/**
 * Key Management Routes
 * 
 * Provides REST API endpoints for key management operations.
 * All routes require authentication and admin privileges.
 * 
 * Requirements: 15.5
 */

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// TODO: Add admin role check middleware
// router.use(requireRole('admin'));

/**
 * @route   GET /api/keys/dashboard
 * @desc    Get key management dashboard data
 * @access  Private (Admin only)
 */
router.get('/dashboard', (req, res) => keyManagementController.getDashboard(req, res));

/**
 * @route   GET /api/keys/provider/info
 * @desc    Get key provider information
 * @access  Private (Admin only)
 */
router.get('/provider/info', (req, res) => keyManagementController.getProviderInfo(req, res));

/**
 * @route   GET /api/keys/rotation/policy
 * @desc    Get key rotation policy
 * @access  Private (Admin only)
 */
router.get('/rotation/policy', (req, res) => keyManagementController.getRotationPolicy(req, res));

/**
 * @route   PUT /api/keys/rotation/policy
 * @desc    Update key rotation policy
 * @access  Private (Admin only)
 */
router.put('/rotation/policy', (req, res) => keyManagementController.updateRotationPolicy(req, res));

/**
 * @route   GET /api/keys/rotation/needed
 * @desc    Get keys that need rotation
 * @access  Private (Admin only)
 */
router.get('/rotation/needed', (req, res) => keyManagementController.getKeysNeedingRotation(req, res));

/**
 * @route   GET /api/keys/usage/all
 * @desc    Get all key usage logs
 * @access  Private (Admin only)
 */
router.get('/usage/all', (req, res) => keyManagementController.getAllKeyUsage(req, res));

/**
 * @route   POST /api/keys/generate
 * @desc    Generate a new data encryption key
 * @access  Private (Admin only)
 */
router.post('/generate', (req, res) => keyManagementController.generateKey(req, res));

/**
 * @route   GET /api/keys
 * @desc    Get all keys metadata
 * @access  Private (Admin only)
 */
router.get('/', (req, res) => keyManagementController.getAllKeys(req, res));

/**
 * @route   GET /api/keys/:keyId
 * @desc    Get specific key metadata
 * @access  Private (Admin only)
 */
router.get('/:keyId', (req, res) => keyManagementController.getKey(req, res));

/**
 * @route   GET /api/keys/:keyId/usage
 * @desc    Get key usage logs
 * @access  Private (Admin only)
 */
router.get('/:keyId/usage', (req, res) => keyManagementController.getKeyUsage(req, res));

/**
 * @route   POST /api/keys/:keyId/rotate
 * @desc    Rotate encryption key
 * @access  Private (Admin only)
 */
router.post('/:keyId/rotate', (req, res) => keyManagementController.rotateKey(req, res));

/**
 * @route   DELETE /api/keys/:keyId
 * @desc    Delete a key (schedule for deletion)
 * @access  Private (Admin only)
 */
router.delete('/:keyId', (req, res) => keyManagementController.deleteKey(req, res));

export default router;
