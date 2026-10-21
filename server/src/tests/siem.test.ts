/**
 * SIEM Integration Tests
 * Tests for security event logging, structured logging, and correlation IDs
 */

import { siemService, SecurityEventType, SecuritySeverity } from '../services/SIEMService';
import { correlationIdMiddleware, getCorrelationId } from '../middleware/correlationId';
import {
  requestLogger,
  authenticationLogger,
  authorizationLogger,
  suspiciousActivityDetector,
} from '../middleware/securityLogging.middleware';
import { Request, Response, NextFunction } from 'express';

describe('SIEM Integration', () => {
  describe('SIEMService', () => {
    beforeEach(() => {
      // Clear console spies
      jest.clearAllMocks();
    });

    it('should log security events with structured format', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      siemService.logSecurityEvent(
        SecurityEventType.AUTHENTICATION_SUCCESS,
        SecuritySeverity.INFO,
        'SUCCESS',
        'User logged in successfully',
        {
          userId: 'user-123',
          username: 'test@example.com',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          resource: '/api/auth/login',
          correlationId: 'corr-123',
        }
      );

      expect(consoleSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);

      expect(loggedData).toMatchObject({
        event_type: SecurityEventType.AUTHENTICATION_SUCCESS,
        severity: SecuritySeverity.INFO,
        result: 'SUCCESS',
        message: 'User logged in successfully',
        user: {
          id: 'user-123',
          username: 'test@example.com',
        },
        source: {
          ip: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
        },
        resource: '/api/auth/login',
        correlation_id: 'corr-123',
      });

      expect(loggedData['@timestamp']).toBeDefined();
      expect(loggedData.event_id).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('should sanitize sensitive data in metadata', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      siemService.logSecurityEvent(
        SecurityEventType.DATA_ACCESS,
        SecuritySeverity.INFO,
        'SUCCESS',
        'Data accessed',
        {
          userId: 'user-123',
          password: 'secret123',
          token: 'jwt-token-here',
          apiKey: 'api-key-here',
          normalField: 'visible-data',
        }
      );

      const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);

      expect(loggedData.metadata.password).toBe('[REDACTED]');
      expect(loggedData.metadata.token).toBe('[REDACTED]');
      expect(loggedData.metadata.apiKey).toBe('[REDACTED]');
      expect(loggedData.metadata.normalField).toBe('visible-data');

      consoleSpy.mockRestore();
    });

    it('should use appropriate log levels based on severity', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const infoSpy = jest.spyOn(console, 'info').mockImplementation();

      // Critical event should use console.error
      siemService.logSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        SecuritySeverity.CRITICAL,
        'FAILURE',
        'Critical security event'
      );
      expect(errorSpy).toHaveBeenCalled();

      // Medium event should use console.warn
      siemService.logSecurityEvent(
        SecurityEventType.AUTHORIZATION_FAILURE,
        SecuritySeverity.MEDIUM,
        'FAILURE',
        'Medium security event'
      );
      expect(warnSpy).toHaveBeenCalled();

      // Info event should use console.info
      siemService.logSecurityEvent(
        SecurityEventType.DATA_ACCESS,
        SecuritySeverity.INFO,
        'SUCCESS',
        'Info security event'
      );
      expect(infoSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
      warnSpy.mockRestore();
      infoSpy.mockRestore();
    });

    it('should provide helper methods for common events', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      siemService.logAuthenticationSuccess('user-123', 'test@example.com', {
        ipAddress: '192.168.1.1',
      });

      const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);
      expect(loggedData.event_type).toBe(SecurityEventType.AUTHENTICATION_SUCCESS);
      expect(loggedData.user.id).toBe('user-123');
      expect(loggedData.user.username).toBe('test@example.com');

      consoleSpy.mockRestore();
    });

    it('should log authentication failures', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      siemService.logAuthenticationFailure('test@example.com', 'Invalid password', {
        ipAddress: '192.168.1.1',
      });

      const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);
      expect(loggedData.event_type).toBe(SecurityEventType.AUTHENTICATION_FAILURE);
      expect(loggedData.severity).toBe(SecuritySeverity.MEDIUM);
      expect(loggedData.result).toBe('FAILURE');

      consoleSpy.mockRestore();
    });

    it('should log authorization failures', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      siemService.logAuthorizationFailure('user-123', '/api/admin/users', 'DELETE', {
        username: 'test@example.com',
      });

      const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);
      expect(loggedData.event_type).toBe(SecurityEventType.AUTHORIZATION_FAILURE);
      expect(loggedData.resource).toBe('/api/admin/users');
      expect(loggedData.action).toBe('DELETE');

      consoleSpy.mockRestore();
    });

    it('should log suspicious activity with threat indicators', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      siemService.logSuspiciousActivity('SQL injection attempt detected', SecuritySeverity.HIGH, {
        ipAddress: '192.168.1.1',
        threat: {
          type: 'SQL_INJECTION',
          score: 90,
          indicators: ['UNION SELECT', 'DROP TABLE'],
        },
      });

      const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);
      expect(loggedData.event_type).toBe(SecurityEventType.SUSPICIOUS_ACTIVITY);
      expect(loggedData.severity).toBe(SecuritySeverity.HIGH);
      expect(loggedData.threat.type).toBe('SQL_INJECTION');
      expect(loggedData.threat.score).toBe(90);

      consoleSpy.mockRestore();
    });

    it('should log sensitive data access with high severity', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      siemService.logSensitiveDataAccess('user-123', '/api/users/passwords', 'READ', {
        ipAddress: '192.168.1.1',
      });

      const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);
      expect(loggedData.event_type).toBe(SecurityEventType.SENSITIVE_DATA_ACCESS);
      expect(loggedData.severity).toBe(SecuritySeverity.HIGH);

      consoleSpy.mockRestore();
    });

    it('should log configuration changes', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      siemService.logConfigurationChange('admin-123', 'MAX_LOGIN_ATTEMPTS', 3, 5, {
        ipAddress: '192.168.1.1',
      });

      const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);
      expect(loggedData.event_type).toBe(SecurityEventType.CONFIGURATION_CHANGE);
      expect(loggedData.severity).toBe(SecuritySeverity.HIGH);

      consoleSpy.mockRestore();
    });
  });

  describe('Correlation ID Middleware', () => {
    it('should generate correlation ID if not present', () => {
      const req = {
        headers: {},
      } as Request;
      const res = {
        setHeader: jest.fn(),
        locals: {},
      } as unknown as Response;
      const next = jest.fn();

      correlationIdMiddleware(req, res, next);

      expect((req as any).correlationId).toBeDefined();
      expect((req as any).correlationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', (req as any).correlationId);
      expect(next).toHaveBeenCalled();
    });

    it('should use existing correlation ID from headers', () => {
      const existingId = 'existing-correlation-id';
      const req = {
        headers: {
          'x-correlation-id': existingId,
        },
      } as Request;
      const res = {
        setHeader: jest.fn(),
        locals: {},
      } as unknown as Response;
      const next = jest.fn();

      correlationIdMiddleware(req, res, next);

      expect((req as any).correlationId).toBe(existingId);
      expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', existingId);
    });

    it('should provide getCorrelationId helper', () => {
      const req = {
        correlationId: 'test-correlation-id',
      } as any;

      expect(getCorrelationId(req)).toBe('test-correlation-id');
    });

    it('should return "unknown" if correlation ID not set', () => {
      const req = {} as any;

      expect(getCorrelationId(req)).toBe('unknown');
    });
  });

  describe('Security Logging Middleware', () => {
    describe('requestLogger', () => {
      it('should log sensitive route access', (done) => {
        const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

        const req = {
          path: '/api/auth/login',
          method: 'POST',
          headers: {},
          query: {},
          body: { email: 'test@example.com' },
          correlationId: 'test-corr-id',
          socket: { remoteAddress: '192.168.1.1' },
        } as any;

        const res = {
          statusCode: 200,
          end: jest.fn((chunk, encoding, callback) => {
            // Verify logging occurred
            expect(consoleSpy).toHaveBeenCalled();
            const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);
            expect(loggedData.resource).toBe('/api/auth/login');
            expect(loggedData.action).toBe('POST');
            expect(loggedData.correlation_id).toBe('test-corr-id');

            consoleSpy.mockRestore();
            done();
            return res;
          }),
        } as any;

        const next = jest.fn();

        requestLogger(req, res, next);
        expect(next).toHaveBeenCalled();

        // Simulate response end
        res.end();
      });

      it('should sanitize sensitive fields in request body', (done) => {
        const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

        const req = {
          path: '/api/auth/login',
          method: 'POST',
          headers: {},
          query: {},
          body: {
            email: 'test@example.com',
            password: 'secret123',
            token: 'jwt-token',
          },
          correlationId: 'test-corr-id',
          socket: { remoteAddress: '192.168.1.1' },
        } as any;

        const res = {
          statusCode: 200,
          end: jest.fn((chunk, encoding, callback) => {
            const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);
            expect(loggedData.metadata.body.password).toBe('[REDACTED]');
            expect(loggedData.metadata.body.token).toBe('[REDACTED]');
            expect(loggedData.metadata.body.email).toBe('test@example.com');

            consoleSpy.mockRestore();
            done();
            return res;
          }),
        } as any;

        const next = jest.fn();

        requestLogger(req, res, next);
        res.end();
      });
    });

    describe('suspiciousActivityDetector', () => {
      it('should detect SQL injection attempts', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const req = {
          path: '/api/users',
          method: 'GET',
          headers: {},
          query: { id: "1 OR 1=1" },
          body: {},
          correlationId: 'test-corr-id',
          socket: { remoteAddress: '192.168.1.1' },
        } as any;

        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        } as any;

        const next = jest.fn();

        suspiciousActivityDetector(req, res, next);

        expect(consoleSpy).toHaveBeenCalled();
        const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);
        expect(loggedData.event_type).toBe(SecurityEventType.SUSPICIOUS_ACTIVITY);
        expect(loggedData.threat.indicators).toContain('SQL_INJECTION');

        // Should block the request
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
      });

      it('should detect XSS attempts', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const req = {
          path: '/api/comments',
          method: 'POST',
          headers: {},
          query: {},
          body: { comment: '<script>alert("XSS")</script>' },
          correlationId: 'test-corr-id',
          socket: { remoteAddress: '192.168.1.1' },
        } as any;

        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        } as any;

        const next = jest.fn();

        suspiciousActivityDetector(req, res, next);

        expect(consoleSpy).toHaveBeenCalled();
        const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);
        expect(loggedData.threat.indicators).toContain('XSS');

        // XSS should be logged but not blocked
        expect(next).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });

      it('should detect path traversal attempts', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const req = {
          path: '/api/files/../../../etc/passwd',
          method: 'GET',
          headers: {},
          query: {},
          body: {},
          correlationId: 'test-corr-id',
          socket: { remoteAddress: '192.168.1.1' },
        } as any;

        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        } as any;

        const next = jest.fn();

        suspiciousActivityDetector(req, res, next);

        expect(consoleSpy).toHaveBeenCalled();
        const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);
        expect(loggedData.threat.indicators).toContain('PATH_TRAVERSAL');

        // Should block the request
        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
      });

      it('should detect suspicious user agents', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const req = {
          path: '/api/users',
          method: 'GET',
          headers: { 'user-agent': 'sqlmap/1.0' },
          query: {},
          body: {},
          correlationId: 'test-corr-id',
          socket: { remoteAddress: '192.168.1.1' },
        } as any;

        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        } as any;

        const next = jest.fn();

        suspiciousActivityDetector(req, res, next);

        expect(consoleSpy).toHaveBeenCalled();
        const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);
        expect(loggedData.threat.indicators).toContain('SUSPICIOUS_USER_AGENT');

        consoleSpy.mockRestore();
      });

      it('should allow normal requests', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const req = {
          path: '/api/users',
          method: 'GET',
          headers: { 'user-agent': 'Mozilla/5.0' },
          query: { page: '1', limit: '10' },
          body: {},
          correlationId: 'test-corr-id',
          socket: { remoteAddress: '192.168.1.1' },
        } as any;

        const res = {} as any;
        const next = jest.fn();

        suspiciousActivityDetector(req, res, next);

        expect(consoleSpy).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });
  });

  describe('Structured Logging Format', () => {
    it('should include all required fields in structured logs', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      siemService.logSecurityEvent(
        SecurityEventType.DATA_ACCESS,
        SecuritySeverity.INFO,
        'SUCCESS',
        'Test event',
        {
          userId: 'user-123',
          username: 'test@example.com',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          resource: '/api/test',
          action: 'GET',
          correlationId: 'corr-123',
          sessionId: 'session-123',
          tenantId: 'tenant-123',
        }
      );

      const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);

      // Verify all required fields
      expect(loggedData['@timestamp']).toBeDefined();
      expect(loggedData.event_id).toBeDefined();
      expect(loggedData.correlation_id).toBe('corr-123');
      expect(loggedData.event_type).toBe(SecurityEventType.DATA_ACCESS);
      expect(loggedData.severity).toBe(SecuritySeverity.INFO);
      expect(loggedData.result).toBe('SUCCESS');
      expect(loggedData.message).toBe('Test event');
      expect(loggedData.user.id).toBe('user-123');
      expect(loggedData.user.username).toBe('test@example.com');
      expect(loggedData.source.ip).toBe('192.168.1.1');
      expect(loggedData.source.user_agent).toBe('Mozilla/5.0');
      expect(loggedData.resource).toBe('/api/test');
      expect(loggedData.action).toBe('GET');
      expect(loggedData.session_id).toBe('session-123');
      expect(loggedData.tenant_id).toBe('tenant-123');

      consoleSpy.mockRestore();
    });

    it('should format timestamps in ISO 8601 format', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      siemService.logSecurityEvent(
        SecurityEventType.DATA_ACCESS,
        SecuritySeverity.INFO,
        'SUCCESS',
        'Test event'
      );

      const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);
      const timestamp = loggedData['@timestamp'];

      // Verify ISO 8601 format
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(timestamp).toISOString()).toBe(timestamp);

      consoleSpy.mockRestore();
    });
  });
});
