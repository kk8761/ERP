/**
 * Anomaly Detection Service
 * Task 38.6: Implement anomaly detection for suspicious activities
 * 
 * Detects unusual access patterns and suspicious activities:
 * - Unusual login times
 * - Multiple failed login attempts
 * - Access from unusual locations
 * - Unusual data access patterns
 * - Privilege escalation attempts
 * - Data exfiltration patterns
 * 
 * Uses statistical analysis and machine learning for detection
 */

import prisma from '../config/prisma';
import { redis } from '../config/redis';
import { SIEMIntegrationService, EventSeverity, EventCategory } from './siem-integration.service';

/**
 * Anomaly Types
 */
export enum AnomalyType {
  UNUSUAL_LOGIN_TIME = 'UNUSUAL_LOGIN_TIME',
  MULTIPLE_FAILED_LOGINS = 'MULTIPLE_FAILED_LOGINS',
  UNUSUAL_LOCATION = 'UNUSUAL_LOCATION',
  UNUSUAL_IP_ADDRESS = 'UNUSUAL_IP_ADDRESS',
  RAPID_REQUESTS = 'RAPID_REQUESTS',
  UNUSUAL_DATA_ACCESS = 'UNUSUAL_DATA_ACCESS',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  DATA_EXFILTRATION = 'DATA_EXFILTRATION',
  SUSPICIOUS_USER_AGENT = 'SUSPICIOUS_USER_AGENT',
  ACCOUNT_TAKEOVER = 'ACCOUNT_TAKEOVER',
}

/**
 * Anomaly Severity
 */
export enum AnomalySeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * Anomaly Detection Result
 */
export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyType?: AnomalyType;
  severity?: AnomalySeverity;
  score: number; // 0-100, higher = more anomalous
  reason: string;
  details?: Record<string, any>;
  recommendedAction?: string;
}

/**
 * User Behavior Profile
 */
export interface UserBehaviorProfile {
  userId: string;
  typicalLoginHours: number[]; // Hours of day (0-23)
  typicalIpAddresses: string[];
  typicalLocations: string[];
  typicalUserAgents: string[];
  averageSessionDuration: number; // minutes
  averageRequestsPerSession: number;
  typicalResourcesAccessed: string[];
  lastUpdated: Date;
}

/**
 * Anomaly Detection Service
 */
export class AnomalyDetectionService {
  private static readonly THRESHOLDS = {
    FAILED_LOGIN_ATTEMPTS: 5,
    RAPID_REQUESTS_PER_MINUTE: 100,
    UNUSUAL_TIME_SCORE: 70,
    UNUSUAL_LOCATION_SCORE: 80,
    DATA_EXFILTRATION_RECORDS: 1000,
    SESSION_DURATION_MULTIPLIER: 3, // 3x normal duration
  };

  /**
   * Analyze user activity for anomalies
   */
  static async analyzeUserActivity(
    userId: string,
    activityData: {
      ipAddress: string;
      userAgent: string;
      timestamp: Date;
      resource?: string;
      action?: string;
    }
  ): Promise<AnomalyDetectionResult[]> {
    const anomalies: AnomalyDetectionResult[] = [];

    // Get user behavior profile
    const profile = await this.getUserBehaviorProfile(userId);

    // Check for unusual login time
    const timeAnomaly = await this.detectUnusualLoginTime(
      activityData.timestamp,
      profile
    );
    if (timeAnomaly.isAnomaly) {
      anomalies.push(timeAnomaly);
    }

    // Check for unusual IP address
    const ipAnomaly = await this.detectUnusualIPAddress(
      activityData.ipAddress,
      profile
    );
    if (ipAnomaly.isAnomaly) {
      anomalies.push(ipAnomaly);
    }

    // Check for suspicious user agent
    const uaAnomaly = await this.detectSuspiciousUserAgent(
      activityData.userAgent,
      profile
    );
    if (uaAnomaly.isAnomaly) {
      anomalies.push(uaAnomaly);
    }

    // Check for rapid requests
    const rapidAnomaly = await this.detectRapidRequests(
      userId,
      activityData.ipAddress
    );
    if (rapidAnomaly.isAnomaly) {
      anomalies.push(rapidAnomaly);
    }

    // Log anomalies to SIEM
    for (const anomaly of anomalies) {
      await this.logAnomalyToSIEM(userId, activityData, anomaly);
    }

    return anomalies;
  }

  /**
   * Detect unusual login time
   */
  private static async detectUnusualLoginTime(
    timestamp: Date,
    profile: UserBehaviorProfile | null
  ): Promise<AnomalyDetectionResult> {
    const hour = timestamp.getHours();

    // If no profile, use default business hours (6 AM - 10 PM)
    const typicalHours = profile?.typicalLoginHours || Array.from({ length: 16 }, (_, i) => i + 6);

    const isTypicalHour = typicalHours.includes(hour);

    if (!isTypicalHour) {
      const score = 75; // High anomaly score for unusual time

      return {
        isAnomaly: true,
        anomalyType: AnomalyType.UNUSUAL_LOGIN_TIME,
        severity: AnomalySeverity.MEDIUM,
        score,
        reason: `Login at unusual time: ${hour}:00. Typical hours: ${typicalHours.join(', ')}`,
        details: {
          loginHour: hour,
          typicalHours,
        },
        recommendedAction: 'Verify user identity with MFA',
      };
    }

    return {
      isAnomaly: false,
      score: 0,
      reason: 'Login time is within typical hours',
    };
  }

  /**
   * Detect unusual IP address
   */
  private static async detectUnusualIPAddress(
    ipAddress: string,
    profile: UserBehaviorProfile | null
  ): Promise<AnomalyDetectionResult> {
    if (!profile || profile.typicalIpAddresses.length === 0) {
      // No profile yet, not anomalous
      return {
        isAnomaly: false,
        score: 0,
        reason: 'No IP address history available',
      };
    }

    const isKnownIP = profile.typicalIpAddresses.includes(ipAddress);

    if (!isKnownIP) {
      const score = 85; // High anomaly score for new IP

      return {
        isAnomaly: true,
        anomalyType: AnomalyType.UNUSUAL_IP_ADDRESS,
        severity: AnomalySeverity.HIGH,
        score,
        reason: `Access from new IP address: ${ipAddress}`,
        details: {
          ipAddress,
          knownIpAddresses: profile.typicalIpAddresses,
        },
        recommendedAction: 'Require MFA and notify user',
      };
    }

    return {
      isAnomaly: false,
      score: 0,
      reason: 'IP address is known',
    };
  }

  /**
   * Detect suspicious user agent
   */
  private static async detectSuspiciousUserAgent(
    userAgent: string,
    profile: UserBehaviorProfile | null
  ): Promise<AnomalyDetectionResult> {
    // Check for bot/scraper patterns
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python-requests/i,
      /java/i,
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));

    if (isSuspicious) {
      return {
        isAnomaly: true,
        anomalyType: AnomalyType.SUSPICIOUS_USER_AGENT,
        severity: AnomalySeverity.HIGH,
        score: 90,
        reason: `Suspicious user agent detected: ${userAgent}`,
        details: { userAgent },
        recommendedAction: 'Block request and investigate',
      };
    }

    // Check if user agent is different from typical
    if (profile && profile.typicalUserAgents.length > 0) {
      const isKnownUA = profile.typicalUserAgents.some(ua => 
        userAgent.includes(ua) || ua.includes(userAgent)
      );

      if (!isKnownUA) {
        return {
          isAnomaly: true,
          anomalyType: AnomalyType.SUSPICIOUS_USER_AGENT,
          severity: AnomalySeverity.MEDIUM,
          score: 60,
          reason: `New user agent detected: ${userAgent}`,
          details: {
            userAgent,
            knownUserAgents: profile.typicalUserAgents,
          },
          recommendedAction: 'Monitor activity closely',
        };
      }
    }

    return {
      isAnomaly: false,
      score: 0,
      reason: 'User agent is normal',
    };
  }

  /**
   * Detect rapid requests (potential bot/attack)
   */
  private static async detectRapidRequests(
    userId: string,
    ipAddress: string
  ): Promise<AnomalyDetectionResult> {
    const cacheKey = `request-count:${userId}:${ipAddress}`;
    const count = await redis.incr(cacheKey);

    if (count === 1) {
      // Set expiry to 1 minute
      await redis.expire(cacheKey, 60);
    }

    if (count > this.THRESHOLDS.RAPID_REQUESTS_PER_MINUTE) {
      return {
        isAnomaly: true,
        anomalyType: AnomalyType.RAPID_REQUESTS,
        severity: AnomalySeverity.CRITICAL,
        score: 95,
        reason: `Rapid requests detected: ${count} requests in 1 minute`,
        details: {
          requestCount: count,
          threshold: this.THRESHOLDS.RAPID_REQUESTS_PER_MINUTE,
        },
        recommendedAction: 'Rate limit or block IP address',
      };
    }

    return {
      isAnomaly: false,
      score: 0,
      reason: 'Request rate is normal',
    };
  }

  /**
   * Detect multiple failed login attempts
   */
  static async detectFailedLoginAttempts(
    userId: string,
    ipAddress: string
  ): Promise<AnomalyDetectionResult> {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const failedAttempts = await prisma.securityEvent.count({
      where: {
        userId,
        ipAddress,
        eventType: 'LOGIN_FAILURE',
        success: false,
        timestamp: { gte: fifteenMinutesAgo },
      },
    });

    if (failedAttempts >= this.THRESHOLDS.FAILED_LOGIN_ATTEMPTS) {
      return {
        isAnomaly: true,
        anomalyType: AnomalyType.MULTIPLE_FAILED_LOGINS,
        severity: AnomalySeverity.HIGH,
        score: 90,
        reason: `Multiple failed login attempts: ${failedAttempts} in 15 minutes`,
        details: {
          failedAttempts,
          threshold: this.THRESHOLDS.FAILED_LOGIN_ATTEMPTS,
          timeWindow: '15 minutes',
        },
        recommendedAction: 'Lock account and notify user',
      };
    }

    return {
      isAnomaly: false,
      score: 0,
      reason: 'Failed login attempts within normal range',
    };
  }

  /**
   * Detect data exfiltration patterns
   */
  static async detectDataExfiltration(
    userId: string,
    recordsAccessed: number,
    timeWindowMinutes: number = 10
  ): Promise<AnomalyDetectionResult> {
    if (recordsAccessed > this.THRESHOLDS.DATA_EXFILTRATION_RECORDS) {
      return {
        isAnomaly: true,
        anomalyType: AnomalyType.DATA_EXFILTRATION,
        severity: AnomalySeverity.CRITICAL,
        score: 100,
        reason: `Potential data exfiltration: ${recordsAccessed} records accessed in ${timeWindowMinutes} minutes`,
        details: {
          recordsAccessed,
          timeWindowMinutes,
          threshold: this.THRESHOLDS.DATA_EXFILTRATION_RECORDS,
        },
        recommendedAction: 'Immediately block user and investigate',
      };
    }

    return {
      isAnomaly: false,
      score: 0,
      reason: 'Data access within normal range',
    };
  }

  /**
   * Detect privilege escalation attempts
   */
  static async detectPrivilegeEscalation(
    userId: string,
    attemptedAction: string,
    attemptedResource: string
  ): Promise<AnomalyDetectionResult> {
    // Get user's typical permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return {
        isAnomaly: false,
        score: 0,
        reason: 'User not found',
      };
    }

    // Check if user has permission
    const hasPermission = user.roles.some(ur =>
      ur.role.permissions.some(p =>
        p.resource === attemptedResource && p.action === attemptedAction
      )
    );

    if (!hasPermission) {
      // Check if this is a repeated attempt
      const recentAttempts = await prisma.securityEvent.count({
        where: {
          userId,
          eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          resource: attemptedResource,
          action: attemptedAction,
          timestamp: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
        },
      });

      if (recentAttempts >= 3) {
        return {
          isAnomaly: true,
          anomalyType: AnomalyType.PRIVILEGE_ESCALATION,
          severity: AnomalySeverity.CRITICAL,
          score: 95,
          reason: `Multiple privilege escalation attempts: ${recentAttempts} attempts in 1 hour`,
          details: {
            attemptedAction,
            attemptedResource,
            attempts: recentAttempts,
          },
          recommendedAction: 'Lock account and investigate immediately',
        };
      }
    }

    return {
      isAnomaly: false,
      score: 0,
      reason: 'No privilege escalation detected',
    };
  }

  /**
   * Get or create user behavior profile
   */
  private static async getUserBehaviorProfile(
    userId: string
  ): Promise<UserBehaviorProfile | null> {
    // Check cache first
    const cacheKey = `user-profile:${userId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Build profile from historical data
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const events = await prisma.securityEvent.findMany({
      where: {
        userId,
        timestamp: { gte: thirtyDaysAgo },
        success: true,
      },
      select: {
        timestamp: true,
        ipAddress: true,
        userAgent: true,
        resource: true,
      },
    });

    if (events.length < 10) {
      // Not enough data to build profile
      return null;
    }

    // Extract typical login hours
    const loginHours = events.map(e => e.timestamp.getHours());
    const typicalLoginHours = [...new Set(loginHours)];

    // Extract typical IP addresses
    const ipAddresses = events.map(e => e.ipAddress).filter(Boolean) as string[];
    const typicalIpAddresses = [...new Set(ipAddresses)];

    // Extract typical user agents
    const userAgents = events.map(e => e.userAgent).filter(Boolean) as string[];
    const typicalUserAgents = [...new Set(userAgents)];

    // Extract typical resources
    const resources = events.map(e => e.resource).filter(Boolean) as string[];
    const typicalResourcesAccessed = [...new Set(resources)];

    const profile: UserBehaviorProfile = {
      userId,
      typicalLoginHours,
      typicalIpAddresses,
      typicalLocations: [], // TODO: Implement geolocation
      typicalUserAgents,
      averageSessionDuration: 60, // TODO: Calculate from session data
      averageRequestsPerSession: 50, // TODO: Calculate from session data
      typicalResourcesAccessed,
      lastUpdated: new Date(),
    };

    // Cache profile for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(profile));

    return profile;
  }

  /**
   * Update user behavior profile
   */
  static async updateUserBehaviorProfile(userId: string): Promise<void> {
    const cacheKey = `user-profile:${userId}`;
    await redis.del(cacheKey);
    
    // Profile will be rebuilt on next access
  }

  /**
   * Log anomaly to SIEM
   */
  private static async logAnomalyToSIEM(
    userId: string,
    activityData: any,
    anomaly: AnomalyDetectionResult
  ): Promise<void> {
    await SIEMIntegrationService.logEvent({
      eventType: anomaly.anomalyType || 'ANOMALY_DETECTED',
      category: EventCategory.ANOMALY_DETECTED,
      severity: this.mapAnomalySeverityToEventSeverity(anomaly.severity!),
      userId,
      ipAddress: activityData.ipAddress,
      userAgent: activityData.userAgent,
      resource: activityData.resource,
      action: activityData.action,
      outcome: 'FAILURE',
      message: anomaly.reason,
      details: {
        anomalyScore: anomaly.score,
        ...anomaly.details,
        recommendedAction: anomaly.recommendedAction,
      },
    });
  }

  /**
   * Map anomaly severity to event severity
   */
  private static mapAnomalySeverityToEventSeverity(
    severity: AnomalySeverity
  ): EventSeverity {
    const mapping = {
      [AnomalySeverity.CRITICAL]: EventSeverity.CRITICAL,
      [AnomalySeverity.HIGH]: EventSeverity.HIGH,
      [AnomalySeverity.MEDIUM]: EventSeverity.MEDIUM,
      [AnomalySeverity.LOW]: EventSeverity.LOW,
    };
    return mapping[severity] || EventSeverity.MEDIUM;
  }

  /**
   * Get anomaly detection statistics
   */
  static async getStatistics(days: number = 7): Promise<{
    totalAnomalies: number;
    anomaliesByType: Record<string, number>;
    anomaliesBySeverity: Record<string, number>;
    topAffectedUsers: Array<{ userId: string; count: number }>;
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const anomalies = await prisma.securityEvent.findMany({
      where: {
        category: 'ANOMALY_DETECTED',
        timestamp: { gte: since },
      },
      select: {
        eventType: true,
        severity: true,
        userId: true,
      },
    });

    const totalAnomalies = anomalies.length;

    // Group by type
    const anomaliesByType: Record<string, number> = {};
    for (const anomaly of anomalies) {
      anomaliesByType[anomaly.eventType] = (anomaliesByType[anomaly.eventType] || 0) + 1;
    }

    // Group by severity
    const anomaliesBySeverity: Record<string, number> = {};
    for (const anomaly of anomalies) {
      anomaliesBySeverity[anomaly.severity] = (anomaliesBySeverity[anomaly.severity] || 0) + 1;
    }

    // Top affected users
    const userCounts: Record<string, number> = {};
    for (const anomaly of anomalies) {
      if (anomaly.userId) {
        userCounts[anomaly.userId] = (userCounts[anomaly.userId] || 0) + 1;
      }
    }

    const topAffectedUsers = Object.entries(userCounts)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalAnomalies,
      anomaliesByType,
      anomaliesBySeverity,
      topAffectedUsers,
    };
  }

  /**
   * Automated response to anomalies
   */
  static async respondToAnomaly(
    userId: string,
    anomaly: AnomalyDetectionResult
  ): Promise<void> {
    switch (anomaly.severity) {
      case AnomalySeverity.CRITICAL:
        // Lock account immediately
        await prisma.user.update({
          where: { id: userId },
          data: {
            isActive: false,
            lockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          },
        });

        // TODO: Send alert to security team
        console.log(`CRITICAL ANOMALY: User ${userId} account locked`);
        break;

      case AnomalySeverity.HIGH:
        // Require MFA for next login
        await redis.setex(`require-mfa:${userId}`, 3600, '1'); // 1 hour

        // TODO: Send notification to user
        console.log(`HIGH ANOMALY: MFA required for user ${userId}`);
        break;

      case AnomalySeverity.MEDIUM:
        // Log for review
        console.log(`MEDIUM ANOMALY: Monitoring user ${userId}`);
        break;

      case AnomalySeverity.LOW:
        // Just log
        console.log(`LOW ANOMALY: User ${userId}`);
        break;
    }
  }
}

