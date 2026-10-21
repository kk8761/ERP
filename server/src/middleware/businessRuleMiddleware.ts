/**
 * Business Rule Middleware
 * Automatically execute business rules on entity events
 */

import { Request, Response, NextFunction } from 'express';
import { businessRuleEngine } from '../services/BusinessRuleEngine';
import { RuleExecutionContext, RuleTriggerType } from '../types/businessRule.types';

/**
 * Middleware to execute business rules before create operations
 */
export const executeBeforeCreate = (entity: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context: RuleExecutionContext = {
        ruleId: '', // Will be set by engine
        entity,
        triggerType: RuleTriggerType.BEFORE_CREATE,
        data: req.body,
        userId: req.user?.id,
        tenantId: req.user?.tenantId
      };

      const results = await businessRuleEngine.executeRules(context);

      // Check for errors
      const hasErrors = results.some(r => !r.success);
      if (hasErrors) {
        const errors = results
          .filter(r => !r.success)
          .flatMap(r => r.errors || [])
          .map(e => e.message);

        res.status(400).json({
          success: false,
          error: 'Business rule validation failed',
          errors
        });
        return;
      }

      // Apply modified data from rules
      const modifiedData = results.reduce((acc, r) => {
        if (r.modifiedData) {
          return { ...acc, ...r.modifiedData };
        }
        return acc;
      }, {});

      if (Object.keys(modifiedData).length > 0) {
        req.body = { ...req.body, ...modifiedData };
      }

      // Store results for after-create hooks
      req.ruleResults = results;

      next();
    } catch (error) {
      console.error('Error executing before-create rules:', error);
      next(error);
    }
  };
};

/**
 * Middleware to execute business rules after create operations
 */
export const executeAfterCreate = (entity: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Store original send function
      const originalSend = res.json.bind(res);

      // Override send to execute rules after response
      res.json = function (data: any) {
        // Execute rules asynchronously (don't block response)
        setImmediate(async () => {
          try {
            const context: RuleExecutionContext = {
              ruleId: '',
              entity,
              triggerType: RuleTriggerType.AFTER_CREATE,
              data: data.data || req.body,
              recordId: data.data?.id,
              userId: req.user?.id,
              tenantId: req.user?.tenantId
            };

            await businessRuleEngine.executeRules(context);
          } catch (error) {
            console.error('Error executing after-create rules:', error);
          }
        });

        // Send original response
        return originalSend(data);
      };

      next();
    } catch (error) {
      console.error('Error setting up after-create rules:', error);
      next(error);
    }
  };
};

/**
 * Middleware to execute business rules before update operations
 */
export const executeBeforeUpdate = (entity: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context: RuleExecutionContext = {
        ruleId: '',
        entity,
        triggerType: RuleTriggerType.BEFORE_UPDATE,
        data: req.body,
        recordId: req.params.id,
        oldData: req.existingRecord, // Should be set by a previous middleware
        userId: req.user?.id,
        tenantId: req.user?.tenantId
      };

      const results = await businessRuleEngine.executeRules(context);

      // Check for errors
      const hasErrors = results.some(r => !r.success);
      if (hasErrors) {
        const errors = results
          .filter(r => !r.success)
          .flatMap(r => r.errors || [])
          .map(e => e.message);

        res.status(400).json({
          success: false,
          error: 'Business rule validation failed',
          errors
        });
        return;
      }

      // Apply modified data from rules
      const modifiedData = results.reduce((acc, r) => {
        if (r.modifiedData) {
          return { ...acc, ...r.modifiedData };
        }
        return acc;
      }, {});

      if (Object.keys(modifiedData).length > 0) {
        req.body = { ...req.body, ...modifiedData };
      }

      req.ruleResults = results;

      next();
    } catch (error) {
      console.error('Error executing before-update rules:', error);
      next(error);
    }
  };
};

/**
 * Middleware to execute business rules after update operations
 */
export const executeAfterUpdate = (entity: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const originalSend = res.json.bind(res);

      res.json = function (data: any) {
        setImmediate(async () => {
          try {
            const context: RuleExecutionContext = {
              ruleId: '',
              entity,
              triggerType: RuleTriggerType.AFTER_UPDATE,
              data: data.data || req.body,
              recordId: req.params.id,
              oldData: req.existingRecord,
              userId: req.user?.id,
              tenantId: req.user?.tenantId
            };

            await businessRuleEngine.executeRules(context);
          } catch (error) {
            console.error('Error executing after-update rules:', error);
          }
        });

        return originalSend(data);
      };

      next();
    } catch (error) {
      console.error('Error setting up after-update rules:', error);
      next(error);
    }
  };
};

/**
 * Middleware to execute business rules before delete operations
 */
export const executeBeforeDelete = (entity: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context: RuleExecutionContext = {
        ruleId: '',
        entity,
        triggerType: RuleTriggerType.BEFORE_DELETE,
        data: req.existingRecord || {},
        recordId: req.params.id,
        userId: req.user?.id,
        tenantId: req.user?.tenantId
      };

      const results = await businessRuleEngine.executeRules(context);

      // Check for errors
      const hasErrors = results.some(r => !r.success);
      if (hasErrors) {
        const errors = results
          .filter(r => !r.success)
          .flatMap(r => r.errors || [])
          .map(e => e.message);

        res.status(400).json({
          success: false,
          error: 'Business rule validation failed',
          errors
        });
        return;
      }

      req.ruleResults = results;

      next();
    } catch (error) {
      console.error('Error executing before-delete rules:', error);
      next(error);
    }
  };
};

/**
 * Middleware to execute business rules after delete operations
 */
export const executeAfterDelete = (entity: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const originalSend = res.json.bind(res);

      res.json = function (data: any) {
        setImmediate(async () => {
          try {
            const context: RuleExecutionContext = {
              ruleId: '',
              entity,
              triggerType: RuleTriggerType.AFTER_DELETE,
              data: req.existingRecord || {},
              recordId: req.params.id,
              userId: req.user?.id,
              tenantId: req.user?.tenantId
            };

            await businessRuleEngine.executeRules(context);
          } catch (error) {
            console.error('Error executing after-delete rules:', error);
          }
        });

        return originalSend(data);
      };

      next();
    } catch (error) {
      console.error('Error setting up after-delete rules:', error);
      next(error);
    }
  };
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      ruleResults?: any[];
      existingRecord?: any;
    }
  }
}
