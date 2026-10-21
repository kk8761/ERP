/**
 * Zero-Trust Security Middleware
 * Implements Task 38.1: Zero-trust security with continuous authorization and device trust
 * 
 * Zero-Trust Principles:
 * 1. Never trust, always verify
 * 2. Verify explicitly on every request
 * 3. Use least privilege access
 * 4. Assume breach
 * 5. Verify device trust
 */

import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import prisma from '../config/prisma';
import crypto from 'crypto';
import { checkUserPermission } from './rbac.middleware';

/**
 * Device Trust Score Thresholds
 */
const DEVICE_TRUST_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 50,
  LOW: 30,
  BLOCKED: 0,
};

/**
 * Risk Score Thresholds
 */
const RISK_SCORE_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 60,
  HIGH: 80,
  CRITICAL: 100,
};

/**
 * Extended Request with Zero-Trust Context
 */
export interface ZeroTrustRequest extends Request {
  user?: any;
  zeroTrust?: {
    deviceId: string;
    deviceTrustScore: number;
    riskScore: number;
    ipAddress: string;
    location?: string;
    verified: boolean;
    requiresMFA: boolean;
  };
}

/**
 * Device Trust Verification
 * Calculates a trust score based on device characteristics
 */
export async function verifyDeviceTrust(req: ZeroTrustRequest): Promise<number> {
  const userAgent = req.headers['user-agent'] || '';
  const ipAddress = req.ip || req.socket.remoteAddress || '';
  
  // Generate device fingerprint
  const deviceId = generateDeviceFingerprint(req);
  
  // Check if device is registered
  const registeredDevice = await prisma.trustedDevice.findUnique({
    where: { deviceId },
  });

  let trustScore = 0;

  // Factor 1: Device is registered (40 points)
  if (registeredDevice) {
    trustScore += 40;
    
    // Factor 2: Device has been used recently (20 points)
    const daysSinceLastUse = Math.floor(
      (Date.now() - registeredDevice.lastUsedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastUse < 7) {
      trustScore += 20;
    } else if (daysSinceLastUse < 30) {
      trustScore += 10;
    }
    
    // Factor 3: Device IP matches known IP (20 points)
    if (registeredDevice.ipAddress === ipAddress) {
      trustScore += 20;
    }
    
    // Factor 4: Device is explicitly trusted by user (20 points)
    if (registeredDevice.isTrusted) {
      trustScore += 20;
    }
  } else {
    // New device - low trust score
    trustScore = 20;
  }

  return Math.min(trustScore, 100);
}

/**
 * Calculate Risk Score based on request context
 */
export async function calculateRiskScore(req: ZeroTrustRequest): Promise<number> {
  const ipAddress = req.ip || req.socket.remoteAddress || '';
  const userId = req.user?.id;
  
  let riskScore = 0;

  // Factor 1: Check for suspicious IP (30 points)
  const isBlockedIP = await checkBlockedIP(ipAddress);
  if (isBlockedIP) {
    riskScore += 30;
  }

  // Factor 2: Check for unusual access patterns (25 points)
  if (userId) {
    const isUnusualPattern = await detectUnusualAccessPattern(userId, ipAddress);
    if (isUnusualPattern) {
      riskScore += 25;
    }
  }

  // Factor 3: Check for rapid requests (20 points)
  const isRapidRequest = await detectRapidRequests(ipAddress);
  if (isRapidRequest) {
    riskScore += 20;
  }

  // Factor 4: Check for unusual time of access (15 points)
  const isUnusualTime = detectUnusualAccessTime();
  if (isUnusualTime) {
    riskScore += 15;
  }

  // Factor 5: Check for suspicious user agent (10 points)
  const isSuspiciousUA = detectSuspiciousUserAgent(req.headers['user-agent'] || '');
  if (isSuspiciousUA) {
    riskScore += 10;
  }

  return Math.min(riskScore, 100);
}

/**
 * Generate device fingerprint from request
 */
function generateDeviceFingerprint(req: Request): string {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  
  const fingerprint = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
  
  return crypto
    .createHash('sha256')
    .update(fingerprint)
    .digest('hex');
}

/**
 * Check if IP is in blocklist
 */
async function checkBlockedIP(ipAddress: string): Promise<boolean> {
  const cacheKey = `blocked-ip:${ipAddress}`;
  const cached = await redis.get(cacheKey);
  
  if (cached !== null) {
    return cached === '1';
  }

  // Check database for blocked IPs
  const blockedIP = await prisma.blockedIP.findUnique({
    where: { ipAddress },
  });

  const isBlocked = !!blockedIP;
  
  // Cache result for 5 minutes
  await redis.setex(cacheKey, 300, isBlocked ? '1' : '0');
  
  return isBlocked;
}

/**
 * Detect unusual access patterns
 */
async function detectUnusualAccessPattern(userId: string, ipAddress: string): Promise<boolean> {
  // Get user's typical IP addresses from last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const recentSessions = await prisma.session.findMany({
    where: {
      userId,
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { ipAddress: true },
    distinct: ['ipAddress'],
  });

  const knownIPs = recentSessions.map(s => s.ipAddress).filter(Boolean);
  
  // If current IP is not in known IPs, it's unusual
  return knownIPs.length > 0 && !knownIPs.includes(ipAddress);
}

/**
 * Detect rapid requests (potential bot/attack)
 */
async function detectRapidRequests(ipAddress: string): Promise<boolean> {
  const cacheKey = `request-count:${ipAddress}`;
  const count = await redis.incr(cacheKey);
  
  if (count === 1) {
    // Set expiry to 1 minute
    await redis.expire(cacheKey, 60);
  }
  
  // More than 100 requests per minute is suspicious
  return count > 100;
}

/**
 * Detect unusual access time (outside business hours)
 */
function detectUnusualAccessTime(): boolean {
  const hour = new Date().getHours();
  
  // Business hours: 6 AM to 10 PM
  return hour < 6 || hour > 22;
}

/**
 * Detect suspicious user agent
 */
function detectSuspiciousUserAgent(userAgent: string): boolean {
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Zero-Trust Authentication Middleware
 * Enforces authentication on EVERY request
 */
export const enforceZeroTrustAuth = async (
  req: ZeroTrustRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Verify user is authenticated
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'ZERO_TRUST_AUTH_REQUIRED',
      });
      return;
    }

    // 2. Verify session is still valid
    const sessionValid = await verifySessionValidity(req.user.id, req.sessionID);
    if (!sessionValid) {
      res.status(401).json({
        success: false,
        message: 'Session expired or invalid',
        code: 'ZERO_TRUST_SESSION_INVALID',
      });
      return;
    }

    // 3. Verify device trust
    const deviceTrustScore = await verifyDeviceTrust(req);
    
    // 4. Calculate risk score
    const riskScore = await calculateRiskScore(req);

    // 5. Store zero-trust context
    req.zeroTrust = {
      deviceId: generateDeviceFingerprint(req),
      deviceTrustScore,
      riskScore,
      ipAddress: req.ip || req.socket.remoteAddress || '',
      verified: true,
      requiresMFA: false,
    };

    // 6. Enforce trust thresholds
    if (deviceTrustScore < DEVICE_TRUST_THRESHOLDS.LOW) {
      res.status(403).json({
        success: false,
        message: 'Device not trusted. Please register your device.',
        code: 'ZERO_TRUST_DEVICE_UNTRUSTED',
        deviceTrustScore,
      });
      return;
    }

    // 7. Require MFA for high-risk requests
    if (riskScore >= RISK_SCORE_THRESHOLDS.HIGH) {
      req.zeroTrust.requiresMFA = true;
      
      // Check if MFA was recently verified
      const mfaVerified = await checkRecentMFAVerification(req.user.id);
      if (!mfaVerified) {
        res.status(403).json({
          success: false,
          message: 'Multi-factor authentication required for this request',
          code: 'ZERO_TRUST_MFA_REQUIRED',
          riskScore,
        });
        return;
      }
    }

    // 8. Log security event
    await logSecurityEvent({
      userId: req.user.id,
      eventType: 'ZERO_TRUST_VERIFICATION',
      ipAddress: req.zeroTrust.ipAddress,
      deviceId: req.zeroTrust.deviceId,
      deviceTrustScore,
      riskScore,
      success: true,
    });

    next();
  } catch (error) {
    console.error('Zero-Trust Auth Error:', error);
    res.status(500).json({
      success: false,
      message: 'Security verification failed',
      code: 'ZERO_TRUST_ERROR',
    });
  }
};

/**
 * Continuous Authorization Middleware
 * Re-validates permissions on every request
 */
export const enforceContinuousAuthorization = (resource: string, action: string) => {
  return async (req: ZeroTrustRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Verify user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'CONTINUOUS_AUTH_REQUIRED',
        });
        return;
      }

      // 2. Check permission in real-time (no caching for zero-trust)
      const hasPermission = await checkUserPermission(req.user.id, action, resource);
      
      if (!hasPermission) {
        // Log unauthorized access attempt
        await logSecurityEvent({
          userId: req.user.id,
          eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          resource,
          action,
          ipAddress: req.zeroTrust?.ipAddress || req.ip || '',
          success: false,
        });

        res.status(403).json({
          success: false,
          message: `Forbidden: Missing required permission [${action}:${resource}]`,
          code: 'CONTINUOUS_AUTH_FORBIDDEN',
        });
        return;
      }

      // 3. Verify user account is still active
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { isActive: true, lockedUntil: true },
      });

      if (!user || !user.isActive) {
        res.status(403).json({
          success: false,
          message: 'User account is inactive',
          code: 'CONTINUOUS_AUTH_INACTIVE',
        });
        return;
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        res.status(403).json({
          success: false,
          message: 'User account is locked',
          code: 'CONTINUOUS_AUTH_LOCKED',
        });
        return;
      }

      // 4. Log successful authorization
      await logSecurityEvent({
        userId: req.user.id,
        eventType: 'CONTINUOUS_AUTHORIZATION_SUCCESS',
        resource,
        action,
        ipAddress: req.zeroTrust?.ipAddress || req.ip || '',
        success: true,
      });

      next();
    } catch (error) {
      console.error('Continuous Authorization Error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization verification failed',
        code: 'CONTINUOUS_AUTH_ERROR',
      });
    }
  };
};

/**
 * Verify session validity
 */
async function verifySessionValidity(userId: string, sessionId: string): Promise<boolean> {
  if (!sessionId) return false;

  const session = await prisma.session.findFirst({
    where: {
      sessionToken: sessionId,
      userId,
      expiresAt: { gt: new Date() },
    },
  });

  return !!session;
}

/**
 * Check if MFA was recently verified (within last 15 minutes)
 */
async function checkRecentMFAVerification(userId: string): Promise<boolean> {
  const cacheKey = `mfa-verified:${userId}`;
  const verified = await redis.get(cacheKey);
  
  return verified === '1';
}

/**
 * Mark MFA as verified for user (15 minute window)
 */
export async function markMFAVerified(userId: string): Promise<void> {
  const cacheKey = `mfa-verified:${userId}`;
  await redis.setex(cacheKey, 900, '1'); // 15 minutes
}

/**
 * Log security event
 */
async function logSecurityEvent(event: {
  userId: string;
  eventType: string;
  resource?: string;
  action?: string;
  ipAddress: string;
  deviceId?: string;
  deviceTrustScore?: number;
  riskScore?: number;
  success: boolean;
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
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

/**
 * Register a trusted device
 */
export async function registerTrustedDevice(
  userId: string,
  deviceId: string,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  await prisma.trustedDevice.upsert({
    where: { deviceId },
    create: {
      deviceId,
      userId,
      ipAddress,
      userAgent,
      isTrusted: true,
      lastUsedAt: new Date(),
    },
    update: {
      lastUsedAt: new Date(),
      ipAddress,
    },
  });
}

/**
 * Block an IP address
 */
export async function blockIPAddress(
  ipAddress: string,
  reason: string,
  blockedBy: string
): Promise<void> {
  await prisma.blockedIP.create({
    data: {
      ipAddress,
      reason,
      blockedBy,
      blockedAt: new Date(),
    },
  });

  // Clear cache
  await redis.del(`blocked-ip:${ipAddress}`);
}

/**
 * Unblock an IP address
 */
export async function unblockIPAddress(ipAddress: string): Promise<void> {
  await prisma.blockedIP.delete({
    where: { ipAddress },
  });

  // Clear cache
  await redis.del(`blocked-ip:${ipAddress}`);
}
