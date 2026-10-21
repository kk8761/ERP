/**
 * Authentication Middleware
 * Validates JWT tokens and protects routes with SIEM logging
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { siemService } from '../services/SIEMService';
import { CorrelationRequest, getCorrelationId } from './correlationId';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

interface AuthCorrelationRequest extends AuthRequest, CorrelationRequest {}

/**
 * Extract client IP address
 */
const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
};

export const authenticate = (req: AuthCorrelationRequest, res: Response, next: NextFunction): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const correlationId = getCorrelationId(req);
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!token) {
      siemService.logAuthenticationFailure('unknown', 'No token provided', {
        correlationId,
        ipAddress,
        userAgent,
        resource: req.path,
      });

      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    req.user = decoded;

    // Log successful authentication
    siemService.logAuthenticationSuccess(decoded.userId, decoded.email, {
      correlationId,
      ipAddress,
      userAgent,
      resource: req.path,
    });

    next();
  } catch (error) {
    const correlationId = getCorrelationId(req);
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    const reason = error instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token';

    siemService.logAuthenticationFailure('unknown', reason, {
      correlationId,
      ipAddress,
      userAgent,
      resource: req.path,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthCorrelationRequest, res: Response, next: NextFunction): void => {
    const correlationId = getCorrelationId(req);
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!req.user) {
      siemService.logAuthenticationFailure('unknown', 'No user in request', {
        correlationId,
        ipAddress,
        userAgent,
        resource: req.path,
      });

      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      siemService.logAuthorizationFailure(req.user.userId, req.path, 'ACCESS', {
        correlationId,
        username: req.user.email,
        ipAddress,
        userAgent,
        requiredRoles: roles,
        userRole: req.user.role,
      });

      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};
