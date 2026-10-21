/**
 * Approval Details Screen
 * 
 * Detailed view of an approval request with full history and entity data
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import workflowService, { ApprovalRequest, ApprovalHistory } from '../../services/workflow.service';

interface Props {
  route: {
    params: {
      approvalId: string;
    };
  };
  navigation: any;
}

const ApprovalDetailsScreen = ({ route, navigation }: Props) => {
  const { approvalId } = route.params;
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [comment, setComment] = useState('');
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    loadApprovalDetails();
  }, [approvalId]);

  const loadApprovalDetails = async () => {
    try {
      setLoading(true);
      const data = await workflowService.getApprovalDetails(approvalId);
      setApproval(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load approval details');
      console.error(error);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approval) return;

    try {
      const result = await workflowService.approve(approval.id, comment || undefined);
      if (result.success) {
        Alert.alert('Success', result.message, [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!approval) return;

    if (!comment.trim()) {
      Alert.alert('Required', 'Please provide a reason for rejection');
      return;
    }

    try {
      const result = await workflowService.reject(approval.id, comment);
      if (result.success) {
        Alert.alert('Success', result.message, [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject');
    }
  };

  const showActionModal = (action: 'approve' | 'reject') => {
    setPendingAction(action);
    setCommentModalVisible(true);
  };

  const submitAction = async () => {
    if (pendingAction === 'approve') {
      await handleApprove();
    } else if (pendingAction === 'reject') {
      await handleReject();
    }
    setCommentModalVisible(false);
    setComment('');
    setPendingAction(null);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!approval) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Approval not found</Text>
      </View>
    );
  }

  const priorityColor = workflowService.getPriorityColor(approval.priority);
  const statusColor = workflowService.getStatusColor(approval.status);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header Card */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
              <Text style={styles.priorityText}>{approval.priority.toUpperCase()}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{approval.status.toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.title}>{approval.title}</Text>
          
          {approval.description && (
            <Text style={styles.description}>{approval.description}</Text>
          )}

          <View style={styles.divider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Icon name="file-document" size={20} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Type</Text>
                <Text style={styles.infoValue}>
                  {approval.entityType.replace(/_/g, ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            {approval.amount && (
              <View style={styles.infoRow}>
                <Icon name="currency-usd" size={20} color="#6b7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Amount</Text>
                  <Text style={styles.infoValue}>
                    {workflowService.formatAmount(approval.amount, approval.currency)}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.infoRow}>
              <Icon name="account" size={20} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Requester</Text>
                <Text style={styles.infoValue}>{approval.requesterName || 'Unknown'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Icon name="calendar" size={20} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Created</Text>
                <Text style={styles.infoValue}>
                  {new Date(approval.createdAt).toLocaleString()}
                </Text>
              </View>
            </View>

            {approval.dueDate && (
              <View style={styles.infoRow}>
                <Icon name="clock-alert" size={20} color="#6b7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Due Date</Text>
                  <Text style={styles.infoValue}>
                    {new Date(approval.dueDate).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.infoRow}>
              <Icon name="workflow" size={20} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Progress</Text>
                <Text style={styles.infoValue}>
                  Step {approval.currentStep} of {approval.totalSteps}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Workflow Progress */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Workflow Progress</Text>
          <View style={styles.progressContainer}>
            {Array.from({ length: approval.totalSteps }).map((_, index) => (
              <View key={index} style={styles.progressStepContainer}>
                <View
                  style={[
                    styles.progressStep,
                    index < approval.currentStep && styles.progressStepCompleted,
                    index === approval.currentStep - 1 && styles.progressStepCurrent,
                  ]}
                >
                  {index < approval.currentStep - 1 ? (
                    <Icon name="check" size={16} color="#fff" />
                  ) : (
                    <Text style={styles.progressStepText}>{index + 1}</Text>
                  )}
                </View>
                {index < approval.totalSteps - 1 && (
                  <View
                    style={[
                      styles.progressLine,
                      index < approval.currentStep - 1 && styles.progressLineCompleted,
                    ]}
                  />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Entity Data */}
        {approval.entityData && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.entityData}>
              {Object.entries(approval.entityData).map(([key, value]) => (
                <View key={key} style={styles.entityDataRow}>
                  <Text style={styles.entityDataKey}>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                  </Text>
                  <Text style={styles.entityDataValue}>{String(value)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Approval History */}
        {approval.history && approval.history.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Approval History</Text>
            {approval.history.map((item, index) => (
              <View key={item.id} style={styles.historyItem}>
                <View
                  style={[
                    styles.historyIcon,
                    { backgroundColor: workflowService.getStatusColor(item.action) },
                  ]}
                >
                  <Icon
                    name={
                      item.action === 'approved'
                        ? 'check'
                        : item.action === 'rejected'
                        ? 'close'
                        : 'account-arrow-right'
                    }
                    size={16}
                    color="#fff"
                  />
                </View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyAction}>
                    {item.action.toUpperCase()} - Step {item.step}
                  </Text>
                  <Text style={styles.historyApprover}>{item.approverName || 'Unknown'}</Text>
                  {item.comments && (
                    <Text style={styles.historyComments}>{item.comments}</Text>
                  )}
                  <Text style={styles.historyDate}>
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {approval.status === 'pending' && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => showActionModal('reject')}
          >
            <Icon name="close-circle" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => showActionModal('approve')}
          >
            <Icon name="check-circle" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Comment Modal */}
      <Modal
        visible={commentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCommentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pendingAction === 'approve' ? 'Add Comment (Optional)' : 'Reason for Rejection'}
              </Text>
              <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.commentInput}
              placeholder={
                pendingAction === 'approve'
                  ? 'Add your comments...'
                  : 'Please provide a reason for rejection'
              }
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setCommentModalVisible(false);
                  setComment('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonSubmit,
                  { backgroundColor: pendingAction === 'approve' ? '#22c55e' : '#ef4444' },
                ]}
                onPress={submitAction}
              >
                <Text style={styles.modalButtonText}>
                  {pendingAction === 'approve' ? 'Approve' : 'Reject'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepCompleted: {
    backgroundColor: '#22c55e',
  },
  progressStepCurrent: {
    backgroundColor: '#3b82f6',
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e5e7eb',
  },
  progressLineCompleted: {
    backgroundColor: '#22c55e',
  },
  entityData: {
    gap: 8,
  },
  entityDataRow: {
    flexDirection: 'row',
  },
  entityDataKey: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    width: 120,
  },
  entityDataValue: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  historyItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyContent: {
    marginLeft: 12,
    flex: 1,
  },
  historyAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  historyApprover: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  historyComments: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  historyDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actionBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#22c55e',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f3f4f6',
  },
  modalButtonSubmit: {
    backgroundColor: '#3b82f6',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
});

export default ApprovalDetailsScreen;
