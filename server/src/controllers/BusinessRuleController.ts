/**
 * Business Rule Controller
 * HTTP handlers for business rule management
 */

import { Request, Response } from 'express';
import { businessRuleEngine } from '../services/BusinessRuleEngine';
import {
  BusinessRule,
  RuleExecutionContext,
  RuleTriggerType,
  RuleStatus
} from '../types/businessRule.types';

export class BusinessRuleController {
  /**
   * Create a new business rule
   */
  async createRule(req: Request, res: Response): Promise<void> {
    try {
      const rule: BusinessRule = req.body;

      // Set metadata
      rule.metadata = {
        createdBy: req.user?.id || 'system',
        createdAt: new Date(),
        version: 1,
        ...rule.metadata
      };

      // Validate and register the rule
      const validation = businessRuleEngine.validateRule(rule);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: 'Invalid rule',
          errors: validation.errors
        });
        return;
      }

      businessRuleEngine.registerRule(rule);

      res.status(201).json({
        success: true,
        data: rule,
        message: 'Business rule created successfully'
      });
    } catch (error) {
      console.error('Error creating business rule:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create business rule'
      });
    }
  }

  /**
   * Get all business rules
   */
  async getAllRules(req: Request, res: Response): Promise<void> {
    try {
      const { entity, status } = req.query;

      let rules = businessRuleEngine.getAllRules();

      // Filter by entity
      if (entity) {
        rules = rules.filter(rule => rule.entity === entity);
      }

      // Filter by status
      if (status) {
        rules = rules.filter(rule => rule.status === status);
      }

      res.json({
        success: true,
        data: rules,
        count: rules.length
      });
    } catch (error) {
      console.error('Error fetching business rules:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch business rules'
      });
    }
  }

  /**
   * Get a specific business rule
   */
  async getRule(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const rules = businessRuleEngine.getAllRules();
      const rule = rules.find(r => r.id === id);

      if (!rule) {
        res.status(404).json({
          success: false,
          error: 'Business rule not found'
        });
        return;
      }

      res.json({
        success: true,
        data: rule
      });
    } catch (error) {
      console.error('Error fetching business rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch business rule'
      });
    }
  }

  /**
   * Update a business rule
   */
  async updateRule(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates: Partial<BusinessRule> = req.body;

      const rules = businessRuleEngine.getAllRules();
      const existingRule = rules.find(r => r.id === id);

      if (!existingRule) {
        res.status(404).json({
          success: false,
          error: 'Business rule not found'
        });
        return;
      }

      // Merge updates
      const updatedRule: BusinessRule = {
        ...existingRule,
        ...updates,
        id, // Ensure ID doesn't change
        metadata: {
          ...existingRule.metadata,
          updatedBy: req.user?.id || 'system',
          updatedAt: new Date(),
          version: (existingRule.metadata?.version || 1) + 1
        }
      };

      // Validate updated rule
      const validation = businessRuleEngine.validateRule(updatedRule);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: 'Invalid rule',
          errors: validation.errors
        });
        return;
      }

      // Re-register the rule
      businessRuleEngine.registerRule(updatedRule);

      res.json({
        success: true,
        data: updatedRule,
        message: 'Business rule updated successfully'
      });
    } catch (error) {
      console.error('Error updating business rule:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update business rule'
      });
    }
  }

  /**
   * Delete a business rule
   */
  async deleteRule(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = businessRuleEngine.unregisterRule(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Business rule not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Business rule deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting business rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete business rule'
      });
    }
  }

  /**
   * Validate a business rule
   */
  async validateRule(req: Request, res: Response): Promise<void> {
    try {
      const rule: BusinessRule = req.body;
      const validation = businessRuleEngine.validateRule(rule);

      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      console.error('Error validating business rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate business rule'
      });
    }
  }

  /**
   * Execute a business rule manually
   */
  async executeRule(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const context: RuleExecutionContext = req.body;

      const rules = businessRuleEngine.getAllRules();
      const rule = rules.find(r => r.id === id);

      if (!rule) {
        res.status(404).json({
          success: false,
          error: 'Business rule not found'
        });
        return;
      }

      // Set context defaults
      context.ruleId = id;
      context.entity = context.entity || rule.entity;
      context.triggerType = context.triggerType || RuleTriggerType.MANUAL;
      context.userId = context.userId || req.user?.id;

      const result = await businessRuleEngine.executeRule(rule, context);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error executing business rule:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute business rule'
      });
    }
  }

  /**
   * Execute rules for an entity event
   */
  async executeRulesForEvent(req: Request, res: Response): Promise<void> {
    try {
      const context: RuleExecutionContext = req.body;

      if (!context.entity || !context.triggerType) {
        res.status(400).json({
          success: false,
          error: 'Entity and trigger type are required'
        });
        return;
      }

      // Set user context
      context.userId = context.userId || req.user?.id;

      const results = await businessRuleEngine.executeRules(context);

      res.json({
        success: true,
        data: results,
        count: results.length
      });
    } catch (error) {
      console.error('Error executing business rules:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute business rules'
      });
    }
  }

  /**
   * Get rules by entity
   */
  async getRulesByEntity(req: Request, res: Response): Promise<void> {
    try {
      const { entity } = req.params;
      const rules = businessRuleEngine.getRulesByEntity(entity);

      res.json({
        success: true,
        data: rules,
        count: rules.length
      });
    } catch (error) {
      console.error('Error fetching rules by entity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch rules'
      });
    }
  }

  /**
   * Register a custom function
   */
  async registerCustomFunction(req: Request, res: Response): Promise<void> {
    try {
      const { name, code } = req.body;

      if (!name || !code) {
        res.status(400).json({
          success: false,
          error: 'Function name and code are required'
        });
        return;
      }

      // Create function from code string
      // WARNING: This is potentially unsafe in production
      // Consider using a sandboxed environment or pre-defined functions
      const fn = new Function('context', 'parameters', code);
      businessRuleEngine.registerCustomFunction(name, fn);

      res.json({
        success: true,
        message: 'Custom function registered successfully'
      });
    } catch (error) {
      console.error('Error registering custom function:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register custom function'
      });
    }
  }
}

export const businessRuleController = new BusinessRuleController();
