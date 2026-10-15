/**
 * Workflow Card Component
 * 
 * Reusable card component for displaying workflow items
 * Used across different workflow types (expense, leave, PO, etc.)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export interface WorkflowCardProps {
  title: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'draft';
  priority?: 'high' | 'medium' | 'low';
  amount?: number;
  currency?: string;
  date?: string;
  type?: string;
  icon?: string;
  onPress?: () => void;
  style?: ViewStyle;
  actions?: Array<{
    icon: string;
    label: string;
    color: string;
    onPress: () => void;
  }>;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({
  title,
  description,
  status,
  priority = 'medium',
  amount,
  currency = 'USD',
  date,
  type,
  icon = 'file-document',
  onPress,
  style,
  actions,
}) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'approved':
        return '#22c55e';
      case 'rejected':
        return '#ef4444';
      case 'pending':
        return '#f59e0b';
      case 'draft':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f97316';
      case 'low':
        return '#22c55e';
      default:
        return '#6b7280';
    }
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const statusColor = getStatusColor(status);
  const priorityColor = getPriorityColor(priority);

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: `${statusColor}20` }]}>
          <Icon name={icon} size={24} color={statusColor} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{status.toUpperCase()}</Text>
          </View>
        </View>

        {description && (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        )}

        <View style={styles.metadata}>
          {type && (
            <View style={styles.metaItem}>
              <Icon name="tag" size={14} color="#6b7280" />
              <Text style={styles.metaText}>{type}</Text>
            </View>
          )}

          {amount !== undefined && (
            <View style={styles.metaItem}>
              <Icon name="currency-usd" size={14} color="#6b7280" />
              <Text style={styles.metaText}>{formatAmount(amount)}</Text>
            </View>
          )}

          {date && (
            <View style={styles.metaItem}>
              <Icon name="calendar" size={14} color="#6b7280" />
              <Text style={styles.metaText}>{date}</Text>
            </View>
          )}

          {priority && status === 'pending' && (
            <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          )}
        </View>

        {actions && actions.length > 0 && (
          <View style={styles.actions}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.actionButton, { backgroundColor: `${action.color}15` }]}
                onPress={action.onPress}
              >
                <Icon name={action.icon} size={18} color={action.color} />
                <Text style={[styles.actionText, { color: action.color }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    marginRight: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default WorkflowCard;
