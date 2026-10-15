/**
 * Forum Controller
 *
 * HTTP request/response handlers for the community forum endpoints.
 *
 * Requirements: 28.8
 */

import { Request, Response } from 'express';
import * as ForumService from '../services/forum.service';
import { AuthRequest } from '../middleware/auth';

// ─── Thread Endpoints ─────────────────────────────────────────────────────────

/**
 * GET /api/forum/threads
 * List published threads with optional category filter and search.
 */
export async function listThreads(req: Request, res: Response): Promise<void> {
  try {
    const {
      category,
      search,
      page,
      pageSize,
      tenantId,
    } = req.query as Record<string, string>;

    const result = await ForumService.listThreads({
      category,
      search,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      tenantId,
    });

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/forum/threads/:id
 * Get a single thread with its replies (increments view count).
 */
export async function getThread(req: Request, res: Response): Promise<void> {
  try {
    const thread = await ForumService.getThreadById(req.params.id);
    res.json({ success: true, data: thread });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Thread not found' });
      return;
    }
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/forum/threads
 * Create a new thread (authentication required).
 */
export async function createThread(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { title, content, category, tags, tenantId } = req.body;

    if (!title || !content || !category) {
      res.status(400).json({
        success: false,
        error: 'title, content, and category are required',
      });
      return;
    }

    const validCategories = [
      'General',
      'Features',
      'Bug Reports',
      'How-To',
      'Announcements',
    ];
    if (!validCategories.includes(category)) {
      res.status(400).json({
        success: false,
        error: `category must be one of: ${validCategories.join(', ')}`,
      });
      return;
    }

    const authorId = req.user?.userId ?? 'anonymous';
    const authorName = req.user?.email ?? 'Anonymous';

    const thread = await ForumService.createThread({
      title,
      content,
      category,
      authorId,
      authorName,
      tags: Array.isArray(tags) ? tags : tags ? [tags] : [],
      tenantId,
    });

    res.status(201).json({ success: true, data: thread, message: 'Thread created' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// ─── Reply Endpoints ──────────────────────────────────────────────────────────

/**
 * POST /api/forum/threads/:id/replies
 * Post a reply to a thread (authentication required).
 */
export async function createReply(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { content } = req.body;
    const threadId = req.params.id;

    if (!content) {
      res.status(400).json({ success: false, error: 'content is required' });
      return;
    }

    const authorId = req.user?.userId ?? 'anonymous';
    const authorName = req.user?.email ?? 'Anonymous';

    const reply = await ForumService.createReply({
      threadId,
      content,
      authorId,
      authorName,
    });

    res.status(201).json({ success: true, data: reply, message: 'Reply posted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * PATCH /api/forum/threads/:id/answer/:replyId
 * Mark a reply as the accepted answer (authentication required).
 */
export async function markAnswer(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id: threadId, replyId } = req.params;
    const result = await ForumService.markAnswered(threadId, replyId);
    res.json({ success: true, data: result, message: 'Answer marked' });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Thread or reply not found' });
      return;
    }
    res.status(500).json({ success: false, error: err.message });
  }
}

// ─── Admin / Moderation Endpoints ─────────────────────────────────────────────

/**
 * PATCH /api/forum/threads/:id/pin
 * Toggle the pinned status of a thread.
 */
export async function pinThread(req: AuthRequest, res: Response): Promise<void> {
  try {
    const thread = await ForumService.togglePin(req.params.id);
    res.json({
      success: true,
      data: thread,
      message: thread.isPinned ? 'Thread pinned' : 'Thread unpinned',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * DELETE /api/forum/threads/:id
 * Soft-delete a thread (sets isPublished = false).
 */
export async function deleteThread(req: AuthRequest, res: Response): Promise<void> {
  try {
    await ForumService.deleteThread(req.params.id);
    res.json({ success: true, message: 'Thread removed' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * GET /api/forum/stats
 * Return aggregate forum statistics.
 */
export async function getStats(_req: Request, res: Response): Promise<void> {
  try {
    const stats = await ForumService.getForumStats();
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/forum/seed
 * Seed sample forum threads (idempotent).
 */
export async function seedForum(_req: Request, res: Response): Promise<void> {
  try {
    const result = await ForumService.seedForumThreads();
    res.json({ success: true, data: result, message: 'Seed complete' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
