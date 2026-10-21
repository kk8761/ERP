/**
 * Approvals Screen
 * 
 * Mobile-optimized approval management with swipe actions
 * Displays pending approvals with quick approve/reject gestures
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import workflowService, { ApprovalRequest } from '../../services/workflow.service';

const ApprovalsScreen = ({ navigation }: any) => {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [comment, setComment] = useState('');
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const data = await workflowService.getPendingApprovals();
      setApprovals(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load approvals');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadApprovals();
    setRefreshing(false);
  }, []);

  const handleApprove = async (approval: ApprovalRequest, withComment: boolean = false) => {
    if (withComment) {
      setSelectedApproval(approval);
      setPendingAction('approve');
      setCommentModalVisible(true);
      return;
    }

    try {
      const result = await workflowService.approve(approval.id, comment || undefined);
      if (result.success) {
        Alert.alert('Success', result.message);
        loadApprovals();
        setComment('');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve');
    }
  };

  const handleReject = async (approval: ApprovalRequest) => {
    setSelectedApproval(approval);
    setPendingAction('reject');
    setCommentModalVisible(true);
  };

  const submitAction = async () => {
    if (!selectedApproval || !pendingAction) return;

    try {
      if (pendingAction === 'approve') {
        await handleApprove(selectedApproval, false);
      } else if (pendingAction === 'reject') {
        if (!comment.trim()) {
          Alert.alert('Required', 'Please provide a reason for rejection');
          return;
        }
        const result = await workflowService.reject(selectedApproval.id, comment);
        if (result.success) {
          Alert.alert('Success', result.message);
          loadApprovals();
        }
      }
      setCommentModalVisible(false);
      setComment('');
      setSelectedApproval(null);
      setPendingAction(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process approval');
    }
  };

  const handleViewDetails = (approval: ApprovalRequest) => {
    navigation.navigate('ApprovalDetails', { approvalId: approval.id });
  };

  const renderRightActions = (approval: ApprovalRequest) => {
    return (
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={[styles.swipeAction, styles.approveAction]}
          onPress={() => handleApprove(approval)}
        >
          <Icon name="check" size={30} color="#fff" />
          <Text style={styles.swipeActionText}>Approve</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderLeftActions = (approval: ApprovalRequest) => {
    return (
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={[styles.swipeAction, styles.rejectAction]}
          onPress={() => handleReject(approval)}
        >
          <Icon name="close" size={30} color="#fff" />
          <Text style={styles.swipeActionText}>Reject</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderApprovalCard = ({ item }: { item: ApprovalRequest }) => {
    const priorityColor = workflowService.getPriorityColor(item.priority);

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        renderLeftActions={() => renderLeftActions(item)}
        overshootRight={false}
        overshootLeft={false}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleViewDetails(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.priorityIndicator, { backgroundColor: priorityColor }]} />
          
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
                <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
              </View>
            </View>

            <Text style={styles.cardDescription} numberOfLines={2}>
              {item.description || 'No description'}
            </Text>

            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Icon name="file-document" size={16} color="#6b7280" />
                <Text style={styles.metaText}>{item.entityType.replace('_', ' ')}</Text>
              </View>
              
              {item.amount && (
                <View style={styles.metaItem}>
                  <Icon name="currency-usd" size={16} color="#6b7280" />
                  <Text style={styles.metaText}>
                    {workflowService.formatAmount(item.amount, item.currency)}
                  </Text>
                </View>
              )}

              <View style={styles.metaItem}>
                <Icon name="clock-outline" size={16} color="#6b7280" />
                <Text style={styles.metaText}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.stepIndicator}>
                <Icon name="workflow" size={16} color="#6b7280" />
                <Text style={styles.stepText}>
                  Step {item.currentStep} of {item.totalSteps}
                </Text>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleReject(item)}
                >
                  <Icon name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleApprove(item, true)}
                >
                  <Icon name="message-text" size={24} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleApprove(item)}
                >
                  <Icon name="check-circle" size={24} color="#22c55e" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const filteredApprovals = approvals.filter(approval => {
    if (filter !== 'all' && approval.priority !== filter) return false;
    if (typeFilter && approval.entityType !== typeFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
            All ({approvals.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'high' && styles.filterChipActive]}
          onPress={() => setFilter('high')}
        >
          <Text style={[styles.filterChipText, filter === 'high' && styles.filterChipTextActive]}>
            High
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'medium' && styles.filterChipActive]}
          onPress={() => setFilter('medium')}
        >
          <Text style={[styles.filterChipText, filter === 'medium' && styles.filterChipTextActive]}>
            Medium
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'low' && styles.filterChipActive]}
          onPress={() => setFilter('low')}
        >
          <Text style={[styles.filterChipText, filter === 'low' && styles.filterChipTextActive]}>
            Low
          </Text>
        </TouchableOpacity>
      </View>

      {/* Swipe Hint */}
      {approvals.length > 0 && (
        <View style={styles.hintContainer}>
          <Icon name="gesture-swipe-horizontal" size={20} color="#6b7280" />
          <Text style={styles.hintText}>Swipe left to approve, right to reject</Text>
        </View>
      )}

      {/* Approvals List */}
      <FlatList
        data={filteredApprovals}
        renderItem={renderApprovalCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="checkbox-marked-circle-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No pending approvals</Text>
            <Text style={styles.emptySubtext}>You're all caught up!</Text>
          </View>
        }
      />

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
  filterBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f3f4f6',
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#fef3c7',
  },
  hintText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#92400e',
  },
  listContent: {
    padding: 12,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  priorityIndicator: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  swipeActions: {
    flexDirection: 'row',
    height: '100%',
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
  },
  approveAction: {
    backgroundColor: '#22c55e',
  },
  rejectAction: {
    backgroundColor: '#ef4444',
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
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

export default ApprovalsScreen;
