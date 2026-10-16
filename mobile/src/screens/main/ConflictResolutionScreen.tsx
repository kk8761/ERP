/**
 * Conflict Resolution Screen
 * 
 * Allows users to manually resolve sync conflicts between local and server data
 */

import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {OfflineService} from '../../services/offline.service';

interface ConflictData {
  id: string;
  localData: any;
  serverData: any;
  timestamp: number;
  resolved: boolean;
}

const ConflictResolutionScreen = ({navigation}: any) => {
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<ConflictData | null>(
    null,
  );

  useEffect(() => {
    loadConflicts();
  }, []);

  const loadConflicts = async () => {
    try {
      const conflictList = await OfflineService.getConflicts();
      setConflicts(conflictList);
    } catch (error) {
      console.error('Error loading conflicts:', error);
      Alert.alert('Error', 'Failed to load conflicts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadConflicts();
  };

  const handleResolve = async (
    conflictId: string,
    resolution: 'local' | 'server' | 'custom',
    customData?: any,
  ) => {
    try {
      await OfflineService.resolveConflict(conflictId, resolution, customData);
      Alert.alert('Success', 'Conflict resolved successfully');
      setSelectedConflict(null);
      loadConflicts();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resolve conflict');
    }
  };

  const renderConflictItem = ({item}: {item: ConflictData}) => (
    <TouchableOpacity
      style={styles.conflictCard}
      onPress={() => setSelectedConflict(item)}>
      <View style={styles.conflictHeader}>
        <Icon name="alert-circle" size={24} color="#ef4444" />
        <View style={styles.conflictInfo}>
          <Text style={styles.conflictId}>Conflict #{item.id.slice(-8)}</Text>
          <Text style={styles.conflictTime}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        </View>
        <Icon name="chevron-right" size={24} color="#6b7280" />
      </View>
    </TouchableOpacity>
  );

  const renderComparisonView = () => {
    if (!selectedConflict) return null;

    return (
      <View style={styles.comparisonContainer}>
        <View style={styles.comparisonHeader}>
          <TouchableOpacity onPress={() => setSelectedConflict(null)}>
            <Icon name="arrow-left" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.comparisonTitle}>Resolve Conflict</Text>
          <View style={{width: 24}} />
        </View>

        <ScrollView style={styles.comparisonBody}>
          <View style={styles.dataSection}>
            <View style={styles.dataSectionHeader}>
              <Icon name="cellphone" size={20} color="#3b82f6" />
              <Text style={styles.dataSectionTitle}>Your Changes (Local)</Text>
            </View>
            <View style={styles.dataContent}>
              <Text style={styles.dataText}>
                {JSON.stringify(selectedConflict.localData, null, 2)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.resolutionButton, styles.localButton]}
              onPress={() =>
                Alert.alert(
                  'Use Local Version',
                  'This will overwrite the server data with your local changes.',
                  [
                    {text: 'Cancel', style: 'cancel'},
                    {
                      text: 'Confirm',
                      onPress: () =>
                        handleResolve(selectedConflict.id, 'local'),
                    },
                  ],
                )
              }>
              <Icon name="check" size={20} color="#ffffff" />
              <Text style={styles.resolutionButtonText}>Use My Changes</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>VS</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.dataSection}>
            <View style={styles.dataSectionHeader}>
              <Icon name="cloud" size={20} color="#10b981" />
              <Text style={styles.dataSectionTitle}>Server Version</Text>
            </View>
            <View style={styles.dataContent}>
              <Text style={styles.dataText}>
                {JSON.stringify(selectedConflict.serverData, null, 2)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.resolutionButton, styles.serverButton]}
              onPress={() =>
                Alert.alert(
                  'Use Server Version',
                  'This will discard your local changes and accept the server data.',
                  [
                    {text: 'Cancel', style: 'cancel'},
                    {
                      text: 'Confirm',
                      onPress: () =>
                        handleResolve(selectedConflict.id, 'server'),
                      style: 'destructive',
                    },
                  ],
                )
              }>
              <Icon name="check" size={20} color="#ffffff" />
              <Text style={styles.resolutionButtonText}>Use Server Version</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.helpText}>
            <Icon name="information" size={16} color="#6b7280" />
            <Text style={styles.helpTextContent}>
              Review both versions carefully before choosing. If needed, you can
              contact support for assistance with complex conflicts.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  };

  if (selectedConflict) {
    return renderComparisonView();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resolve Conflicts</Text>
        <View style={{width: 24}} />
      </View>

      <FlatList
        data={conflicts}
        renderItem={renderConflictItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="check-circle" size={64} color="#10b981" />
            <Text style={styles.emptyTitle}>No Conflicts</Text>
            <Text style={styles.emptyText}>
              All your changes have been synced successfully
            </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  list: {
    padding: 16,
  },
  conflictCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  conflictInfo: {
    flex: 1,
  },
  conflictId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  conflictTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  comparisonContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  comparisonBody: {
    flex: 1,
    padding: 16,
  },
  dataSection: {
    marginBottom: 24,
  },
  dataSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dataSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  dataContent: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dataText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'monospace',
  },
  resolutionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  localButton: {
    backgroundColor: '#3b82f6',
  },
  serverButton: {
    backgroundColor: '#10b981',
  },
  resolutionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  helpText: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    marginTop: 16,
  },
  helpTextContent: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
});

export default ConflictResolutionScreen;
