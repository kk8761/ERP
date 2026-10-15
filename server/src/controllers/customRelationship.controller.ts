/**
 * Custom Relationship Controller
 * Handles HTTP requests for custom relationship management
 */

import { Request, Response } from 'express';
import { customRelationshipService } from '../services/customRelationship.service';

export class CustomRelationshipController {
  /**
   * Create a new relationship
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const result = await customRelationshipService.createRelationship(
        req.body,
        userId
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
   * Get all relationships for an entity
   */
  async getByEntity(req: Request, res: Response): Promise<void> {
    try {
      const { entityId } = req.params;

      const relationships =
        await customRelationshipService.getRelationshipsForEntity(entityId);

      res.json({
        success: true,
        relationships,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get relationship by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const relationship = await customRelationshipService.getRelationshipById(
        id
      );

      if (!relationship) {
        res.status(404).json({
          success: false,
          message: 'Relationship not found',
        });
        return;
      }

      res.json({
        success: true,
        relationship,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Update relationship
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const relationship = await customRelationshipService.updateRelationship(
        id,
        req.body
      );

      res.json({
        success: true,
        relationship,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Delete relationship
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await customRelationshipService.deleteRelationship(id);

      res.json({
        success: true,
        message: 'Relationship deleted successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get related records
   */
  async getRelatedRecords(req: Request, res: Response): Promise<void> {
    try {
      const { id, recordId } = req.params;

      const records = await customRelationshipService.getRelatedRecords(
        id,
        recordId
      );

      res.json({
        success: true,
        records,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Link records (many-to-many)
   */
  async linkRecords(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { sourceRecordId, targetRecordId } = req.body;

      await customRelationshipService.linkRecords(
        id,
        sourceRecordId,
        targetRecordId
      );

      res.json({
        success: true,
        message: 'Records linked successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Unlink records (many-to-many)
   */
  async unlinkRecords(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { sourceRecordId, targetRecordId } = req.body;

      await customRelationshipService.unlinkRecords(
        id,
        sourceRecordId,
        targetRecordId
      );

      res.json({
        success: true,
        message: 'Records unlinked successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get all relationships
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const relationships =
        await customRelationshipService.getAllRelationships();

      res.json({
        success: true,
        relationships,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Generate views and forms for a relationship
   */
  async generateViews(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const views = await customRelationshipService.generateRelationshipViews(
        id
      );

      res.json({
        success: true,
        views,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get linked records (many-to-many)
   */
  async getLinkedRecords(req: Request, res: Response): Promise<void> {
    try {
      const { id, recordId } = req.params;

      const records = await customRelationshipService.getLinkedRecords(
        id,
        recordId
      );

      res.json({
        success: true,
        records,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get related record (one-to-one)
   */
  async getRelatedRecord(req: Request, res: Response): Promise<void> {
    try {
      const { id, recordId } = req.params;

      const record = await customRelationshipService.getRelatedRecord(
        id,
        recordId
      );

      res.json({
        success: true,
        record,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Query related records with filters and pagination
   */
  async queryRelatedRecords(req: Request, res: Response): Promise<void> {
    try {
      const { id, recordId } = req.params;
      const { filters, sort, page, pageSize } = req.query;

      const options: any = {};

      if (filters) {
        options.filters = JSON.parse(filters as string);
      }

      if (sort) {
        options.sort = JSON.parse(sort as string);
      }

      if (page) {
        options.page = parseInt(page as string, 10);
      }

      if (pageSize) {
        options.pageSize = parseInt(pageSize as string, 10);
      }

      const result = await customRelationshipService.queryRelatedRecords(
        id,
        recordId,
        options
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
   * Get relationship statistics
   */
  async getStatistics(_req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const statistics =
        await customRelationshipService.getRelationshipStatistics(id);

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
}

export const customRelationshipController = new CustomRelationshipController();
