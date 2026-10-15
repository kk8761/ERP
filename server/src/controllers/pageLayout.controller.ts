/**
 * Page Layout Controller
 * Handles HTTP requests for page layout management
 */

import { Request, Response } from 'express';
import { pageLayoutService } from '../services/pageLayout.service';

export class PageLayoutController {
  /**
   * Create a new page layout
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

      const result = await pageLayoutService.createLayout(
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
   * Get all layouts for an entity
   */
  async getByEntity(req: Request, res: Response): Promise<void> {
    try {
      const { entityName } = req.params;
      const { layoutType } = req.query;
      const tenantId = (req.user as any)?.tenantId;

      const layouts = await pageLayoutService.getLayoutsForEntity(
        entityName,
        layoutType as string,
        tenantId
      );

      res.json({
        success: true,
        layouts,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get default layout
   */
  async getDefault(req: Request, res: Response): Promise<void> {
    try {
      const { entityName, layoutType } = req.params;
      const tenantId = (req.user as any)?.tenantId;

      const layout = await pageLayoutService.getDefaultLayout(
        entityName,
        layoutType,
        tenantId
      );

      if (!layout) {
        res.status(404).json({
          success: false,
          message: 'No default layout found',
        });
        return;
      }

      res.json({
        success: true,
        layout,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get layout by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const layout = await pageLayoutService.getLayoutById(id);

      if (!layout) {
        res.status(404).json({
          success: false,
          message: 'Layout not found',
        });
        return;
      }

      res.json({
        success: true,
        layout,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Update layout
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const layout = await pageLayoutService.updateLayout(id, req.body);

      res.json({
        success: true,
        layout,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Delete layout
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await pageLayoutService.deleteLayout(id);

      res.json({
        success: true,
        message: 'Layout deleted successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Clone layout
   */
  async clone(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const userId = (req.user as any)?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const result = await pageLayoutService.cloneLayout(id, name, userId);

      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Set as default
   */
  async setDefault(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const layout = await pageLayoutService.setAsDefault(id);

      res.json({
        success: true,
        layout,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get all layouts
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req.user as any)?.tenantId;

      const layouts = await pageLayoutService.getAllLayouts(tenantId);

      res.json({
        success: true,
        layouts,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export const pageLayoutController = new PageLayoutController();
