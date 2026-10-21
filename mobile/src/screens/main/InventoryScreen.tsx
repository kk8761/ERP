/**
 * Inventory Screen
 * 
 * Mobile inventory management with barcode scanning support
 */

import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ApiService from '../../services/api.service';
import {API_ENDPOINTS} from '../../config/api';
import BarcodeScanner, {ScanResult} from '../../components/BarcodeScanner';
import InventoryService, {
  InventoryItem as InventoryItemType,
} from '../../services/inventory.service';

interface InventoryItem extends InventoryItemType {}

const InventoryScreen = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanMode, setScanMode] = useState<'single' | 'batch'>('single');
  const [scanHistoryVisible, setScanHistoryVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [itemDetailsVisible, setItemDetailsVisible] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    filterItems();
  }, [searchQuery, items]);

  const loadInventory = async () => {
    try {
      const data = await ApiService.get<{data: InventoryItem[]}>(
        API_ENDPOINTS.INVENTORY.LIST,
      );
      setItems(data.data);
    } catch (error) {
      console.error('Error loading inventory:', error);
      Alert.alert('Error', 'Failed to load inventory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterItems = () => {
    if (!searchQuery) {
      setFilteredItems(items);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = items.filter(
      item =>
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query),
    );
    setFilteredItems(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInventory();
  };

  const handleScan = () => {
    // Open single scan mode
    setScanMode('single');
    setScannerVisible(true);
  };

  const handleBatchScan = () => {
    // Open batch scan mode
    setScanMode('batch');
    setScannerVisible(true);
  };

  const handleScanResult = async (result: ScanResult) => {
    try {
      const item = await InventoryService.processScan(result);

      if (item) {
        setSelectedItem(item);
        setItemDetailsVisible(true);
      } else {
        Alert.alert(
          'Item Not Found',
          `No inventory item found with barcode: ${result.value}`,
          [
            {text: 'OK'},
            {
              text: 'Try Again',
              onPress: () => setScannerVisible(true),
            },
          ],
        );
      }
    } catch (error) {
      console.error('Error processing scan:', error);
      Alert.alert('Error', 'Failed to process barcode scan');
    }
  };

  const handleShowScanHistory = () => {
    setScanHistoryVisible(true);
  };

  const handleItemPress = (item: InventoryItem) => {
    setSelectedItem(item);
    setItemDetailsVisible(true);
  };

  const renderItem = ({item}: {item: InventoryItem}) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => handleItemPress(item)}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text
          style={[
            styles.stockBadge,
            item.quantity < 10 ? styles.lowStock : styles.inStock,
          ]}>
          {item.quantity} in stock
        </Text>
      </View>
      <View style={styles.itemDetails}>
        <Text style={styles.itemSku}>SKU: {item.sku}</Text>
        <Text style={styles.itemCategory}>{item.category}</Text>
      </View>
      {item.barcode && (
        <View style={styles.itemBarcode}>
          <Icon name="barcode" size={16} color="#6b7280" />
          <Text style={styles.itemBarcodeText}>{item.barcode}</Text>
        </View>
      )}
      <View style={styles.itemFooter}>
        <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
        <TouchableOpacity style={styles.editButton}>
          <Icon name="pencil" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Icon name="magnify" size={24} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search inventory..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.scanButton} onPress={handleScan}>
          <Icon name="barcode-scan" size={24} color="#3b82f6" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={handleShowScanHistory}>
          <Icon name="history" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={handleScan}>
          <Icon name="barcode-scan" size={28} color="#3b82f6" />
          <Text style={styles.quickActionText}>Single Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={handleBatchScan}>
          <Icon name="barcode" size={28} color="#10b981" />
          <Text style={styles.quickActionText}>Batch Scan</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="package-variant-closed" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No inventory items found</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab}>
        <Icon name="plus" size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleScanResult}
        mode={scanMode}
        title={scanMode === 'batch' ? 'Batch Scan Items' : 'Scan Barcode'}
      />

      {/* Item Details Modal */}
      <Modal
        visible={itemDetailsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setItemDetailsVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedItem && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedItem.name}</Text>
                  <TouchableOpacity
                    onPress={() => setItemDetailsVisible(false)}>
                    <Icon name="close" size={28} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>SKU:</Text>
                    <Text style={styles.detailValue}>{selectedItem.sku}</Text>
                  </View>

                  {selectedItem.barcode && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Barcode:</Text>
                      <Text style={styles.detailValue}>
                        {selectedItem.barcode}
                      </Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Category:</Text>
                    <Text style={styles.detailValue}>
                      {selectedItem.category}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Quantity:</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        {
                          color:
                            selectedItem.quantity < 10 ? '#ef4444' : '#10b981',
                        },
                      ]}>
                      {selectedItem.quantity}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Price:</Text>
                    <Text style={styles.detailValue}>
                      ₹{selectedItem.price.toFixed(2)}
                    </Text>
                  </View>

                  {selectedItem.description && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Description:</Text>
                      <Text style={styles.detailValue}>
                        {selectedItem.description}
                      </Text>
                    </View>
                  )}

                  {selectedItem.location && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Location:</Text>
                      <Text style={styles.detailValue}>
                        {selectedItem.location}
                      </Text>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Icon name="plus-circle" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Receive</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, {backgroundColor: '#f59e0b'}]}>
                    <Icon name="swap-horizontal" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Transfer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, {backgroundColor: '#6b7280'}]}>
                    <Icon name="pencil" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Adjust</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Scan History Modal */}
      <Modal
        visible={scanHistoryVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setScanHistoryVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scan History</Text>
              <TouchableOpacity onPress={() => setScanHistoryVisible(false)}>
                <Icon name="close" size={28} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {InventoryService.getScanHistory(20).map((historyItem, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.historyItem}
                  onPress={() => {
                    if (historyItem.item) {
                      setSelectedItem(historyItem.item);
                      setScanHistoryVisible(false);
                      setItemDetailsVisible(true);
                    }
                  }}>
                  <View style={styles.historyItemLeft}>
                    <Icon
                      name={
                        historyItem.action === 'lookup'
                          ? 'barcode-scan'
                          : historyItem.action === 'receive'
                          ? 'plus-circle'
                          : historyItem.action === 'transfer'
                          ? 'swap-horizontal'
                          : 'pencil'
                      }
                      size={24}
                      color="#3b82f6"
                    />
                    <View style={styles.historyItemText}>
                      <Text style={styles.historyItemName}>
                        {historyItem.item?.name || historyItem.barcode}
                      </Text>
                      <Text style={styles.historyItemTime}>
                        {new Date(historyItem.timestamp).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  <Icon name="chevron-right" size={24} color="#d1d5db" />
                </TouchableOpacity>
              ))}
              {InventoryService.getScanHistory().length === 0 && (
                <View style={styles.emptyHistory}>
                  <Icon name="history" size={48} color="#d1d5db" />
                  <Text style={styles.emptyHistoryText}>No scan history</Text>
                </View>
              )}
            </ScrollView>

            {InventoryService.getScanHistory().length > 0 && (
              <TouchableOpacity
                style={styles.clearHistoryButton}
                onPress={() => {
                  InventoryService.clearScanHistory();
                  setScanHistoryVisible(false);
                  Alert.alert('Success', 'Scan history cleared');
                }}>
                <Text style={styles.clearHistoryButtonText}>
                  Clear History
                </Text>
              </TouchableOpacity>
            )}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 12,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1f2937',
  },
  scanButton: {
    padding: 8,
  },
  list: {
    padding: 12,
  },
  itemCard: {
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
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  inStock: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  lowStock: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemSku: {
    fontSize: 14,
    color: '#6b7280',
  },
  itemCategory: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
  },
  editButton: {
    padding: 8,
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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  historyButton: {
    padding: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 8,
  },
  itemBarcode: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemBarcodeText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    maxHeight: '80%',
    position: 'absolute',
    bottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalContent: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyItemText: {
    marginLeft: 12,
    flex: 1,
  },
  historyItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  historyItemTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  clearHistoryButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
  },
  clearHistoryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InventoryScreen;
