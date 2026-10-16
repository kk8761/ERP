/**
 * Device Trust Service
 * Manages trusted devices and device verification for zero-trust security
 * Task 38.1: Device trust verification
 */

import prisma from '../config/prisma';
import { redis } from '../config/redis';
import crypto from 'crypto';

export interface DeviceInfo {
  userAgent: string;
  ipAddress: string;
  acceptLanguage?: string;
  acceptEncoding?: string;
}

export interface DeviceTrustResult {
  deviceId: string;
  trustScore: number;
  isRegistered: boolean;
  isTrusted: boolean;
  requiresVerification: boolean;
  lastUsedAt?: Date;
}

/**
 * Device Trust Service
 */
export class DeviceTrustService {
  /**
   * Generate device fingerprint from device characteristics
   */
  static generateDeviceFingerprint(deviceInfo: DeviceInfo): string {
    const { userAgent, acceptLanguage = '', acceptEncoding = '' } = deviceInfo;
    
    const fingerprint = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
    
    return crypto
      .createHash('sha256')
      .update(fingerprint)
      .digest('hex');
  }

  /**
   * Verify device trust and calculate trust score
   */
  static async verifyDeviceTrust(
    userId: string,
    deviceInfo: DeviceInfo
  ): Promise<DeviceTrustResult> {
    const deviceId = this.generateDeviceFingerprint(deviceInfo);
    
    // Check if device is registered
    const registeredDevice = await prisma.trustedDevice.findUnique({
      where: { deviceId },
    });

    if (!registeredDevice) {
      // New device - low trust score
      return {
        deviceId,
        trustScore: 20,
        isRegistered: false,
        isTrusted: false,
        requiresVerification: true,
      };
    }

    // Calculate trust score
    const trustScore = await this.calculateDeviceTrustScore(
      registeredDevice,
      deviceInfo.ipAddress
    );

    // Update last used timestamp
    await prisma.trustedDevice.update({
      where: { deviceId },
      data: {
        lastUsedAt: new Date(),
        ipAddress: deviceInfo.ipAddress,
        trustScore,
      },
    });

    return {
      deviceId,
      trustScore,
      isRegistered: true,
      isTrusted: registeredDevice.isTrusted,
      requiresVerification: trustScore < 50,
      lastUsedAt: registeredDevice.lastUsedAt,
    };
  }

  /**
   * Calculate device trust score based on multiple factors
   */
  private static async calculateDeviceTrustScore(
    device: any,
    currentIpAddress: string
  ): Promise<number> {
    let trustScore = 0;

    // Factor 1: Device is registered (40 points)
    trustScore += 40;

    // Factor 2: Device has been used recently (20 points)
    const daysSinceLastUse = Math.floor(
      (Date.now() - device.lastUsedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastUse < 7) {
      trustScore += 20;
    } else if (daysSinceLastUse < 30) {
      trustScore += 10;
    }

    // Factor 3: Device IP matches known IP (20 points)
    if (device.ipAddress === currentIpAddress) {
      trustScore += 20;
    }

    // Factor 4: Device is explicitly trusted by user (20 points)
    if (device.isTrusted) {
      trustScore += 20;
    }

    return Math.min(trustScore, 100);
  }

  /**
   * Register a new trusted device
   */
  static async registerDevice(
    userId: string,
    deviceInfo: DeviceInfo,
    deviceName?: string,
    isTrusted: boolean = false
  ): Promise<void> {
    const deviceId = this.generateDeviceFingerprint(deviceInfo);

    await prisma.trustedDevice.upsert({
      where: { deviceId },
      create: {
        deviceId,
        userId,
        deviceName,
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
        isTrusted,
        trustScore: isTrusted ? 100 : 60,
        lastUsedAt: new Date(),
      },
      update: {
        lastUsedAt: new Date(),
        ipAddress: deviceInfo.ipAddress,
        isTrusted,
      },
    });

    // Clear cache
    await redis.del(`device-trust:${userId}:${deviceId}`);
  }

  /**
   * Mark device as explicitly trusted
   */
  static async trustDevice(userId: string, deviceId: string): Promise<void> {
    await prisma.trustedDevice.update({
      where: { deviceId },
      data: {
        isTrusted: true,
        trustScore: 100,
      },
    });

    // Clear cache
    await redis.del(`device-trust:${userId}:${deviceId}`);
  }

  /**
   * Revoke trust for a device
   */
  static async untrustDevice(userId: string, deviceId: string): Promise<void> {
    await prisma.trustedDevice.update({
      where: { deviceId },
      data: {
        isTrusted: false,
        trustScore: 20,
      },
    });

    // Clear cache
    await redis.del(`device-trust:${userId}:${deviceId}`);
  }

  /**
   * Remove a device from trusted devices
   */
  static async removeDevice(userId: string, deviceId: string): Promise<void> {
    await prisma.trustedDevice.delete({
      where: { deviceId },
    });

    // Clear cache
    await redis.del(`device-trust:${userId}:${deviceId}`);
  }

  /**
   * Get all trusted devices for a user
   */
  static async getUserDevices(userId: string) {
    return await prisma.trustedDevice.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  /**
   * Clean up old devices (not used in 90+ days)
   */
  static async cleanupOldDevices(): Promise<number> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const result = await prisma.trustedDevice.deleteMany({
      where: {
        lastUsedAt: { lt: ninetyDaysAgo },
        isTrusted: false, // Don't delete explicitly trusted devices
      },
    });

    return result.count;
  }
}

/**
 * IP Blocking Service
 */
export class IPBlockingService {
  /**
   * Check if an IP address is blocked
   */
  static async isIPBlocked(ipAddress: string): Promise<boolean> {
    const cacheKey = `blocked-ip:${ipAddress}`;
    const cached = await redis.get(cacheKey);

    if (cached !== null) {
      return cached === '1';
    }

    // Check database for blocked IPs
    const blockedIP = await prisma.blockedIP.findFirst({
      where: {
        ipAddress,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    const isBlocked = !!blockedIP;

    // Cache result for 5 minutes
    await redis.setex(cacheKey, 300, isBlocked ? '1' : '0');

    return isBlocked;
  }

  /**
   * Block an IP address
   */
  static async blockIP(
    ipAddress: string,
    reason: string,
    blockedBy: string,
    expiresAt?: Date
  ): Promise<void> {
    await prisma.blockedIP.create({
      data: {
        ipAddress,
        reason,
        blockedBy,
        expiresAt,
        isActive: true,
      },
    });

    // Clear cache
    await redis.del(`blocked-ip:${ipAddress}`);
  }

  /**
   * Unblock an IP address
   */
  static async unblockIP(ipAddress: string): Promise<void> {
    await prisma.blockedIP.updateMany({
      where: { ipAddress },
      data: { isActive: false },
    });

    // Clear cache
    await redis.del(`blocked-ip:${ipAddress}`);
  }

  /**
   * Get all blocked IPs
   */
  static async getBlockedIPs() {
    return await prisma.blockedIP.findMany({
      where: { isActive: true },
      orderBy: { blockedAt: 'desc' },
    });
  }

  /**
   * Clean up expired IP blocks
   */
  static async cleanupExpiredBlocks(): Promise<number> {
    const result = await prisma.blockedIP.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        isActive: true,
      },
      data: { isActive: false },
    });

    return result.count;
  }
}

/**
 * Security Event Logging Service
 */
export class SecurityEventService {
  /**
   * Log a security event
   */
  static async logEvent(event: {
    userId: string;
    eventType: string;
    resource?: string;
    action?: string;
    ipAddress: string;
    deviceId?: string;
    deviceTrustScore?: number;
    riskScore?: number;
    success: boolean;
    errorMessage?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await prisma.securityEvent.create({
        data: {
          userId: event.userId,
          eventType: event.eventType,
          resource: event.resource,
          action: event.action,
          ipAddress: event.ipAddress,
          deviceId: event.deviceId,
          deviceTrustScore: event.deviceTrustScore,
          riskScore: event.riskScore,
          success: event.success,
          errorMessage: event.errorMessage,
          metadata: event.metadata,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Get security events for a user
   */
  static async getUserEvents(
    userId: string,
    limit: number = 100,
    eventType?: string
  ) {
    return await prisma.securityEvent.findMany({
      where: {
        userId,
        ...(eventType && { eventType }),
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Get failed access attempts
   */
  static async getFailedAccessAttempts(
    userId: string,
    since: Date
  ): Promise<number> {
    const count = await prisma.securityEvent.count({
      where: {
        userId,
        success: false,
        timestamp: { gte: since },
        eventType: {
          in: [
            'ZERO_TRUST_VERIFICATION',
            'CONTINUOUS_AUTHORIZATION_FAILURE',
            'UNAUTHORIZED_ACCESS_ATTEMPT',
          ],
        },
      },
    });

    return count;
  }

  /**
   * Detect anomalous activity patterns
   */
  static async detectAnomalies(userId: string): Promise<any[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get recent events
    const events = await prisma.securityEvent.findMany({
      where: {
        userId,
        timestamp: { gte: oneDayAgo },
      },
      orderBy: { timestamp: 'desc' },
    });

    const anomalies: any[] = [];

    // Detect multiple failed attempts
    const failedAttempts = events.filter(e => !e.success).length;
    if (failedAttempts > 10) {
      anomalies.push({
        type: 'MULTIPLE_FAILED_ATTEMPTS',
        severity: 'HIGH',
        count: failedAttempts,
        message: `${failedAttempts} failed access attempts in the last 24 hours`,
      });
    }

    // Detect access from multiple IPs
    const uniqueIPs = new Set(events.map(e => e.ipAddress));
    if (uniqueIPs.size > 5) {
      anomalies.push({
        type: 'MULTIPLE_IP_ADDRESSES',
        severity: 'MEDIUM',
        count: uniqueIPs.size,
        message: `Access from ${uniqueIPs.size} different IP addresses in the last 24 hours`,
      });
    }

    // Detect high-risk score events
    const highRiskEvents = events.filter(e => e.riskScore && e.riskScore > 70);
    if (highRiskEvents.length > 5) {
      anomalies.push({
        type: 'HIGH_RISK_ACTIVITY',
        severity: 'HIGH',
        count: highRiskEvents.length,
        message: `${highRiskEvents.length} high-risk events detected in the last 24 hours`,
      });
    }

    return anomalies;
  }

  /**
   * Clean up old security events (keep for 90 days)
   */
  static async cleanupOldEvents(): Promise<number> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const result = await prisma.securityEvent.deleteMany({
      where: {
        timestamp: { lt: ninetyDaysAgo },
      },
    });

    return result.count;
  }
}
