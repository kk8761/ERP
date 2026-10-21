/**
 * SIEM Integration Usage Examples
 * Demonstrates how to use the SIEM service for security event logging
 */

import {
  siemService,
  SecurityEventType,
  SecuritySeverity,
} from '../src/services/SIEMService';

// ─────────────────────────────────────────────────────────────
// Example 1: Log Authentication Events
// ─────────────────────────────────────────────────────────────

function exampleAuthenticationLogging() {
  // Successful login
  const correlationId = siemService.logAuthenticationSuccess(
    'user-123',
    'john.doe@example.com',
    '192.168.1.100',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  );

  console.log(`Authentication logged with correlation ID: ${correlationId}`);

  // Failed login attempt
  siemService.logAuthenticationFailure(
    'john.doe@example.com',
    '192.168.1.100',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Invalid password',
    correlationId // Use same correlation ID to track the session
  );
}

// ─────────────────────────────────────────────────────────────
// Example 2: Log Authorization Failures
// ─────────────────────────────────────────────────────────────

function exampleAuthorizationLogging() {
  siemService.logAuthorizationFailure(
    'user-123',
    'john.doe@example.com',
    '/api/admin/users',
    'DELETE',
    '192.168.1.100'
  );
}

// ─────────────────────────────────────────────────────────────
// Example 3: Log Data Access
// ─────────────────────────────────────────────────────────────

function exampleDataAccessLogging() {
  siemService.logDataAccess(
    'user-123',
    'john.doe@example.com',
    'customers',
    'GET',
    150 // Number of records accessed
  );
}

// ─────────────────────────────────────────────────────────────
// Example 4: Log Data Modifications
// ─────────────────────────────────────────────────────────────

function exampleDataModificationLogging() {
  siemService.logDataModification(
    'user-123',
    'john.doe@example.com',
    'products',
    'UPDATE',
    'product-456',
    {
      price: { old: 99.99, new: 89.99 },
      stock: { old: 100, new: 95 },
    }
  );
}

// ─────────────────────────────────────────────────────────────
// Example 5: Log Suspicious Activity
// ─────────────────────────────────────────────────────────────

function exampleSuspiciousActivityLogging() {
  siemService.logSuspiciousActivity(
    SecurityEventType.SQL_INJECTION_ATTEMPT,
    'user-123',
    '192.168.1.100',
    'Potential SQL injection detected in search query',
    85, // Threat score (0-100)
    ['SQL_INJECTION', "Pattern: ' OR 1=1--"]
  );

  siemService.logSuspiciousActivity(
    SecurityEventType.BRUTE_FORCE_ATTEMPT,
    undefined, // Unknown user
    '192.168.1.100',
    'Multiple failed login attempts detected',
    90,
    ['BRUTE_FORCE', '10 attempts in 2 minutes']
  );
}

// ─────────────────────────────────────────────────────────────
// Example 6: Log Encryption Key Rotation
// ─────────────────────────────────────────────────────────────

function exampleKeyRotationLogging() {
  siemService.logKeyRotation(
    'key-789',
    'AES-256-GCM',
    'admin@example.com'
  );
}

// ─────────────────────────────────────────────────────────────
// Example 7: Custom Security Events
// ─────────────────────────────────────────────────────────────

function exampleCustomSecurityEvent() {
  siemService.logSecurityEvent(
    SecurityEventType.CONFIGURATION_CHANGE,
    SecuritySeverity.HIGH,
    'SUCCESS',
    'System configuration updated: TLS version changed to 1.3',
    {
      userId: 'admin-001',
      username: 'admin@example.com',
      ipAddress: '192.168.1.1',
      resource: 'system-config',
      action: 'UPDATE',
      configKey: 'tls.minVersion',
      oldValue: '1.2',
      newValue: '1.3',
    }
  );
}

// ─────────────────────────────────────────────────────────────
// Example 8: Correlation ID Usage for Distributed Tracing
// ─────────────────────────────────────────────────────────────

function exampleCorrelationIdTracing() {
  // Start of a transaction
  const correlationId = siemService.logSecurityEvent(
    SecurityEventType.DATA_ACCESS,
    SecuritySeverity.INFO,
    'SUCCESS',
    'Order retrieval started',
    {
      userId: 'user-123',
      username: 'john.doe@example.com',
      resource: 'orders',
      action: 'GET',
    }
  );

  // Subsequent operations in the same transaction
  siemService.logSecurityEvent(
    SecurityEventType.DATA_ACCESS,
    SecuritySeverity.INFO,
    'SUCCESS',
    'Customer data retrieved for order',
    {
      userId: 'user-123',
      username: 'john.doe@example.com',
      resource: 'customers',
      action: 'GET',
      correlationId, // Link to the original transaction
    }
  );

  siemService.logSecurityEvent(
    SecurityEventType.DATA_ACCESS,
    SecuritySeverity.INFO,
    'SUCCESS',
    'Product data retrieved for order',
    {
      userId: 'user-123',
      username: 'john.doe@example.com',
      resource: 'products',
      action: 'GET',
      correlationId, // Link to the original transaction
    }
  );
}

// ─────────────────────────────────────────────────────────────
// Example 9: Geolocation and Threat Intelligence
// ─────────────────────────────────────────────────────────────

function exampleGeolocationAndThreat() {
  siemService.logSecurityEvent(
    SecurityEventType.AUTHENTICATION_SUCCESS,
    SecuritySeverity.INFO,
    'SUCCESS',
    'User logged in from new location',
    {
      userId: 'user-123',
      username: 'john.doe@example.com',
      ipAddress: '203.0.113.45',
      location: {
        country: 'United States',
        city: 'New York',
        latitude: 40.7128,
        longitude: -74.006,
      },
      threat: {
        type: 'NEW_LOCATION',
        score: 30,
        indicators: ['First login from this country'],
      },
    }
  );
}

// ─────────────────────────────────────────────────────────────
// Example 10: Integration with Express Middleware
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { CorrelationRequest } from '../src/middleware/correlationId';
import { AuthRequest } from '../src/middleware/auth';

interface SecurityRequest extends CorrelationRequest, AuthRequest {}

function exampleMiddlewareIntegration() {
  // Custom middleware to log sensitive operations
  const logSensitiveOperation = (
    req: SecurityRequest,
    res: Response,
    next: NextFunction
  ) => {
    const originalJson = res.json;

    res.json = function (data: any): Response {
      if (res.statusCode === 200 && req.user) {
        siemService.logSecurityEvent(
          SecurityEventType.DATA_EXPORT,
          SecuritySeverity.MEDIUM,
          'SUCCESS',
          `User exported ${req.path} data`,
          {
            userId: req.user.userId,
            username: req.user.email,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            resource: req.path,
            action: req.method,
            correlationId: req.correlationId,
            exportFormat: req.query.format || 'json',
            recordCount: Array.isArray(data.data) ? data.data.length : 1,
          }
        );
      }

      return originalJson.call(this, data);
    };

    next();
  };

  return logSensitiveOperation;
}

// ─────────────────────────────────────────────────────────────
// Example 11: Batch Event Logging
// ─────────────────────────────────────────────────────────────

function exampleBatchLogging() {
  // Log multiple events - they will be batched and sent to SIEM
  for (let i = 0; i < 50; i++) {
    siemService.logDataAccess(
      `user-${i}`,
      `user${i}@example.com`,
      'products',
      'GET',
      10
    );
  }

  // Events are automatically flushed when batch size is reached
  // or at the configured flush interval
}

// ─────────────────────────────────────────────────────────────
// Example 12: Critical Event Immediate Flush
// ─────────────────────────────────────────────────────────────

function exampleCriticalEventLogging() {
  // Critical events are flushed immediately to SIEM
  siemService.logSecurityEvent(
    SecurityEventType.ENCRYPTION_FAILURE,
    SecuritySeverity.CRITICAL,
    'FAILURE',
    'Failed to encrypt sensitive data',
    {
      userId: 'system',
      resource: 'customer-data',
      action: 'ENCRYPT',
      errorCode: 'ENC_001',
      errorMessage: 'Key not found',
    }
  );
}

// ─────────────────────────────────────────────────────────────
// Run Examples
// ─────────────────────────────────────────────────────────────

console.log('=== SIEM Integration Examples ===\n');

console.log('1. Authentication Logging:');
exampleAuthenticationLogging();

console.log('\n2. Authorization Logging:');
exampleAuthorizationLogging();

console.log('\n3. Data Access Logging:');
exampleDataAccessLogging();

console.log('\n4. Data Modification Logging:');
exampleDataModificationLogging();

console.log('\n5. Suspicious Activity Logging:');
exampleSuspiciousActivityLogging();

console.log('\n6. Key Rotation Logging:');
exampleKeyRotationLogging();

console.log('\n7. Custom Security Event:');
exampleCustomSecurityEvent();

console.log('\n8. Correlation ID Tracing:');
exampleCorrelationIdTracing();

console.log('\n9. Geolocation and Threat Intelligence:');
exampleGeolocationAndThreat();

console.log('\n11. Batch Logging:');
exampleBatchLogging();

console.log('\n12. Critical Event Logging:');
exampleCriticalEventLogging();

console.log('\n=== Examples Complete ===');
