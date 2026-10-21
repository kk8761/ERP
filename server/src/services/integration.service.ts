/**
 * Integration Service
 * Handles file-based integration, webhooks, connectors, and data synchronization
 * 
 * Requirements: 21.2, 21.3, 21.5, 21.6, 21.7
 */

import { PrismaClient } from '@prisma/client';
import axios, { AxiosRequestConfig } from 'axios';
import * as csv from 'csv-parse/sync';
import * as csvStringify from 'csv-stringify/sync';
import * as xml2js from 'xml2js';
import crypto from 'crypto';

const prisma = new PrismaClient();

// ─── Types ─────────────────────────────────────────────────

export interface FileImportOptions {
  format: 'csv' | 'xml' | 'json';
  entityType: string;
  mapping?: Record<string, string>;
  batchSize?: number;
  validateOnly?: boolean;
}

export interface FileExportOptions {
  format: 'csv' | 'xml' | 'json';
  entityType: string;
  filters?: Record<string, any>;
  fields?: string[];
}

export interface WebhookConfig {
  id?: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  isActive?: boolean;
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: any;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  attempts: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  response?: any;
  error?: string;
}

export interface ConnectorConfig {
  id?: string;
  name: string;
  type: 'salesforce' | 'sap' | 'oracle' | 'custom';
  credentials: Record<string, any>;
  mapping: DataMapping;
  syncSchedule?: string;
  isActive?: boolean;
}

export interface DataMapping {
  sourceEntity: string;
  targetEntity: string;
  fieldMappings: Array<{
    sourceField: string;
    targetField: string;
    transform?: string;
  }>;
}

export interface SyncJob {
  id: string;
  connectorId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  direction: 'inbound' | 'outbound' | 'bidirectional';
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  conflicts: SyncConflict[];
  errors: SyncError[];
  startedAt?: Date;
  completedAt?: Date;
}

export interface SyncConflict {
  recordId: string;
  field: string;
  localValue: any;
  remoteValue: any;
  resolution?: 'local' | 'remote' | 'manual';
}

export interface SyncError {
  recordId: string;
  error: string;
  retryable: boolean;
}

// ─── File-Based Integration (Sub-task 39.1) ───────────────

export class FileIntegrationService {
  /**
   * Import data from CSV file
   * Requirements: 21.3, 21.7
   */
  async importCSV(
    fileContent: string,
    options: FileImportOptions
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    return this.processBatchImport(records, options);
  }

  /**
   * Import data from XML file
   * Requirements: 21.3
   */
  async importXML(
    fileContent: string,
    options: FileImportOptions
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(fileContent);

    // Extract records from XML structure
    const records = this.extractRecordsFromXML(result, options.entityType);

    return this.processBatchImport(records, options);
  }

  /**
   * Import data from JSON file
   * Requirements: 21.3
   */
  async importJSON(
    fileContent: string,
    options: FileImportOptions
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    const data = JSON.parse(fileContent);
    const records = Array.isArray(data) ? data : [data];

    return this.processBatchImport(records, options);
  }

  /**
   * Export data to CSV format
   * Requirements: 21.3, 21.7
   */
  async exportCSV(options: FileExportOptions): Promise<string> {
    const records = await this.fetchRecordsForExport(options);

    return csvStringify.stringify(records, {
      header: true,
      columns: options.fields,
    });
  }

  /**
   * Export data to XML format
   * Requirements: 21.3
   */
  async exportXML(options: FileExportOptions): Promise<string> {
    const records = await this.fetchRecordsForExport(options);

    const builder = new xml2js.Builder({
      rootName: options.entityType,
      xmldec: { version: '1.0', encoding: 'UTF-8' },
    });

    return builder.buildObject({ record: records });
  }

  /**
   * Export data to JSON format
   * Requirements: 21.3
   */
  async exportJSON(options: FileExportOptions): Promise<string> {
    const records = await this.fetchRecordsForExport(options);
    return JSON.stringify(records, null, 2);
  }

  /**
   * Generate file format template
   * Requirements: 21.3
   */
  async generateTemplate(
    entityType: string,
    format: 'csv' | 'xml' | 'json'
  ): Promise<string> {
    const sampleData = this.getSampleDataForEntity(entityType);

    switch (format) {
      case 'csv':
        return csvStringify.stringify([sampleData], { header: true });
      case 'xml':
        const builder = new xml2js.Builder({ rootName: entityType });
        return builder.buildObject({ record: sampleData });
      case 'json':
        return JSON.stringify([sampleData], null, 2);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Process batch import with validation
   * Requirements: 21.7
   */
  private async processBatchImport(
    records: any[],
    options: FileImportOptions
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    const batchSize = options.batchSize || 100;
    let success = 0;
    let failed = 0;
    const errors: any[] = [];

    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      for (const record of batch) {
        try {
          // Apply field mapping
          const mappedRecord = this.applyFieldMapping(record, options.mapping);

          // Validate record
          const validation = await this.validateRecord(
            mappedRecord,
            options.entityType
          );

          if (!validation.valid) {
            failed++;
            errors.push({
              record,
              errors: validation.errors,
            });
            continue;
          }

          // Skip actual import if validateOnly
          if (options.validateOnly) {
            success++;
            continue;
          }

          // Import record
          await this.importRecord(mappedRecord, options.entityType);
          success++;
        } catch (error: any) {
          failed++;
          errors.push({
            record,
            error: error.message,
          });
        }
      }
    }

    return { success, failed, errors };
  }

  /**
   * Fetch records for export
   */
  private async fetchRecordsForExport(
    options: FileExportOptions
  ): Promise<any[]> {
    // This would query the appropriate Prisma model based on entityType
    // For now, return sample data
    return [];
  }

  /**
   * Extract records from XML structure
   */
  private extractRecordsFromXML(xmlData: any, entityType: string): any[] {
    // Navigate XML structure to find records
    if (xmlData[entityType]) {
      const data = xmlData[entityType];
      return Array.isArray(data) ? data : [data];
    }
    return [];
  }

  /**
   * Apply field mapping to record
   */
  private applyFieldMapping(
    record: any,
    mapping?: Record<string, string>
  ): any {
    if (!mapping) return record;

    const mapped: any = {};
    for (const [sourceField, targetField] of Object.entries(mapping)) {
      if (record[sourceField] !== undefined) {
        mapped[targetField] = record[sourceField];
      }
    }
    return mapped;
  }

  /**
   * Validate record before import
   */
  private async validateRecord(
    record: any,
    entityType: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Add validation logic based on entity type
    // For now, basic validation
    if (!record || Object.keys(record).length === 0) {
      errors.push('Empty record');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Import single record
   */
  private async importRecord(record: any, entityType: string): Promise<void> {
    // This would use Prisma to create the record
    // Implementation depends on entity type
  }

  /**
   * Get sample data for entity template
   */
  private getSampleDataForEntity(entityType: string): any {
    const templates: Record<string, any> = {
      product: {
        name: 'Sample Product',
        sku: 'SKU-001',
        price: 99.99,
        quantity: 100,
      },
      customer: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      },
      order: {
        orderNumber: 'ORD-001',
        customerId: 'CUST-001',
        total: 199.99,
        status: 'pending',
      },
    };

    return templates[entityType] || {};
  }
}

// ─── Webhook Framework (Sub-task 39.2) ────────────────────

export class WebhookService {
  private readonly defaultRetryPolicy = {
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    backoffMultiplier: 2,
  };

  /**
   * Create webhook configuration
   * Requirements: 21.2
   */
  async createWebhook(config: WebhookConfig): Promise<WebhookConfig> {
    const secret = config.secret || this.generateWebhookSecret();

    const webhook = await prisma.webhook.create({
      data: {
        name: config.name,
        url: config.url,
        events: config.events,
        secret,
        isActive: config.isActive !== false,
      },
    });

    return {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret || undefined,
      isActive: webhook.isActive,
      retryPolicy: config.retryPolicy || this.defaultRetryPolicy,
    };
  }

  /**
   * Update webhook configuration
   * Requirements: 21.2
   */
  async updateWebhook(
    id: string,
    updates: Partial<WebhookConfig>
  ): Promise<WebhookConfig> {
    const webhook = await prisma.webhook.update({
      where: { id },
      data: {
        name: updates.name,
        url: updates.url,
        events: updates.events,
        secret: updates.secret,
        isActive: updates.isActive,
      },
    });

    return {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret || undefined,
      isActive: webhook.isActive,
    };
  }

  /**
   * Delete webhook
   * Requirements: 21.2
   */
  async deleteWebhook(id: string): Promise<void> {
    await prisma.webhook.delete({ where: { id } });
  }

  /**
   * List all webhooks
   * Requirements: 21.2
   */
  async listWebhooks(): Promise<WebhookConfig[]> {
    const webhooks = await prisma.webhook.findMany();

    return webhooks.map((w) => ({
      id: w.id,
      name: w.name,
      url: w.url,
      events: w.events,
      secret: w.secret || undefined,
      isActive: w.isActive,
    }));
  }

  /**
   * Send webhook notification
   * Requirements: 21.2
   */
  async sendWebhook(event: string, payload: any): Promise<void> {
    const webhooks = await prisma.webhook.findMany({
      where: {
        isActive: true,
        events: {
          has: event,
        },
      },
    });

    // Create delivery records for all matching webhooks
    const deliveries = await Promise.all(
      webhooks.map((webhook) =>
        prisma.webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            event,
            payload,
            status: 'pending',
            attempts: 0,
            maxRetries: this.defaultRetryPolicy.maxRetries,
          },
        })
      )
    );

    // Deliver webhooks asynchronously
    deliveries.forEach((delivery) => {
      this.deliverWebhookAsync(delivery.id).catch((error) => {
        console.error(`Failed to deliver webhook ${delivery.id}:`, error);
      });
    });
  }

  /**
   * Deliver webhook asynchronously with retry logic
   * Requirements: 21.2
   */
  private async deliverWebhookAsync(deliveryId: string): Promise<void> {
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });

    if (!delivery) {
      throw new Error(`Webhook delivery not found: ${deliveryId}`);
    }

    await this.attemptDelivery(delivery);
  }

  /**
   * Attempt webhook delivery with retry logic
   * Requirements: 21.2
   */
  private async attemptDelivery(delivery: any): Promise<void> {
    const webhook = delivery.webhook;
    const attempt = delivery.attempts + 1;

    try {
      // Update delivery status
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'retrying',
          attempts: attempt,
          lastAttemptAt: new Date(),
        },
      });

      // Generate signature
      const signature = webhook.secret
        ? this.generateSignature(delivery.payload, webhook.secret)
        : undefined;

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': delivery.event,
        'X-Webhook-Delivery-ID': delivery.id,
        'X-Webhook-Attempt': attempt.toString(),
        'User-Agent': 'NexaERP-Webhook/1.0',
      };

      if (signature) {
        headers['X-Webhook-Signature'] = signature;
      }

      // Send webhook
      const response = await axios.post(webhook.url, delivery.payload, {
        headers,
        timeout: 30000, // 30 seconds
        validateStatus: (status) => status >= 200 && status < 300,
      });

      // Mark as successful
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'success',
          responseStatus: response.status,
          responseBody: JSON.stringify(response.data).substring(0, 10000), // Limit size
          completedAt: new Date(),
        },
      });

      console.log(`Webhook delivered successfully: ${delivery.id}, status: ${response.status}`);
    } catch (error: any) {
      console.error(`Webhook delivery failed: ${delivery.id}, attempt: ${attempt}`, error.message);

      const errorMessage = error.response?.data
        ? JSON.stringify(error.response.data).substring(0, 1000)
        : error.message;

      // Check if we should retry
      if (attempt < delivery.maxRetries) {
        const retryPolicy = this.defaultRetryPolicy;
        const delay = retryPolicy.retryDelay * Math.pow(retryPolicy.backoffMultiplier, attempt - 1);
        const nextRetryAt = new Date(Date.now() + delay);

        await prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'retrying',
            responseStatus: error.response?.status,
            errorMessage,
            nextRetryAt,
          },
        });

        console.log(`Scheduling retry for webhook ${delivery.id} in ${delay}ms...`);

        // Schedule retry
        setTimeout(() => {
          this.deliverWebhookAsync(delivery.id).catch((err) => {
            console.error(`Retry failed for webhook ${delivery.id}:`, err);
          });
        }, delay);
      } else {
        // Max retries reached, mark as failed
        await prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'failed',
            responseStatus: error.response?.status,
            errorMessage,
            completedAt: new Date(),
          },
        });

        console.error(`Webhook delivery failed after ${attempt} attempts: ${delivery.id}`);
      }
    }
  }

  /**
   * Get webhook delivery history
   * Requirements: 21.2
   */
  async getDeliveryHistory(
    webhookId: string,
    limit: number = 50
  ): Promise<WebhookDelivery[]> {
    const deliveries = await prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return deliveries.map((d) => ({
      id: d.id,
      webhookId: d.webhookId,
      event: d.event,
      payload: d.payload,
      status: d.status as any,
      attempts: d.attempts,
      lastAttemptAt: d.lastAttemptAt || undefined,
      nextRetryAt: d.nextRetryAt || undefined,
      response: d.responseBody ? JSON.parse(d.responseBody) : undefined,
      error: d.errorMessage || undefined,
    }));
  }

  /**
   * Retry failed webhook delivery
   * Requirements: 21.2
   */
  async retryDelivery(deliveryId: string): Promise<void> {
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });

    if (!delivery) {
      throw new Error(`Webhook delivery not found: ${deliveryId}`);
    }

    if (delivery.status === 'success') {
      throw new Error('Cannot retry successful delivery');
    }

    // Reset delivery for retry
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'pending',
        attempts: 0,
        nextRetryAt: null,
        errorMessage: null,
      },
    });

    // Attempt delivery
    await this.deliverWebhookAsync(deliveryId);
  }

  /**
   * Generate webhook secret
   */
  private generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: any, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: any, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

// ─── Pre-built Connectors (Sub-task 39.3) ─────────────────

export class ConnectorService {
  /**
   * Create connector configuration
   * Requirements: 21.5
   */
  async createConnector(config: ConnectorConfig): Promise<ConnectorConfig> {
    const connector = await prisma.connector.create({
      data: {
        name: config.name,
        type: config.type,
        baseUrl: config.credentials.baseUrl || config.credentials.instanceUrl,
        credentials: config.credentials,
        mapping: config.mapping,
        syncSchedule: config.syncSchedule,
        syncDirection: 'bidirectional',
        isActive: config.isActive !== false,
      },
    });

    return {
      id: connector.id,
      name: connector.name,
      type: connector.type as any,
      credentials: connector.credentials as any,
      mapping: connector.mapping as any,
      syncSchedule: connector.syncSchedule || undefined,
      isActive: connector.isActive,
    };
  }

  /**
   * Update connector configuration
   * Requirements: 21.5
   */
  async updateConnector(
    id: string,
    updates: Partial<ConnectorConfig>
  ): Promise<ConnectorConfig> {
    const connector = await prisma.connector.update({
      where: { id },
      data: {
        name: updates.name,
        credentials: updates.credentials,
        mapping: updates.mapping,
        syncSchedule: updates.syncSchedule,
        isActive: updates.isActive,
      },
    });

    return {
      id: connector.id,
      name: connector.name,
      type: connector.type as any,
      credentials: connector.credentials as any,
      mapping: connector.mapping as any,
      syncSchedule: connector.syncSchedule || undefined,
      isActive: connector.isActive,
    };
  }

  /**
   * Delete connector
   * Requirements: 21.5
   */
  async deleteConnector(id: string): Promise<void> {
    await prisma.connector.delete({ where: { id } });
  }

  /**
   * List all connectors
   * Requirements: 21.5
   */
  async listConnectors(): Promise<ConnectorConfig[]> {
    const connectors = await prisma.connector.findMany();

    return connectors.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type as any,
      credentials: c.credentials as any,
      mapping: c.mapping as any,
      syncSchedule: c.syncSchedule || undefined,
      isActive: c.isActive,
    }));
  }

  /**
   * Test connector connection
   * Requirements: 21.5
   */
  async testConnection(connectorId: string): Promise<{ success: boolean; message: string }> {
    const connector = await prisma.connector.findUnique({
      where: { id: connectorId },
    });

    if (!connector) {
      throw new Error('Connector not found');
    }

    try {
      const client = await this.createClient(connector);

      // Test connection based on connector type
      switch (connector.type) {
        case 'salesforce':
          await client.get('/services/data/v57.0/');
          break;
        case 'sap':
          await client.get('/sap/opu/odata/sap/API_BUSINESS_PARTNER');
          break;
        case 'oracle':
          await client.get('/fscmRestApi/resources/11.13.18.05/');
          break;
        default:
          await client.get('/');
      }

      return {
        success: true,
        message: 'Connection successful',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
      };
    }
  }

  /**
   * Create HTTP client for connector
   */
  private async createClient(connector: any): Promise<any> {
    const credentials = connector.credentials;

    switch (connector.type) {
      case 'salesforce':
        return this.connectSalesforce(credentials);
      case 'sap':
        return this.connectSAP(credentials);
      case 'oracle':
        return this.connectOracle(credentials);
      default:
        return axios.create({
          baseURL: connector.baseUrl,
          headers: {
            'Content-Type': 'application/json',
          },
        });
    }
  }

  /**
   * Salesforce connector
   * Requirements: 21.5
   */
  async connectSalesforce(credentials: {
    instanceUrl: string;
    accessToken: string;
  }): Promise<any> {
    const config: AxiosRequestConfig = {
      baseURL: credentials.instanceUrl,
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    return axios.create(config);
  }

  /**
   * SAP connector
   * Requirements: 21.5
   */
  async connectSAP(credentials: {
    baseUrl: string;
    username: string;
    password: string;
  }): Promise<any> {
    const config: AxiosRequestConfig = {
      baseURL: credentials.baseUrl,
      auth: {
        username: credentials.username,
        password: credentials.password,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    };

    return axios.create(config);
  }

  /**
   * Oracle connector
   * Requirements: 21.5
   */
  async connectOracle(credentials: {
    baseUrl: string;
    apiKey: string;
  }): Promise<any> {
    const config: AxiosRequestConfig = {
      baseURL: credentials.baseUrl,
      headers: {
        'X-API-Key': credentials.apiKey,
        'Content-Type': 'application/json',
      },
    };

    return axios.create(config);
  }

  /**
   * Map data between systems
   * Requirements: 21.5
   */
  async mapData(data: any, mapping: DataMapping): Promise<any> {
    const mapped: any = {};

    for (const fieldMapping of mapping.fieldMappings) {
      let value = data[fieldMapping.sourceField];

      // Apply transformation if specified
      if (fieldMapping.transform && value !== undefined) {
        value = this.applyTransform(value, fieldMapping.transform);
      }

      mapped[fieldMapping.targetField] = value;
    }

    return mapped;
  }

  /**
   * Apply data transformation
   */
  private applyTransform(value: any, transform: string): any {
    switch (transform) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      case 'number':
        return Number(value);
      case 'string':
        return String(value);
      case 'date':
        return new Date(value);
      default:
        return value;
    }
  }

  /**
   * Fetch data from external system
   * Requirements: 21.5
   */
  async fetchData(
    connectorId: string,
    entityType: string,
    filters?: Record<string, any>
  ): Promise<any[]> {
    const connector = await prisma.connector.findUnique({
      where: { id: connectorId },
    });

    if (!connector) {
      throw new Error('Connector not found');
    }

    const client = await this.createClient(connector);

    // Build query based on connector type and entity
    let endpoint = '';
    switch (connector.type) {
      case 'salesforce':
        endpoint = `/services/data/v57.0/query?q=SELECT+*+FROM+${entityType}`;
        break;
      case 'sap':
        endpoint = `/sap/opu/odata/sap/${entityType}`;
        break;
      case 'oracle':
        endpoint = `/fscmRestApi/resources/11.13.18.05/${entityType}`;
        break;
      default:
        endpoint = `/${entityType}`;
    }

    const response = await client.get(endpoint);
    return response.data.records || response.data.items || response.data;
  }

  /**
   * Push data to external system
   * Requirements: 21.5
   */
  async pushData(
    connectorId: string,
    entityType: string,
    records: any[]
  ): Promise<{ success: number; failed: number }> {
    const connector = await prisma.connector.findUnique({
      where: { id: connectorId },
    });

    if (!connector) {
      throw new Error('Connector not found');
    }

    const client = await this.createClient(connector);
    let success = 0;
    let failed = 0;

    for (const record of records) {
      try {
        // Map data using connector mapping
        const mappedRecord = await this.mapData(record, connector.mapping as any);

        // Push to external system
        let endpoint = '';
        switch (connector.type) {
          case 'salesforce':
            endpoint = `/services/data/v57.0/sobjects/${entityType}`;
            break;
          case 'sap':
            endpoint = `/sap/opu/odata/sap/${entityType}`;
            break;
          case 'oracle':
            endpoint = `/fscmRestApi/resources/11.13.18.05/${entityType}`;
            break;
          default:
            endpoint = `/${entityType}`;
        }

        await client.post(endpoint, mappedRecord);
        success++;
      } catch (error) {
        console.error('Failed to push record:', error);
        failed++;
      }
    }

    return { success, failed };
  }
}

// ─── Data Synchronization (Sub-task 39.4) ─────────────────

export class SyncService {
  /**
   * Start synchronization job
   * Requirements: 21.6
   */
  async startSync(
    connectorId: string,
    direction: 'inbound' | 'outbound' | 'bidirectional'
  ): Promise<SyncJob> {
    // Create sync job
    const job = await prisma.syncJob.create({
      data: {
        connectorId,
        status: 'pending',
        direction,
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
        recordsSkipped: 0,
      },
    });

    // Start sync in background
    this.executeSync(job.id).catch((error) => {
      console.error('Sync job failed:', error);
    });

    return {
      id: job.id,
      connectorId: job.connectorId,
      status: job.status as any,
      direction: job.direction as any,
      recordsProcessed: job.recordsProcessed,
      recordsSucceeded: job.recordsSucceeded,
      recordsFailed: job.recordsFailed,
      conflicts: [],
      errors: [],
      startedAt: job.startedAt || undefined,
      completedAt: job.completedAt || undefined,
    };
  }

  /**
   * Execute synchronization
   * Requirements: 21.6
   */
  private async executeSync(jobId: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Update job status to running
      await prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: 'running',
          startedAt: new Date(),
        },
      });

      const job = await prisma.syncJob.findUnique({
        where: { id: jobId },
        include: { connector: true },
      });

      if (!job) {
        throw new Error('Sync job not found');
      }

      const connector = job.connector;
      const mapping = connector.mapping as any;

      // Fetch records from source
      let records: any[] = [];

      if (job.direction === 'inbound' || job.direction === 'bidirectional') {
        records = await connectorService.fetchData(
          connector.id,
          mapping.sourceEntity
        );
      }

      // Process each record
      for (const record of records) {
        await prisma.syncJob.update({
          where: { id: jobId },
          data: {
            recordsProcessed: { increment: 1 },
          },
        });

        try {
          // Check for conflicts
          const conflict = await this.detectConflict(jobId, record, mapping);

          if (conflict) {
            // Skip record if conflict cannot be resolved
            const resolved = await this.resolveConflict(conflict.id);

            if (!resolved) {
              await prisma.syncJob.update({
                where: { id: jobId },
                data: {
                  recordsSkipped: { increment: 1 },
                },
              });
              continue;
            }
          }

          // Map and sync record
          const mappedRecord = await connectorService.mapData(record, mapping);
          await this.syncRecord(mappedRecord, mapping.targetEntity);

          await prisma.syncJob.update({
            where: { id: jobId },
            data: {
              recordsSucceeded: { increment: 1 },
            },
          });
        } catch (error: any) {
          await prisma.syncJob.update({
            where: { id: jobId },
            data: {
              recordsFailed: { increment: 1 },
            },
          });

          // Log error
          await prisma.syncError.create({
            data: {
              syncJobId: jobId,
              recordId: record.id || 'unknown',
              entityType: mapping.sourceEntity,
              errorType: this.classifyError(error),
              errorMessage: error.message,
              errorDetails: {
                stack: error.stack,
                code: error.code,
              },
              isRetryable: this.isRetryableError(error),
            },
          });
        }
      }

      // Mark job as completed
      const duration = Math.floor((Date.now() - startTime) / 1000);

      await prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          duration,
        },
      });

      // Update connector last sync time
      await prisma.connector.update({
        where: { id: connector.id },
        data: {
          lastSyncAt: new Date(),
        },
      });

      console.log(`Sync job ${jobId} completed successfully`);
    } catch (error: any) {
      const duration = Math.floor((Date.now() - startTime) / 1000);

      await prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          duration,
          errorMessage: error.message,
          errorDetails: {
            stack: error.stack,
            code: error.code,
          },
        },
      });

      console.error(`Sync job ${jobId} failed:`, error);
    }
  }

  /**
   * Detect sync conflicts
   * Requirements: 21.6
   */
  private async detectConflict(
    jobId: string,
    record: any,
    mapping: DataMapping
  ): Promise<any | null> {
    // Check if record exists locally
    // For now, simplified conflict detection
    // In production, this would check timestamps and compare values

    const recordId = record.id || record[mapping.fieldMappings[0]?.sourceField];

    if (!recordId) {
      return null;
    }

    // Check for existing record with same ID
    // This is a simplified example - actual implementation would depend on entity type
    const existingRecord = await this.findLocalRecord(mapping.targetEntity, recordId);

    if (!existingRecord) {
      return null; // No conflict, record doesn't exist
    }

    // Compare timestamps if available
    const remoteUpdatedAt = record.updatedAt || record.lastModifiedDate;
    const localUpdatedAt = existingRecord.updatedAt;

    if (remoteUpdatedAt && localUpdatedAt) {
      const remoteTime = new Date(remoteUpdatedAt).getTime();
      const localTime = new Date(localUpdatedAt).getTime();

      if (remoteTime > localTime) {
        return null; // Remote is newer, no conflict
      } else if (localTime > remoteTime) {
        // Local is newer, conflict detected
        const conflict = await prisma.syncConflict.create({
          data: {
            syncJobId: jobId,
            recordId: recordId.toString(),
            entityType: mapping.targetEntity,
            field: 'updatedAt',
            localValue: localUpdatedAt,
            remoteValue: remoteUpdatedAt,
            resolution: 'remote', // Default: use remote value
          },
        });

        return conflict;
      }
    }

    return null;
  }

  /**
   * Resolve sync conflict
   * Requirements: 21.6
   */
  private async resolveConflict(conflictId: string): Promise<boolean> {
    const conflict = await prisma.syncConflict.findUnique({
      where: { id: conflictId },
    });

    if (!conflict) {
      return false;
    }

    // Apply conflict resolution strategy
    switch (conflict.resolution) {
      case 'local':
        // Keep local value, skip sync
        await prisma.syncConflict.update({
          where: { id: conflictId },
          data: {
            resolvedAt: new Date(),
          },
        });
        return false; // Don't sync this record

      case 'remote':
        // Use remote value, proceed with sync
        await prisma.syncConflict.update({
          where: { id: conflictId },
          data: {
            resolvedAt: new Date(),
          },
        });
        return true; // Proceed with sync

      case 'manual':
        // Requires manual intervention
        return false;

      default:
        // Default: use remote (last write wins)
        await prisma.syncConflict.update({
          where: { id: conflictId },
          data: {
            resolution: 'remote',
            resolvedAt: new Date(),
          },
        });
        return true;
    }
  }

  /**
   * Sync single record to local database
   */
  private async syncRecord(record: any, entityType: string): Promise<void> {
    // This would use Prisma to create/update records based on entity type
    // For now, simplified implementation

    switch (entityType.toLowerCase()) {
      case 'product':
        await prisma.product.upsert({
          where: { id: record.id || crypto.randomUUID() },
          create: record,
          update: record,
        });
        break;

      case 'customer':
        // Handle customer sync
        break;

      case 'order':
        // Handle order sync
        break;

      default:
        console.warn(`Unknown entity type: ${entityType}`);
    }
  }

  /**
   * Find local record by ID
   */
  private async findLocalRecord(entityType: string, recordId: string): Promise<any | null> {
    switch (entityType.toLowerCase()) {
      case 'product':
        return await prisma.product.findUnique({ where: { id: recordId } });

      case 'customer':
        // Find customer
        return null;

      case 'order':
        // Find order
        return null;

      default:
        return null;
    }
  }

  /**
   * Classify error type
   */
  private classifyError(error: any): string {
    if (error.name === 'ValidationError') {
      return 'validation';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return 'network';
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      return 'authentication';
    } else if (error.message?.includes('mapping')) {
      return 'mapping';
    } else {
      return 'unknown';
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors, timeouts, rate limits are retryable
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
    const retryableStatuses = [429, 500, 502, 503, 504];

    return (
      retryableCodes.includes(error.code) ||
      retryableStatuses.includes(error.response?.status)
    );
  }

  /**
   * Retry failed sync records
   * Requirements: 21.6
   */
  async retryFailedRecords(jobId: string): Promise<{ retried: number; succeeded: number }> {
    const errors = await prisma.syncError.findMany({
      where: {
        syncJobId: jobId,
        isRetryable: true,
      },
    });

    let retried = 0;
    let succeeded = 0;

    for (const error of errors) {
      retried++;

      try {
        // Retry the record
        // This is simplified - actual implementation would fetch and re-sync the record
        await prisma.syncError.update({
          where: { id: error.id },
          data: {
            retryCount: { increment: 1 },
            lastRetryAt: new Date(),
          },
        });

        succeeded++;
      } catch (retryError) {
        console.error(`Retry failed for record ${error.recordId}:`, retryError);
      }
    }

    return { retried, succeeded };
  }

  /**
   * Get sync job status
   * Requirements: 21.6
   */
  async getSyncStatus(jobId: string): Promise<SyncJob | null> {
    const job = await prisma.syncJob.findUnique({
      where: { id: jobId },
      include: {
        conflicts: true,
        errors: true,
      },
    });

    if (!job) {
      return null;
    }

    return {
      id: job.id,
      connectorId: job.connectorId,
      status: job.status as any,
      direction: job.direction as any,
      recordsProcessed: job.recordsProcessed,
      recordsSucceeded: job.recordsSucceeded,
      recordsFailed: job.recordsFailed,
      conflicts: job.conflicts.map((c) => ({
        recordId: c.recordId,
        field: c.field,
        localValue: c.localValue,
        remoteValue: c.remoteValue,
        resolution: c.resolution as any,
      })),
      errors: job.errors.map((e) => ({
        recordId: e.recordId || 'unknown',
        error: e.errorMessage,
        retryable: e.isRetryable,
      })),
      startedAt: job.startedAt || undefined,
      completedAt: job.completedAt || undefined,
    };
  }

  /**
   * List sync jobs for a connector
   * Requirements: 21.6
   */
  async listSyncJobs(
    connectorId: string,
    limit: number = 50
  ): Promise<SyncJob[]> {
    const jobs = await prisma.syncJob.findMany({
      where: { connectorId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        conflicts: true,
        errors: true,
      },
    });

    return jobs.map((job) => ({
      id: job.id,
      connectorId: job.connectorId,
      status: job.status as any,
      direction: job.direction as any,
      recordsProcessed: job.recordsProcessed,
      recordsSucceeded: job.recordsSucceeded,
      recordsFailed: job.recordsFailed,
      conflicts: job.conflicts.map((c) => ({
        recordId: c.recordId,
        field: c.field,
        localValue: c.localValue,
        remoteValue: c.remoteValue,
        resolution: c.resolution as any,
      })),
      errors: job.errors.map((e) => ({
        recordId: e.recordId || 'unknown',
        error: e.errorMessage,
        retryable: e.isRetryable,
      })),
      startedAt: job.startedAt || undefined,
      completedAt: job.completedAt || undefined,
    }));
  }

  /**
   * Cancel running sync job
   * Requirements: 21.6
   */
  async cancelSync(jobId: string): Promise<void> {
    await prisma.syncJob.update({
      where: { id: jobId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
      },
    });
  }
}

// ─── Export Services ───────────────────────────────────────

export const fileIntegrationService = new FileIntegrationService();
export const webhookService = new WebhookService();
export const connectorService = new ConnectorService();
export const syncService = new SyncService();
