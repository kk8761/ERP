/**
 * Tutorial Controller
 *
 * HTTP request handlers for the interactive tutorial API.
 *
 * Public routes (auth optional — user may be unauthenticated):
 *   GET /api/tutorials                     — List active tutorials (with optional module filter)
 *   GET /api/tutorials/:id                 — Get tutorial by ID (with steps)
 *   GET /api/tutorials/module/:module      — Get all tutorials for a module
 *
 * Authenticated user routes:
 *   POST /api/tutorials/:id/start          — Start / resume a tutorial
 *   POST /api/tutorials/:id/steps/:stepId/complete — Mark a step complete
 *   POST /api/tutorials/:id/skip           — Skip a tutorial
 *   POST /api/tutorials/:id/reset          — Reset progress for a tutorial
 *   GET  /api/tutorials/progress           — Get full progress summary for the logged-in user
 *
 * Admin routes:
 *   POST   /api/tutorials/admin            — Create tutorial
 *   PUT    /api/tutorials/admin/:id        — Update tutorial metadata
 *   DELETE /api/tutorials/admin/:id        — Delete tutorial
 *   PUT    /api/tutorials/admin/:id/steps  — Replace all steps for a tutorial
 *
 * Requirements: 28.3
 */

import { Request, Response } from 'express';
import * as TutorialService from '../services/TutorialService';

// Helper to extract userId from the JWT payload injected by authenticate middleware
function getUserId(req: Request): string | undefined {
  return (req as any).user?.userId ?? (req as any).user?.id;
}

// ─── Public / Browse Endpoints ────────────────────────────────────────────────

/**
 * GET /api/tutorials
 *
 * Returns a paginated list of active tutorials.
 * Supports query params: module, category, tags (comma-sep), search, page, pageSize.
 * Requirements: 28.3
 */
export async function listTutorials(req: Request, res: Response): Promise<void> {
  try {
    const { module, category, tags, search, page, pageSize, tenantId } =
      req.query as Record<string, string>;

    const result = await TutorialService.listTutorials({
      module,
      category,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      isActive: true,
      tenantId,
      search,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });

    res.json({ success: true, data: result, message: 'Tutorials retrieved successfully' });
  } catch (error: any) {
    console.error('[TutorialController] listTutorials error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve tutorials' });
  }
}

/**
 * GET /api/tutorials/progress
 *
 * Returns the current user's tutorial progress across all active tutorials.
 * Must be authenticated.
 * Requirements: 28.3
 */
export async function getUserProgress(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const tenantId = req.query.tenantId as string | undefined;
    const progress = await TutorialService.getUserProgress(userId, tenantId);

    res.json({
      success: true,
      data: progress,
      message: 'Tutorial progress retrieved successfully',
    });
  } catch (error: any) {
    console.error('[TutorialController] getUserProgress error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve tutorial progress' });
  }
}

/**
 * GET /api/tutorials/module/:module
 *
 * Returns all active tutorials for a specific module (e.g. "inventory", "pos").
 * Requirements: 28.3
 */
export async function getTutorialsByModule(req: Request, res: Response): Promise<void> {
  try {
    const { module } = req.params;
    const tenantId = req.query.tenantId as string | undefined;

    const tutorials = await TutorialService.getTutorialsByModule(module, tenantId);

    res.json({
      success: true,
      data: tutorials,
      message: `Tutorials for module '${module}' retrieved successfully`,
    });
  } catch (error: any) {
    console.error('[TutorialController] getTutorialsByModule error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve module tutorials' });
  }
}

/**
 * GET /api/tutorials/:id
 *
 * Returns a single tutorial with all its steps.
 * Requirements: 28.3
 */
export async function getTutorial(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const tutorial = await TutorialService.getTutorialById(id);

    if (!tutorial) {
      res.status(404).json({ success: false, error: 'Tutorial not found' });
      return;
    }

    res.json({ success: true, data: tutorial, message: 'Tutorial retrieved successfully' });
  } catch (error: any) {
    console.error('[TutorialController] getTutorial error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve tutorial' });
  }
}

// ─── User Progress Endpoints (auth required) ──────────────────────────────────

/**
 * POST /api/tutorials/:id/start
 *
 * Starts or resumes a tutorial for the current user.
 * Returns the progress record and the full tutorial + steps.
 * Requirements: 28.3
 */
export async function startTutorial(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id: tutorialId } = req.params;
    const result = await TutorialService.startTutorial(userId, tutorialId);

    res.json({ success: true, data: result, message: 'Tutorial started successfully' });
  } catch (error: any) {
    console.error('[TutorialController] startTutorial error:', error.message);

    if (error.message === 'Tutorial not found') {
      res.status(404).json({ success: false, error: error.message });
      return;
    }
    if (error.message === 'Tutorial is not active') {
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    res.status(500).json({ success: false, error: 'Failed to start tutorial' });
  }
}

/**
 * POST /api/tutorials/:id/steps/:stepId/complete
 *
 * Marks a tutorial step as completed for the current user.
 * Automatically advances the progress counter and marks the tutorial
 * complete if all steps have been finished.
 * Requirements: 28.3
 */
export async function completeStep(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id: tutorialId, stepId } = req.params;
    const result = await TutorialService.completeStep(userId, tutorialId, stepId);

    res.json({ success: true, data: result, message: 'Step completed successfully' });
  } catch (error: any) {
    console.error('[TutorialController] completeStep error:', error.message);

    if (
      error.message === 'Tutorial not found' ||
      error.message === 'Step not found for this tutorial'
    ) {
      res.status(404).json({ success: false, error: error.message });
      return;
    }

    res.status(500).json({ success: false, error: 'Failed to complete step' });
  }
}

/**
 * POST /api/tutorials/:id/skip
 *
 * Skips (dismisses) a tutorial without completing it.
 * Requirements: 28.3
 */
export async function skipTutorial(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id: tutorialId } = req.params;
    const result = await TutorialService.skipTutorial(userId, tutorialId);

    res.json({ success: true, data: result, message: 'Tutorial skipped' });
  } catch (error: any) {
    console.error('[TutorialController] skipTutorial error:', error.message);

    if (error.message === 'Tutorial not found') {
      res.status(404).json({ success: false, error: error.message });
      return;
    }

    res.status(500).json({ success: false, error: 'Failed to skip tutorial' });
  }
}

/**
 * POST /api/tutorials/:id/reset
 *
 * Resets the current user's progress for a tutorial so they can replay it.
 * Requirements: 28.3
 */
export async function resetProgress(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id: tutorialId } = req.params;
    await TutorialService.resetProgress(userId, tutorialId);

    res.json({ success: true, data: null, message: 'Tutorial progress reset successfully' });
  } catch (error: any) {
    console.error('[TutorialController] resetProgress error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to reset tutorial progress' });
  }
}

// ─── Admin Endpoints ──────────────────────────────────────────────────────────

/**
 * POST /api/tutorials/admin
 *
 * Creates a new tutorial (optionally with inline steps).
 * Requirements: 28.3
 */
export async function createTutorial(req: Request, res: Response): Promise<void> {
  try {
    const data = req.body as TutorialService.CreateTutorialData;

    if (!data.title || !data.slug || !data.module || !data.category) {
      res.status(400).json({
        success: false,
        error: 'title, slug, module, and category are required',
      });
      return;
    }

    const tutorial = await TutorialService.createTutorial({
      ...data,
      createdBy: getUserId(req),
    });

    res.status(201).json({
      success: true,
      data: tutorial,
      message: 'Tutorial created successfully',
    });
  } catch (error: any) {
    console.error('[TutorialController] createTutorial error:', error.message);

    if (error.message.includes('already exists')) {
      res.status(409).json({ success: false, error: error.message });
      return;
    }

    res.status(500).json({ success: false, error: 'Failed to create tutorial' });
  }
}

/**
 * PUT /api/tutorials/admin/:id
 *
 * Updates tutorial metadata (not steps — use the steps endpoint for that).
 * Requirements: 28.3
 */
export async function updateTutorial(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const data = req.body as TutorialService.UpdateTutorialData;

    const tutorial = await TutorialService.updateTutorial(id, {
      ...data,
      updatedBy: getUserId(req),
    });

    res.json({ success: true, data: tutorial, message: 'Tutorial updated successfully' });
  } catch (error: any) {
    console.error('[TutorialController] updateTutorial error:', error.message);

    if (error.message === 'Tutorial not found') {
      res.status(404).json({ success: false, error: error.message });
      return;
    }
    if (error.message.includes('already exists')) {
      res.status(409).json({ success: false, error: error.message });
      return;
    }

    res.status(500).json({ success: false, error: 'Failed to update tutorial' });
  }
}

/**
 * DELETE /api/tutorials/admin/:id
 *
 * Permanently deletes a tutorial and all its steps/progress records.
 * Requirements: 28.3
 */
export async function deleteTutorial(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await TutorialService.deleteTutorial(id);

    res.json({ success: true, data: null, message: 'Tutorial deleted successfully' });
  } catch (error: any) {
    console.error('[TutorialController] deleteTutorial error:', error.message);

    if (error.message === 'Tutorial not found') {
      res.status(404).json({ success: false, error: error.message });
      return;
    }

    res.status(500).json({ success: false, error: 'Failed to delete tutorial' });
  }
}

/**
 * PUT /api/tutorials/admin/:id/steps
 *
 * Replaces the complete step list for a tutorial.
 * Body: { steps: CreateTutorialStepData[] }
 * Requirements: 28.3
 */
export async function replaceTutorialSteps(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { steps } = req.body as { steps?: TutorialService.CreateTutorialStepData[] };

    if (!Array.isArray(steps)) {
      res.status(400).json({ success: false, error: '`steps` array is required' });
      return;
    }

    const updatedSteps = await TutorialService.replaceTutorialSteps(id, steps);

    res.json({
      success: true,
      data: updatedSteps,
      message: 'Tutorial steps updated successfully',
    });
  } catch (error: any) {
    console.error('[TutorialController] replaceTutorialSteps error:', error.message);

    if (error.message === 'Tutorial not found') {
      res.status(404).json({ success: false, error: error.message });
      return;
    }

    res.status(500).json({ success: false, error: 'Failed to update tutorial steps' });
  }
}
