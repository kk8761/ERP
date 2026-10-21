/**
 * Integration Routes
 * API endpoints for integration capabilities
 * 
 * Requirements: 21.2, 21.3, 21.5, 21.6, 21.7
 */

import { Router } from 'express';
import * as IntegrationController from '../controllers/IntegrationController';

const router = Router();

// ─── File-Based Integration Routes ────────────────────────
// Requirements: 21.3, 21.7

/**
 * Import data from file
 * POST /api/integration/import
 * Body: multipart/form-data with file and options
 */
router.post(
  '/import',
  IntegrationController.uploadMiddleware,
  IntegrationController.importFile
);

/**
 * Export data to file
 * POST /api/integration/export
 * Body: { format, entityType, filters, fields }
 */
router.post('/export', IntegrationController.exportFile);

/**
 * Generate file template
 * GET /api/integration/template/:entityType/:format
 * Params: entityType (product, customer, order), format (csv, xml, json)
 */
router.get('/template/:entityType/:format', IntegrationController.generateTemplate);

// ─── Webhook Routes ────────────────────────────────────────
// Requirements: 21.2

/**
 * Create webhook
 * POST /api/integration/webhooks
 * Body: { name, url, events, secret?, isActive? }
 */
router.post('/webhooks', IntegrationController.createWebhook);

/**
 * Update webhook
 * PUT /api/integration/webhooks/:id
 * Body: Partial<WebhookConfig>
 */
router.put('/webhooks/:id', IntegrationController.updateWebhook);

/**
 * Delete webhook
 * DELETE /api/integration/webhooks/:id
 */
router.delete('/webhooks/:id', IntegrationController.deleteWebhook);

/**
 * List all webhooks
 * GET /api/integration/webhooks
 */
router.get('/webhooks', IntegrationController.listWebhooks);

/**
 * Test webhook
 * POST /api/integration/webhooks/:id/test
 * Body: { payload? }
 */
router.post('/webhooks/:id/test', IntegrationController.testWebhook);

// ─── Connector Routes ──────────────────────────────────────
// Requirements: 21.5

/**
 * Create connector
 * POST /api/integration/connectors
 * Body: { name, type, credentials, mapping, syncSchedule?, isActive? }
 */
router.post('/connectors', IntegrationController.createConnector);

/**
 * Update connector
 * PUT /api/integration/connectors/:id
 * Body: Partial<ConnectorConfig>
 */
router.put('/connectors/:id', IntegrationController.updateConnector);

/**
 * Delete connector
 * DELETE /api/integration/connectors/:id
 */
router.delete('/connectors/:id', IntegrationController.deleteConnector);

/**
 * List all connectors
 * GET /api/integration/connectors
 */
router.get('/connectors', IntegrationController.listConnectors);

/**
 * Test connector connection
 * POST /api/integration/connectors/:id/test
 */
router.post('/connectors/:id/test', IntegrationController.testConnector);

/**
 * Map data using connector
 * POST /api/integration/connectors/:id/map
 * Body: { data, mapping }
 */
router.post('/connectors/:id/map', IntegrationController.mapData);

// ─── Synchronization Routes ────────────────────────────────
// Requirements: 21.6

/**
 * Start sync job
 * POST /api/integration/sync
 * Body: { connectorId, direction }
 */
router.post('/sync', IntegrationController.startSync);

/**
 * Get sync job status
 * GET /api/integration/sync/:jobId
 */
router.get('/sync/:jobId', IntegrationController.getSyncStatus);

/**
 * Retry failed sync records
 * POST /api/integration/sync/:jobId/retry
 */
router.post('/sync/:jobId/retry', IntegrationController.retrySync);

export default router;
