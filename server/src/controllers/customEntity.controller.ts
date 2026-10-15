/**
 * Custom Entity Controller
 * Handles HTTP requests for custom entity management
 * Requirements: 19.6, 26.2
 */

import { Request, Response } from 'express';
import { customEntityService } from '../services/customEntity.service';
import { CustomEntityDefinition } from '../types/customEntity';

export class CustomEntityController {
  /**
   * Get all custom entities
   */
  async getAllEntities(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user?.tenantId;
      const entities = await customEntityService.getAllEntities(tenantId);

      res.json({
        success: true,
        data: entities,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch custom entities',
        error: error.message,
      });
    }
  }

  /**
   * Get entity by ID
   */
  async getEntityById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const entity = await customEntityService.getEntityById(id);

      if (!entity) {
        res.status(404).json({
          success: false,
          message: 'Entity not found',
        });
        return;
      }

      res.json({
        success: true,
        data: entity,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch entity',
        error: error.message,
      });
    }
  }

  /**
   * Create new custom entity
   */
  async createEntity(req: Request, res: Response): Promise<void> {
    try {
      const definition: CustomEntityDefinition = req.body;
      const userId = (req as any).user?.id;
      const tenantId = (req as any).user?.tenantId;

      // Add tenant ID to definition
      definition.tenantId = tenantId;

      const result = await customEntityService.createEntity(definition, userId);

      res.status(201).json({
        success: true,
        message: 'Custom entity created successfully',
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to create custom entity',
        error: error.message,
      });
    }
  }

  /**
   * Delete custom entity
   */
  async deleteEntity(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await customEntityService.deleteEntity(id);

      res.json({
        success: true,
        message: 'Custom entity deleted successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete custom entity',
        error: error.message,
      });
    }
  }

  /**
   * Render entity designer page
   */
  async renderDesigner(req: Request, res: Response): Promise<void> {
    try {
      res.render('pages/custom-entity-designer', {
        title: 'Custom Entity Designer',
        user: (req as any).user,
      });
    } catch (error: any) {
      res.status(500).send('Failed to render designer page');
    }
  }

  /**
   * Render entity list page
   */
  async renderEntityList(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user?.tenantId;
      const entities = await customEntityService.getAllEntities(tenantId);

      res.render('pages/custom-entity-list', {
        title: 'Custom Entities',
        user: (req as any).user,
        entities,
      });
    } catch (error: any) {
      res.status(500).send('Failed to render entity list page');
    }
  }
}

export const customEntityController = new CustomEntityController();
