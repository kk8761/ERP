/**
 * Inventory Service
 * 
 * Service for inventory operations including barcode scanning integration
 */

import ApiService from './api.service';
import {API_ENDPOINTS} from '../config/api';
import {ScanResult} from '../components/BarcodeScanner';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  quantity: number;
  price: number;
  category: string;
  description?: string;
  image?: string;
  minStockLevel?: number;
  maxStockLevel?: number;
  location?: string;
  batchNumber?: string;
  expiryDate?: string;
}

export interface ScanHistoryItem {
  id: string;
  barcode: string;
  item?: InventoryItem;
  timestamp: Date;
  action: 'lookup' | 'receive' | 'transfer' | 'adjust';
  quantity?: number;
  notes?: string;
}

export interface BatchScanResult {
  successful: number;
  failed: number;
  items: Array<{
    barcode: string;
    success: boolean;
    item?: InventoryItem;
    error?: string;
  }>;
}

class InventoryService {
  private scanHistory: ScanHistoryItem[] = [];
  private readonly MAX_HISTORY_SIZE = 100;

  /**
   * Lookup inventory item by barcode
   */
  async lookupByBarcode(barcode: string): Promise<InventoryItem | null> {
    try {
      const response = await ApiService.get<{
        success: boolean;
        data: InventoryItem;
      }>(`${API_ENDPOINTS.INVENTORY.SCAN}?barcode=${encodeURIComponent(barcode)}`);

      if (response.success && response.data) {
        // Add to scan history
        this.addToHistory({
          id: Date.now().toString(),
          barcode,
          item: response.data,
          timestamp: new Date(),
          action: 'lookup',
        });

        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Error looking up barcode:', error);
      throw error;
    }
  }

  /**
   * Process scan result from barcode scanner
   */
  async processScan(scanResult: ScanResult): Promise<InventoryItem | null> {
    const {value: barcode} = scanResult;
    return this.lookupByBarcode(barcode);
  }

  /**
   * Process multiple scan results (batch scanning)
   */
  async processBatchScans(
    scanResults: ScanResult[],
  ): Promise<BatchScanResult> {
    const result: BatchScanResult = {
      successful: 0,
      failed: 0,
      items: [],
    };

    for (const scan of scanResults) {
      try {
        const item = await this.lookupByBarcode(scan.value);
        
        if (item) {
          result.successful++;
          result.items.push({
            barcode: scan.value,
            success: true,
            item,
          });
        } else {
          result.failed++;
          result.items.push({
            barcode: scan.value,
            success: false,
            error: 'Item not found',
          });
        }
      } catch (error) {
        result.failed++;
        result.items.push({
          barcode: scan.value,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Receive inventory using barcode
   */
  async receiveInventory(
    barcode: string,
    quantity: number,
    notes?: string,
  ): Promise<InventoryItem> {
    try {
      const response = await ApiService.post<{
        success: boolean;
        data: InventoryItem;
      }>(`${API_ENDPOINTS.INVENTORY.SCAN}/receive`, {
        barcode,
        quantity,
        notes,
      });

      if (response.success && response.data) {
        this.addToHistory({
          id: Date.now().toString(),
          barcode,
          item: response.data,
          timestamp: new Date(),
          action: 'receive',
          quantity,
          notes,
        });

        return response.data;
      }

      throw new Error('Failed to receive inventory');
    } catch (error) {
      console.error('Error receiving inventory:', error);
      throw error;
    }
  }

  /**
   * Batch receive inventory items
   */
  async batchReceiveInventory(
    items: Array<{barcode: string; quantity: number; notes?: string}>,
  ): Promise<BatchScanResult> {
    try {
      const response = await ApiService.post<{
        success: boolean;
        data: BatchScanResult;
      }>(`${API_ENDPOINTS.INVENTORY.SCAN}/batch-receive`, {
        items,
      });

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error('Failed to batch receive inventory');
    } catch (error) {
      console.error('Error batch receiving inventory:', error);
      throw error;
    }
  }

  /**
   * Transfer inventory using barcode
   */
  async transferInventory(
    barcode: string,
    fromLocation: string,
    toLocation: string,
    quantity: number,
  ): Promise<InventoryItem> {
    try {
      const response = await ApiService.post<{
        success: boolean;
        data: InventoryItem;
      }>(`${API_ENDPOINTS.INVENTORY.SCAN}/transfer`, {
        barcode,
        fromLocation,
        toLocation,
        quantity,
      });

      if (response.success && response.data) {
        this.addToHistory({
          id: Date.now().toString(),
          barcode,
          item: response.data,
          timestamp: new Date(),
          action: 'transfer',
          quantity,
          notes: `From ${fromLocation} to ${toLocation}`,
        });

        return response.data;
      }

      throw new Error('Failed to transfer inventory');
    } catch (error) {
      console.error('Error transferring inventory:', error);
      throw error;
    }
  }

  /**
   * Adjust inventory quantity using barcode
   */
  async adjustInventory(
    barcode: string,
    quantity: number,
    reason: string,
  ): Promise<InventoryItem> {
    try {
      const response = await ApiService.post<{
        success: boolean;
        data: InventoryItem;
      }>(`${API_ENDPOINTS.INVENTORY.SCAN}/adjust`, {
        barcode,
        quantity,
        reason,
      });

      if (response.success && response.data) {
        this.addToHistory({
          id: Date.now().toString(),
          barcode,
          item: response.data,
          timestamp: new Date(),
          action: 'adjust',
          quantity,
          notes: reason,
        });

        return response.data;
      }

      throw new Error('Failed to adjust inventory');
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      throw error;
    }
  }

  /**
   * Get scan history
   */
  getScanHistory(limit?: number): ScanHistoryItem[] {
    const history = [...this.scanHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Clear scan history
   */
  clearScanHistory(): void {
    this.scanHistory = [];
  }

  /**
   * Add item to scan history
   */
  private addToHistory(item: ScanHistoryItem): void {
    this.scanHistory.push(item);

    // Keep history size manageable
    if (this.scanHistory.length > this.MAX_HISTORY_SIZE) {
      this.scanHistory.shift();
    }
  }

  /**
   * Get quick access to recently scanned items
   */
  getRecentlyScanned(limit: number = 10): InventoryItem[] {
    const items: InventoryItem[] = [];
    const seen = new Set<string>();

    for (let i = this.scanHistory.length - 1; i >= 0 && items.length < limit; i--) {
      const historyItem = this.scanHistory[i];
      if (historyItem.item && !seen.has(historyItem.item.id)) {
        items.push(historyItem.item);
        seen.add(historyItem.item.id);
      }
    }

    return items;
  }

  /**
   * Search inventory items
   */
  async searchInventory(query: string): Promise<InventoryItem[]> {
    try {
      const response = await ApiService.get<{
        success: boolean;
        data: InventoryItem[];
      }>(`${API_ENDPOINTS.INVENTORY.LIST}?search=${encodeURIComponent(query)}`);

      if (response.success && response.data) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error('Error searching inventory:', error);
      throw error;
    }
  }

  /**
   * Get inventory item by ID
   */
  async getInventoryItem(id: string): Promise<InventoryItem | null> {
    try {
      const response = await ApiService.get<{
        success: boolean;
        data: InventoryItem;
      }>(API_ENDPOINTS.INVENTORY.GET(id));

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Error getting inventory item:', error);
      throw error;
    }
  }

  /**
   * Update inventory item
   */
  async updateInventoryItem(
    id: string,
    updates: Partial<InventoryItem>,
  ): Promise<InventoryItem> {
    try {
      const response = await ApiService.put<{
        success: boolean;
        data: InventoryItem;
      }>(API_ENDPOINTS.INVENTORY.UPDATE(id), updates);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error('Failed to update inventory item');
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }
  }
}

export default new InventoryService();
