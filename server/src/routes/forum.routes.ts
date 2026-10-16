/**
 * Forum Routes
 *
 * Base path: /api/forum
 *
 * Public routes:
 *   GET  /api/forum/threads            — list threads (category/search/pagination)
 *   GET  /api/forum/threads/:id        — get thread with replies (increments viewCount)
 *   GET  /api/forum/stats              — forum statistics
 *
 * Authenticated routes:
 *   POST  /api/forum/threads                      — create thread
 *   POST  /api/forum/threads/:id/replies          — post reply
 *   PATCH /api/forum/threads/:id/answer/:replyId  — mark accepted answer
 *   PATCH /api/forum/threads/:id/pin              — toggle pin (admin)
 *   DELETE /api/forum/threads/:id                 — soft-delete thread (admin)
 *
 * Admin / seed:
 *   POST /api/forum/seed  — seed sample threads
 *
 * Requirements: 28.8
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as ForumController from '../controllers/forum.controller';

const router = Router();

// ─── Public Routes ────────────────────────────────────────────────────────────

/** GET /api/forum/stats */
router.get('/stats', ForumController.getStats);

/** GET /api/forum/threads */
router.get('/threads', ForumController.listThreads);

/** GET /api/forum/threads/:id */
router.get('/threads/:id', ForumController.getThread);

// ─── Authenticated Routes ─────────────────────────────────────────────────────

/** POST /api/forum/threads */
router.post('/threads', authenticate as any, ForumController.createThread);

/** POST /api/forum/threads/:id/replies */
router.post('/threads/:id/replies', authenticate as any, ForumController.createReply);

/** PATCH /api/forum/threads/:id/answer/:replyId */
router.patch(
  '/threads/:id/answer/:replyId',
  authenticate as any,
  ForumController.markAnswer
);

/** PATCH /api/forum/threads/:id/pin */
router.patch('/threads/:id/pin', authenticate as any, ForumController.pinThread);

/** DELETE /api/forum/threads/:id */
router.delete('/threads/:id', authenticate as any, ForumController.deleteThread);

// ─── Seed ─────────────────────────────────────────────────────────────────────

/** POST /api/forum/seed */
router.post('/seed', ForumController.seedForum);

export default router;
