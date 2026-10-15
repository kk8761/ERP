/**
 * Integration Routes
 * API endpoints for integration capabilities
 * 
 * Requirements: 21.2, 21.3, 21.5, 21.6, 21.7
 */

import { Router } from 'express';
import * as IntegrationController from '../controllers/IntegrationController';
import { requirePermission } from '../middleware/rbac.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

// ─── File-Based Integration Routes ────────────────────────
// Requirements: 21.3, 21.7

/**
 * Import data from file
 * POST /api/integrations/import
 * Body: multipart/form-data with file and options
 */
router.post(
  '/import',
  requirePermission('create', 'integration'),
  auditLog('IMPORT', 'integration'),
  IntegrationController.uploadMiddleware,
  IntegrationController.importFile
);

/**
 * Export data to file
 * POST /api/integrations/export
 * Body: { format, entityType, filters, fields }
 */
router.post(
  '/export',
  requirePermission('read', 'integration'),
  auditLog('EXPORT', 'integration'),
  IntegrationController.exportFile
);

/**
 * Generate file template
 * GET /api/integrations/template/:entityType/:format
 * Params: entityType (product, customer, order), format (csv, xml, json)
 */
router.get('/template/:entityType/:format', IntegrationController.generateTemplate);

// ─── Webhook Routes ────────────────────────────────────────
// Requirements: 21.2

/**
 * Create webhook
 * POST /api/integrations/webhooks
 * Body: { name, url, events, secret?, isActive? }
 */
router.post(
  '/webhooks',
  requirePermission('create', 'webhook'),
  auditLog('CREATE', 'webhook'),
  IntegrationController.createWebhook
);

/**
 * Update webhook
 * PUT /api/integrations/webhooks/:id
 * Body: Partial<WebhookConfig>
 */
router.put(
  '/webhooks/:id',
  requirePermission('update', 'webhook'),
  auditLog('UPDATE', 'webhook'),
  IntegrationController.updateWebhook
);

/**
 * Delete webhook
 * DELETE /api/integrations/webhooks/:id
 */
router.delete(
  '/webhooks/:id',
  requirePermission('delete', 'webhook'),
  auditLog('DELETE', 'webhook'),
  IntegrationController.deleteWebhook
);

/**
 * List all webhooks
 * GET /api/integrations/webhooks
 */
router.get(
  '/webhooks',
  requirePermission('read', 'webhook'),
  IntegrationController.listWebhooks
);

/**
 * Test webhook
 * POST /api/integrations/webhooks/:id/test
 * Body: { payload? }
 */
router.post('/webhooks/:id/test', IntegrationController.testWebhook);

// ─── Connector Routes ──────────────────────────────────────
// Requirements: 21.5

/**
 * Create connector
 * POST /api/integrations/connectors
 * Body: { name, type, credentials, mapping, syncSchedule?, isActive? }
 */
router.post(
  '/connectors',
  requirePermission('create', 'connector'),
  auditLog('CREATE', 'connector'),
  IntegrationController.createConnector
);

/**
 * Update connector
 * PUT /api/integrations/connectors/:id
 * Body: Partial<ConnectorConfig>
 */
router.put(
  '/connectors/:id',
  requirePermission('update', 'connector'),
  auditLog('UPDATE', 'connector'),
  IntegrationController.updateConnector
);

/**
 * Delete connector
 * DELETE /api/integrations/connectors/:id
 */
router.delete(
  '/connectors/:id',
  requirePermission('delete', 'connector'),
  auditLog('DELETE', 'connector'),
  IntegrationController.deleteConnector
);

/**
 * List all connectors
 * GET /api/integrations/connectors
 */
router.get(
  '/connectors',
  requirePermission('read', 'connector'),
  IntegrationController.listConnectors
);

/**
 * Test connector connection
 * POST /api/integrations/connectors/:id/test
 */
router.post('/connectors/:id/test', IntegrationController.testConnector);

/**
 * Map data using connector
 * POST /api/integrations/connectors/:id/map
 * Body: { data, mapping }
 */
router.post('/connectors/:id/map', IntegrationController.mapData);

// ─── Synchronization Routes ────────────────────────────────
// Requirements: 21.6

/**
 * Start sync job
 * POST /api/integrations/sync
 * Body: { connectorId, direction }
 */
router.post(
  '/sync',
  requirePermission('create', 'sync'),
  auditLog('START_SYNC', 'sync'),
  IntegrationController.startSync
);

/**
 * Get sync job status
 * GET /api/integrations/sync/:jobId
 */
router.get(
  '/sync/:jobId',
  requirePermission('read', 'sync'),
  IntegrationController.getSyncStatus
);

/**
 * Retry failed sync records
 * POST /api/integrations/sync/:jobId/retry
 */
router.post(
  '/sync/:jobId/retry',
  requirePermission('update', 'sync'),
  auditLog('RETRY_SYNC', 'sync'),
  IntegrationController.retrySync
);

// ─── Legacy API Key Routes ─────────────────────────────────

/**
 * Create API key (legacy endpoint)
 * POST /api/integrations/api-keys
 */
router.post(
  '/api-keys',
  requirePermission('create', 'api_key'),
  auditLog('CREATE', 'api_key'),
  async (req, res) => {
    try {
      const { name } = req.body;
      const user: any = req.user;

      const crypto = require('crypto');
      const key = `nexa_${crypto.randomBytes(32).toString('hex')}`;

      const prisma = require('../config/prisma').default;
      const apiKey = await prisma.apiKey.create({
        data: {
          name,
          key,
          userId: user.id,
        },
      });

      res.status(201).json({ success: true, apiKey });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to create API key' });
    }
  }
);

export default router;

