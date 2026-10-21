/**
 * Quick Actions Screen
 * 
 * Mobile-optimized quick access to common workflow actions
 * - Submit expense report
 * - Request leave
 * - Create purchase order
 * - Quick approvals
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import workflowService from '../../services/workflow.service';

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  description: string;
  action: () => void;
}

const QuickActionsScreen = ({ navigation }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  // Quick action handlers
  const handleExpenseReport = () => {
    setSelectedAction('expense');
    setModalVisible(true);
  };

  const handleLeaveRequest = () => {
    setSelectedAction('leave');
    setModalVisible(true);
  };

  const handlePurchaseOrder = () => {
    setSelectedAction('purchase');
    setModalVisible(true);
  };

  const handleTimesheet = () => {
    setSelectedAction('timesheet');
    setModalVisible(true);
  };

  const handleQuickApproval = () => {
    navigation.navigate('Approvals');
  };

  const handleViewDashboard = () => {
    navigation.navigate('Dashboard');
  };

  const quickActions: QuickAction[] = [
    {
      id: 'approvals',
      title: 'Pending Approvals',
      icon: 'checkbox-marked-circle',
      color: '#3b82f6',
      description: 'View and process pending approvals',
      action: handleQuickApproval,
    },
    {
      id: 'expense',
      title: 'Submit Expense',
      icon: 'receipt',
      color: '#8b5cf6',
      description: 'Create a new expense report',
      action: handleExpenseReport,
    },
    {
      id: 'leave',
      title: 'Request Leave',
      icon: 'calendar-check',
      color: '#10b981',
      description: 'Submit a leave request',
      action: handleLeaveRequest,
    },
    {
      id: 'purchase',
      title: 'Purchase Order',
      icon: 'cart',
      color: '#f59e0b',
      description: 'Create a purchase order',
      action: handlePurchaseOrder,
    },
    {
      id: 'timesheet',
      title: 'Log Time',
      icon: 'clock',
      color: '#06b6d4',
      description: 'Submit timesheet entry',
      action: handleTimesheet,
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: 'view-dashboard',
      color: '#ef4444',
      description: 'View analytics and reports',
      action: handleViewDashboard,
    },
  ];

  const renderActionCard = (action: QuickAction) => (
    <TouchableOpacity
      key={action.id}
      style={styles.actionCard}
      onPress={action.action}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
        <Icon name={action.icon} size={32} color={action.color} />
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{action.title}</Text>
        <Text style={styles.actionDescription}>{action.description}</Text>
      </View>
      <Icon name="chevron-right" size={24} color="#9ca3af" />
    </TouchableOpacity>
  );

  const renderWorkflowForm = () => {
    switch (selectedAction) {
      case 'expense':
        return <ExpenseReportForm onClose={() => setModalVisible(false)} />;
      case 'leave':
        return <LeaveRequestForm onClose={() => setModalVisible(false)} />;
      case 'purchase':
        return <PurchaseOrderForm onClose={() => setModalVisible(false)} />;
      case 'timesheet':
        return <TimesheetForm onClose={() => setModalVisible(false)} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Quick Actions</Text>
          <Text style={styles.headerSubtitle}>
            Access frequently used workflows with one tap
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          {quickActions.map(renderActionCard)}
        </View>

        {/* Recent Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Actions</Text>
          <View style={styles.recentItem}>
            <Icon name="receipt" size={20} color="#6b7280" />
            <Text style={styles.recentText}>Expense Report #EXP-2024-001</Text>
            <Text style={styles.recentDate}>2 hours ago</Text>
          </View>
          <View style={styles.recentItem}>
            <Icon name="calendar-check" size={20} color="#6b7280" />
            <Text style={styles.recentText}>Leave Request - Annual Leave</Text>
            <Text style={styles.recentDate}>Yesterday</Text>
          </View>
        </View>
      </ScrollView>

      {/* Workflow Form Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedAction === 'expense' && 'New Expense Report'}
                {selectedAction === 'leave' && 'Request Leave'}
                {selectedAction === 'purchase' && 'New Purchase Order'}
                {selectedAction === 'timesheet' && 'Log Time'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {renderWorkflowForm()}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Simple form components for demo
const ExpenseReportForm = ({ onClose }: { onClose: () => void }) => (
  <View style={styles.form}>
    <TextInput style={styles.input} placeholder="Title" />
    <TextInput style={styles.input} placeholder="Amount" keyboardType="numeric" />
    <TextInput style={styles.input} placeholder="Category" />
    <TextInput
      style={[styles.input, styles.textArea]}
      placeholder="Description"
      multiline
      numberOfLines={3}
    />
    <TouchableOpacity style={styles.submitButton} onPress={onClose}>
      <Text style={styles.submitButtonText}>Submit for Approval</Text>
    </TouchableOpacity>
  </View>
);

const LeaveRequestForm = ({ onClose }: { onClose: () => void }) => (
  <View style={styles.form}>
    <TextInput style={styles.input} placeholder="Leave Type" />
    <TextInput style={styles.input} placeholder="Start Date" />
    <TextInput style={styles.input} placeholder="End Date" />
    <TextInput
      style={[styles.input, styles.textArea]}
      placeholder="Reason"
      multiline
      numberOfLines={3}
    />
    <TouchableOpacity style={styles.submitButton} onPress={onClose}>
      <Text style={styles.submitButtonText}>Submit Request</Text>
    </TouchableOpacity>
  </View>
);

const PurchaseOrderForm = ({ onClose }: { onClose: () => void }) => (
  <View style={styles.form}>
    <TextInput style={styles.input} placeholder="Supplier" />
    <TextInput style={styles.input} placeholder="Item Description" />
    <TextInput style={styles.input} placeholder="Quantity" keyboardType="numeric" />
    <TextInput style={styles.input} placeholder="Unit Price" keyboardType="numeric" />
    <TouchableOpacity style={styles.submitButton} onPress={onClose}>
      <Text style={styles.submitButtonText}>Create PO</Text>
    </TouchableOpacity>
  </View>
);

const TimesheetForm = ({ onClose }: { onClose: () => void }) => (
  <View style={styles.form}>
    <TextInput style={styles.input} placeholder="Project" />
    <TextInput style={styles.input} placeholder="Task" />
    <TextInput style={styles.input} placeholder="Hours" keyboardType="numeric" />
    <TextInput
      style={[styles.input, styles.textArea]}
      placeholder="Notes"
      multiline
      numberOfLines={3}
    />
    <TouchableOpacity style={styles.submitButton} onPress={onClose}>
      <Text style={styles.submitButtonText}>Log Time</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  recentText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
  },
  recentDate: {
    fontSize: 12,
    color: '#9ca3af',
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  form: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default QuickActionsScreen;
