/**
 * Orders Screen
 * 
 * View and manage sales orders
 */

import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ApiService from '../../services/api.service';
import {API_ENDPOINTS} from '../../config/api';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
  date: string;
}

const OrdersScreen = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await ApiService.get<{data: Order[]}>(
        API_ENDPOINTS.ORDERS.LIST,
      );
      setOrders(data.data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return 'check-circle';
      case 'pending':
        return 'clock-outline';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const renderOrder = ({item}: {item: Order}) => (
    <TouchableOpacity style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
          <Text style={styles.customerName}>{item.customerName}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {backgroundColor: `${getStatusColor(item.status)}20`},
          ]}>
          <Icon
            name={getStatusIcon(item.status)}
            size={16}
            color={getStatusColor(item.status)}
          />
          <Text
            style={[
              styles.statusText,
              {color: getStatusColor(item.status)},
            ]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
      <View style={styles.orderFooter}>
        <Text style={styles.orderDate}>
          {new Date(item.date).toLocaleDateString()}
        </Text>
        <Text style={styles.orderTotal}>₹{item.total.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="file-document-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  list: {
    padding: 12,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  orderDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  orderTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
});

export default OrdersScreen;
