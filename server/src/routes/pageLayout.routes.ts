/**
 * Page Layout Routes
 */

import { Router } from 'express';
import { pageLayoutController } from '../controllers/pageLayout.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Create page layout
router.post('/', pageLayoutController.create.bind(pageLayoutController));

// Get all layouts
router.get('/', pageLayoutController.getAll.bind(pageLayoutController));

// Get layouts for entity
router.get(
  '/entity/:entityName',
  pageLayoutController.getByEntity.bind(pageLayoutController)
);

// Get default layout
router.get(
  '/entity/:entityName/default/:layoutType',
  pageLayoutController.getDefault.bind(pageLayoutController)
);

// Get layout by ID
router.get('/:id', pageLayoutController.getById.bind(pageLayoutController));

// Update layout
router.put('/:id', pageLayoutController.update.bind(pageLayoutController));

// Delete layout
router.delete('/:id', pageLayoutController.delete.bind(pageLayoutController));

// Clone layout
router.post('/:id/clone', pageLayoutController.clone.bind(pageLayoutController));

// Set as default
router.post(
  '/:id/set-default',
  pageLayoutController.setDefault.bind(pageLayoutController)
);

export default router;
