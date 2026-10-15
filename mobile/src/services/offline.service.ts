/**
 * Offline Service
 * 
 * Handles offline data caching and synchronization when connectivity is restored
 * Implements requirements 22.3, 22.4: enhanced offline mode with smart caching,
 * conflict resolution, optimistic updates, and comprehensive sync
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {AxiosRequestConfig} from 'axios';

interface QueuedRequest {
  id: string;
  method: string;
  url: string;
  data?: any;
  config?: AxiosRequestConfig;
  timestamp: number;
  retryCount: number;
  optimisticId?: string;
  entityType?: string;
  status: 'pending' | 'syncing' | 'failed' | 'conflict';
}

interface CachedData {
  data: any;
  timestamp: number;
  ttl?: number; // Time to live in milliseconds
  version?: number;
  etag?: string;
}

interface ConflictData {
  id: string;
  localData: any;
  serverData: any;
  timestamp: number;
  resolved: boolean;
}

interface SyncResult {
  success: number;
  failed: number;
  conflicts: number;
  errors: Array<{requestId: string; error: string}>;
}

const STORAGE_KEYS = {
  CACHE_PREFIX: '@nexaerp:cache:',
  QUEUE_PREFIX: '@nexaerp:queue:',
  SYNC_STATUS: '@nexaerp:sync_status',
  CONFLICTS_PREFIX: '@nexaerp:conflict:',
  OPTIMISTIC_PREFIX: '@nexaerp:optimistic:',
  CACHE_METADATA: '@nexaerp:cache_metadata',
};

const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RETRY_COUNT = 3;
const STALE_REQUEST_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

class OfflineServiceClass {
  private syncInProgress = false;
  private syncCallbacks: Array<(result: SyncResult) => void> = [];
  private cacheMetadata: Map<string, CachedData> = new Map();

  constructor() {
    this.loadCacheMetadata();
  }

  /**
   * Load cache metadata from storage
   */
  private async loadCacheMetadata(): Promise<void> {
    try {
      const metadata = await AsyncStorage.getItem(STORAGE_KEYS.CACHE_METADATA);
      if (metadata) {
        const parsed = JSON.parse(metadata);
        this.cacheMetadata = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.error('Error loading cache metadata:', error);
    }
  }

  /**
   * Save cache metadata to storage
   */
  private async saveCacheMetadata(): Promise<void> {
    try {
      const obj = Object.fromEntries(this.cacheMetadata);
      await AsyncStorage.setItem(STORAGE_KEYS.CACHE_METADATA, JSON.stringify(obj));
    } catch (error) {
      console.error('Error saving cache metadata:', error);
    }
  }

  /**
   * Cache API response data for offline use with TTL support
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds (optional)
   * @param etag - ETag for cache validation (optional)
   */
  async cacheData(
    key: string,
    data: any,
    ttl: number = DEFAULT_TTL,
    etag?: string,
  ): Promise<void> {
    try {
      const cacheKey = `${STORAGE_KEYS.CACHE_PREFIX}${key}`;
      const cachedData: CachedData = {
        data,
        timestamp: Date.now(),
        ttl,
        version: 1,
        etag,
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedData));
      
      // Update metadata
      this.cacheMetadata.set(key, cachedData);
      await this.saveCacheMetadata();
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  /**
   * Get cached data for offline use with smart staleness detection
   * @param key - Cache key
   * @param allowStale - Whether to return stale data (default: true)
   */
  async getCachedData(key: string, allowStale: boolean = true): Promise<{
    data: any;
    isStale: boolean;
    etag?: string;
  } | null> {
    try {
      const cacheKey = `${STORAGE_KEYS.CACHE_PREFIX}${key}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (cached) {
        const cachedData: CachedData = JSON.parse(cached);
        const age = Date.now() - cachedData.timestamp;
        const ttl = cachedData.ttl || DEFAULT_TTL;
        const isStale = age >= ttl;
        
        if (!isStale || allowStale) {
          return {
            data: cachedData.data,
            isStale,
            etag: cachedData.etag,
          };
        }
      }
    } catch (error) {
      console.error('Error getting cached data:', error);
    }
    
    return null;
  }

  /**
   * Invalidate cached data
   */
  async invalidateCache(key: string): Promise<void> {
    try {
      const cacheKey = `${STORAGE_KEYS.CACHE_PREFIX}${key}`;
      await AsyncStorage.removeItem(cacheKey);
      this.cacheMetadata.delete(key);
      await this.saveCacheMetadata();
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateCachePattern(pattern: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const regex = new RegExp(pattern);
      const keysToDelete = keys.filter(key => 
        key.startsWith(STORAGE_KEYS.CACHE_PREFIX) && 
        regex.test(key.replace(STORAGE_KEYS.CACHE_PREFIX, ''))
      );
      
      if (keysToDelete.length > 0) {
        await AsyncStorage.multiRemove(keysToDelete);
        
        // Update metadata
        keysToDelete.forEach(key => {
          const cacheKey = key.replace(STORAGE_KEYS.CACHE_PREFIX, '');
          this.cacheMetadata.delete(cacheKey);
        });
        await this.saveCacheMetadata();
      }
    } catch (error) {
      console.error('Error invalidating cache pattern:', error);
    }
  }

  /**
   * Queue a request for later sync when online with optimistic support
   * @param request - Request to queue
   * @param optimisticData - Optimistic data to show in UI immediately
   */
  async queueRequest(
    request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount' | 'status'>,
    optimisticData?: any,
  ): Promise<string> {
    try {
      const queuedRequest: QueuedRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...request,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
      };

      const queueKey = `${STORAGE_KEYS.QUEUE_PREFIX}${queuedRequest.id}`;
      await AsyncStorage.setItem(queueKey, JSON.stringify(queuedRequest));
      
      // Store optimistic data if provided
      if (optimisticData && queuedRequest.optimisticId) {
        const optimisticKey = `${STORAGE_KEYS.OPTIMISTIC_PREFIX}${queuedRequest.optimisticId}`;
        await AsyncStorage.setItem(optimisticKey, JSON.stringify(optimisticData));
      }
      
      return queuedRequest.id;
    } catch (error) {
      console.error('Error queuing request:', error);
      throw new Error('Failed to queue request for offline sync');
    }
  }

  /**
   * Get optimistic data by ID
   */
  async getOptimisticData(optimisticId: string): Promise<any | null> {
    try {
      const optimisticKey = `${STORAGE_KEYS.OPTIMISTIC_PREFIX}${optimisticId}`;
      const data = await AsyncStorage.getItem(optimisticKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting optimistic data:', error);
      return null;
    }
  }

  /**
   * Remove optimistic data
   */
  async removeOptimisticData(optimisticId: string): Promise<void> {
    try {
      const optimisticKey = `${STORAGE_KEYS.OPTIMISTIC_PREFIX}${optimisticId}`;
      await AsyncStorage.removeItem(optimisticKey);
    } catch (error) {
      console.error('Error removing optimistic data:', error);
    }
  }

  /**
   * Get all queued requests
   */
  async getQueuedRequests(): Promise<QueuedRequest[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const queueKeys = keys.filter(key => key.startsWith(STORAGE_KEYS.QUEUE_PREFIX));
      
      const requests: QueuedRequest[] = [];
      
      for (const key of queueKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          requests.push(JSON.parse(data));
        }
      }
      
      // Sort by timestamp (oldest first)
      return requests.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('Error getting queued requests:', error);
      return [];
    }
  }

  /**
   * Remove a queued request
   */
  async removeQueuedRequest(id: string): Promise<void> {
    try {
      const queueKey = `${STORAGE_KEYS.QUEUE_PREFIX}${id}`;
      await AsyncStorage.removeItem(queueKey);
    } catch (error) {
      console.error('Error removing queued request:', error);
    }
  }

  /**
   * Sync all queued requests when back online with conflict resolution
   * @param onProgress - Progress callback
   */
  async syncOfflineData(
    onProgress?: (current: number, total: number, status: string) => void,
  ): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;

    const result: SyncResult = {
      success: 0,
      failed: 0,
      conflicts: 0,
      errors: [],
    };

    try {
      const requests = await this.getQueuedRequests();
      
      if (requests.length === 0) {
        return result;
      }

      console.log(`Syncing ${requests.length} offline requests...`);

      // Import axios here to avoid circular dependency
      const axios = require('axios').default;
      const {API_CONFIG} = require('../config/api');
      const {AuthService} = require('./auth.service');

      const token = await AuthService.getToken();

      for (let i = 0; i < requests.length; i++) {
        const request = requests[i];
        
        onProgress?.(i + 1, requests.length, `Syncing ${request.method} ${request.url}...`);

        try {
          // Check if request is too old
          const age = Date.now() - request.timestamp;
          if (age > STALE_REQUEST_AGE) {
            console.log(`Removing stale request ${request.id}`);
            await this.removeQueuedRequest(request.id);
            result.failed++;
            result.errors.push({
              requestId: request.id,
              error: 'Request too old (>7 days)',
            });
            continue;
          }

          // Update request status
          request.status = 'syncing';
          await AsyncStorage.setItem(
            `${STORAGE_KEYS.QUEUE_PREFIX}${request.id}`,
            JSON.stringify(request),
          );

          const config = {
            ...request.config,
            headers: {
              ...request.config?.headers,
              Authorization: token ? `Bearer ${token}` : undefined,
            },
          };

          const url = `${API_CONFIG.BASE_URL}${request.url}`;
          let response;

          switch (request.method) {
            case 'POST':
              response = await axios.post(url, request.data, config);
              break;
            case 'PUT':
              response = await axios.put(url, request.data, config);
              break;
            case 'PATCH':
              response = await axios.patch(url, request.data, config);
              break;
            case 'DELETE':
              response = await axios.delete(url, config);
              break;
          }

          // Remove from queue on success
          await this.removeQueuedRequest(request.id);
          
          // Remove optimistic data if exists
          if (request.optimisticId) {
            await this.removeOptimisticData(request.optimisticId);
          }
          
          // Invalidate related cache
          if (request.entityType) {
            await this.invalidateCachePattern(`/api/${request.entityType}`);
          }
          
          result.success++;
        } catch (error: any) {
          console.error(`Failed to sync request ${request.id}:`, error);
          
          // Check for conflict (409) or validation errors (422)
          if (error.response?.status === 409 || error.response?.status === 422) {
            // Store conflict for manual resolution
            await this.storeConflict({
              id: request.id,
              localData: request.data,
              serverData: error.response?.data,
              timestamp: Date.now(),
              resolved: false,
            });
            
            request.status = 'conflict';
            await AsyncStorage.setItem(
              `${STORAGE_KEYS.QUEUE_PREFIX}${request.id}`,
              JSON.stringify(request),
            );
            
            result.conflicts++;
          } else {
            // Increment retry count
            request.retryCount++;
            
            if (request.retryCount >= MAX_RETRY_COUNT) {
              request.status = 'failed';
              result.failed++;
              result.errors.push({
                requestId: request.id,
                error: error.message || 'Max retries exceeded',
              });
            } else {
              request.status = 'pending';
            }
            
            await AsyncStorage.setItem(
              `${STORAGE_KEYS.QUEUE_PREFIX}${request.id}`,
              JSON.stringify(request),
            );
          }
        }
      }

      // Update last sync time
      await AsyncStorage.setItem(
        STORAGE_KEYS.SYNC_STATUS,
        Date.now().toString(),
      );

      console.log(
        `Sync complete: ${result.success} succeeded, ${result.failed} failed, ${result.conflicts} conflicts`,
      );
      
      // Notify sync callbacks
      this.syncCallbacks.forEach(cb => cb(result));
    } catch (error) {
      console.error('Error during sync:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Register sync callback
   */
  onSyncComplete(callback: (result: SyncResult) => void): () => void {
    this.syncCallbacks.push(callback);
    return () => {
      this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(STORAGE_KEYS.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Clear all queued requests
   */
  async clearQueue(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const queueKeys = keys.filter(key => key.startsWith(STORAGE_KEYS.QUEUE_PREFIX));
      await AsyncStorage.multiRemove(queueKeys);
    } catch (error) {
      console.error('Error clearing queue:', error);
    }
  }

  /**
   * Store conflict for manual resolution
   */
  private async storeConflict(conflict: ConflictData): Promise<void> {
    try {
      const conflictKey = `${STORAGE_KEYS.CONFLICTS_PREFIX}${conflict.id}`;
      await AsyncStorage.setItem(conflictKey, JSON.stringify(conflict));
    } catch (error) {
      console.error('Error storing conflict:', error);
    }
  }

  /**
   * Get all conflicts
   */
  async getConflicts(): Promise<ConflictData[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const conflictKeys = keys.filter(key => 
        key.startsWith(STORAGE_KEYS.CONFLICTS_PREFIX)
      );
      
      const conflicts: ConflictData[] = [];
      
      for (const key of conflictKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const conflict = JSON.parse(data);
          if (!conflict.resolved) {
            conflicts.push(conflict);
          }
        }
      }
      
      return conflicts.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error getting conflicts:', error);
      return [];
    }
  }

  /**
   * Resolve conflict by choosing local or server data
   */
  async resolveConflict(
    conflictId: string,
    resolution: 'local' | 'server' | 'custom',
    customData?: any,
  ): Promise<void> {
    try {
      const conflictKey = `${STORAGE_KEYS.CONFLICTS_PREFIX}${conflictId}`;
      const conflictData = await AsyncStorage.getItem(conflictKey);
      
      if (!conflictData) {
        throw new Error('Conflict not found');
      }
      
      const conflict: ConflictData = JSON.parse(conflictData);
      
      // Mark as resolved
      conflict.resolved = true;
      await AsyncStorage.setItem(conflictKey, JSON.stringify(conflict));
      
      // Update the queued request based on resolution
      const queueKey = `${STORAGE_KEYS.QUEUE_PREFIX}${conflictId}`;
      const requestData = await AsyncStorage.getItem(queueKey);
      
      if (requestData) {
        const request: QueuedRequest = JSON.parse(requestData);
        
        if (resolution === 'server') {
          // Accept server version, remove from queue
          await this.removeQueuedRequest(conflictId);
        } else if (resolution === 'local') {
          // Keep local version, reset for retry
          request.status = 'pending';
          request.retryCount = 0;
          await AsyncStorage.setItem(queueKey, JSON.stringify(request));
        } else if (resolution === 'custom' && customData) {
          // Use custom merged data
          request.data = customData;
          request.status = 'pending';
          request.retryCount = 0;
          await AsyncStorage.setItem(queueKey, JSON.stringify(request));
        }
      }
      
      // Remove conflict after resolution
      await AsyncStorage.removeItem(conflictKey);
    } catch (error) {
      console.error('Error resolving conflict:', error);
      throw error;
    }
  }

  /**
   * Get sync status with detailed information
   */
  async getSyncStatus(): Promise<{
    queuedCount: number;
    pendingCount: number;
    failedCount: number;
    conflictCount: number;
    lastSyncTime: number | null;
    isSyncing: boolean;
  }> {
    try {
      const requests = await this.getQueuedRequests();
      const conflicts = await this.getConflicts();
      const lastSyncStr = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_STATUS);
      
      const pendingCount = requests.filter(r => r.status === 'pending').length;
      const failedCount = requests.filter(r => r.status === 'failed').length;
      
      return {
        queuedCount: requests.length,
        pendingCount,
        failedCount,
        conflictCount: conflicts.length,
        lastSyncTime: lastSyncStr ? parseInt(lastSyncStr, 10) : null,
        isSyncing: this.syncInProgress,
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        queuedCount: 0,
        pendingCount: 0,
        failedCount: 0,
        conflictCount: 0,
        lastSyncTime: null,
        isSyncing: false,
      };
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(STORAGE_KEYS.CACHE_PREFIX));
      
      let totalSize = 0;
      let oldestEntry: number | null = null;
      let newestEntry: number | null = null;
      
      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalSize += data.length;
          const cached: CachedData = JSON.parse(data);
          
          if (!oldestEntry || cached.timestamp < oldestEntry) {
            oldestEntry = cached.timestamp;
          }
          if (!newestEntry || cached.timestamp > newestEntry) {
            newestEntry = cached.timestamp;
          }
        }
      }
      
      return {
        totalEntries: cacheKeys.length,
        totalSize,
        oldestEntry,
        newestEntry,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalEntries: 0,
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }

  /**
   * Prune old cache entries
   */
  async pruneCache(maxAge: number = DEFAULT_TTL): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(STORAGE_KEYS.CACHE_PREFIX));
      
      let prunedCount = 0;
      const now = Date.now();
      
      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const cached: CachedData = JSON.parse(data);
          const age = now - cached.timestamp;
          
          if (age > maxAge) {
            await AsyncStorage.removeItem(key);
            const cacheKey = key.replace(STORAGE_KEYS.CACHE_PREFIX, '');
            this.cacheMetadata.delete(cacheKey);
            prunedCount++;
          }
        }
      }
      
      if (prunedCount > 0) {
        await this.saveCacheMetadata();
      }
      
      return prunedCount;
    } catch (error) {
      console.error('Error pruning cache:', error);
      return 0;
    }
  }
}

export const OfflineService = new OfflineServiceClass();
