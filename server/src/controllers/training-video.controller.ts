/**
 * Training Video Controller
 *
 * HTTP handlers for the video training library API.
 * Public routes expose the catalogue; admin routes allow CRUD management.
 *
 * Requirements: 28.4
 */

import { Request, Response } from 'express';
import * as videoService from '../services/training-video.service';

function getUserId(req: Request): string | undefined {
  return (req as any).user?.userId ?? (req as any).user?.id;
}

// ─── Public / Browse Endpoints ──────────────────────────────────────────────

/**
 * GET /api/help/videos
 *
 * Paginated list of active training videos with optional filters.
 * Query params: module, level, tags (comma-separated), search, page, pageSize
 *
 * Requirements: 28.4
 */
export async function listVideos(req: Request, res: Response): Promise<void> {
  try {
    const { module, level, tags, search, page, pageSize, tenantId } =
      req.query as Record<string, string>;

    const result = await videoService.listVideos({
      module,
      level,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      search,
      isActive: true,
      tenantId,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[TrainingVideoController] listVideos error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to list training videos' });
  }
}

/**
 * GET /api/help/videos/modules
 *
 * Returns a list of distinct module names for filter / sidebar UI.
 *
 * Requirements: 28.4
 */
export async function getModules(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.query.tenantId as string | undefined;
    const modules = await videoService.getModules(tenantId);

    res.json({ success: true, data: modules });
  } catch (error: any) {
    console.error('[TrainingVideoController] getModules error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve modules' });
  }
}

/**
 * GET /api/help/videos/module/:module
 *
 * All active videos for a given module, sorted by sortOrder.
 *
 * Requirements: 28.4
 */
export async function getVideosByModule(req: Request, res: Response): Promise<void> {
  try {
    const { module } = req.params;
    const tenantId = req.query.tenantId as string | undefined;

    const videos = await videoService.getVideosByModule(module, tenantId);

    res.json({
      success: true,
      data: videos,
      message: `Training videos for module '${module}'`,
    });
  } catch (error: any) {
    console.error('[TrainingVideoController] getVideosByModule error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve module videos' });
  }
}

/**
 * GET /api/help/videos/:id
 *
 * Retrieve a single training video by ID (increments view count).
 *
 * Requirements: 28.4
 */
export async function getVideo(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const video = await videoService.getVideoById(id);

    if (!video) {
      res.status(404).json({ success: false, error: 'Training video not found' });
      return;
    }

    res.json({ success: true, data: video });
  } catch (error: any) {
    console.error('[TrainingVideoController] getVideo error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve training video' });
  }
}

// ─── Admin Endpoints ────────────────────────────────────────────────────────

/**
 * GET /api/help/admin/videos
 *
 * Admin listing of all videos (including inactive).
 *
 * Requirements: 28.4
 */
export async function adminListVideos(req: Request, res: Response): Promise<void> {
  try {
    const { module, level, tags, search, page, pageSize, tenantId, isActive } =
      req.query as Record<string, string>;

    const result = await videoService.listVideos({
      module,
      level,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      tenantId,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[TrainingVideoController] adminListVideos error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to list training videos' });
  }
}

/**
 * POST /api/help/admin/videos
 *
 * Create a new training video entry.
 *
 * Requirements: 28.4
 */
export async function createVideo(req: Request, res: Response): Promise<void> {
  try {
    const {
      title,
      description,
      module,
      duration,
      videoUrl,
      thumbnailUrl,
      tags,
      level,
      sortOrder,
      isActive,
      tenantId,
    } = req.body as videoService.CreateVideoData;

    if (!title || !description || !module || !duration || !videoUrl) {
      res.status(400).json({
        success: false,
        error: 'title, description, module, duration, and videoUrl are required',
      });
      return;
    }

    const video = await videoService.createVideo({
      title,
      description,
      module,
      duration,
      videoUrl,
      thumbnailUrl,
      tags,
      level,
      sortOrder,
      isActive,
      tenantId,
      createdBy: getUserId(req),
    });

    res.status(201).json({
      success: true,
      data: video,
      message: 'Training video created successfully',
    });
  } catch (error: any) {
    console.error('[TrainingVideoController] createVideo error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to create training video' });
  }
}

/**
 * PUT /api/help/admin/videos/:id
 *
 * Update an existing training video entry.
 *
 * Requirements: 28.4
 */
export async function updateVideo(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const data = req.body as videoService.UpdateVideoData;

    const video = await videoService.updateVideo(id, {
      ...data,
      updatedBy: getUserId(req),
    });

    res.json({
      success: true,
      data: video,
      message: 'Training video updated successfully',
    });
  } catch (error: any) {
    console.error('[TrainingVideoController] updateVideo error:', error.message);

    if (error.message === 'Training video not found') {
      res.status(404).json({ success: false, error: error.message });
      return;
    }

    res.status(500).json({ success: false, error: 'Failed to update training video' });
  }
}

/**
 * DELETE /api/help/admin/videos/:id
 *
 * Permanently delete a training video entry.
 *
 * Requirements: 28.4
 */
export async function deleteVideo(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await videoService.deleteVideo(id);

    res.json({
      success: true,
      data: null,
      message: 'Training video deleted successfully',
    });
  } catch (error: any) {
    console.error('[TrainingVideoController] deleteVideo error:', error.message);

    if (error.message === 'Training video not found') {
      res.status(404).json({ success: false, error: error.message });
      return;
    }

    res.status(500).json({ success: false, error: 'Failed to delete training video' });
  }
}

/**
 * POST /api/help/admin/videos/seed
 *
 * Seed the library with default training video metadata for all major modules.
 *
 * Requirements: 28.4
 */
export async function seedVideos(_req: Request, res: Response): Promise<void> {
  try {
    const result = await videoService.seedDefaultVideos();

    res.json({
      success: true,
      data: result,
      message:
        result.seeded > 0
          ? `Seeded ${result.seeded} training videos`
          : 'Training videos already seeded — skipped',
    });
  } catch (error: any) {
    console.error('[TrainingVideoController] seedVideos error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to seed training videos' });
  }
}
