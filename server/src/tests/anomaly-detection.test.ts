/**
 * Anomaly Detection Tests
 * Task 38.6: Implement anomaly detection
 */

import { AnomalyDetectionService, AnomalyType, AnomalySeverity } from '../services/anomaly-detection.service';
import prisma from '../config/prisma';
import { redis } from '../config/redis';

describe('Anomaly Detection Service', () => {
  const testUserId = 'test-user-123';
  const testIpAddress = '192.168.1.100';
  const testUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0';

  beforeEach(async () => {
    // Clean up test data
    await redis.flushdb();
    
    // Create test user
    try {
      await prisma.user.upsert({
        where: { id: testUserId },
        update: {},
        create: {
          id: testUserId,
          email: 'test@example.com',
          username: 'testuser',
          password: 'hashedpassword',
          isActive: true,
        },
      });
    } catch (error) {
      // User might already exist
    }
  });

  afterAll(async () => {
    // Clean up
    await redis.quit();
    await prisma.$disconnect();
  });

  describe('Unusual Login Time Detection', () => {
    it('should detect login at unusual time (3 AM)', async () => {
      const timestamp = new Date('2024-01-15T03:00:00Z');

      const anomalies = await AnomalyDetectionService.analyzeUserActivity(testUserId, {
        ipAddress: testIpAddress,
        userAgent: testUserAgent,
        timestamp,
      });

      const timeAnomaly = anomalies.find(a => a.anomalyType === AnomalyType.UNUSUAL_LOGIN_TIME);
      expect(timeAnomaly).toBeDefined();
      expect(timeAnomaly?.isAnomaly).toBe(true);
      expect(timeAnomaly?.severity).toBe(AnomalySeverity.MEDIUM);
      expect(timeAnomaly?.score).toBeGreaterThan(70);
    });

    it('should not detect anomaly during business hours', async () => {
      const timestamp = new Date('2024-01-15T14:00:00Z'); // 2 PM

      const anomalies = await AnomalyDetectionService.analyzeUserActivity(testUserId, {
        ipAddress: testIpAddress,
        userAgent: testUserAgent,
        timestamp,
      });

      const timeAnomaly = anomalies.find(a => a.anomalyType === AnomalyType.UNUSUAL_LOGIN_TIME);
      expect(timeAnomaly?.isAnomaly).toBe(false);
    });
  });

  describe('Unusual IP Address Detection', () => {
    it('should detect access from new IP address', async () => {
      // Create user profile with known IPs
      const profile = {
        userId: testUserId,
        typicalIpAddresses: ['192.168.1.1', '192.168.1.2'],
        typicalLoginHours: [9, 10, 11, 12, 13, 14, 15, 16, 17],
        typicalUserAgents: [testUserAgent],
        typicalLocations: [],
        averageSessionDuration: 60,
        averageRequestsPerSession: 50,
        typicalResourcesAccessed: [],
        lastUpdated: new Date(),
      };

      await redis.setex(
        `user-profile:${testUserId}`,
        3600,
        JSON.stringify(profile)
      );

      const newIpAddress = '10.0.0.1';
      const anomalies = await AnomalyDetectionService.analyzeUserActivity(testUserId, {
        ipAddress: newIpAddress,
        userAgent: testUserAgent,
        timestamp: new Date(),
      });

      const ipAnomaly = anomalies.find(a => a.anomalyType === AnomalyType.UNUSUAL_IP_ADDRESS);
      expect(ipAnomaly).toBeDefined();
      expect(ipAnomaly?.isAnomaly).toBe(true);
      expect(ipAnomaly?.severity).toBe(AnomalySeverity.HIGH);
      expect(ipAnomaly?.score).toBeGreaterThan(80);
    });
  });

  describe('Suspicious User Agent Detection', () => {
    it('should detect bot user agent', async () => {
      const botUserAgent = 'curl/7.68.0';

      const anomalies = await AnomalyDetectionService.analyzeUserActivity(testUserId, {
        ipAddress: testIpAddress,
        userAgent: botUserAgent,
        timestamp: new Date(),
      });

      const uaAnomaly = anomalies.find(a => a.anomalyType === AnomalyType.SUSPICIOUS_USER_AGENT);
      expect(uaAnomaly).toBeDefined();
      expect(uaAnomaly?.isAnomaly).toBe(true);
      expect(uaAnomaly?.severity).toBe(AnomalySeverity.HIGH);
      expect(uaAnomaly?.score).toBeGreaterThan(85);
    });

    it('should detect scraper user agent', async () => {
      const scraperUserAgent = 'python-requests/2.28.0';

      const anomalies = await AnomalyDetectionService.analyzeUserActivity(testUserId, {
        ipAddress: testIpAddress,
        userAgent: scraperUserAgent,
        timestamp: new Date(),
      });

      const uaAnomaly = anomalies.find(a => a.anomalyType === AnomalyType.SUSPICIOUS_USER_AGENT);
      expect(uaAnomaly).toBeDefined();
      expect(uaAnomaly?.isAnomaly).toBe(true);
    });

    it('should not detect anomaly for normal user agent', async () => {
      const normalUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0';

      const anomalies = await AnomalyDetectionService.analyzeUserActivity(testUserId, {
        ipAddress: testIpAddress,
        userAgent: normalUserAgent,
        timestamp: new Date(),
      });

      const uaAnomaly = anomalies.find(a => a.anomalyType === AnomalyType.SUSPICIOUS_USER_AGENT);
      expect(uaAnomaly?.isAnomaly).toBe(false);
    });
  });

  describe('Rapid Requests Detection', () => {
    it('should detect rapid requests (potential DDoS)', async () => {
      // Simulate 150 requests in 1 minute
      for (let i = 0; i < 150; i++) {
        await redis.incr(`request-count:${testUserId}:${testIpAddress}`);
      }

      const anomalies = await AnomalyDetectionService.analyzeUserActivity(testUserId, {
        ipAddress: testIpAddress,
        userAgent: testUserAgent,
        timestamp: new Date(),
      });

      const rapidAnomaly = anomalies.find(a => a.anomalyType === AnomalyType.RAPID_REQUESTS);
      expect(rapidAnomaly).toBeDefined();
      expect(rapidAnomaly?.isAnomaly).toBe(true);
      expect(rapidAnomaly?.severity).toBe(AnomalySeverity.CRITICAL);
      expect(rapidAnomaly?.score).toBeGreaterThan(90);
    });

    it('should not detect anomaly for normal request rate', async () => {
      // Simulate 50 requests in 1 minute
      for (let i = 0; i < 50; i++) {
        await redis.incr(`request-count:${testUserId}:${testIpAddress}`);
      }

      const anomalies = await AnomalyDetectionService.analyzeUserActivity(testUserId, {
        ipAddress: testIpAddress,
        userAgent: testUserAgent,
        timestamp: new Date(),
      });

      const rapidAnomaly = anomalies.find(a => a.anomalyType === AnomalyType.RAPID_REQUESTS);
      expect(rapidAnomaly?.isAnomaly).toBe(false);
    });
  });

  describe('Failed Login Attempts Detection', () => {
    it('should detect multiple failed login attempts', async () => {
      // Create failed login events
      const fifteenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      for (let i = 0; i < 6; i++) {
        await prisma.securityEvent.create({
          data: {
            eventType: 'LOGIN_FAILURE',
            category: 'AUTHENTICATION',
            severity: 'MEDIUM',
            userId: testUserId,
            ipAddress: testIpAddress,
            userAgent: testUserAgent,
            resource: '/api/auth/login',
            action: 'LOGIN',
            outcome: 'FAILURE',
            success: false,
            timestamp: fifteenMinutesAgo,
            message: 'Invalid credentials',
          },
        });
      }

      const result = await AnomalyDetectionService.detectFailedLoginAttempts(
        testUserId,
        testIpAddress
      );

      expect(result.isAnomaly).toBe(true);
      expect(result.anomalyType).toBe(AnomalyType.MULTIPLE_FAILED_LOGINS);
      expect(result.severity).toBe(AnomalySeverity.HIGH);
      expect(result.score).toBeGreaterThan(85);
    });

    it('should not detect anomaly for few failed attempts', async () => {
      // Create only 2 failed login events
      const fifteenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      for (let i = 0; i < 2; i++) {
        await prisma.securityEvent.create({
          data: {
            eventType: 'LOGIN_FAILURE',
            category: 'AUTHENTICATION',
            severity: 'MEDIUM',
            userId: testUserId,
            ipAddress: testIpAddress,
            userAgent: testUserAgent,
            resource: '/api/auth/login',
            action: 'LOGIN',
            outcome: 'FAILURE',
            success: false,
            timestamp: fifteenMinutesAgo,
            message: 'Invalid credentials',
          },
        });
      }

      const result = await AnomalyDetectionService.detectFailedLoginAttempts(
        testUserId,
        testIpAddress
      );

      expect(result.isAnomaly).toBe(false);
    });
  });

  describe('Data Exfiltration Detection', () => {
    it('should detect potential data exfiltration', async () => {
      const recordsAccessed = 1500;
      const timeWindowMinutes = 10;

      const result = await AnomalyDetectionService.detectDataExfiltration(
        testUserId,
        recordsAccessed,
        timeWindowMinutes
      );

      expect(result.isAnomaly).toBe(true);
      expect(result.anomalyType).toBe(AnomalyType.DATA_EXFILTRATION);
      expect(result.severity).toBe(AnomalySeverity.CRITICAL);
      expect(result.score).toBe(100);
    });

    it('should not detect anomaly for normal data access', async () => {
      const recordsAccessed = 500;
      const timeWindowMinutes = 10;

      const result = await AnomalyDetectionService.detectDataExfiltration(
        testUserId,
        recordsAccessed,
        timeWindowMinutes
      );

      expect(result.isAnomaly).toBe(false);
    });
  });

  describe('Privilege Escalation Detection', () => {
    it('should detect privilege escalation attempts', async () => {
      // Create multiple unauthorized access attempts
      const oneHourAgo = new Date(Date.now() - 30 * 60 * 1000);

      for (let i = 0; i < 4; i++) {
        await prisma.securityEvent.create({
          data: {
            eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
            category: 'AUTHORIZATION',
            severity: 'HIGH',
            userId: testUserId,
            ipAddress: testIpAddress,
            userAgent: testUserAgent,
            resource: '/api/admin/users',
            action: 'DELETE',
            outcome: 'FAILURE',
            success: false,
            timestamp: oneHourAgo,
            message: 'Unauthorized access attempt',
          },
        });
      }

      const result = await AnomalyDetectionService.detectPrivilegeEscalation(
        testUserId,
        'DELETE',
        '/api/admin/users'
      );

      expect(result.isAnomaly).toBe(true);
      expect(result.anomalyType).toBe(AnomalyType.PRIVILEGE_ESCALATION);
      expect(result.severity).toBe(AnomalySeverity.CRITICAL);
      expect(result.score).toBeGreaterThan(90);
    });
  });

  describe('Automated Response', () => {
    it('should lock account for CRITICAL anomaly', async () => {
      const criticalAnomaly = {
        isAnomaly: true,
        anomalyType: AnomalyType.DATA_EXFILTRATION,
        severity: AnomalySeverity.CRITICAL,
        score: 100,
        reason: 'Potential data exfiltration detected',
      };

      await AnomalyDetectionService.respondToAnomaly(testUserId, criticalAnomaly);

      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });

      expect(user?.isActive).toBe(false);
      expect(user?.lockedUntil).toBeDefined();
    });

    it('should require MFA for HIGH anomaly', async () => {
      const highAnomaly = {
        isAnomaly: true,
        anomalyType: AnomalyType.UNUSUAL_IP_ADDRESS,
        severity: AnomalySeverity.HIGH,
        score: 85,
        reason: 'Access from new IP address',
      };

      await AnomalyDetectionService.respondToAnomaly(testUserId, highAnomaly);

      const mfaRequired = await redis.get(`require-mfa:${testUserId}`);
      expect(mfaRequired).toBe('1');
    });
  });

  describe('Statistics', () => {
    it('should return anomaly statistics', async () => {
      // Create some anomaly events
      await prisma.securityEvent.create({
        data: {
          eventType: AnomalyType.UNUSUAL_LOGIN_TIME,
          category: 'ANOMALY_DETECTED',
          severity: 'MEDIUM',
          userId: testUserId,
          ipAddress: testIpAddress,
          userAgent: testUserAgent,
          resource: '/api/auth/login',
          action: 'LOGIN',
          outcome: 'SUCCESS',
          success: true,
          timestamp: new Date(),
          message: 'Unusual login time detected',
        },
      });

      const stats = await AnomalyDetectionService.getStatistics(7);

      expect(stats.totalAnomalies).toBeGreaterThan(0);
      expect(stats.anomaliesByType).toBeDefined();
      expect(stats.anomaliesBySeverity).toBeDefined();
      expect(stats.topAffectedUsers).toBeDefined();
    });
  });

  describe('User Behavior Profile', () => {
    it('should update user behavior profile', async () => {
      await AnomalyDetectionService.updateUserBehaviorProfile(testUserId);

      // Profile should be cleared from cache
      const cached = await redis.get(`user-profile:${testUserId}`);
      expect(cached).toBeNull();
    });
  });
});
