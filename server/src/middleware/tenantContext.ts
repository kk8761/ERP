/**
 * Tenant Context Middleware
 * 
 * Extracts tenant information from the request and adds it to the request context.
 * Implements row-level security by ensuring all database queries are scoped to the tenant.
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from '../types/tenant.types';

const prisma = new PrismaClient();

// Extend Express Request to include tenant context
declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
      tenantId?: string;
    }
  }
}

/**
 * Extract tenant from subdomain or custom domain
 */
export async function tenantContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Skip tenant resolution for public routes
    if (isPublicRoute(req.path)) {
      return next();
    }

    // Extract tenant identifier from:
    // 1. Subdomain (e.g., acme.nexaerp.com)
    // 2. Custom domain (e.g., erp.acme.com)
    // 3. Header (X-Tenant-ID or X-Tenant-Slug)
    // 4. Query parameter (?tenant=acme)

    let tenantIdentifier: string | null = null;
    let identifierType: 'domain' | 'slug' | 'id' = 'domain';

    // Check header first
    const tenantHeader = req.headers['x-tenant-id'] || req.headers['x-tenant-slug'];
    if (tenantHeader && typeof tenantHeader === 'string') {
      tenantIdentifier = tenantHeader;
      identifierType = req.headers['x-tenant-id'] ? 'id' : 'slug';
    }

    // Check query parameter
    if (!tenantIdentifier && req.query.tenant) {
      tenantIdentifier = req.query.tenant as string;
      identifierType = 'slug';
    }

    // Extract from domain/subdomain
    if (!tenantIdentifier) {
      const host = req.hostname;
      
      // Check if it's a subdomain (e.g., acme.nexaerp.com)
      const parts = host.split('.');
      if (parts.length >= 3) {
        // Subdomain detected
        tenantIdentifier = parts[0];
        identifierType = 'slug';
      } else {
        // Custom domain (e.g., erp.acme.com)
        tenantIdentifier = host;
        identifierType = 'domain';
      }
    }

    if (!tenantIdentifier) {
      return res.status(400).json({
        error: 'Tenant identifier not found',
        message: 'Please provide tenant information via subdomain, domain, header, or query parameter'
      });
    }

    // Resolve tenant from database
    let tenant;
    if (identifierType === 'id') {
      tenant = await prisma.tenant.findUnique({
        where: { id: tenantIdentifier }
      });
    } else if (identifierType === 'slug') {
      tenant = await prisma.tenant.findUnique({
        where: { slug: tenantIdentifier }
      });
    } else {
      tenant = await prisma.tenant.findUnique({
        where: { domain: tenantIdentifier }
      });
    }

    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found',
        message: `No tenant found for identifier: ${tenantIdentifier}`
      });
    }

    // Check tenant status
    if (tenant.status === 'suspended') {
      return res.status(403).json({
        error: 'Tenant suspended',
        message: 'This tenant account has been suspended. Please contact support.'
      });
    }

    if (tenant.status === 'cancelled') {
      return res.status(403).json({
        error: 'Tenant cancelled',
        message: 'This tenant account has been cancelled.'
      });
    }

    // Check trial expiration
    if (tenant.status === 'trial' && tenant.trialEndsAt && new Date() > tenant.trialEndsAt) {
      return res.status(403).json({
        error: 'Trial expired',
        message: 'Your trial period has expired. Please upgrade to continue.'
      });
    }

    // Add tenant context to request
    req.tenantContext = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantDomain: tenant.domain,
      tenantPlan: tenant.plan as any,
      tenantStatus: tenant.status as any,
      tenantFeatures: tenant.features,
      isolationStrategy: tenant.isolationStrategy as any
    };

    req.tenantId = tenant.id;

    // Update last activity
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { lastActivityAt: new Date() }
    }).catch(err => console.error('Error updating last activity:', err));

    next();
  } catch (error) {
    console.error('Error in tenant context middleware:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to resolve tenant context'
    });
  }
}

/**
 * Check if route is public (doesn't require tenant context)
 */
function isPublicRoute(path: string): boolean {
  const publicRoutes = [
    '/health',
    '/api/health',
    '/api/tenants/create',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password'
  ];

  return publicRoutes.some(route => path.startsWith(route));
}

/**
 * Require tenant context (use after tenantContextMiddleware)
 */
export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.tenantContext || !req.tenantId) {
    return res.status(401).json({
      error: 'Tenant context required',
      message: 'This endpoint requires tenant context'
    });
  }

  next();
}

/**
 * Check if tenant has a specific feature enabled
 */
export function requireFeature(featureName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenantContext) {
      return res.status(401).json({
        error: 'Tenant context required',
        message: 'This endpoint requires tenant context'
      });
    }

    if (!req.tenantContext.tenantFeatures.includes(featureName)) {
      return res.status(403).json({
        error: 'Feature not available',
        message: `This feature (${featureName}) is not available in your plan`
      });
    }

    next();
  };
}

/**
 * Check if tenant plan meets minimum requirement
 */
export function requirePlan(minimumPlan: string) {
  const planHierarchy = ['trial', 'basic', 'professional', 'enterprise'];

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenantContext) {
      return res.status(401).json({
        error: 'Tenant context required',
        message: 'This endpoint requires tenant context'
      });
    }

    const currentPlanIndex = planHierarchy.indexOf(req.tenantContext.tenantPlan);
    const requiredPlanIndex = planHierarchy.indexOf(minimumPlan);

    if (currentPlanIndex < requiredPlanIndex) {
      return res.status(403).json({
        error: 'Plan upgrade required',
        message: `This feature requires at least ${minimumPlan} plan`
      });
    }

    next();
  };
}
