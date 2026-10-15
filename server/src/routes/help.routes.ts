/**
 * Help Routes
 *
 * Context-sensitive help API endpoints.
 *
 * Base path: /api/help
 *
 * Public routes (no auth required):
 *   GET /api/help/context/:contextKey         — Articles for a given page/module context
 *   GET /api/help/articles                    — Paginated list of published articles
 *   GET /api/help/articles/:slug              — Single article by slug (increments view count)
 *   GET /api/help/categories                  — Distinct categories
 *   POST /api/help/articles/:id/feedback      — Submit helpful/not-helpful vote
 *   GET /api/help/videos                      — Paginated list of active training videos
 *   GET /api/help/videos/modules              — Distinct module names
 *   GET /api/help/videos/module/:module       — Videos for a specific module
 *   GET /api/help/videos/:id                  — Single training video (increments view count)
 *
 * Admin routes (authentication required):
 *   GET    /api/help/admin/articles           — List all articles (incl. drafts & archived)
 *   GET    /api/help/admin/articles/:id       — Get any article by ID
 *   POST   /api/help/admin/articles           — Create article
 *   PUT    /api/help/admin/articles/:id       — Update article
 *   PATCH  /api/help/admin/articles/:id/publish  — Publish draft
 *   PATCH  /api/help/admin/articles/:id/archive  — Archive article
 *   DELETE /api/help/admin/articles/:id       — Permanently delete
 *   GET    /api/help/admin/videos             — List all videos (incl. inactive)
 *   POST   /api/help/admin/videos             — Create training video
 *   PUT    /api/help/admin/videos/:id         — Update training video
 *   DELETE /api/help/admin/videos/:id         — Delete training video
 *   POST   /api/help/admin/videos/seed        — Seed default video metadata
 *
 * Requirements: 28.1, 28.4
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as HelpController from '../controllers/help.controller';
import * as VideoController from '../controllers/training-video.controller';
import * as ReleaseNotesController from '../controllers/release-notes.controller';

const router = Router();

// ─── Public / Read Routes ───────────────────────────────────────────────────

/**
 * GET /api/help/context/:contextKey
 *
 * Returns published articles for a given page/module context key.
 * e.g. GET /api/help/context/inventory.product-create
 *
 * Requirements: 28.1
 */
router.get('/context/:contextKey', HelpController.getByContext);

/**
 * GET /api/help/categories
 *
 * Returns a list of distinct article categories for filter UIs.
 *
 * Requirements: 28.1
 */
router.get('/categories', HelpController.getCategories);

/**
 * GET /api/help/articles
 *
 * Paginated list of published help articles.
 * Query params: category, tags (comma-separated), search, page, pageSize, tenantId
 *
 * Requirements: 28.1, 28.2
 */
router.get('/articles', HelpController.listArticles);

/**
 * GET /api/help/articles/:slug
 *
 * Returns a single published article by slug.
 * Also resolves related articles and increments view counter.
 *
 * Requirements: 28.1
 */
router.get('/articles/:slug', HelpController.getBySlug);

/**
 * POST /api/help/articles/:id/feedback
 *
 * Submits a helpful / not-helpful vote for an article.
 * Body: { helpful: boolean }
 *
 * Requirements: 28.1
 */
router.post('/articles/:id/feedback', HelpController.submitFeedback);

// ─── Video Training Library Routes (Public) ─────────────────────────────────

/**
 * GET /api/help/videos/modules
 *
 * Returns distinct module names for sidebar / filter UI.
 * Must be declared before /videos/:id to avoid shadowing.
 *
 * Requirements: 28.4
 */
router.get('/videos/modules', VideoController.getModules);

/**
 * GET /api/help/videos/module/:module
 *
 * Returns all active videos for a given module (e.g. "pos", "inventory").
 *
 * Requirements: 28.4
 */
router.get('/videos/module/:module', VideoController.getVideosByModule);

/**
 * GET /api/help/videos
 *
 * Paginated list of active training videos.
 * Query params: module, level, tags (comma-separated), search, page, pageSize
 *
 * Requirements: 28.4
 */
router.get('/videos', VideoController.listVideos);

/**
 * GET /api/help/videos/:id
 *
 * Returns a single training video by ID (increments view count).
 *
 * Requirements: 28.4
 */
router.get('/videos/:id', VideoController.getVideo);

// ─── Admin Routes (authentication required) ─────────────────────────────────

router.use('/admin', authenticate as any);

/**
 * GET /api/help/admin/articles
 *
 * Admin article listing — includes drafts and archived items.
 * Query params: category, tags, isPublished, isArchived, search, page, pageSize, tenantId
 *
 * Requirements: 28.1
 */
router.get('/admin/articles', HelpController.adminListArticles);

/**
 * GET /api/help/admin/articles/:id
 *
 * Get any article by ID (not filtered by published state).
 *
 * Requirements: 28.1
 */
router.get('/admin/articles/:id', HelpController.adminGetById);

/**
 * POST /api/help/admin/articles
 *
 * Create a new help article.
 * Body: { title, slug, content, contextKey, category, summary?, tags?, relatedArticleIds?, isPublished? }
 *
 * Requirements: 28.1
 */
router.post('/admin/articles', HelpController.createArticle);

/**
 * PUT /api/help/admin/articles/:id
 *
 * Update an existing help article.
 *
 * Requirements: 28.1
 */
router.put('/admin/articles/:id', HelpController.updateArticle);

/**
 * PATCH /api/help/admin/articles/:id/publish
 *
 * Publish a draft article, making it visible to users.
 *
 * Requirements: 28.1
 */
router.patch('/admin/articles/:id/publish', HelpController.publishArticle);

/**
 * PATCH /api/help/admin/articles/:id/archive
 *
 * Archive an article (soft delete — hidden from users but not removed from DB).
 *
 * Requirements: 28.1
 */
router.patch('/admin/articles/:id/archive', HelpController.archiveArticle);

/**
 * DELETE /api/help/admin/articles/:id
 *
 * Permanently delete a help article.
 *
 * Requirements: 28.1
 */
router.delete('/admin/articles/:id', HelpController.deleteArticle);

// ─── Admin Video Routes ──────────────────────────────────────────────────────

/**
 * POST /api/help/admin/videos/seed
 *
 * Seed default training video metadata for all major modules. Idempotent.
 *
 * Requirements: 28.4
 */
router.post('/admin/videos/seed', VideoController.seedVideos);

/**
 * GET /api/help/admin/videos
 *
 * Admin listing of all training videos (including inactive).
 * Query params: module, level, tags, search, isActive, page, pageSize
 *
 * Requirements: 28.4
 */
router.get('/admin/videos', VideoController.adminListVideos);

/**
 * POST /api/help/admin/videos
 *
 * Create a new training video entry.
 * Body: { title, description, module, duration, videoUrl, thumbnailUrl?, tags?, level?, sortOrder? }
 *
 * Requirements: 28.4
 */
router.post('/admin/videos', VideoController.createVideo);

/**
 * PUT /api/help/admin/videos/:id
 *
 * Update an existing training video.
 *
 * Requirements: 28.4
 */
router.put('/admin/videos/:id', VideoController.updateVideo);

/**
 * DELETE /api/help/admin/videos/:id
 *
 * Permanently delete a training video.
 *
 * Requirements: 28.4
 */
router.delete('/admin/videos/:id', VideoController.deleteVideo);

// ─── Release Notes Routes (Public) ──────────────────────────────────────────

/**
 * GET /api/help/release-notes/latest
 *
 * Returns the most recently published release note (for "What's New" banner).
 * Must be declared before /:version to avoid shadowing.
 *
 * Requirements: 28.6
 */
router.get('/release-notes/latest', ReleaseNotesController.getLatestReleaseNote);

/**
 * GET /api/help/release-notes
 *
 * Paginated list of published release notes, newest first.
 * Query params: page, pageSize, tenantId
 *
 * Requirements: 28.6
 */
router.get('/release-notes', ReleaseNotesController.listReleaseNotes);

/**
 * GET /api/help/release-notes/:version
 *
 * Returns a single published release note by semver string (e.g. "1.2.0").
 *
 * Requirements: 28.6
 */
router.get('/release-notes/:version', ReleaseNotesController.getReleaseNoteByVersion);

// ─── Release Notes Admin Routes ──────────────────────────────────────────────

/**
 * POST /api/help/admin/release-notes/seed
 *
 * Seeds sample release notes for v1.0–v1.3. Idempotent.
 *
 * Requirements: 28.6
 */
router.post('/admin/release-notes/seed', ReleaseNotesController.seedReleaseNotes);

/**
 * GET /api/help/admin/release-notes
 *
 * Admin listing — all notes including unpublished drafts.
 *
 * Requirements: 28.6
 */
router.get('/admin/release-notes', ReleaseNotesController.adminListReleaseNotes);

/**
 * POST /api/help/admin/release-notes
 *
 * Create a new release note.
 * Body: { version, title, releaseDate, summary, type?, sections?, isPublished?, tenantId? }
 *
 * Requirements: 28.6
 */
router.post('/admin/release-notes', ReleaseNotesController.createReleaseNote);

/**
 * PUT /api/help/admin/release-notes/:id
 *
 * Update an existing release note.
 *
 * Requirements: 28.6
 */
router.put('/admin/release-notes/:id', ReleaseNotesController.updateReleaseNote);

/**
 * PATCH /api/help/admin/release-notes/:id/publish
 *
 * Publish a draft release note.
 *
 * Requirements: 28.6
 */
router.patch('/admin/release-notes/:id/publish', ReleaseNotesController.publishReleaseNote);

export default router;
