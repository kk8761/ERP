/**
 * Custom Field Controller
 * Handles HTTP requests for custom field management on standard entities
 * Requirements: 26.1
 * Task: 37.2
 */

import { Request, Response } from 'express';
import { customFieldService } from '../services/customField.service';

export class CustomFieldController {
  /**
   * Add a custom field to a standard entity
   */
  async addField(req: Request, res: Response): Promise<void> {
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

      const result = await customFieldService.addCustomField(
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
   * Get all custom fields for an entity
   */
  async getByEntity(req: Request, res: Response): Promise<void> {
    try {
      const { entityName } = req.params;
      const tenantId = (req.user as any)?.tenantId;

      const fields = await customFieldService.getCustomFields(
        entityName,
        tenantId
      );

      res.json({
        success: true,
        fields,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get custom field value for a record
   */
  async getFieldValue(req: Request, res: Response): Promise<void> {
    try {
      const { entityName, recordId, fieldName } = req.params;
      const tenantId = (req.user as any)?.tenantId;

      const value = await customFieldService.getCustomFieldValue(
        entityName,
        recordId,
        fieldName,
        tenantId
      );

      res.json({
        success: true,
        value,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get all custom field values for a record
   */
  async getFieldValues(req: Request, res: Response): Promise<void> {
    try {
      const { entityName, recordId } = req.params;
      const tenantId = (req.user as any)?.tenantId;

      const values = await customFieldService.getCustomFieldValues(
        entityName,
        recordId,
        tenantId
      );

      res.json({
        success: true,
        values,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Set custom field value for a record
   */
  async setFieldValue(req: Request, res: Response): Promise<void> {
    try {
      const { entityName, recordId, fieldName } = req.params;
      const { value } = req.body;
      const userId = (req.user as any)?.id;
      const tenantId = (req.user as any)?.tenantId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      await customFieldService.setCustomFieldValue(
        entityName,
        recordId,
        fieldName,
        value,
        userId,
        tenantId
      );

      res.json({
        success: true,
        message: 'Custom field value set successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Set multiple custom field values for a record
   */
  async setFieldValues(req: Request, res: Response): Promise<void> {
    try {
      const { entityName, recordId } = req.params;
      const { values } = req.body;
      const userId = (req.user as any)?.id;
      const tenantId = (req.user as any)?.tenantId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      await customFieldService.setCustomFieldValues(
        entityName,
        recordId,
        values,
        userId,
        tenantId
      );

      res.json({
        success: true,
        message: 'Custom field values set successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Update custom field definition
   */
  async updateField(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const field = await customFieldService.updateCustomField(id, req.body);

      res.json({
        success: true,
        field,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Delete custom field definition
   */
  async deleteField(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await customFieldService.deleteCustomField(id);

      res.json({
        success: true,
        message: 'Custom field deleted successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Enrich entity with custom fields
   */
  async enrichEntity(req: Request, res: Response): Promise<void> {
    try {
      const { entityName } = req.params;
      const { record } = req.body;
      const tenantId = (req.user as any)?.tenantId;

      const enrichedRecord = await customFieldService.enrichEntityWithCustomFields(
        entityName,
        record,
        tenantId
      );

      res.json({
        success: true,
        record: enrichedRecord,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export const customFieldController = new CustomFieldController();
