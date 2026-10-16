/**
 * SIEM Integration Service
 * Sends security events to SIEM systems with structured logging
 */

import { v4 as uuidv4 } from 'uuid';

export enum SecurityEventType {
  AUTHENTICATION_SUCCESS = 'AUTHENTICATION_SUCCESS',
  AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',
  AUTHORIZATION_FAILURE = 'AUTHORIZATION_FAILURE',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  MFA_VERIFICATION_SUCCESS = 'MFA_VERIFICATION_SUCCESS',
  MFA_VERIFICATION_FAILURE = 'MFA_VERIFICATION_FAILURE',
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_REVOKED = 'SESSION_REVOKED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REVOKED = 'ROLE_REVOKED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_MODIFICATION = 'DATA_MODIFICATION',
  DATA_DELETION = 'DATA_DELETION',
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
  ENCRYPTION_KEY_ROTATION = 'ENCRYPTION_KEY_ROTATION',
  ENCRYPTION_FAILURE = 'ENCRYPTION_FAILURE',
  DECRYPTION_FAILURE = 'DECRYPTION_FAILURE',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_INPUT = 'INVALID_INPUT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  CSRF_ATTEMPT = 'CSRF_ATTEMPT',
  BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  AUDIT_LOG_ACCESS = 'AUDIT_LOG_ACCESS',
  BACKUP_CREATED = 'BACKUP_CREATED',
  BACKUP_RESTORED = 'BACKUP_RESTORED',
}

export enum SecuritySeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

export interface SecurityEvent {
  eventId: string;
  correlationId: string;
  timestamp: string;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  userId?: string;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  result: 'SUCCESS' | 'FAILURE';
  message: string;
  metadata?: Record<string, any>;
  sessionId?: string;
  tenantId?: string;
  location?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  threat?: {
    type?: string;
    score?: number;
    indicators?: string[];
  };
}

export interface SIEMConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  batchSize: number;
  flushInterval: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

class SIEMService {
  private config: SIEMConfig;
  private eventQueue: SecurityEvent[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.config = {
      enabled: process.env.SIEM_ENABLED === 'true',
      endpoint: process.env.SIEM_ENDPOINT,
      apiKey: process.env.SIEM_API_KEY,
      batchSize: parseInt(process.env.SIEM_BATCH_SIZE || '100', 10),
      flushInterval: parseInt(process.env.SIEM_FLUSH_INTERVAL || '5000', 10),
      retryAttempts: parseInt(process.env.SIEM_RETRY_ATTEMPTS || '3', 10),
      retryDelay: parseInt(process.env.SIEM_RETRY_DELAY || '1000', 10),
    };

    if (this.config.enabled) {
      this.startFlushTimer();
    }
  }

  /**
   * Log a security event
   */
  public logSecurityEvent(
    eventType: SecurityEventType,
    severity: SecuritySeverity,
    result: 'SUCCESS' | 'FAILURE',
    message: string,
    metadata?: {
      userId?: string;
      username?: string;
      ipAddress?: string;
      userAgent?: string;
      resource?: string;
      action?: string;
      correlationId?: string;
      sessionId?: string;
      tenantId?: string;
      location?: SecurityEvent['location'];
      threat?: SecurityEvent['threat'];
      [key: string]: any;
    }
  ): void {
    const event: SecurityEvent = {
      eventId: uuidv4(),
      correlationId: metadata?.correlationId || uuidv4(),
      timestamp: new Date().toISOString(),
      eventType,
      severity,
      result,
      message,
      userId: metadata?.userId,
      username: metadata?.username,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      resource: metadata?.resource,
      action: metadata?.action,
      sessionId: metadata?.sessionId,
      tenantId: metadata?.tenantId,
      location: metadata?.location,
      threat: metadata?.threat,
      metadata: this.sanitizeMetadata(metadata),
    };

    // Log to console with structured format
    this.logToConsole(event);

    // Add to queue for SIEM forwarding
    if (this.config.enabled) {
      this.eventQueue.push(event);

      // Flush immediately for critical events
      if (severity === SecuritySeverity.CRITICAL) {
        this.flush();
      } else if (this.eventQueue.length >= this.config.batchSize) {
        this.flush();
      }
    }
  }

  /**
   * Log structured event to console
   */
  private logToConsole(event: SecurityEvent): void {
    const logEntry = {
      '@timestamp': event.timestamp,
      event_id: event.eventId,
      correlation_id: event.correlationId,
      event_type: event.eventType,
      severity: event.severity,
      result: event.result,
      message: event.message,
      user: {
        id: event.userId,
        username: event.username,
      },
      source: {
        ip: event.ipAddress,
        user_agent: event.userAgent,
      },
      resource: event.resource,
      action: event.action,
      session_id: event.sessionId,
      tenant_id: event.tenantId,
      location: event.location,
      threat: event.threat,
      metadata: event.metadata,
    };

    // Use appropriate log level based on severity
    switch (event.severity) {
      case SecuritySeverity.CRITICAL:
      case SecuritySeverity.HIGH:
        console.error('[SECURITY]', JSON.stringify(logEntry));
        break;
      case SecuritySeverity.MEDIUM:
        console.warn('[SECURITY]', JSON.stringify(logEntry));
        break;
      default:
        console.info('[SECURITY]', JSON.stringify(logEntry));
    }
  }

  /**
   * Sanitize metadata to remove sensitive information
   */
  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;

    const sanitized = { ...metadata };
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'apiKey',
      'api_key',
      'authorization',
      'cookie',
      'sessionId',
      'session_id',
    ];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Start automatic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);
  }

  /**
   * Flush events to SIEM
   */
  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await this.sendToSIEM(events);
    } catch (error) {
      console.error('[SIEM] Failed to send events:', error);
      // Re-queue events for retry (with limit to prevent memory issues)
      if (this.eventQueue.length < 10000) {
        this.eventQueue.push(...events);
      }
    }
  }

  /**
   * Send events to SIEM endpoint
   */
  private async sendToSIEM(events: SecurityEvent[], attempt = 1): Promise<void> {
    if (!this.config.endpoint) {
      console.warn('[SIEM] No endpoint configured, events logged locally only');
      return;
    }

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify({ events }),
      });

      if (!response.ok) {
        throw new Error(`SIEM endpoint returned ${response.status}: ${response.statusText}`);
      }

      console.info(`[SIEM] Successfully sent ${events.length} events to SIEM`);
    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        console.warn(`[SIEM] Retry attempt ${attempt}/${this.config.retryAttempts}`);
        await new Promise((resolve) => setTimeout(resolve, this.config.retryDelay * attempt));
        return this.sendToSIEM(events, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Shutdown service and flush remaining events
   */
  public async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
  }

  /**
   * Helper methods for common security events
   */

  public logAuthenticationSuccess(userId: string, username: string, metadata?: Record<string, any>): void {
    this.logSecurityEvent(
      SecurityEventType.AUTHENTICATION_SUCCESS,
      SecuritySeverity.INFO,
      'SUCCESS',
      `User ${username} authenticated successfully`,
      { userId, username, ...metadata }
    );
  }

  public logAuthenticationFailure(username: string, reason: string, metadata?: Record<string, any>): void {
    this.logSecurityEvent(
      SecurityEventType.AUTHENTICATION_FAILURE,
      SecuritySeverity.MEDIUM,
      'FAILURE',
      `Authentication failed for ${username}: ${reason}`,
      { username, ...metadata }
    );
  }

  public logAuthorizationFailure(
    userId: string,
    resource: string,
    action: string,
    metadata?: Record<string, any>
  ): void {
    this.logSecurityEvent(
      SecurityEventType.AUTHORIZATION_FAILURE,
      SecuritySeverity.MEDIUM,
      'FAILURE',
      `User ${userId} denied access to ${resource}`,
      { userId, resource, action, ...metadata }
    );
  }

  public logSuspiciousActivity(
    description: string,
    severity: SecuritySeverity,
    metadata?: Record<string, any>
  ): void {
    this.logSecurityEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity,
      'FAILURE',
      `Suspicious activity detected: ${description}`,
      metadata
    );
  }

  public logDataAccess(userId: string, resource: string, action: string, metadata?: Record<string, any>): void {
    this.logSecurityEvent(
      SecurityEventType.DATA_ACCESS,
      SecuritySeverity.INFO,
      'SUCCESS',
      `User ${userId} accessed ${resource}`,
      { userId, resource, action, ...metadata }
    );
  }

  public logSensitiveDataAccess(
    userId: string,
    resource: string,
    action: string,
    metadata?: Record<string, any>
  ): void {
    this.logSecurityEvent(
      SecurityEventType.SENSITIVE_DATA_ACCESS,
      SecuritySeverity.HIGH,
      'SUCCESS',
      `User ${userId} accessed sensitive data: ${resource}`,
      { userId, resource, action, ...metadata }
    );
  }

  public logConfigurationChange(
    userId: string,
    configKey: string,
    oldValue: any,
    newValue: any,
    metadata?: Record<string, any>
  ): void {
    this.logSecurityEvent(
      SecurityEventType.CONFIGURATION_CHANGE,
      SecuritySeverity.HIGH,
      'SUCCESS',
      `Configuration changed: ${configKey}`,
      {
        userId,
        configKey,
        oldValue: this.sanitizeMetadata({ value: oldValue })?.value,
        newValue: this.sanitizeMetadata({ value: newValue })?.value,
        ...metadata,
      }
    );
  }
}

// Export singleton instance
export const siemService = new SIEMService();

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  await siemService.shutdown();
});

process.on('SIGINT', async () => {
  await siemService.shutdown();
});
