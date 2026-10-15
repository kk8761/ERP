/**
 * NexaERP — Signature Controller
 * Handles mobile signature capture for approvals and documents
 * Task 40.6 — Mobile Signature Capture
 * Requirements: 22.8 - Mobile signature capture for approvals
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Save signature for an e-signature request
 * POST /api/signatures/sign/:requestId
 */
export const signDocument = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { signatureData, email, name } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress;

    // Validate input
    if (!signatureData || !email) {
      return res.status(400).json({
        success: false,
        error: 'Signature data and email are required',
      });
    }

    // Find the e-signature request
    const request = await prisma.eSignatureRequest.findUnique({
      where: { id: requestId },
      include: { signers: true },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Signature request not found',
      });
    }

    // Check if request is still active
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'This signature request is no longer active',
      });
    }

    // Check if request has expired
    if (request.expiryDate && new Date(request.expiryDate) < new Date()) {
      await prisma.eSignatureRequest.update({
        where: { id: requestId },
        data: { status: 'expired' },
      });

      return res.status(400).json({
        success: false,
        error: 'This signature request has expired',
      });
    }

    // Find the signer
    const signer = request.signers.find((s) => s.email === email);

    if (!signer) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to sign this document',
      });
    }

    // Check if already signed
    if (signer.status === 'signed') {
      return res.status(400).json({
        success: false,
        error: 'You have already signed this document',
      });
    }

    // Update signer with signature
    await prisma.eSignatureSigner.update({
      where: { id: signer.id },
      data: {
        status: 'signed',
        signedAt: new Date(),
        signatureData,
        ipAddress,
      },
    });

    // Check if all signers have signed
    const updatedRequest = await prisma.eSignatureRequest.findUnique({
      where: { id: requestId },
      include: { signers: true },
    });

    const allSigned = updatedRequest?.signers.every(
      (s) => s.status === 'signed' || s.status === 'declined'
    );

    // If all signed, mark request as completed
    if (allSigned) {
      await prisma.eSignatureRequest.update({
        where: { id: requestId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });
    }

    res.json({
      success: true,
      message: 'Signature saved successfully',
      data: {
        requestId,
        allSigned,
      },
    });
  } catch (error) {
    console.error('Error saving signature:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save signature',
    });
  }
};

/**
 * Decline to sign a document
 * POST /api/signatures/decline/:requestId
 */
export const declineSignature = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { email, reason } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    // Find the e-signature request
    const request = await prisma.eSignatureRequest.findUnique({
      where: { id: requestId },
      include: { signers: true },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Signature request not found',
      });
    }

    // Find the signer
    const signer = request.signers.find((s) => s.email === email);

    if (!signer) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to decline this document',
      });
    }

    // Update signer status
    await prisma.eSignatureSigner.update({
      where: { id: signer.id },
      data: {
        status: 'declined',
      },
    });

    res.json({
      success: true,
      message: 'Signature declined',
    });
  } catch (error) {
    console.error('Error declining signature:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to decline signature',
    });
  }
};

/**
 * Get signature request details
 * GET /api/signatures/request/:requestId
 */
export const getSignatureRequest = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { email } = req.query;

    const request = await prisma.eSignatureRequest.findUnique({
      where: { id: requestId },
      include: {
        signers: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Signature request not found',
      });
    }

    // If email provided, filter signer information
    let filteredRequest = { ...request };
    if (email) {
      const signer = request.signers.find((s) => s.email === email);
      if (!signer) {
        return res.status(403).json({
          success: false,
          error: 'You are not authorized to view this request',
        });
      }

      // Only return information relevant to this signer
      filteredRequest.signers = request.signers.map((s) => ({
        ...s,
        signatureData: s.email === email ? s.signatureData : null, // Only show own signature
      }));
    }

    res.json({
      success: true,
      data: filteredRequest,
    });
  } catch (error) {
    console.error('Error fetching signature request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch signature request',
    });
  }
};

/**
 * Create a new signature request
 * POST /api/signatures/request
 */
export const createSignatureRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { documentId, message, expiryDate, signers } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Validate input
    if (!documentId || !signers || !Array.isArray(signers) || signers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Document ID and at least one signer are required',
      });
    }

    // Validate signers
    for (const signer of signers) {
      if (!signer.email || !signer.name) {
        return res.status(400).json({
          success: false,
          error: 'Each signer must have email and name',
        });
      }
    }

    // Create signature request
    const request = await prisma.eSignatureRequest.create({
      data: {
        documentId,
        message,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: 'pending',
        createdById: userId,
        signers: {
          create: signers.map((signer: any, index: number) => ({
            email: signer.email,
            name: signer.name,
            signingOrder: index + 1,
            status: 'pending',
          })),
        },
      },
      include: {
        signers: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Signature request created successfully',
      data: request,
    });
  } catch (error) {
    console.error('Error creating signature request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create signature request',
    });
  }
};

/**
 * Get all signature requests for authenticated user
 * GET /api/signatures/requests
 */
export const getUserSignatureRequests = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const requests = await prisma.eSignatureRequest.findMany({
      where: {
        createdById: userId,
      },
      include: {
        signers: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('Error fetching signature requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch signature requests',
    });
  }
};

/**
 * Get pending signature requests for a specific email
 * GET /api/signatures/pending
 */
export const getPendingSignatures = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    const pendingSigners = await prisma.eSignatureSigner.findMany({
      where: {
        email: email as string,
        status: 'pending',
      },
      include: {
        request: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: pendingSigners,
    });
  } catch (error) {
    console.error('Error fetching pending signatures:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending signatures',
    });
  }
};

/**
 * Save signature for an approval request
 * POST /api/signatures/approve/:approvalId
 */
export const signApproval = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { approvalId } = req.params;
    const { signatureData, decision, comments } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Validate input
    if (!signatureData || !decision) {
      return res.status(400).json({
        success: false,
        error: 'Signature data and decision are required',
      });
    }

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        error: 'Decision must be either approved or rejected',
      });
    }

    // Find the approval request
    const approval = await prisma.approvalRequest.findUnique({
      where: { id: approvalId },
    });

    if (!approval) {
      return res.status(404).json({
        success: false,
        error: 'Approval request not found',
      });
    }

    // Check if user is the assigned approver
    if (approval.approvedById !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to approve this request',
      });
    }

    // Update approval request
    await prisma.approvalRequest.update({
      where: { id: approvalId },
      data: {
        status: decision,
        approvedAt: decision === 'approved' ? new Date() : null,
      },
    });

    // Create approval history record with signature
    await prisma.approvalHistory.create({
      data: {
        requestId: approvalId,
        approverId: userId,
        decision,
        comments: comments || null,
        // Store signature data in comments field for now
        // In production, you might want to add a dedicated signatureData field
        signatureData,
        ipAddress: ipAddress || 'unknown',
        approvedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: `Request ${decision} successfully`,
    });
  } catch (error) {
    console.error('Error signing approval:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sign approval',
    });
  }
};
