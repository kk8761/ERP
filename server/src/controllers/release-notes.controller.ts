/**
 * Release Notes Controller
 *
 * HTTP handlers for the release notes API.
 *
 * Public endpoints:
 *   GET /api/help/release-notes              — Paginated published notes
 *   GET /api/help/release-notes/latest       — Most recent published note (for "What's New")
 *   GET /api/help/release-notes/:version     — Single published note by semver
 *
 * Admin endpoints (authentication required):
 *   POST  /api/help/admin/release-notes               — Create note
 *   PUT   /api/help/admin/release-notes/:id           — Update note
 *   PATCH /api/help/admin/release-notes/:id/publish   — Publish draft
 *   POST  /api/help/admin/release-notes/seed          — Seed sample data
 *
 * Requirements: 28.6
 */

import { Request, Response } from 'express';
import * as releaseNotesService from '../services/release-notes.service';

// ─── Public / Read Endpoints ─────────────────────────────────────────────────

/**
 * GET /api/help/release-notes
 *
 * Paginated list of published release notes, newest first.
 * Query params: page, pageSize, tenantId
 *
 * Requirements: 28.6
 */
export async function listReleaseNotes(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string, 10) || 20, 50);
    const tenantId = req.query.tenantId as string | undefined;

    const result = await releaseNotesService.listReleaseNotes({
      isPublished: true,
      tenantId,
      page,
      pageSize,
    });

    res.json({ success: true, data: result, message: 'Release notes retrieved' });
  } catch (error: any) {
    console.error('[ReleaseNotesController] listReleaseNotes error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve release notes' });
  }
}

/**
 * GET /api/help/release-notes/latest
 *
 * Returns the most recently published release note — used to drive the
 * "What's New" login notification.
 *
 * Requirements: 28.6
 */
export async function getLatestReleaseNote(req: Request, res: Response): Promise<void> {
  try {
    const note = await releaseNotesService.getLatestPublished();

    if (!note) {
      res.status(404).json({ success: false, error: 'No published release notes found' });
      return;
    }

    res.json({ success: true, data: note, message: 'Latest release note retrieved' });
  } catch (error: any) {
    console.error('[ReleaseNotesController] getLatestReleaseNote error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve latest release note' });
  }
}

/**
 * GET /api/help/release-notes/:version
 *
 * Returns a single published release note by semver string, e.g. "1.2.0".
 *
 * Requirements: 28.6
 */
export async function getReleaseNoteByVersion(req: Request, res: Response): Promise<void> {
  try {
    const { version } = req.params;
    const note = await releaseNotesService.getReleaseNoteByVersion(version, true);

    if (!note) {
      res.status(404).json({ success: false, error: `Release note for v${version} not found` });
      return;
    }

    res.json({ success: true, data: note, message: `Release note for v${version}` });
  } catch (error: any) {
    console.error('[ReleaseNotesController] getReleaseNoteByVersion error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve release note' });
  }
}

// ─── Admin Endpoints ─────────────────────────────────────────────────────────

/**
 * POST /api/help/admin/release-notes/seed
 *
 * Seeds sample release notes for NexaERP v1.0–v1.3. Idempotent.
 *
 * Requirements: 28.6
 */
export async function seedReleaseNotes(req: Request, res: Response): Promise<void> {
  try {
    const result = await releaseNotesService.seedReleaseNotes();
    res.json({
      success: true,
      data: result,
      message: result.seeded > 0
        ? `Seeded ${result.seeded} release note(s)`
        : 'All sample release notes already exist',
    });
  } catch (error: any) {
    console.error('[ReleaseNotesController] seedReleaseNotes error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to seed release notes' });
  }
}

/**
 * GET /api/help/admin/release-notes
 *
 * Admin listing — returns all notes including unpublished drafts.
 *
 * Requirements: 28.6
 */
export async function adminListReleaseNotes(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string, 10) || 20, 50);
    const tenantId = req.query.tenantId as string | undefined;

    const result = await releaseNotesService.listReleaseNotes({
      isPublished: undefined, // all
      tenantId,
      page,
      pageSize,
    });

    res.json({ success: true, data: result, message: 'All release notes (admin)' });
  } catch (error: any) {
    console.error('[ReleaseNotesController] adminListReleaseNotes error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve release notes' });
  }
}

/**
 * POST /api/help/admin/release-notes
 *
 * Creates a new release note.
 * Body: { version, title, releaseDate, summary, type?, sections?, isPublished?, tenantId? }
 *
 * Requirements: 28.6
 */
export async function createReleaseNote(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.userId ?? (req as any).user?.id;
    const note = await releaseNotesService.createReleaseNote({ ...req.body, createdBy: userId });
    res.status(201).json({ success: true, data: note, message: 'Release note created' });
  } catch (error: any) {
    console.error('[ReleaseNotesController] createReleaseNote error:', error.message);
    if (error.message.includes('already exists') || error.message.includes('Invalid version')) {
      res.status(400).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create release note' });
    }
  }
}

/**
 * PUT /api/help/admin/release-notes/:id
 *
 * Updates an existing release note by ID.
 *
 * Requirements: 28.6
 */
export async function updateReleaseNote(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const note = await releaseNotesService.updateReleaseNote(id, req.body);
    res.json({ success: true, data: note, message: 'Release note updated' });
  } catch (error: any) {
    console.error('[ReleaseNotesController] updateReleaseNote error:', error.message);
    if (error.message.includes('not found')) {
      res.status(404).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update release note' });
    }
  }
}

/**
 * PATCH /api/help/admin/release-notes/:id/publish
 *
 * Publishes a draft release note.
 *
 * Requirements: 28.6
 */
export async function publishReleaseNote(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const note = await releaseNotesService.publishReleaseNote(id);
    res.json({ success: true, data: note, message: 'Release note published' });
  } catch (error: any) {
    console.error('[ReleaseNotesController] publishReleaseNote error:', error.message);
    if (error.message.includes('not found')) {
      res.status(404).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to publish release note' });
    }
  }
}
