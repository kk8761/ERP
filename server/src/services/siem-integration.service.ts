/**
 * SIEM Integration Service
 * Task 38.5: Implement SIEM integration for security event logging
 * 
 * Integrates with Security Information and Event Management (SIEM) systems:
 * - Splunk
 * - IBM QRadar
 * - ArcSight
 * - Generic syslog
 * 
 * Features:
 * - Structured logging with correlation IDs
 * - Real-time event streaming
 * - Event batching and buffering
 * - Automatic retry on failure
 */

import prisma from '../config/prisma';
import { redis } from '../config/redis';
import crypto from 'crypto';

/**
 * SIEM Provider Types
 */
export enum SIEMProvider {
  SPLUNK = 'SPLUNK',
  QRADAR = 'QRADAR',
  ARCSIGHT = 'ARCSIGHT',
  SYSLOG = 'SYSLOG',
  CUSTOM = 'CUSTOM',
}

/**
 * Security Event Severity Levels
 */
export enum EventSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

/**
 * Security Event Categories
 */
export enum EventCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_MODIFICATION = 'DATA_MODIFICATION',
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  ANOMALY_DETECTED = 'ANOMALY_DETECTED',
  SYSTEM_EVENT = 'SYSTEM_EVENT',
}

/**
 * Security Event Interface
 */
export interface SecurityEvent {
  eventId: string;
  correlationId: string;
  timestamp: Date;
  eventType: string;
  category: EventCategory;
  severity: EventSeverity;
  userId?: string;
  username?: string;
  ipAddress: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  outcome: 'SUCCESS' | 'FAILURE';
  message: string;
  details?: Record<string, any>;
  deviceId?: string;
  deviceTrustScore?: number;
  riskScore?: number;
  location?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
}

/**
 * SIEM Configuration
 */
export interface SIEMConfig {
  provider: SIEMProvider;
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  batchSize: number;
  batchIntervalMs: number;
  retryAttempts: number;
  retryDelayMs: number;
}

/**
 * SIEM Integration Service
 */
export class SIEMIntegrationService {
  private static config: SIEMConfig = {
    provider: SIEMProvider.SYSLOG,
    enabled: false,
    batchSize: 100,
    batchIntervalMs: 5000,
    retryAttempts: 3,
    retryDelayMs: 1000,
  };

  private static eventBuffer: SecurityEvent[] = [];
  private static batchTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize SIEM integration
   */
  static async initialize(): Promise<void> {
    // Load configuration from database
    const config = await this.loadConfiguration();
    if (config) {
      this.config = config;
    }

    // Load from environment variables
    if (process.env.SIEM_PROVIDER) {
      this.config.provider = process.env.SIEM_PROVIDER as SIEMProvider;
    }
    if (process.env.SIEM_ENDPOINT) {
      this.config.endpoint = process.env.SIEM_ENDPOINT;
    }
    if (process.env.SIEM_API_KEY) {
      this.config.apiKey = process.env.SIEM_API_KEY;
    }
    if (process.env.SIEM_ENABLED === 'true') {
      this.config.enabled = true;
    }

    if (this.config.enabled) {
      console.log(`SIEM Integration initialized: ${this.config.provider}`);
      this.startBatchProcessor();
    } else {
      console.log('SIEM Integration disabled');
    }
  }

  /**
   * Load SIEM configuration from database
   */
  private static async loadConfiguration(): Promise<SIEMConfig | null> {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { key: 'siem_config' },
      });

      if (config && config.value) {
        return JSON.parse(config.value as string);
      }
    } catch (error) {
      console.error('Failed to load SIEM configuration:', error);
    }

    return null;
  }

  /**
   * Update SIEM configuration
   */
  static async updateConfiguration(config: Partial<SIEMConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    await prisma.systemConfig.upsert({
      where: { key: 'siem_config' },
      create: {
        key: 'siem_config',
        value: JSON.stringify(this.config),
      },
      update: {
        value: JSON.stringify(this.config),
      },
    });

    // Restart batch processor if enabled status changed
    if (this.config.enabled && !this.batchTimer) {
      this.startBatchProcessor();
    } else if (!this.config.enabled && this.batchTimer) {
      this.stopBatchProcessor();
    }
  }

  /**
   * Log security event to SIEM
   */
  static async logEvent(event: Omit<SecurityEvent, 'eventId' | 'correlationId' | 'timestamp'>): Promise<void> {
    // Generate event ID and correlation ID
    const eventId = crypto.randomUUID();
    const correlationId = event.details?.correlationId || crypto.randomUUID();

    const fullEvent: SecurityEvent = {
      eventId,
      correlationId,
      timestamp: new Date(),
      ...event,
    };

    // Store in database for audit trail
    await this.storeEventInDatabase(fullEvent);

    // Send to SIEM if enabled
    if (this.config.enabled) {
      this.eventBuffer.push(fullEvent);

      // If buffer is full, flush immediately
      if (this.eventBuffer.length >= this.config.batchSize) {
        await this.flushEventBuffer();
      }
    }
  }

  /**
   * Store event in database
   */
  private static async storeEventInDatabase(event: SecurityEvent): Promise<void> {
    try {
      await prisma.securityEvent.create({
        data: {
          id: event.eventId,
          correlationId: event.correlationId,
          eventType: event.eventType,
          category: event.category,
          severity: event.severity,
          userId: event.userId,
          username: event.username,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          resource: event.resource,
          action: event.action,
          success: event.outcome === 'SUCCESS',
          message: event.message,
          deviceId: event.deviceId,
          deviceTrustScore: event.deviceTrustScore,
          riskScore: event.riskScore,
          metadata: event.details ? JSON.stringify(event.details) : null,
          timestamp: event.timestamp,
        },
      });
    } catch (error) {
      console.error('Failed to store security event in database:', error);
    }
  }

  /**
   * Start batch processor
   */
  private static startBatchProcessor(): void {
    if (this.batchTimer) {
      return; // Already running
    }

    this.batchTimer = setInterval(async () => {
      if (this.eventBuffer.length > 0) {
        await this.flushEventBuffer();
      }
    }, this.config.batchIntervalMs);

    console.log('SIEM batch processor started');
  }

  /**
   * Stop batch processor
   */
  private static stopBatchProcessor(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
      console.log('SIEM batch processor stopped');
    }
  }

  /**
   * Flush event buffer to SIEM
   */
  private static async flushEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      await this.sendEventsToSIEM(events);
    } catch (error) {
      console.error('Failed to send events to SIEM:', error);
      
      // Put events back in buffer for retry
      this.eventBuffer.unshift(...events);
      
      // Limit buffer size to prevent memory issues
      if (this.eventBuffer.length > 10000) {
        console.warn('Event buffer overflow, dropping oldest events');
        this.eventBuffer = this.eventBuffer.slice(0, 10000);
      }
    }
  }

  /**
   * Send events to SIEM system
   */
  private static async sendEventsToSIEM(events: SecurityEvent[]): Promise<void> {
    switch (this.config.provider) {
      case SIEMProvider.SPLUNK:
        await this.sendToSplunk(events);
        break;

      case SIEMProvider.QRADAR:
        await this.sendToQRadar(events);
        break;

      case SIEMProvider.ARCSIGHT:
        await this.sendToArcSight(events);
        break;

      case SIEMProvider.SYSLOG:
        await this.sendToSyslog(events);
        break;

      case SIEMProvider.CUSTOM:
        await this.sendToCustomEndpoint(events);
        break;

      default:
        console.warn(`Unknown SIEM provider: ${this.config.provider}`);
    }
  }

  /**
   * Send events to Splunk HTTP Event Collector (HEC)
   */
  private static async sendToSplunk(events: SecurityEvent[]): Promise<void> {
    if (!this.config.endpoint || !this.config.apiKey) {
      throw new Error('Splunk endpoint and API key required');
    }

    const payload = events.map(event => ({
      time: Math.floor(event.timestamp.getTime() / 1000),
      source: 'nexaerp',
      sourcetype: 'security:event',
      event: {
        ...event,
        timestamp: event.timestamp.toISOString(),
      },
    }));

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Splunk ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Splunk API error: ${response.statusText}`);
    }
  }

  /**
   * Send events to IBM QRadar
   */
  private static async sendToQRadar(events: SecurityEvent[]): Promise<void> {
    if (!this.config.endpoint || !this.config.apiKey) {
      throw new Error('QRadar endpoint and API key required');
    }

    // QRadar uses LEF (Log Event Format)
    const payload = events.map(event => this.formatAsLEF(event));

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'SEC': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`QRadar API error: ${response.statusText}`);
    }
  }

  /**
   * Send events to ArcSight
   */
  private static async sendToArcSight(events: SecurityEvent[]): Promise<void> {
    if (!this.config.endpoint) {
      throw new Error('ArcSight endpoint required');
    }

    // ArcSight uses CEF (Common Event Format)
    const payload = events.map(event => this.formatAsCEF(event));

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`ArcSight API error: ${response.statusText}`);
    }
  }

  /**
   * Send events to syslog
   */
  private static async sendToSyslog(events: SecurityEvent[]): Promise<void> {
    // Format as RFC 5424 syslog messages
    for (const event of events) {
      const syslogMessage = this.formatAsSyslog(event);
      console.log(`[SIEM] ${syslogMessage}`);
      
      // In production, use a proper syslog client library
      // e.g., glossy, modern-syslog, or ain2
    }
  }

  /**
   * Send events to custom endpoint
   */
  private static async sendToCustomEndpoint(events: SecurityEvent[]): Promise<void> {
    if (!this.config.endpoint) {
      throw new Error('Custom endpoint required');
    }

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify(events),
    });

    if (!response.ok) {
      throw new Error(`Custom endpoint error: ${response.statusText}`);
    }
  }

  /**
   * Format event as LEF (Log Event Format) for QRadar
   */
  private static formatAsLEF(event: SecurityEvent): string {
    return [
      `eventId=${event.eventId}`,
      `correlationId=${event.correlationId}`,
      `timestamp=${event.timestamp.toISOString()}`,
      `eventType=${event.eventType}`,
      `category=${event.category}`,
      `severity=${event.severity}`,
      `userId=${event.userId || 'N/A'}`,
      `ipAddress=${event.ipAddress}`,
      `resource=${event.resource || 'N/A'}`,
      `action=${event.action || 'N/A'}`,
      `outcome=${event.outcome}`,
      `message=${event.message}`,
    ].join(' ');
  }

  /**
   * Format event as CEF (Common Event Format) for ArcSight
   */
  private static formatAsCEF(event: SecurityEvent): string {
    const cefVersion = 0;
    const deviceVendor = 'NexaERP';
    const deviceProduct = 'ERP';
    const deviceVersion = '2.0';
    const signatureId = event.eventType;
    const name = event.message;
    const severity = this.mapSeverityToCEF(event.severity);

    const extension = [
      `src=${event.ipAddress}`,
      `suser=${event.username || event.userId || 'N/A'}`,
      `outcome=${event.outcome}`,
      `cat=${event.category}`,
      `act=${event.action || 'N/A'}`,
      `cs1=${event.correlationId}`,
      `cs1Label=CorrelationId`,
    ].join(' ');

    return `CEF:${cefVersion}|${deviceVendor}|${deviceProduct}|${deviceVersion}|${signatureId}|${name}|${severity}|${extension}`;
  }

  /**
   * Format event as RFC 5424 syslog message
   */
  private static formatAsSyslog(event: SecurityEvent): string {
    const priority = this.mapSeverityToSyslogPriority(event.severity);
    const timestamp = event.timestamp.toISOString();
    const hostname = 'nexaerp';
    const appName = 'security';
    const procId = process.pid;
    const msgId = event.eventType;

    const structuredData = [
      `[event eventId="${event.eventId}" correlationId="${event.correlationId}"]`,
      `[user userId="${event.userId || 'N/A'}" username="${event.username || 'N/A'}"]`,
      `[network ipAddress="${event.ipAddress}"]`,
      `[action resource="${event.resource || 'N/A'}" action="${event.action || 'N/A'}" outcome="${event.outcome}"]`,
    ].join('');

    return `<${priority}>1 ${timestamp} ${hostname} ${appName} ${procId} ${msgId} ${structuredData} ${event.message}`;
  }

  /**
   * Map severity to CEF severity (0-10)
   */
  private static mapSeverityToCEF(severity: EventSeverity): number {
    const mapping = {
      [EventSeverity.CRITICAL]: 10,
      [EventSeverity.HIGH]: 8,
      [EventSeverity.MEDIUM]: 5,
      [EventSeverity.LOW]: 3,
      [EventSeverity.INFO]: 1,
    };
    return mapping[severity] || 5;
  }

  /**
   * Map severity to syslog priority
   */
  private static mapSeverityToSyslogPriority(severity: EventSeverity): number {
    // Facility: 16 (local0), Severity: 0-7
    const facilityCode = 16 << 3;
    const severityMapping = {
      [EventSeverity.CRITICAL]: 2, // Critical
      [EventSeverity.HIGH]: 3, // Error
      [EventSeverity.MEDIUM]: 4, // Warning
      [EventSeverity.LOW]: 5, // Notice
      [EventSeverity.INFO]: 6, // Informational
    };
    return facilityCode | (severityMapping[severity] || 6);
  }

  /**
   * Get SIEM integration status
   */
  static getStatus(): {
    enabled: boolean;
    provider: SIEMProvider;
    bufferSize: number;
    config: SIEMConfig;
  } {
    return {
      enabled: this.config.enabled,
      provider: this.config.provider,
      bufferSize: this.eventBuffer.length,
      config: this.config,
    };
  }

  /**
   * Test SIEM connection
   */
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const testEvent: SecurityEvent = {
        eventId: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
        timestamp: new Date(),
        eventType: 'SIEM_CONNECTION_TEST',
        category: EventCategory.SYSTEM_EVENT,
        severity: EventSeverity.INFO,
        ipAddress: '127.0.0.1',
        outcome: 'SUCCESS',
        message: 'SIEM connection test',
      };

      await this.sendEventsToSIEM([testEvent]);

      return {
        success: true,
        message: 'SIEM connection test successful',
      };
    } catch (error) {
      return {
        success: false,
        message: `SIEM connection test failed: ${error}`,
      };
    }
  }
}

/**
 * Correlation ID Manager
 * Manages correlation IDs for tracing related events
 */
export class CorrelationIdManager {
  private static readonly CORRELATION_ID_HEADER = 'X-Correlation-ID';

  /**
   * Generate new correlation ID
   */
  static generate(): string {
    return crypto.randomUUID();
  }

  /**
   * Get correlation ID from request or generate new one
   */
  static getOrGenerate(req: any): string {
    return req.headers[this.CORRELATION_ID_HEADER.toLowerCase()] || this.generate();
  }

  /**
   * Store correlation ID in request context
   */
  static store(req: any, correlationId: string): void {
    req.correlationId = correlationId;
  }

  /**
   * Get correlation ID from request context
   */
  static get(req: any): string | undefined {
    return req.correlationId;
  }
}

