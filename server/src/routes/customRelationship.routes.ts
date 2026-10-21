/**
 * Custom Relationship Routes
 */

import { Router } from 'express';
import { customRelationshipController } from '../controllers/customRelationship.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create relationship
router.post(
  '/',
  customRelationshipController.create.bind(customRelationshipController)
);

// Get all relationships
router.get(
  '/',
  customRelationshipController.getAll.bind(customRelationshipController)
);

// Get relationships for entity
router.get(
  '/entity/:entityId',
  customRelationshipController.getByEntity.bind(customRelationshipController)
);

// Get relationship by ID
router.get(
  '/:id',
  customRelationshipController.getById.bind(customRelationshipController)
);

// Update relationship
router.put(
  '/:id',
  customRelationshipController.update.bind(customRelationshipController)
);

// Delete relationship
router.delete(
  '/:id',
  customRelationshipController.delete.bind(customRelationshipController)
);

// Get related records
router.get(
  '/:id/records/:recordId',
  customRelationshipController.getRelatedRecords.bind(
    customRelationshipController
  )
);

// Link records (many-to-many)
router.post(
  '/:id/link',
  customRelationshipController.linkRecords.bind(customRelationshipController)
);

// Unlink records (many-to-many)
router.post(
  '/:id/unlink',
  customRelationshipController.unlinkRecords.bind(customRelationshipController)
);

// Generate views and forms
router.get(
  '/:id/views',
  customRelationshipController.generateViews.bind(
    customRelationshipController
  )
);

// Get linked records (many-to-many)
router.get(
  '/:id/linked/:recordId',
  customRelationshipController.getLinkedRecords.bind(
    customRelationshipController
  )
);

// Get related record (one-to-one)
router.get(
  '/:id/related/:recordId',
  customRelationshipController.getRelatedRecord.bind(
    customRelationshipController
  )
);

// Query related records with filters and pagination
router.get(
  '/:id/query/:recordId',
  customRelationshipController.queryRelatedRecords.bind(
    customRelationshipController
  )
);

// Get relationship statistics
router.get(
  '/:id/statistics',
  customRelationshipController.getStatistics.bind(
    customRelationshipController
  )
);

export default router;
