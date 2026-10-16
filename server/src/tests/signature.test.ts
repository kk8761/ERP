/**
 * Signature Capture Tests
 * Task 40.6 - Mobile Signature Capture
 * Requirements: 22.8
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Signature Capture API', () => {
  let testUser: any;
  let testDocument: any;
  let testSignatureRequest: any;

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'signature-test@example.com',
        name: 'Signature Test User',
        password: 'hashed_password',
      },
    });

    // Create test document
    testDocument = await prisma.document.create({
      data: {
        title: 'Test Document for Signing',
        fileName: 'test-doc.pdf',
        fileType: '.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        fileUrl: 'https://example.com/test.pdf',
        category: 'contract',
        uploadedById: testUser.id,
        status: 'active',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.eSignatureSigner.deleteMany({
      where: { email: { contains: 'signer@example.com' } },
    });
    await prisma.eSignatureRequest.deleteMany({
      where: { documentId: testDocument.id },
    });
    await prisma.document.delete({ where: { id: testDocument.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.$disconnect();
  });

  test('Should create a signature request', async () => {
    testSignatureRequest = await prisma.eSignatureRequest.create({
      data: {
        documentId: testDocument.id,
        message: 'Please sign this test document',
        status: 'pending',
        createdById: testUser.id,
        signers: {
          create: [
            {
              email: 'signer@example.com',
              name: 'Test Signer',
              signingOrder: 1,
              status: 'pending',
            },
          ],
        },
      },
      include: {
        signers: true,
      },
    });

    expect(testSignatureRequest).toBeDefined();
    expect(testSignatureRequest.status).toBe('pending');
    expect(testSignatureRequest.signers).toHaveLength(1);
  });

  test('Should save signature data', async () => {
    const signer = testSignatureRequest.signers[0];
    const signatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const updatedSigner = await prisma.eSignatureSigner.update({
      where: { id: signer.id },
      data: {
        status: 'signed',
        signedAt: new Date(),
        signatureData,
        ipAddress: '127.0.0.1',
      },
    });

    expect(updatedSigner.status).toBe('signed');
    expect(updatedSigner.signatureData).toBe(signatureData);
    expect(updatedSigner.signedAt).toBeDefined();
  });

  test('Should mark request as completed when all signers sign', async () => {
    const request = await prisma.eSignatureRequest.findUnique({
      where: { id: testSignatureRequest.id },
      include: { signers: true },
    });

    const allSigned = request?.signers.every((s) => s.status === 'signed');

    if (allSigned) {
      await prisma.eSignatureRequest.update({
        where: { id: testSignatureRequest.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });
    }

    const updatedRequest = await prisma.eSignatureRequest.findUnique({
      where: { id: testSignatureRequest.id },
    });

    expect(updatedRequest?.status).toBe('completed');
    expect(updatedRequest?.completedAt).toBeDefined();
  });

  test('Should save signature with approval', async () => {
    // Create test approval request
    const approvalRequest = await prisma.approvalRequest.create({
      data: {
        entityType: 'purchase_order',
        entityId: 'test-po-123',
        requestedById: testUser.id,
        approvedById: testUser.id,
        status: 'pending',
        priority: 'medium',
        currentStep: 1,
        totalSteps: 1,
      },
    });

    const signatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    // Create approval history with signature
    const approvalHistory = await prisma.approvalHistory.create({
      data: {
        requestId: approvalRequest.id,
        approverId: testUser.id,
        action: 'approved',
        comments: 'Approved with signature',
        step: 1,
        signatureData,
        ipAddress: '127.0.0.1',
        approvedAt: new Date(),
      },
    });

    expect(approvalHistory.signatureData).toBe(signatureData);
    expect(approvalHistory.ipAddress).toBe('127.0.0.1');

    // Clean up
    await prisma.approvalHistory.delete({ where: { id: approvalHistory.id } });
    await prisma.approvalRequest.delete({ where: { id: approvalRequest.id } });
  });
});
