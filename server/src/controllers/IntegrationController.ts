/**
 * Integration Controller
 * Handles HTTP requests for integration capabilities
 * 
 * Requirements: 21.2, 21.3, 21.5, 21.6, 21.7
 */

import { Request, Response } from 'express';
import {
  fileIntegrationService,
  webhookService,
  connectorService,
  syncService,
  FileImportOptions,
  FileExportOptions,
  WebhookConfig,
  ConnectorConfig,
} from '../services/integration.service';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// ─── File-Based Integration Endpoints ─────────────────────

/**
 * Import data from file
 * POST /api/integration/import
 * Requirements: 21.3, 21.7
 */
export const importFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
      return;
    }

    const options: FileImportOptions = {
      format: req.body.format || 'csv',
      entityType: req.body.entityType,
      mapping: req.body.mapping ? JSON.parse(req.body.mapping) : undefined,
      batchSize: req.body.batchSize ? parseInt(req.body.batchSize) : 100,
      validateOnly: req.body.validateOnly === 'true',
    };

    const fileContent = file.buffer.toString('utf-8');

    let result;
    switch (options.format) {
      case 'csv':
        result = await fileIntegrationService.importCSV(fileContent, options);
        break;
      case 'xml':
        result = await fileIntegrationService.importXML(fileContent, options);
        break;
      case 'json':
        result = await fileIntegrationService.importJSON(fileContent, options);
        break;
      default:
        res.status(400).json({
          success: false,
          message: `Unsupported format: ${options.format}`,
        });
        return;
    }

    res.json({
      success: true,
      data: result,
      message: `Import completed: ${result.success} succeeded, ${result.failed} failed`,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    res.status(500).json({
      success: false,
      message: 'Import failed',
      error: error.message,
    });
  }
};

/**
 * Export data to file
 * POST /api/integration/export
 * Requirements: 21.3, 21.7
 */
export const exportFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const options: FileExportOptions = {
      format: req.body.format || 'csv',
      entityType: req.body.entityType,
      filters: req.body.filters,
      fields: req.body.fields,
    };

    let content: string;
    let contentType: string;
    let filename: string;

    switch (options.format) {
      case 'csv':
        content = await fileIntegrationService.exportCSV(options);
        contentType = 'text/csv';
        filename = `${options.entityType}.csv`;
        break;
      case 'xml':
        content = await fileIntegrationService.exportXML(options);
        contentType = 'application/xml';
        filename = `${options.entityType}.xml`;
        break;
      case 'json':
        content = await fileIntegrationService.exportJSON(options);
        contentType = 'application/json';
        filename = `${options.entityType}.json`;
        break;
      default:
        res.status(400).json({
          success: false,
          message: `Unsupported format: ${options.format}`,
        });
        return;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  } catch (error: any) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Export failed',
      error: error.message,
    });
  }
};

/**
 * Generate file template
 * GET /api/integration/template/:entityType/:format
 * Requirements: 21.3
 */
export const generateTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, format } = req.params;

    if (!['csv', 'xml', 'json'].includes(format)) {
      res.status(400).json({
        success: false,
        message: `Unsupported format: ${format}`,
      });
      return;
    }

    const template = await fileIntegrationService.generateTemplate(
      entityType,
      format as 'csv' | 'xml' | 'json'
    );

    const contentTypes = {
      csv: 'text/csv',
      xml: 'application/xml',
      json: 'application/json',
    };

    res.setHeader('Content-Type', contentTypes[format as keyof typeof contentTypes]);
    res.setHeader('Content-Disposition', `attachment; filename="template.${format}"`);
    res.send(template);
  } catch (error: any) {
    console.error('Template generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Template generation failed',
      error: error.message,
    });
  }
};

// ─── Webhook Endpoints ─────────────────────────────────────

/**
 * Create webhook
 * POST /api/integration/webhooks
 * Requirements: 21.2
 */
export const createWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const config: WebhookConfig = req.body;

    const webhook = await webhookService.createWebhook(config);

    res.status(201).json({
      success: true,
      data: webhook,
      message: 'Webhook created successfully',
    });
  } catch (error: any) {
    console.error('Webhook creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook creation failed',
      error: error.message,
    });
  }
};

/**
 * Update webhook
 * PUT /api/integration/webhooks/:id
 * Requirements: 21.2
 */
export const updateWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates: Partial<WebhookConfig> = req.body;

    const webhook = await webhookService.updateWebhook(id, updates);

    res.json({
      success: true,
      data: webhook,
      message: 'Webhook updated successfully',
    });
  } catch (error: any) {
    console.error('Webhook update error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook update failed',
      error: error.message,
    });
  }
};

/**
 * Delete webhook
 * DELETE /api/integration/webhooks/:id
 * Requirements: 21.2
 */
export const deleteWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await webhookService.deleteWebhook(id);

    res.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error: any) {
    console.error('Webhook deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook deletion failed',
      error: error.message,
    });
  }
};

/**
 * List webhooks
 * GET /api/integration/webhooks
 * Requirements: 21.2
 */
export const listWebhooks = async (req: Request, res: Response): Promise<void> => {
  try {
    const webhooks = await webhookService.listWebhooks();

    res.json({
      success: true,
      data: webhooks,
    });
  } catch (error: any) {
    console.error('Webhook listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list webhooks',
      error: error.message,
    });
  }
};

/**
 * Test webhook
 * POST /api/integration/webhooks/:id/test
 * Requirements: 21.2
 */
export const testWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const testPayload = req.body.payload || { test: true };

    await webhookService.sendWebhook('test.event', testPayload);

    res.json({
      success: true,
      message: 'Test webhook sent successfully',
    });
  } catch (error: any) {
    console.error('Webhook test error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook test failed',
      error: error.message,
    });
  }
};

// ─── Connector Endpoints ───────────────────────────────────

/**
 * Create connector
 * POST /api/integration/connectors
 * Requirements: 21.5
 */
export const createConnector = async (req: Request, res: Response): Promise<void> => {
  try {
    const config: ConnectorConfig = req.body;

    const connector = await connectorService.createConnector(config);

    res.status(201).json({
      success: true,
      data: connector,
      message: 'Connector created successfully',
    });
  } catch (error: any) {
    console.error('Connector creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Connector creation failed',
      error: error.message,
    });
  }
};

/**
 * Test connector connection
 * POST /api/integration/connectors/:id/test
 * Requirements: 21.5
 */
export const testConnector = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await connectorService.testConnection(id);

    res.json({
      success: result.success,
      message: result.message,
    });
  } catch (error: any) {
    console.error('Connector test error:', error);
    res.status(500).json({
      success: false,
      message: 'Connector test failed',
      error: error.message,
    });
  }
};

/**
 * Update connector
 * PUT /api/integration/connectors/:id
 * Requirements: 21.5
 */
export const updateConnector = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates: Partial<ConnectorConfig> = req.body;

    const connector = await connectorService.updateConnector(id, updates);

    res.json({
      success: true,
      data: connector,
      message: 'Connector updated successfully',
    });
  } catch (error: any) {
    console.error('Connector update error:', error);
    res.status(500).json({
      success: false,
      message: 'Connector update failed',
      error: error.message,
    });
  }
};

/**
 * Delete connector
 * DELETE /api/integration/connectors/:id
 * Requirements: 21.5
 */
export const deleteConnector = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await connectorService.deleteConnector(id);

    res.json({
      success: true,
      message: 'Connector deleted successfully',
    });
  } catch (error: any) {
    console.error('Connector deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Connector deletion failed',
      error: error.message,
    });
  }
};

/**
 * List connectors
 * GET /api/integration/connectors
 * Requirements: 21.5
 */
export const listConnectors = async (req: Request, res: Response): Promise<void> => {
  try {
    const connectors = await connectorService.listConnectors();

    res.json({
      success: true,
      data: connectors,
    });
  } catch (error: any) {
    console.error('Connector listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list connectors',
      error: error.message,
    });
  }
};

/**
 * Map data using connector
 * POST /api/integration/connectors/:id/map
 * Requirements: 21.5
 */
export const mapData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, mapping } = req.body;

    const mappedData = await connectorService.mapData(data, mapping);

    res.json({
      success: true,
      data: mappedData,
    });
  } catch (error: any) {
    console.error('Data mapping error:', error);
    res.status(500).json({
      success: false,
      message: 'Data mapping failed',
      error: error.message,
    });
  }
};

// ─── Synchronization Endpoints ─────────────────────────────

/**
 * Start sync job
 * POST /api/integration/sync
 * Requirements: 21.6
 */
export const startSync = async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectorId, direction } = req.body;

    const job = await syncService.startSync(connectorId, direction);

    res.status(202).json({
      success: true,
      data: job,
      message: 'Sync job started',
    });
  } catch (error: any) {
    console.error('Sync start error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start sync',
      error: error.message,
    });
  }
};

/**
 * Get sync job status
 * GET /api/integration/sync/:jobId
 * Requirements: 21.6
 */
export const getSyncStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;

    const job = await syncService.getSyncStatus(jobId);

    if (!job) {
      res.status(404).json({
        success: false,
        message: 'Sync job not found',
      });
      return;
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error: any) {
    console.error('Sync status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync status',
      error: error.message,
    });
  }
};

/**
 * Retry failed sync records
 * POST /api/integration/sync/:jobId/retry
 * Requirements: 21.6
 */
export const retrySync = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;

    const result = await syncService.retryFailedRecords(jobId);

    res.json({
      success: true,
      data: result,
      message: `Retried ${result.retried} records, ${result.succeeded} succeeded`,
    });
  } catch (error: any) {
    console.error('Sync retry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry sync',
      error: error.message,
    });
  }
};

// Export multer upload middleware
export const uploadMiddleware = upload.single('file');
