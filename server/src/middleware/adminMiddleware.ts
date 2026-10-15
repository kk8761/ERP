import { Request, Response, NextFunction } from 'express';

/**
 * Admin Middleware
 * 
 * Ensures that only users with admin role can access protected routes.
 * Must be used after authMiddleware.
 */

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: any;
  };
}

export const adminMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Check if user has admin role
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
      return;
    }

    // User is admin, proceed
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization check failed',
    });
  }
};
