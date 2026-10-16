/**
 * Sync Status Banner Component
 * 
 * Displays offline sync status, pending changes, and conflicts
 * Provides user feedback for offline mode operations
 */

import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NetInfo from '@react-native-community/netinfo';
import {OfflineService} from '../services/offline.service';

interface SyncStatusBannerProps {
  onConflictPress?: () => void;
}

const SyncStatusBanner: React.FC<SyncStatusBannerProps> = ({onConflictPress}) => {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState({
    queuedCount: 0,
    pendingCount: 0,
    failedCount: 0,
    conflictCount: 0,
    lastSyncTime: null as number | null,
    isSyncing: false,
  });
  const [showDetails, setShowDetails] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Listen for network changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    // Load initial status
    loadSyncStatus();

    // Refresh status every 5 seconds
    const interval = setInterval(loadSyncStatus, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadSyncStatus = async () => {
    try {
      const status = await OfflineService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline. Connect to the internet and try again.');
      return;
    }

    setSyncing(true);
    try {
      const result = await OfflineService.syncOfflineData(
        (current, total, status) => {
          console.log(`Sync progress: ${current}/${total} - ${status}`);
        },
      );

      const message = `Sync complete!\n\nSuccess: ${result.success}\nFailed: ${result.failed}\nConflicts: ${result.conflicts}`;
      
      if (result.conflicts > 0) {
        Alert.alert('Sync Complete with Conflicts', message, [
          {text: 'Resolve', onPress: onConflictPress},
          {text: 'OK'},
        ]);
      } else if (result.failed > 0) {
        Alert.alert('Sync Complete with Errors', message);
      } else {
        Alert.alert('Success', message);
      }

      loadSyncStatus();
    } catch (error: any) {
      Alert.alert('Sync Error', error.message || 'Failed to sync data');
    } finally {
      setSyncing(false);
    }
  };

  // Don't show banner if nothing to sync and online
  if (isOnline && syncStatus.queuedCount === 0 && !syncStatus.isSyncing) {
    return null;
  }

  const getBannerColor = () => {
    if (!isOnline) return '#f59e0b'; // Orange for offline
    if (syncStatus.conflictCount > 0) return '#ef4444'; // Red for conflicts
    if (syncStatus.failedCount > 0) return '#f59e0b'; // Orange for failures
    if (syncStatus.isSyncing) return '#3b82f6'; // Blue for syncing
    if (syncStatus.queuedCount > 0) return '#10b981'; // Green for pending
    return '#6b7280'; // Gray default
  };

  const getBannerIcon = () => {
    if (!isOnline) return 'wifi-off';
    if (syncStatus.conflictCount > 0) return 'alert-circle';
    if (syncStatus.isSyncing) return 'sync';
    return 'cloud-upload';
  };

  const getBannerText = () => {
    if (!isOnline) {
      return `Offline - ${syncStatus.queuedCount} changes queued`;
    }
    if (syncStatus.isSyncing) {
      return 'Syncing changes...';
    }
    if (syncStatus.conflictCount > 0) {
      return `${syncStatus.conflictCount} conflicts need resolution`;
    }
    if (syncStatus.queuedCount > 0) {
      return `${syncStatus.queuedCount} changes pending sync`;
    }
    return 'Up to date';
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.banner, {backgroundColor: getBannerColor()}]}
        onPress={() => setShowDetails(true)}>
        <Icon name={getBannerIcon()} size={20} color="#ffffff" />
        <Text style={styles.bannerText}>{getBannerText()}</Text>
        {syncStatus.isSyncing ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Icon name="chevron-right" size={20} color="#ffffff" />
        )}
      </TouchableOpacity>

      <Modal
        visible={showDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sync Status</Text>
              <TouchableOpacity onPress={() => setShowDetails(false)}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.statusCard}>
                <View style={styles.statusRow}>
                  <Icon
                    name={isOnline ? 'wifi' : 'wifi-off'}
                    size={24}
                    color={isOnline ? '#10b981' : '#f59e0b'}
                  />
                  <Text style={styles.statusLabel}>Connection</Text>
                  <Text style={styles.statusValue}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Text>
                </View>

                <View style={styles.statusRow}>
                  <Icon name="cloud-upload" size={24} color="#3b82f6" />
                  <Text style={styles.statusLabel}>Queued Changes</Text>
                  <Text style={styles.statusValue}>{syncStatus.queuedCount}</Text>
                </View>

                <View style={styles.statusRow}>
                  <Icon name="clock-outline" size={24} color="#6b7280" />
                  <Text style={styles.statusLabel}>Pending</Text>
                  <Text style={styles.statusValue}>{syncStatus.pendingCount}</Text>
                </View>

                <View style={styles.statusRow}>
                  <Icon name="alert-circle" size={24} color="#ef4444" />
                  <Text style={styles.statusLabel}>Conflicts</Text>
                  <Text style={styles.statusValue}>{syncStatus.conflictCount}</Text>
                </View>

                <View style={styles.statusRow}>
                  <Icon name="close-circle" size={24} color="#f59e0b" />
                  <Text style={styles.statusLabel}>Failed</Text>
                  <Text style={styles.statusValue}>{syncStatus.failedCount}</Text>
                </View>

                {syncStatus.lastSyncTime && (
                  <View style={styles.statusRow}>
                    <Icon name="update" size={24} color="#10b981" />
                    <Text style={styles.statusLabel}>Last Sync</Text>
                    <Text style={styles.statusValue}>
                      {new Date(syncStatus.lastSyncTime).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>

              {syncStatus.conflictCount > 0 && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.conflictButton]}
                  onPress={() => {
                    setShowDetails(false);
                    onConflictPress?.();
                  }}>
                  <Icon name="alert-circle" size={20} color="#ffffff" />
                  <Text style={styles.actionButtonText}>Resolve Conflicts</Text>
                </TouchableOpacity>
              )}

              {isOnline && syncStatus.queuedCount > 0 && !syncStatus.isSyncing && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.syncButton]}
                  onPress={handleSync}
                  disabled={syncing}>
                  {syncing ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Icon name="sync" size={20} color="#ffffff" />
                      <Text style={styles.actionButtonText}>Sync Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  bannerText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalBody: {
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  statusLabel: {
    flex: 1,
    fontSize: 16,
    color: '#4b5563',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  syncButton: {
    backgroundColor: '#3b82f6',
  },
  conflictButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SyncStatusBanner;
