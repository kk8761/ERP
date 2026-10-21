/**
 * Dashboard Screen
 * 
 * Main dashboard with KPIs and quick actions
 */

import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ApiService from '../../services/api.service';
import {API_ENDPOINTS} from '../../config/api';

const {width} = Dimensions.get('window');

interface DashboardStats {
  revenue: number;
  orders: number;
  customers: number;
  inventory: number;
}

const DashboardScreen = () => {
  const [stats, setStats] = useState<DashboardStats>({
    revenue: 0,
    orders: 0,
    customers: 0,
    inventory: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const data = await ApiService.get<{data: DashboardStats}>(
        API_ENDPOINTS.DASHBOARD.STATS,
      );
      setStats(data.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome to NexaERP</Text>
        <Text style={styles.subtitle}>Here's your business overview</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.revenueCard]}>
          <Icon name="currency-inr" size={32} color="#10b981" />
          <Text style={styles.statValue}>{formatCurrency(stats.revenue)}</Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>

        <View style={[styles.statCard, styles.ordersCard]}>
          <Icon name="file-document" size={32} color="#3b82f6" />
          <Text style={styles.statValue}>{stats.orders}</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>

        <View style={[styles.statCard, styles.customersCard]}>
          <Icon name="account-group" size={32} color="#8b5cf6" />
          <Text style={styles.statValue}>{stats.customers}</Text>
          <Text style={styles.statLabel}>Customers</Text>
        </View>

        <View style={[styles.statCard, styles.inventoryCard]}>
          <Icon name="package-variant" size={32} color="#f59e0b" />
          <Text style={styles.statValue}>{stats.inventory}</Text>
          <Text style={styles.statLabel}>Items in Stock</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="cart-plus" size={24} color="#3b82f6" />
          <Text style={styles.actionText}>New Sale</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Icon name="package-variant-closed" size={24} color="#3b82f6" />
          <Text style={styles.actionText}>Add Inventory</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Icon name="barcode-scan" size={24} color="#3b82f6" />
          <Text style={styles.actionText}>Scan Barcode</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Icon name="receipt" size={24} color="#3b82f6" />
          <Text style={styles.actionText}>View Reports</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 36) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  revenueCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  ordersCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  customersCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  inventoryCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  quickActions: {
    backgroundColor: '#ffffff',
    margin: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
});

export default DashboardScreen;
