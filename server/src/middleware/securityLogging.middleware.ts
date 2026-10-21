/**
 * Security Logging Middleware Exports
 * Provides middleware functions for SIEM integration
 */

import { Request, Response, NextFunction } from 'express';
import { siemService, SecurityEventType, SecuritySeverity } from '../services/SIEMService';
import { CorrelationRequest, getCorrelationId } from './correlationId';
import { AuthRequest } from './auth';

interface SecurityLoggingRequest extends CorrelationRequest, AuthRequest {}

/**
 * Extract client IP address from request
 */
const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
};

/**
 * Determine if route is sensitive
 */
const isSensitiveRoute = (path: string): boolean => {
  const sensitivePatterns = [
    '/api/auth',
    '/api/users',
    '/api/admin',
    '/api/settings',
    '/api/encryption',
    '/api/keys',
    '/api/audit',
    '/api/roles',
    '/api/permissions',
  ];

  return sensitivePatterns.some((pattern) => path.startsWith(pattern));
};

/**
 * Request logger middleware - logs all HTTP requests
 */
export const requestLogger = (req: SecurityLoggingRequest, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const correlationId = getCorrelationId(req);
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Capture original end function
  const originalEnd = res.end;

  // Override end function to log after response
  res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log security-relevant requests
    if (isSensitiveRoute(req.path) || statusCode >= 400) {
      const metadata = {
        correlationId,
        userId: req.user?.userId,
        username: req.user?.email,
        ipAddress,
        userAgent,
        resource: req.path,
        action: req.method,
        statusCode,
        duration,
        query: req.query,
        body: sanitizeRequestBody(req.body),
      };

      // Determine event type and severity based on status code
      let eventType: SecurityEventType;
      let severity: SecuritySeverity;
      let result: 'SUCCESS' | 'FAILURE';

      if (statusCode >= 500) {
        eventType = SecurityEventType.SYSTEM_ERROR;
        severity = SecuritySeverity.HIGH;
        result = 'FAILURE';
      } else if (statusCode === 401) {
        eventType = SecurityEventType.AUTHENTICATION_FAILURE;
        severity = SecuritySeverity.MEDIUM;
        result = 'FAILURE';
      } else if (statusCode === 403) {
        eventType = SecurityEventType.AUTHORIZATION_FAILURE;
        severity = SecuritySeverity.MEDIUM;
        result = 'FAILURE';
      } else if (statusCode >= 400) {
        eventType = SecurityEventType.INVALID_INPUT;
        severity = SecuritySeverity.LOW;
        result = 'FAILURE';
      } else {
        eventType = SecurityEventType.DATA_ACCESS;
        severity = SecuritySeverity.INFO;
        result = 'SUCCESS';
      }

      siemService.logSecurityEvent(
        eventType,
        severity,
        result,
        `${req.method} ${req.path} - ${statusCode} (${duration}ms)`,
        metadata
      );
    }

    // Call original end function
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
};

/**
 * Authentication logger middleware - logs authentication attempts
 */
export const authenticationLogger = (
  req: SecurityLoggingRequest,
  res: Response,
  next: NextFunction
): void => {
  // Only log authentication routes
  if (!req.path.startsWith('/api/auth')) {
    return next();
  }

  const correlationId = getCorrelationId(req);
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Capture original json function
  const originalJson = res.json;

  res.json = function (body: any): Response {
    // Log based on response
    if (req.path.includes('/login') || req.path.includes('/signin')) {
      if (body.success) {
        siemService.logAuthenticationSuccess(body.data?.userId || 'unknown', body.data?.email || 'unknown', {
          correlationId,
          ipAddress,
          userAgent,
          resource: req.path,
        });
      } else {
        siemService.logAuthenticationFailure(req.body?.email || 'unknown', body.message || 'Unknown error', {
          correlationId,
          ipAddress,
          userAgent,
          resource: req.path,
        });
      }
    }

    return originalJson.call(this, body);
  };

  next();
};

/**
 * Authorization logger middleware - logs authorization failures
 */
export const authorizationLogger = (
  req: SecurityLoggingRequest,
  res: Response,
  next: NextFunction
): void => {
  // Capture original status function
  const originalStatus = res.status;

  res.status = function (code: number): Response {
    if (code === 403 && req.user) {
      const correlationId = getCorrelationId(req);
      const ipAddress = getClientIp(req);
      const userAgent = req.headers['user-agent'] || 'unknown';

      siemService.logAuthorizationFailure(req.user.userId, req.path, req.method, {
        correlationId,
        username: req.user.email,
        ipAddress,
        userAgent,
      });
    }

    return originalStatus.call(this, code);
  };

  next();
};

/**
 * Suspicious activity detector middleware
 */
export const suspiciousActivityDetector = (
  req: SecurityLoggingRequest,
  res: Response,
  next: NextFunction
): void => {
  const correlationId = getCorrelationId(req);
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  const threats: string[] = [];

  // Check for SQL injection patterns
  const sqlInjectionPatterns = [
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
    /(;.*DROP\b.*TABLE)/i,
    /(;.*DELETE\b.*FROM)/i,
    /(;.*UPDATE\b.*SET)/i,
  ];

  const queryString = JSON.stringify(req.query) + JSON.stringify(req.body);
  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(queryString)) {
      threats.push('SQL_INJECTION');
      break;
    }
  }

  // Check for XSS patterns
  const xssPatterns = [/<script[^>]*>.*<\/script>/i, /javascript:/i, /onerror=/i, /onload=/i];

  for (const pattern of xssPatterns) {
    if (pattern.test(queryString)) {
      threats.push('XSS');
      break;
    }
  }

  // Check for path traversal
  if (/\.\.[\/\\]/.test(req.path) || /\.\.[\/\\]/.test(queryString)) {
    threats.push('PATH_TRAVERSAL');
  }

  // Check for suspicious user agents
  const suspiciousAgents = ['sqlmap', 'nikto', 'nmap', 'masscan', 'metasploit'];
  if (suspiciousAgents.some((agent) => userAgent.toLowerCase().includes(agent))) {
    threats.push('SUSPICIOUS_USER_AGENT');
  }

  // Log threats
  if (threats.length > 0) {
    siemService.logSuspiciousActivity(
      `Potential attack detected: ${threats.join(', ')}`,
      SecuritySeverity.HIGH,
      {
        correlationId,
        userId: req.user?.userId,
        username: req.user?.email,
        ipAddress,
        userAgent,
        resource: req.path,
        action: req.method,
        threat: {
          type: threats.join(','),
          score: threats.length * 25,
          indicators: threats,
        },
      }
    );

    // Block request if critical threat detected
    if (threats.includes('SQL_INJECTION') || threats.includes('PATH_TRAVERSAL')) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Suspicious activity detected',
      });
      return;
    }
  }

  next();
};

/**
 * Sanitize request body to remove sensitive data
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'creditCard',
    'credit_card',
    'ssn',
    'socialSecurity',
    'social_security',
  ];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}
