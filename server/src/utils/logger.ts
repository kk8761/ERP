/**
 * Structured Logger Utility
 * Provides structured logging with correlation IDs and log levels
 */

import { v4 as uuidv4 } from 'uuid';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

export interface LogEntry {
  '@timestamp': string;
  level: LogLevel;
  message: string;
  correlation_id?: string;
  service: string;
  environment: string;
  hostname: string;
  pid: number;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

class Logger {
  private service: string;
  private environment: string;
  private hostname: string;

  constructor() {
    this.service = process.env.SERVICE_NAME || 'nexaerp-backend';
    this.environment = process.env.NODE_ENV || 'development';
    this.hostname = process.env.HOSTNAME || 'localhost';
  }

  /**
   * Create structured log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      '@timestamp': new Date().toISOString(),
      level,
      message,
      service: this.service,
      environment: this.environment,
      hostname: this.hostname,
      pid: process.pid,
    };

    if (context) {
      entry.correlation_id = context.correlationId || uuidv4();
      entry.context = this.sanitizeContext(context);
    }

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    return entry;
  }

  /**
   * Sanitize context to remove sensitive data
   */
  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sanitized = { ...context };
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'apiKey',
      'api_key',
      'authorization',
      'cookie',
      'creditCard',
      'credit_card',
      'ssn',
    ];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Write log entry to output
   */
  private write(entry: LogEntry): void {
    const output = JSON.stringify(entry);

    switch (entry.level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(output);
        break;
    }
  }

  /**
   * Log debug message
   */
  public debug(message: string, context?: Record<string, any>): void {
    if (this.environment === 'production') return; // Skip debug logs in production
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    this.write(entry);
  }

  /**
   * Log info message
   */
  public info(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    this.write(entry);
  }

  /**
   * Log warning message
   */
  public warn(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    this.write(entry);
  }

  /**
   * Log error message
   */
  public error(message: string, error?: Error, context?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
    this.write(entry);
  }

  /**
   * Log fatal error message
   */
  public fatal(message: string, error?: Error, context?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.FATAL, message, context, error);
    this.write(entry);
  }

  /**
   * Create child logger with additional context
   */
  public child(context: Record<string, any>): ChildLogger {
    return new ChildLogger(this, context);
  }
}

/**
 * Child logger with inherited context
 */
class ChildLogger {
  constructor(
    private parent: Logger,
    private context: Record<string, any>
  ) {}

  public debug(message: string, additionalContext?: Record<string, any>): void {
    this.parent.debug(message, { ...this.context, ...additionalContext });
  }

  public info(message: string, additionalContext?: Record<string, any>): void {
    this.parent.info(message, { ...this.context, ...additionalContext });
  }

  public warn(message: string, additionalContext?: Record<string, any>): void {
    this.parent.warn(message, { ...this.context, ...additionalContext });
  }

  public error(message: string, error?: Error, additionalContext?: Record<string, any>): void {
    this.parent.error(message, error, { ...this.context, ...additionalContext });
  }

  public fatal(message: string, error?: Error, additionalContext?: Record<string, any>): void {
    this.parent.fatal(message, error, { ...this.context, ...additionalContext });
  }
}

// Export singleton instance
export const logger = new Logger();
