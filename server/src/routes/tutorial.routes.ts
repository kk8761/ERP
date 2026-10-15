/**
 * Tutorial Routes
 *
 * Registers all interactive tutorial endpoints.
 *
 * Base path: /api/tutorials
 *
 * Public routes (no auth required):
 *   GET /api/tutorials                            — List active tutorials
 *   GET /api/tutorials/module/:module             — Tutorials for a module
 *   GET /api/tutorials/:id                        — Tutorial detail with steps
 *
 * Authenticated user routes:
 *   GET  /api/tutorials/progress                  — User's completion summary
 *   POST /api/tutorials/:id/start                 — Start / resume a tutorial
 *   POST /api/tutorials/:id/steps/:stepId/complete — Complete a step
 *   POST /api/tutorials/:id/skip                  — Skip a tutorial
 *   POST /api/tutorials/:id/reset                 — Reset progress
 *
 * Admin routes (auth required):
 *   POST   /api/tutorials/admin                   — Create tutorial
 *   PUT    /api/tutorials/admin/:id               — Update tutorial
 *   DELETE /api/tutorials/admin/:id               — Delete tutorial
 *   PUT    /api/tutorials/admin/:id/steps         — Replace tutorial steps
 *
 * Requirements: 28.3
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as TutorialController from '../controllers/TutorialController';

const router = Router();

// ─── Public / Browse Routes ───────────────────────────────────────────────────

/**
 * GET /api/tutorials
 *
 * Paginated list of active tutorials.
 * Supports: module, category, tags, search, page, pageSize query params.
 * Requirements: 28.3
 */
router.get('/', TutorialController.listTutorials);

/**
 * GET /api/tutorials/module/:module
 *
 * All active tutorials for a given module (e.g. "inventory", "pos", "orders").
 * Requirements: 28.3
 */
router.get('/module/:module', TutorialController.getTutorialsByModule);

// ─── Auth-protected user routes ───────────────────────────────────────────────
// These must be declared BEFORE the /:id route to avoid being shadowed.

/**
 * GET /api/tutorials/progress
 *
 * Returns the authenticated user's progress across all tutorials.
 * Requirements: 28.3
 */
router.get('/progress', authenticate as any, TutorialController.getUserProgress);

// ─── Admin Routes ─────────────────────────────────────────────────────────────

router.use('/admin', authenticate as any);

/**
 * POST /api/tutorials/admin
 *
 * Create a new tutorial (optionally with inline steps).
 * Body: { title, slug, module, category, description?, tags?, sortOrder?, isActive?, steps? }
 * Requirements: 28.3
 */
router.post('/admin', TutorialController.createTutorial);

/**
 * PUT /api/tutorials/admin/:id
 *
 * Update tutorial metadata.
 * Requirements: 28.3
 */
router.put('/admin/:id', TutorialController.updateTutorial);

/**
 * DELETE /api/tutorials/admin/:id
 *
 * Permanently delete a tutorial.
 * Requirements: 28.3
 */
router.delete('/admin/:id', TutorialController.deleteTutorial);

/**
 * PUT /api/tutorials/admin/:id/steps
 *
 * Replace all steps for a tutorial.
 * Body: { steps: TutorialStep[] }
 * Requirements: 28.3
 */
router.put('/admin/:id/steps', TutorialController.replaceTutorialSteps);

// ─── Tutorial Detail + User Action Routes ────────────────────────────────────

/**
 * GET /api/tutorials/:id
 *
 * Single tutorial with all steps.
 * Requirements: 28.3
 */
router.get('/:id', TutorialController.getTutorial);

/**
 * POST /api/tutorials/:id/start
 *
 * Start or resume a tutorial. Creates progress record.
 * Requirements: 28.3
 */
router.post('/:id/start', authenticate as any, TutorialController.startTutorial);

/**
 * POST /api/tutorials/:id/steps/:stepId/complete
 *
 * Mark a step complete. Auto-advances progress.
 * Requirements: 28.3
 */
router.post(
  '/:id/steps/:stepId/complete',
  authenticate as any,
  TutorialController.completeStep
);

/**
 * POST /api/tutorials/:id/skip
 *
 * Skip (dismiss) a tutorial.
 * Requirements: 28.3
 */
router.post('/:id/skip', authenticate as any, TutorialController.skipTutorial);

/**
 * POST /api/tutorials/:id/reset
 *
 * Reset a user's progress for a tutorial.
 * Requirements: 28.3
 */
router.post('/:id/reset', authenticate as any, TutorialController.resetProgress);

export default router;
