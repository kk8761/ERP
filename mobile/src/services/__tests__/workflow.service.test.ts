/**
 * Workflow Service Tests
 * 
 * Tests for mobile workflow and approval operations
 */

import workflowService, { ApprovalRequest, ProcessApprovalRequest } from '../workflow.service';
import apiService from '../api.service';
import offlineService from '../offline.service';

// Mock dependencies
jest.mock('../api.service');
jest.mock('../offline.service');

const mockApiService = apiService as jest.Mocked<typeof apiService>;
const mockOfflineService = offlineService as jest.Mocked<typeof offlineService>;

describe('WorkflowService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPendingApprovals', () => {
    it('should fetch pending approvals successfully', async () => {
      const mockApprovals: ApprovalRequest[] = [
        {
          id: '1',
          entityType: 'purchase_order',
          entityId: 'PO-001',
          requesterId: 'user1',
          status: 'pending',
          currentStep: 1,
          totalSteps: 2,
          workflowId: 'wf1',
          title: 'Purchase Order #001',
          priority: 'high',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockApiService.get.mockResolvedValue({ data: mockApprovals });

      const result = await workflowService.getPendingApprovals();

      expect(result).toEqual(mockApprovals);
      expect(mockApiService.get).toHaveBeenCalledWith('/api/approvals/pending');
    });

    it('should throw error when fetch fails', async () => {
      mockApiService.get.mockRejectedValue(new Error('Network error'));

      await expect(workflowService.getPendingApprovals()).rejects.toThrow();
    });
  });

  describe('processApproval', () => {
    it('should process approval when online', async () => {
      mockOfflineService.isOnline.mockResolvedValue(true);
      mockApiService.post.mockResolvedValue({
        data: { success: true, message: 'Approved successfully' },
      });

      const request: ProcessApprovalRequest = {
        action: 'approved',
        comments: 'Looks good',
      };

      const result = await workflowService.processApproval('approval1', request);

      expect(result.success).toBe(true);
      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/approvals/approval1/process',
        request
      );
    });

    it('should queue approval when offline', async () => {
      mockOfflineService.isOnline.mockResolvedValue(false);
      mockOfflineService.queueRequest.mockResolvedValue();

      const request: ProcessApprovalRequest = {
        action: 'approved',
      };

      const result = await workflowService.processApproval('approval1', request);

      expect(result.success).toBe(true);
      expect(result.message).toContain('queued');
      expect(mockOfflineService.queueRequest).toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    it('should approve without comments', async () => {
      mockOfflineService.isOnline.mockResolvedValue(true);
      mockApiService.post.mockResolvedValue({
        data: { success: true, message: 'Approved' },
      });

      const result = await workflowService.approve('approval1');

      expect(result.success).toBe(true);
      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/approvals/approval1/process',
        { action: 'approved', comments: undefined }
      );
    });

    it('should approve with comments', async () => {
      mockOfflineService.isOnline.mockResolvedValue(true);
      mockApiService.post.mockResolvedValue({
        data: { success: true, message: 'Approved' },
      });

      const result = await workflowService.approve('approval1', 'Approved after review');

      expect(result.success).toBe(true);
      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/approvals/approval1/process',
        { action: 'approved', comments: 'Approved after review' }
      );
    });
  });

  describe('reject', () => {
    it('should reject with comments', async () => {
      mockOfflineService.isOnline.mockResolvedValue(true);
      mockApiService.post.mockResolvedValue({
        data: { success: true, message: 'Rejected' },
      });

      const result = await workflowService.reject('approval1', 'Missing documentation');

      expect(result.success).toBe(true);
      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/approvals/approval1/process',
        { action: 'rejected', comments: 'Missing documentation' }
      );
    });
  });

  describe('delegate', () => {
    it('should delegate approval to another user', async () => {
      mockApiService.post.mockResolvedValue({
        data: { success: true, message: 'Delegated successfully' },
      });

      const result = await workflowService.delegate('approval1', 'user2', 'On vacation');

      expect(result.success).toBe(true);
      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/approvals/approval1/delegate',
        { toUserId: 'user2', reason: 'On vacation' }
      );
    });
  });

  describe('getApprovalDetails', () => {
    it('should fetch approval details with history', async () => {
      const mockApproval: ApprovalRequest = {
        id: 'approval1',
        entityType: 'expense_report',
        entityId: 'EXP-001',
        requesterId: 'user1',
        status: 'pending',
        currentStep: 1,
        totalSteps: 2,
        workflowId: 'wf1',
        title: 'Expense Report #001',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: [
          {
            id: 'h1',
            requestId: 'approval1',
            approverId: 'approver1',
            action: 'approved',
            comments: 'Approved',
            step: 1,
            createdAt: new Date().toISOString(),
          },
        ],
      };

      mockApiService.get.mockResolvedValue({ data: mockApproval });

      const result = await workflowService.getApprovalDetails('approval1');

      expect(result).toEqual(mockApproval);
      expect(result.history).toHaveLength(1);
    });
  });

  describe('batchApprove', () => {
    it('should approve multiple approvals', async () => {
      mockOfflineService.isOnline.mockResolvedValue(true);
      mockApiService.post.mockResolvedValue({
        data: { success: true, message: 'Approved' },
      });

      const approvalIds = ['approval1', 'approval2', 'approval3'];
      const result = await workflowService.batchApprove(approvalIds, 'Batch approved');

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(mockApiService.post).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures', async () => {
      mockOfflineService.isOnline.mockResolvedValue(true);
      mockApiService.post
        .mockResolvedValueOnce({ data: { success: true, message: 'Approved' } })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ data: { success: true, message: 'Approved' } });

      const approvalIds = ['approval1', 'approval2', 'approval3'];
      const result = await workflowService.batchApprove(approvalIds);

      expect(result.success).toBe(false);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[2].success).toBe(true);
    });
  });

  describe('submitForApproval', () => {
    it('should submit entity for approval', async () => {
      const mockApproval: ApprovalRequest = {
        id: 'new-approval',
        entityType: 'leave_request',
        entityId: 'LEAVE-001',
        requesterId: 'user1',
        status: 'pending',
        currentStep: 1,
        totalSteps: 1,
        workflowId: 'wf1',
        title: 'Leave Request',
        priority: 'low',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiService.post.mockResolvedValue({ data: mockApproval });

      const result = await workflowService.submitForApproval(
        'leave_request',
        'LEAVE-001',
        'leave_workflow'
      );

      expect(result).toEqual(mockApproval);
      expect(mockApiService.post).toHaveBeenCalledWith('/api/approvals/submit', {
        entityType: 'leave_request',
        entityId: 'LEAVE-001',
        workflowName: 'leave_workflow',
      });
    });
  });

  describe('getApprovalStats', () => {
    it('should fetch approval statistics', async () => {
      const mockStats = {
        pendingCount: 5,
        approvedCount: 10,
        rejectedCount: 2,
        byType: [
          { type: 'purchase_order', count: 3 },
          { type: 'expense_report', count: 2 },
        ],
        byPriority: [
          { priority: 'high', count: 2 },
          { priority: 'medium', count: 3 },
        ],
        avgApprovalTime: 24,
      };

      mockApiService.get.mockResolvedValue({ data: mockStats });

      const result = await workflowService.getApprovalStats();

      expect(result).toEqual(mockStats);
      expect(mockApiService.get).toHaveBeenCalledWith('/api/approvals/dashboard/stats');
    });

    it('should fetch stats with date range', async () => {
      mockApiService.get.mockResolvedValue({ data: {} });

      await workflowService.getApprovalStats('2024-01-01', '2024-12-31');

      expect(mockApiService.get).toHaveBeenCalledWith(
        '/api/approvals/dashboard/stats?startDate=2024-01-01&endDate=2024-12-31'
      );
    });
  });

  describe('Priority and Status Colors', () => {
    it('should return correct priority colors', () => {
      expect(workflowService.getPriorityColor('high')).toBe('#ef4444');
      expect(workflowService.getPriorityColor('medium')).toBe('#f97316');
      expect(workflowService.getPriorityColor('low')).toBe('#22c55e');
      expect(workflowService.getPriorityColor('unknown')).toBe('#6b7280');
    });

    it('should return correct status colors', () => {
      expect(workflowService.getStatusColor('approved')).toBe('#22c55e');
      expect(workflowService.getStatusColor('rejected')).toBe('#ef4444');
      expect(workflowService.getStatusColor('pending')).toBe('#f59e0b');
      expect(workflowService.getStatusColor('cancelled')).toBe('#6b7280');
    });
  });

  describe('Amount Formatting', () => {
    it('should format amount with default currency', () => {
      const formatted = workflowService.formatAmount(1234.56);
      expect(formatted).toContain('1,234.56');
    });

    it('should format amount with custom currency', () => {
      const formatted = workflowService.formatAmount(1234.56, 'EUR');
      expect(formatted).toContain('1,234.56');
    });
  });

  describe('getCachedApprovals', () => {
    it('should return cached approvals when available', async () => {
      const mockCached: ApprovalRequest[] = [
        {
          id: '1',
          entityType: 'purchase_order',
          entityId: 'PO-001',
          requesterId: 'user1',
          status: 'pending',
          currentStep: 1,
          totalSteps: 2,
          workflowId: 'wf1',
          title: 'Cached Approval',
          priority: 'medium',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockOfflineService.getCachedResponse.mockResolvedValue(mockCached);

      const result = await workflowService.getCachedApprovals();

      expect(result).toEqual(mockCached);
    });

    it('should return empty array when no cache', async () => {
      mockOfflineService.getCachedResponse.mockResolvedValue(null);

      const result = await workflowService.getCachedApprovals();

      expect(result).toEqual([]);
    });
  });
});
