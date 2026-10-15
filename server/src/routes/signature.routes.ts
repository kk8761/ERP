/**
 * NexaERP — Signature Routes
 * API routes for mobile signature capture
 * Task 40.6 — Mobile Signature Capture
 */

import { Router } from 'express';
import * as signatureController from '../controllers/signature.controller';

const router = Router();

// Public routes (no authentication required for signing via email link)
router.post('/sign/:requestId', signatureController.signDocument);
router.post('/decline/:requestId', signatureController.declineSignature);
router.get('/request/:requestId', signatureController.getSignatureRequest);
router.get('/pending', signatureController.getPendingSignatures);

// Protected routes (require authentication)
// Note: Add authentication middleware as needed
router.post('/request', signatureController.createSignatureRequest);
router.get('/requests', signatureController.getUserSignatureRequests);
router.post('/approve/:approvalId', signatureController.signApproval);

export default router;
