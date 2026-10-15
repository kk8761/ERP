/**
 * Formula Field Controller
 * Handles HTTP requests for formula field management
 */

import { Request, Response } from 'express';
import { formulaFieldService } from '../services/formulaField.service';

export class FormulaFieldController {
  /**
   * Create a new formula field
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

      const result = await formulaFieldService.createFormulaField(
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
   * Get all formula fields for an entity
   */
  async getByEntity(req: Request, res: Response): Promise<void> {
    try {
      const { entityName } = req.params;
      const tenantId = (req.user as any)?.tenantId;

      const formulaFields = await formulaFieldService.getFormulaFieldsForEntity(
        entityName,
        tenantId
      );

      res.json({
        success: true,
        formulaFields,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get formula field by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const formulaField = await formulaFieldService.getFormulaFieldById(id);

      if (!formulaField) {
        res.status(404).json({
          success: false,
          message: 'Formula field not found',
        });
        return;
      }

      res.json({
        success: true,
        formulaField,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Evaluate formula for a record
   */
  async evaluate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { data } = req.body;

      const result = await formulaFieldService.evaluateFormula(id, data);

      res.json({
        success: true,
        result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Update formula field
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const formulaField = await formulaFieldService.updateFormulaField(
        id,
        req.body
      );

      res.json({
        success: true,
        formulaField,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Delete formula field
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await formulaFieldService.deleteFormulaField(id);

      res.json({
        success: true,
        message: 'Formula field deleted successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Test formula
   */
  async test(req: Request, res: Response): Promise<void> {
    try {
      const { formula, sampleData, returnType } = req.body;

      const result = await formulaFieldService.testFormula(
        formula,
        sampleData,
        returnType
      );

      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get formula suggestions
   */
  async getSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const suggestions = formulaFieldService.getFormulaSuggestions();

      res.json({
        success: true,
        suggestions,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get all formula fields
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req.user as any)?.tenantId;

      const formulaFields = await formulaFieldService.getAllFormulaFields(
        tenantId
      );

      res.json({
        success: true,
        formulaFields,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export const formulaFieldController = new FormulaFieldController();
