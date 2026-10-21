/**
 * Workflow Service
 * 
 * Handles workflow and approval operations for mobile app
 * Integrates with backend approval workflow system
 */

import apiService from './api.service';
import offlineService from './offline.service';

export interface ApprovalRequest {
  id: string;
  entityType: string;
  entityId: string;
  requesterId: string;
  requesterName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  currentStep: number;
  totalSteps: number;
  workflowId: string;
  workflowName?: string;
  title: string;
  description?: string;
  amount?: number;
  currency?: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  history?: ApprovalHistory[];
  entityData?: any;
}

export interface ApprovalHistory {
  id: string;
  requestId: string;
  approverId: string;
  approverName?: string;
  action: 'approved' | 'rejected' | 'delegated' | 'cancelled';
  comments?: string;
  step: number;
  createdAt: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  module: string;
  entityType: string;
  steps: WorkflowStep[];
  isActive: boolean;
}

export interface WorkflowStep {
  step: number;
  name: string;
  approverRoles: string[];
  requiredApprovals: number;
  allowDelegation: boolean;
}

export interface ApprovalStats {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  byType: {
    type: string;
    count: number;
  }[];
  byPriority: {
    priority: string;
    count: number;
  }[];
  avgApprovalTime: number;
}

export interface ProcessApprovalRequest {
  action: 'approved' | 'rejected' | 'delegated';
  comments?: string;
  delegateToUserId?: string;
}

class WorkflowService {
  /**
   * Get pending approvals for current user
   */
  async getPendingApprovals(): Promise<ApprovalRequest[]> {
    try {
      const response = await apiService.get('/api/approvals/pending');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error);
      throw error;
    }
  }

  /**
   * Get approval requests by type
   */
  async getApprovalsByType(type: string): Promise<ApprovalRequest[]> {
    try {
      const response = await apiService.get(`/api/approvals/dashboard/pending?type=${type}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch approvals by type:', error);
      throw error;
    }
  }

  /**
   * Get approval request details
   */
  async getApprovalDetails(approvalId: string): Promise<ApprovalRequest> {
    try {
      const response = await apiService.get(`/api/approvals/${approvalId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch approval details:', error);
      throw error;
    }
  }

  /**
   * Process an approval (approve, reject, delegate)
   */
  async processApproval(
    approvalId: string,
    request: ProcessApprovalRequest
  ): Promise<{ success: boolean; message: string }> {
    try {
      const isOnline = await offlineService.isOnline();
      
      if (!isOnline) {
        // Queue for offline processing
        await offlineService.queueRequest({
          method: 'POST',
          url: `/api/approvals/${approvalId}/process`,
          data: request,
        });
        
        return {
          success: true,
          message: 'Approval queued for processing when online',
        };
      }

      const response = await apiService.post(`/api/approvals/${approvalId}/process`, request);
      return response.data;
    } catch (error) {
      console.error('Failed to process approval:', error);
      throw error;
    }
  }

  /**
   * Approve an approval request
   */
  async approve(approvalId: string, comments?: string): Promise<{ success: boolean; message: string }> {
    return this.processApproval(approvalId, {
      action: 'approved',
      comments,
    });
  }

  /**
   * Reject an approval request
   */
  async reject(approvalId: string, comments: string): Promise<{ success: boolean; message: string }> {
    return this.processApproval(approvalId, {
      action: 'rejected',
      comments,
    });
  }

  /**
   * Delegate an approval request
   */
  async delegate(
    approvalId: string,
    delegateToUserId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.post(`/api/approvals/${approvalId}/delegate`, {
        toUserId: delegateToUserId,
        reason,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to delegate approval:', error);
      throw error;
    }
  }

  /**
   * Cancel an approval request
   */
  async cancelApproval(approvalId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.post(`/api/approvals/${approvalId}/cancel`, {
        reason,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to cancel approval:', error);
      throw error;
    }
  }

  /**
   * Get approval history for an entity
   */
  async getApprovalHistory(entityType: string, entityId: string): Promise<ApprovalHistory[]> {
    try {
      const response = await apiService.get(`/api/approvals/history/${entityType}/${entityId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch approval history:', error);
      throw error;
    }
  }

  /**
   * Get approval statistics
   */
  async getApprovalStats(startDate?: string, endDate?: string): Promise<ApprovalStats> {
    try {
      let url = '/api/approvals/dashboard/stats';
      const params: string[] = [];
      
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      
      if (params.length > 0) {
        url += '?' + params.join('&');
      }

      const response = await apiService.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch approval stats:', error);
      throw error;
    }
  }

  /**
   * Get workflow templates
   */
  async getWorkflowTemplates(module?: string): Promise<WorkflowTemplate[]> {
    try {
      let url = '/api/approvals/dashboard/workflows';
      if (module) {
        url += `?module=${module}`;
      }

      const response = await apiService.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch workflow templates:', error);
      throw error;
    }
  }

  /**
   * Submit an entity for approval
   */
  async submitForApproval(
    entityType: string,
    entityId: string,
    workflowName?: string
  ): Promise<ApprovalRequest> {
    try {
      const response = await apiService.post('/api/approvals/submit', {
        entityType,
        entityId,
        workflowName,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to submit for approval:', error);
      throw error;
    }
  }

  /**
   * Batch approve multiple approvals
   */
  async batchApprove(
    approvalIds: string[],
    comments?: string
  ): Promise<{ success: boolean; results: Array<{ id: string; success: boolean; message: string }> }> {
    const results = await Promise.allSettled(
      approvalIds.map(id => this.approve(id, comments))
    );

    const processedResults = results.map((result, index) => ({
      id: approvalIds[index],
      success: result.status === 'fulfilled' && result.value.success,
      message: result.status === 'fulfilled' ? result.value.message : 'Failed to process',
    }));

    return {
      success: processedResults.every(r => r.success),
      results: processedResults,
    };
  }

  /**
   * Get cached approvals (for offline mode)
   */
  async getCachedApprovals(): Promise<ApprovalRequest[]> {
    try {
      const cached = await offlineService.getCachedResponse('/api/approvals/pending');
      return cached || [];
    } catch (error) {
      console.error('Failed to get cached approvals:', error);
      return [];
    }
  }

  /**
   * Get approval priority color
   */
  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high':
        return '#ef4444'; // red
      case 'medium':
        return '#f97316'; // orange
      case 'low':
        return '#22c55e'; // green
      default:
        return '#6b7280'; // gray
    }
  }

  /**
   * Get approval status color
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'approved':
        return '#22c55e'; // green
      case 'rejected':
        return '#ef4444'; // red
      case 'pending':
        return '#f59e0b'; // amber
      case 'cancelled':
        return '#6b7280'; // gray
      default:
        return '#6b7280'; // gray
    }
  }

  /**
   * Format approval amount
   */
  formatAmount(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }
}

export default new WorkflowService();
