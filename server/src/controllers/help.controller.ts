/**
 * Help Controller
 *
 * HTTP handlers for the context-sensitive help API.
 * Public endpoints allow unauthenticated users to read published articles.
 * Admin endpoints require authentication and write-level access.
 *
 * Requirements: 28.1
 */

import { Request, Response } from 'express';
import * as helpService from '../services/help.service';

// Helper to safely read the authenticated user injected by the auth middleware
function getUserId(req: Request): string | undefined {
  return (req as any).user?.userId ?? (req as any).user?.id;
}

// ─── Public / Read Endpoints ────────────────────────────────────────────────

/**
 * GET /api/help/context/:contextKey
 *
 * Returns published articles for a specific page/module context.
 * Context keys follow the pattern "module.action", e.g. "inventory.product-create".
 *
 * Requirements: 28.1
 */
export async function getByContext(req: Request, res: Response): Promise<void> {
  try {
    const { contextKey } = req.params;
    const tenantId = req.query.tenantId as string | undefined;

    if (!contextKey) {
      res.status(400).json({ success: false, error: 'contextKey is required' });
      return;
    }

    const articles = await helpService.getArticlesByContext(contextKey, tenantId);

    res.json({
      success: true,
      data: articles,
      message: `Help articles for context '${contextKey}'`,
    });
  } catch (error: any) {
    console.error('[HelpController] getByContext error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve help articles' });
  }
}

/**
 * GET /api/help/articles/:slug
 *
 * Returns a single published article by slug, including resolved related articles.
 * Also increments the view counter.
 *
 * Requirements: 28.1
 */
export async function getBySlug(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    const tenantId = req.query.tenantId as string | undefined;

    const article = await helpService.getArticleBySlug(slug, tenantId);

    if (!article) {
      res.status(404).json({ success: false, error: 'Help article not found' });
      return;
    }

    res.json({ success: true, data: article });
  } catch (error: any) {
    console.error('[HelpController] getBySlug error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve help article' });
  }
}

/**
 * GET /api/help/articles
 *
 * Lists published articles with optional filters and pagination.
 * Supports query params: category, tags (comma-separated), search, page, pageSize.
 *
 * Requirements: 28.1, 28.2
 */
export async function listArticles(req: Request, res: Response): Promise<void> {
  try {
    const {
      category,
      tags,
      search,
      page,
      pageSize,
      tenantId,
    } = req.query as Record<string, string>;

    const result = await helpService.listArticles({
      category,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      isPublished: true,
      isArchived: false,
      tenantId,
      search,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[HelpController] listArticles error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to list help articles' });
  }
}

/**
 * GET /api/help/categories
 *
 * Returns distinct categories for filter UIs.
 *
 * Requirements: 28.1
 */
export async function getCategories(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.query.tenantId as string | undefined;
    const categories = await helpService.getCategories(tenantId);

    res.json({ success: true, data: categories });
  } catch (error: any) {
    console.error('[HelpController] getCategories error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve categories' });
  }
}

/**
 * POST /api/help/articles/:id/feedback
 *
 * Records a helpful / not-helpful vote on an article.
 * Body: { helpful: boolean }
 *
 * Requirements: 28.1
 */
export async function submitFeedback(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { helpful } = req.body as { helpful?: unknown };

    if (typeof helpful !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'Body must contain `helpful` (boolean)',
      });
      return;
    }

    const counts = await helpService.recordFeedback(id, { helpful });

    res.json({
      success: true,
      data: counts,
      message: 'Feedback recorded',
    });
  } catch (error: any) {
    console.error('[HelpController] submitFeedback error:', error.message);

    if (error.message === 'Help article not found') {
      res.status(404).json({ success: false, error: error.message });
      return;
    }

    res.status(500).json({ success: false, error: 'Failed to record feedback' });
  }
}

// ─── Admin Endpoints ────────────────────────────────────────────────────────

/**
 * GET /api/help/admin/articles
 *
 * Admin listing — includes drafts and archived articles.
 * Supports query params: category, tags, isPublished, isArchived, search, page, pageSize.
 *
 * Requirements: 28.1
 */
export async function adminListArticles(req: Request, res: Response): Promise<void> {
  try {
    const {
      category,
      tags,
      isPublished,
      isArchived,
      search,
      page,
      pageSize,
      tenantId,
    } = req.query as Record<string, string>;

    const result = await helpService.listArticles({
      category,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      isPublished: isPublished !== undefined ? isPublished === 'true' : undefined,
      isArchived: isArchived !== undefined ? isArchived === 'true' : undefined,
      tenantId,
      search,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[HelpController] adminListArticles error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to list help articles' });
  }
}

/**
 * GET /api/help/admin/articles/:id
 *
 * Retrieve any article by ID (admin, no published filter).
 *
 * Requirements: 28.1
 */
export async function adminGetById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const article = await helpService.getArticleById(id);

    if (!article) {
      res.status(404).json({ success: false, error: 'Help article not found' });
      return;
    }

    res.json({ success: true, data: article });
  } catch (error: any) {
    console.error('[HelpController] adminGetById error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve help article' });
  }
}

/**
 * POST /api/help/admin/articles
 *
 * Create a new help article.
 *
 * Requirements: 28.1
 */
export async function createArticle(req: Request, res: Response): Promise<void> {
  try {
    const {
      title,
      slug,
      summary,
      content,
      contextKey,
      category,
      tags,
      relatedArticleIds,
      isPublished,
      tenantId,
    } = req.body as helpService.CreateArticleData;

    if (!title || !slug || !content || !contextKey || !category) {
      res.status(400).json({
        success: false,
        error: 'title, slug, content, contextKey, and category are required',
      });
      return;
    }

    const article = await helpService.createArticle({
      title,
      slug,
      summary,
      content,
      contextKey,
      category,
      tags,
      relatedArticleIds,
      isPublished,
      tenantId,
      createdBy: getUserId(req),
    });

    res.status(201).json({
      success: true,
      data: article,
      message: 'Help article created successfully',
    });
  } catch (error: any) {
    console.error('[HelpController] createArticle error:', error.message);

    if (error.message.includes('already exists')) {
      res.status(409).json({ success: false, error: error.message });
      return;
    }

    res.status(500).json({ success: false, error: 'Failed to create help article' });
  }
}

/**
 * PUT /api/help/admin/articles/:id
 *
 * Update an existing help article.
 *
 * Requirements: 28.1
 */
export async function updateArticle(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const data = req.body as helpService.UpdateArticleData;

    const article = await helpService.updateArticle(id, {
      ...data,
      updatedBy: getUserId(req),
    });

    res.json({
      success: true,
      data: article,
      message: 'Help article updated successfully',
    });
  } catch (error: any) {
    console.error('[HelpController] updateArticle error:', error.message);

    if (error.message === 'Help article not found') {
      res.status(404).json({ success: false, error: error.message });
      return;
    }

    if (error.message.includes('already exists')) {
      res.status(409).json({ success: false, error: error.message });
      return;
    }

    res.status(500).json({ success: false, error: 'Failed to update help article' });
  }
}

/**
 * PATCH /api/help/admin/articles/:id/publish
 *
 * Publish a draft article.
 *
 * Requirements: 28.1
 */
export async function publishArticle(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const article = await helpService.publishArticle(id, getUserId(req));

    res.json({
      success: true,
      data: article,
      message: 'Help article published successfully',
    });
  } catch (error: any) {
    console.error('[HelpController] publishArticle error:', error.message);

    if (error.message === 'Help article not found') {
      res.status(404).json({ success: false, error: error.message });
      return;
    }

    res.status(500).json({ success: false, error: 'Failed to publish help article' });
  }
}

/**
 * PATCH /api/help/admin/articles/:id/archive
 *
 * Archive (soft-delete) an article.
 *
 * Requirements: 28.1
 */
export async function archiveArticle(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const article = await helpService.archiveArticle(id, getUserId(req));

    res.json({
      success: true,
      data: article,
      message: 'Help article archived successfully',
    });
  } catch (error: any) {
    console.error('[HelpController] archiveArticle error:', error.message);

    if (error.message === 'Help article not found') {
      res.status(404).json({ success: false, error: error.message });
      return;
    }

    res.status(500).json({ success: false, error: 'Failed to archive help article' });
  }
}

/**
 * DELETE /api/help/admin/articles/:id
 *
 * Permanently delete a help article.
 *
 * Requirements: 28.1
 */
export async function deleteArticle(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await helpService.deleteArticle(id);

    res.json({
      success: true,
      data: null,
      message: 'Help article deleted successfully',
    });
  } catch (error: any) {
    console.error('[HelpController] deleteArticle error:', error.message);

    if (error.message === 'Help article not found') {
      res.status(404).json({ success: false, error: error.message });
      return;
    }

    res.status(500).json({ success: false, error: 'Failed to delete help article' });
  }
}
