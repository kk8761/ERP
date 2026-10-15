/**
 * Validation Rule Controller
 * Handles HTTP requests for validation rule management
 * Requirements: 26.4
 * Task: 37.4
 */

import { Request, Response } from 'express';
import { validationRuleService } from '../services/validationRule.service';

export class ValidationRuleController {
  /**
   * Create a new validation rule
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

      const result = await validationRuleService.createRule(
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
   * Get all validation rules for an entity
   */
  async getByEntity(req: Request, res: Response): Promise<void> {
    try {
      const { entityName } = req.params;
      const tenantId = (req.user as any)?.tenantId;

      const rules = await validationRuleService.getRulesForEntity(
        entityName,
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
   * Get validation rule by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const rule = await validationRuleService.getRuleById(id);

      if (!rule) {
        res.status(404).json({
          success: false,
          message: 'Validation rule not found',
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
   * Validate a record
   */
  async validateRecord(req: Request, res: Response): Promise<void> {
    try {
      const { entityName } = req.params;
      const { data } = req.body;
      const tenantId = (req.user as any)?.tenantId;

      const result = await validationRuleService.validateRecord(
        entityName,
        data,
        tenantId
      );

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Validate a field
   */
  async validateField(req: Request, res: Response): Promise<void> {
    try {
      const { entityName, fieldName } = req.params;
      const { value, data } = req.body;
      const tenantId = (req.user as any)?.tenantId;

      const result = await validationRuleService.validateField(
        entityName,
        fieldName,
        value,
        data,
        tenantId
      );

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Update validation rule
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const rule = await validationRuleService.updateRule(id, req.body);

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
   * Delete validation rule
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await validationRuleService.deleteRule(id);

      res.json({
        success: true,
        message: 'Validation rule deleted successfully',
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

      const rule = await validationRuleService.toggleRule(id, isActive);

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
   * Get all validation rules
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req.user as any)?.tenantId;

      const rules = await validationRuleService.getAllRules(tenantId);

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
}

export const validationRuleController = new ValidationRuleController();
