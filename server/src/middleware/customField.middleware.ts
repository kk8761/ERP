/**
 * Custom Field Middleware
 * Automatically injects custom fields into entity queries and responses
 * Requirements: 26.1
 * Task: 37.2
 */

import { Request, Response, NextFunction } from 'express';
import { customFieldService } from '../services/customField.service';

/**
 * Middleware to enrich entity response with custom fields
 * Usage: app.use('/api/products', enrichWithCustomFields('Product'), productRoutes);
 */
export function enrichWithCustomFields(entityName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any): Response {
      // Only enrich successful responses with data
      if (body && body.success !== false) {
        const tenantId = (req.user as any)?.tenantId;

        // Handle single record
        if (body.data && body.data.id) {
          customFieldService
            .enrichEntityWithCustomFields(entityName, body.data, tenantId)
            .then((enriched) => {
              body.data = enriched;
              return originalJson(body);
            })
            .catch((error) => {
              console.error('Error enriching entity with custom fields:', error);
              return originalJson(body);
            });
          return res;
        }

        // Handle array of records
        if (Array.isArray(body.data)) {
          customFieldService
            .enrichEntitiesWithCustomFields(entityName, body.data, tenantId)
            .then((enriched) => {
              body.data = enriched;
              return originalJson(body);
            })
            .catch((error) => {
              console.error('Error enriching entities with custom fields:', error);
              return originalJson(body);
            });
          return res;
        }

        // Handle paginated responses
        if (body.data && Array.isArray(body.data.items)) {
          customFieldService
            .enrichEntitiesWithCustomFields(entityName, body.data.items, tenantId)
            .then((enriched) => {
              body.data.items = enriched;
              return originalJson(body);
            })
            .catch((error) => {
              console.error('Error enriching entities with custom fields:', error);
              return originalJson(body);
            });
          return res;
        }
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Middleware to extract custom fields from request body
 * Separates custom fields from standard fields for processing
 */
export function extractCustomFields(entityName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = (req.user as any)?.tenantId;

      // Get custom field definitions for this entity
      const customFieldDefs = await customFieldService.getCustomFields(
        entityName,
        tenantId
      );

      if (customFieldDefs.length === 0) {
        return next();
      }

      // Extract custom field values from request body
      const customFieldNames = customFieldDefs.map((def: any) => def.fieldName);
      const customFieldValues: Record<string, any> = {};
      const standardFields: Record<string, any> = {};

      for (const [key, value] of Object.entries(req.body)) {
        if (customFieldNames.includes(key)) {
          customFieldValues[key] = value;
        } else {
          standardFields[key] = value;
        }
      }

      // Store separated fields in request for later use
      (req as any).customFields = customFieldValues;
      (req as any).standardFields = standardFields;

      // Replace body with standard fields only
      req.body = standardFields;

      next();
    } catch (error) {
      console.error('Error extracting custom fields:', error);
      next();
    }
  };
}

/**
 * Middleware to save custom fields after entity creation/update
 * Should be used after the entity has been saved
 */
export function saveCustomFields(entityName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customFields = (req as any).customFields;
      const recordId = (req as any).savedRecordId || req.params.id;
      const userId = (req.user as any)?.id;
      const tenantId = (req.user as any)?.tenantId;

      if (customFields && Object.keys(customFields).length > 0 && recordId) {
        await customFieldService.setCustomFieldValues(
          entityName,
          recordId,
          customFields,
          userId,
          tenantId
        );
      }

      next();
    } catch (error) {
      console.error('Error saving custom fields:', error);
      // Don't fail the request if custom field save fails
      next();
    }
  };
}

/**
 * Middleware to validate custom fields
 * Validates custom field values before entity creation/update
 */
export function validateCustomFields(entityName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = (req.user as any)?.tenantId;
      const customFields = (req as any).customFields || {};

      // Get custom field definitions
      const customFieldDefs = await customFieldService.getCustomFields(
        entityName,
        tenantId
      );

      // Validate each custom field
      for (const fieldDef of customFieldDefs) {
        const value = customFields[fieldDef.fieldName];

        // Check required fields
        if (fieldDef.isRequired && (value === null || value === undefined || value === '')) {
          return res.status(400).json({
            success: false,
            message: `${fieldDef.fieldLabel} is required`,
          });
        }
      }

      next();
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };
}
