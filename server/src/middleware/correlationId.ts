/**
 * Correlation ID Middleware
 * Adds correlation IDs to all requests for distributed tracing
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface CorrelationRequest extends Request {
  correlationId?: string;
}

/**
 * Middleware to add correlation ID to requests
 */
export const correlationIdMiddleware = (req: CorrelationRequest, res: Response, next: NextFunction): void => {
  // Check if correlation ID exists in headers (from upstream services)
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();

  // Attach to request object
  req.correlationId = correlationId;

  // Add to response headers for client tracking
  res.setHeader('X-Correlation-ID', correlationId);

  // Add to response locals for use in templates/logging
  res.locals.correlationId = correlationId;

  next();
};

/**
 * Get correlation ID from request
 */
export const getCorrelationId = (req: CorrelationRequest): string => {
  return req.correlationId || 'unknown';
};
