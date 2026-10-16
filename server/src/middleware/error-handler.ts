/**
 * Centralized Error Handler Middleware
 * Transforms technical Express/Prisma/JWT errors into user-friendly API responses.
 * Requirement 28.5: WHEN errors occur, THE System SHALL provide helpful error messages
 *                   with resolution steps.
 */

import { Request, Response, NextFunction } from 'express';
import { buildErrorResponse, getEntryForHttpStatus, ERROR_CATALOG } from '../services/error-catalog.service';

// ─── Augmented Error Type ─────────────────────────────────────────────────────

export interface AppError extends Error {
  /** NexaERP error catalog code (e.g. "AUTH_TOKEN_EXPIRED") */
  code?: string | number;
  /** HTTP status to send */
  status?: number;
  statusCode?: number;
  /** Prisma duplicate-key value map */
  keyValue?: Record<string, unknown>;
  /** Mongoose-style field errors */
  errors?: Record<string, { message: string }> | string[];
  /** Express-validator style array */
  validationErrors?: Array<{ field?: string; path?: string; msg: string; value?: unknown }>;
  /** Custom user-facing override */
  userMessage?: string;
  resolutionSteps?: string[];
}

// ─── Validation Error Shape ───────────────────────────────────────────────────

export interface FieldError {
  field: string;
  message: string;
  expected?: string;
}

// ─── Main Error Handler ───────────────────────────────────────────────────────

/**
 * Express error-handling middleware (4-arg signature required).
 * Mount AFTER all routes: `app.use(errorHandler)`.
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Always log the real error for internal diagnostics
  const httpStatus = err.status ?? err.statusCode ?? 500;
  console.error(`[ErrorHandler] ${req.method} ${req.path} → ${httpStatus}:`, err.message);

  // ── JWT errors ──────────────────────────────────────────────────────────────
  if (err.name === 'TokenExpiredError') {
    res.status(401).json(buildErrorResponse('AUTH_TOKEN_EXPIRED'));
    return;
  }

  if (err.name === 'JsonWebTokenError') {
    res.status(401).json(buildErrorResponse('AUTH_TOKEN_INVALID'));
    return;
  }

  // ── Express-Validator errors ─────────────────────────────────────────────────
  if (err.validationErrors && Array.isArray(err.validationErrors)) {
    const fieldErrors: FieldError[] = err.validationErrors.map((ve) => ({
      field: ve.field ?? ve.path ?? 'unknown',
      message: ve.msg,
    }));

    res.status(400).json(
      buildErrorResponse('VALIDATION_FAILED', {
        fieldErrors,
        userMessage: `Please correct the following field${fieldErrors.length > 1 ? 's' : ''}: ${fieldErrors.map((f) => f.field).join(', ')}.`,
      }),
    );
    return;
  }

  // ── Mongoose/legacy ValidationError ─────────────────────────────────────────
  if (err.name === 'ValidationError' && err.errors && !Array.isArray(err.errors)) {
    const fieldErrors: FieldError[] = Object.entries(err.errors as Record<string, { message: string }>).map(
      ([field, e]) => ({ field, message: e.message }),
    );

    res.status(400).json(
      buildErrorResponse('VALIDATION_FAILED', {
        fieldErrors,
        userMessage: `Please correct the following: ${fieldErrors.map((f) => f.message).join('; ')}.`,
      }),
    );
    return;
  }

  // ── Prisma / MongoDB duplicate key (code 11000) ──────────────────────────────
  if (err.code === 11000 || (typeof err.code === 'string' && err.code === 'P2002')) {
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'record';
    res.status(409).json(
      buildErrorResponse('VALIDATION_DUPLICATE', {
        userMessage: `A ${field} with this value already exists. Please use a different value.`,
      }),
    );
    return;
  }

  // ── Prisma not-found ─────────────────────────────────────────────────────────
  if (typeof err.code === 'string' && err.code === 'P2025') {
    res.status(404).json(buildErrorResponse('NOT_FOUND_GENERIC'));
    return;
  }

  // ── Prisma connection error ──────────────────────────────────────────────────
  if (typeof err.code === 'string' && ['P1001', 'P1002', 'P1003'].includes(err.code)) {
    res.status(503).json(buildErrorResponse('DB_CONNECTION_ERROR'));
    return;
  }

  // ── Multer file upload errors ────────────────────────────────────────────────
  if (err.name === 'MulterError') {
    if (err.message.includes('File too large') || err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json(buildErrorResponse('FILE_TOO_LARGE'));
      return;
    }
    res.status(400).json(buildErrorResponse('FILE_UPLOAD_FAILED', { error: err.message }));
    return;
  }

  // ── Known NexaERP catalog code attached to error ─────────────────────────────
  if (typeof err.code === 'string' && err.code in ERROR_CATALOG) {
    const entry = ERROR_CATALOG[err.code];
    res.status(entry.httpStatus).json(
      buildErrorResponse(err.code, {
        userMessage: err.userMessage,
        resolutionSteps: err.resolutionSteps,
      }),
    );
    return;
  }

  // ── HTTP status-based fallback ───────────────────────────────────────────────
  const fallbackEntry = getEntryForHttpStatus(httpStatus);
  res.status(httpStatus).json(
    buildErrorResponse(fallbackEntry.code, {
      // Only expose technical message in development
      error:
        process.env.NODE_ENV === 'development'
          ? err.message
          : fallbackEntry.technicalMessage,
      userMessage: err.userMessage ?? fallbackEntry.userMessage,
      resolutionSteps: err.resolutionSteps ?? fallbackEntry.resolutionSteps,
    }),
  );
}

// ─── 404 Not-Found Handler ─────────────────────────────────────────────────────

/**
 * Catch-all for unmatched routes.
 * Mount as the last `app.use()` before `errorHandler`.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(
    buildErrorResponse('NOT_FOUND_ROUTE', {
      error: `Route ${req.method} ${req.originalUrl} not found`,
      userMessage: `The page or API endpoint "${req.method} ${req.path}" does not exist.`,
    }),
  );
}

// ─── Helper: throw a typed AppError ──────────────────────────────────────────

/**
 * Create a typed AppError that carries an error catalog code.
 *
 * @example
 *   throw createError('PERMISSION_DENIED', 403);
 *   throw createError('BUSINESS_INSUFFICIENT_STOCK', 422, 'Only 3 units available');
 */
export function createError(
  code: string,
  status?: number,
  technicalMessage?: string,
  options?: { userMessage?: string; resolutionSteps?: string[] },
): AppError {
  const entry = ERROR_CATALOG[code];
  const err = new Error(technicalMessage ?? entry?.technicalMessage ?? code) as AppError;
  err.code = code;
  err.status = status ?? entry?.httpStatus ?? 500;
  if (options?.userMessage) err.userMessage = options.userMessage;
  if (options?.resolutionSteps) err.resolutionSteps = options.resolutionSteps;
  return err;
}

/**
 * Attach express-validator result to an error and throw it.
 * Usage in controllers:
 *   const errors = validationResult(req);
 *   if (!errors.isEmpty()) throwValidationErrors(errors.array());
 */
export function throwValidationErrors(
  errors: Array<{ path?: string; param?: string; msg: string; value?: unknown }>,
): never {
  const err = new Error('Validation failed') as AppError;
  err.status = 400;
  err.validationErrors = errors.map((e) => ({
    field: e.path ?? e.param ?? 'unknown',
    msg: e.msg,
    value: e.value,
  }));
  throw err;
}
