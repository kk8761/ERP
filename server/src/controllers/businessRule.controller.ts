/**
 * Business Rule Controller
 * Handles HTTP requests for business rule management
 */

import { Request, Response } from 'express';
import { businessRuleService } from '../services/businessRule.service';

export class BusinessRuleController {
  /**
   * Create a new business rule
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      const tenantId = (req.user as any)?.tenantId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const result = await businessRuleService.createRule(
        req.body,
        userId,
        tenantId
      );

      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get all rules for an entity and event
   */
  async getByEvent(req: Request, res: Response): Promise<void> {
    try {
      const { entityName, triggerEvent } = req.params;
      const tenantId = (req.user as any)?.tenantId;

      const rules = await businessRuleService.getRulesForEvent(
        entityName,
        triggerEvent,
        tenantId
      );

      res.json({
        success: true,
        rules,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get rule by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const rule = await businessRuleService.getRuleById(id);

      if (!rule) {
        res.status(404).json({
          success: false,
          message: 'Business rule not found',
        });
        return;
      }

      res.json({
        success: true,
        rule,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Update business rule
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const rule = await businessRuleService.updateRule(id, req.body);

      res.json({
        success: true,
        rule,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Delete business rule
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await businessRuleService.deleteRule(id);

      res.json({
        success: true,
        message: 'Business rule deleted successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Toggle rule active status
   */
  async toggle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const rule = await businessRuleService.toggleRule(id, isActive);

      res.json({
        success: true,
        rule,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get all rules
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req.user as any)?.tenantId;

      const rules = await businessRuleService.getAllRules(tenantId);

      res.json({
        success: true,
        rules,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get rule execution history
   */
  async getExecutionHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      const history = await businessRuleService.getRuleExecutionHistory(
        id,
        limit
      );

      res.json({
        success: true,
        history,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get execution statistics
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const statistics = await businessRuleService.getExecutionStatistics(id);

      res.json({
        success: true,
        statistics,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Test rule with sample data
   */
  async test(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { sampleData } = req.body;

      const result = await businessRuleService.testRule(id, sampleData);

      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export const businessRuleController = new BusinessRuleController();
