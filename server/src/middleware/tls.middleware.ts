/**
 * TLS Security Middleware
 * Enforces HTTPS and TLS 1.3 for all connections
 */

import { Request, Response, NextFunction } from 'express';
import { mutualTLSConfig } from '../config/tls.config';
import { auditLogger } from '../services/audit.service';

/**
 * Enforce HTTPS in production
 */
export function tlsSecurityMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip for health checks
  if (req.path === '/health') {
    return next();
  }
  
  // Check if request is over HTTPS
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  
  if (!isSecure && process.env.NODE_ENV === 'production') {
    // Redirect to HTTPS
    const httpsUrl = `https://${req.headers.host}${req.url}`;
    
    auditLogger.log({
      userId: 'system',
      action: 'tls.redirect',
      resource: 'connection',
      details: {
        from: req.protocol,
        to: 'https',
        path: req.path,
        ip: req.ip,
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });
    
    return res.redirect(301, httpsUrl);
  }
  
  // Add security headers
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
}

/**
 * Mutual TLS Authentication Middleware
 * Validates client certificates for service-to-service communication
 */
export function mutualTLSMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!mutualTLSConfig.enabled) {
    return next();
  }
  
  // Get client certificate from TLS connection
  const socket = req.socket as any;
  const clientCert = socket.getPeerCertificate?.();
  
  if (!clientCert || !clientCert.subject) {
    auditLogger.log({
      userId: 'system',
      action: 'mtls.auth_failed',
      resource: 'connection',
      details: {
        reason: 'no_client_certificate',
        path: req.path,
        ip: req.ip,
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });
    
    return res.status(401).json({
      success: false,
      error: 'Client certificate required',
      code: 'MTLS_CERT_REQUIRED',
    });
  }
  
  // Validate certificate is authorized
  const authorized = socket.authorized;
  
  if (!authorized) {
    auditLogger.log({
      userId: 'system',
      action: 'mtls.auth_failed',
      resource: 'connection',
      details: {
        reason: 'certificate_not_authorized',
        subject: clientCert.subject,
        issuer: clientCert.issuer,
        path: req.path,
        ip: req.ip,
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });
    
    return res.status(403).json({
      success: false,
      error: 'Client certificate not authorized',
      code: 'MTLS_CERT_UNAUTHORIZED',
    });
  }
  
  // Extract service name from certificate CN (Common Name)
  const serviceName = clientCert.subject.CN;
  
  // Check if service is in allowed list
  if (mutualTLSConfig.allowedServices.length > 0 && 
      !mutualTLSConfig.allowedServices.includes(serviceName)) {
    auditLogger.log({
      userId: 'system',
      action: 'mtls.auth_failed',
      resource: 'connection',
      details: {
        reason: 'service_not_allowed',
        serviceName,
        allowedServices: mutualTLSConfig.allowedServices,
        path: req.path,
        ip: req.ip,
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });
    
    return res.status(403).json({
      success: false,
      error: 'Service not authorized',
      code: 'MTLS_SERVICE_UNAUTHORIZED',
    });
  }
  
  // Add service information to request
  (req as any).clientService = {
    name: serviceName,
    certificate: {
      subject: clientCert.subject,
      issuer: clientCert.issuer,
      validFrom: clientCert.valid_from,
      validTo: clientCert.valid_to,
      fingerprint: clientCert.fingerprint,
    },
  };
  
  auditLogger.log({
    userId: 'system',
    action: 'mtls.auth_success',
    resource: 'connection',
    details: {
      serviceName,
      path: req.path,
      ip: req.ip,
    },
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });
  
  next();
}

/**
 * TLS Version Enforcement Middleware
 * Ensures only TLS 1.3 connections are accepted
 */
export function tlsVersionMiddleware(req: Request, res: Response, next: NextFunction) {
  const socket = req.socket as any;
  const tlsVersion = socket.getProtocol?.();
  
  if (tlsVersion && tlsVersion !== 'TLSv1.3') {
    auditLogger.log({
      userId: 'system',
      action: 'tls.version_rejected',
      resource: 'connection',
      details: {
        version: tlsVersion,
        required: 'TLSv1.3',
        path: req.path,
        ip: req.ip,
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });
    
    return res.status(426).json({
      success: false,
      error: 'TLS 1.3 required',
      code: 'TLS_VERSION_UNSUPPORTED',
      details: {
        current: tlsVersion,
        required: 'TLSv1.3',
      },
    });
  }
  
  next();
}

/**
 * Certificate Pinning Middleware
 * Validates certificate fingerprint for critical endpoints
 */
export function certificatePinningMiddleware(expectedFingerprints: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const socket = req.socket as any;
    const clientCert = socket.getPeerCertificate?.();
    
    if (!clientCert || !clientCert.fingerprint) {
      return res.status(401).json({
        success: false,
        error: 'Certificate required for pinning validation',
        code: 'CERT_PINNING_REQUIRED',
      });
    }
    
    const fingerprint = clientCert.fingerprint.replace(/:/g, '').toLowerCase();
    const isPinned = expectedFingerprints.some(
      expected => expected.replace(/:/g, '').toLowerCase() === fingerprint
    );
    
    if (!isPinned) {
      auditLogger.log({
        userId: 'system',
        action: 'cert_pinning.failed',
        resource: 'connection',
        details: {
          fingerprint,
          expectedFingerprints,
          path: req.path,
          ip: req.ip,
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      
      return res.status(403).json({
        success: false,
        error: 'Certificate fingerprint not recognized',
        code: 'CERT_PINNING_FAILED',
      });
    }
    
    next();
  };
}
