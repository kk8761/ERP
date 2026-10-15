/**
 * Offline Manager for Web Interface
 * 
 * Enhanced offline support with IndexedDB, optimistic updates, and conflict resolution
 * Requirements: 22.3, 22.4 - Cache data for offline access and sync when online
 */

class OfflineManager {
  constructor() {
    this.dbName = 'NexaERPOffline';
    this.dbVersion = 1;
    this.db = null;
    this.syncInProgress = false;
    this.syncCallbacks = [];
    
    this.init();
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Cache store for GET responses
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
          cacheStore.createIndex('ttl', 'ttl', { unique: false });
        }

        // Queue store for pending mutations
        if (!db.objectStoreNames.contains('queue')) {
          const queueStore = db.createObjectStore('queue', { keyPath: 'id' });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('status', 'status', { unique: false });
          queueStore.createIndex('priority', 'priority', { unique: false });
        }

        // Conflicts store
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictsStore = db.createObjectStore('conflicts', { keyPath: 'id' });
          conflictsStore.createIndex('timestamp', 'timestamp', { unique: false });
          conflictsStore.createIndex('resolved', 'resolved', { unique: false });
        }

        // Optimistic updates store
        if (!db.objectStoreNames.contains('optimistic')) {
          db.createObjectStore('optimistic', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Cache data with TTL
   */
  async cacheData(key, data, ttl = 24 * 60 * 60 * 1000) {
    await this.ensureDB();
    
    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    
    await store.put({
      key,
      data,
      timestamp: Date.now(),
      ttl,
      version: 1
    });
  }

  /**
   * Get cached data
   */
  async getCachedData(key, allowStale = true) {
    await this.ensureDB();
    
    const transaction = this.db.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');
    const cached = await this.promisifyRequest(store.get(key));
    
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    const isStale = age >= cached.ttl;
    
    if (!isStale || allowStale) {
      return {
        data: cached.data,
        isStale,
        timestamp: cached.timestamp
      };
    }
    
    return null;
  }

  /**
   * Queue request for offline sync
   */
  async queueRequest(method, url, data, options = {}) {
    await this.ensureDB();
    
    const request = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      method,
      url,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      priority: options.priority || 5,
      optimisticId: options.optimisticId,
      entityType: options.entityType
    };

    const transaction = this.db.transaction(['queue'], 'readwrite');
    const store = transaction.objectStore('queue');
    await store.add(request);
    
    // Store optimistic data if provided
    if (options.optimisticData && options.optimisticId) {
      await this.storeOptimisticData(options.optimisticId, options.optimisticData);
    }
    
    return request.id;
  }

  /**
   * Store optimistic update
   */
  async storeOptimisticData(id, data) {
    await this.ensureDB();
    
    const transaction = this.db.transaction(['optimistic'], 'readwrite');
    const store = transaction.objectStore('optimistic');
    await store.put({ id, data, timestamp: Date.now() });
  }

  /**
   * Get optimistic data
   */
  async getOptimisticData(id) {
    await this.ensureDB();
    
    const transaction = this.db.transaction(['optimistic'], 'readonly');
    const store = transaction.objectStore('optimistic');
    const result = await this.promisifyRequest(store.get(id));
    
    return result ? result.data : null;
  }

  /**
   * Remove optimistic data
   */
  async removeOptimisticData(id) {
    await this.ensureDB();
    
    const transaction = this.db.transaction(['optimistic'], 'readwrite');
    const store = transaction.objectStore('optimistic');
    await store.delete(id);
  }

  /**
   * Get all queued requests
   */
  async getQueuedRequests() {
    await this.ensureDB();
    
    const transaction = this.db.transaction(['queue'], 'readonly');
    const store = transaction.objectStore('queue');
    const requests = await this.promisifyRequest(store.getAll());
    
    // Sort by priority (lower number = higher priority) then timestamp
    return requests.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Sync offline data
   */
  async syncOfflineData(onProgress) {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }

    this.syncInProgress = true;

    const result = {
      success: 0,
      failed: 0,
      conflicts: 0,
      errors: []
    };

    try {
      const requests = await this.getQueuedRequests();
      
      if (requests.length === 0) {
        return result;
      }

      for (let i = 0; i < requests.length; i++) {
        const request = requests[i];
        
        if (onProgress) {
          onProgress(i + 1, requests.length, `Syncing ${request.method} ${request.url}`);
        }

        try {
          // Check if request is too old (7 days)
          const age = Date.now() - request.timestamp;
          if (age > 7 * 24 * 60 * 60 * 1000) {
            await this.removeQueuedRequest(request.id);
            result.failed++;
            result.errors.push({ requestId: request.id, error: 'Request too old' });
            continue;
          }

          // Update status
          await this.updateRequestStatus(request.id, 'syncing');

          // Execute request
          const response = await fetch(request.url, {
            method: request.method,
            headers: {
              'Content-Type': 'application/json',
              ...this.getAuthHeaders()
            },
            body: request.data ? JSON.stringify(request.data) : undefined
          });

          if (response.ok) {
            // Success - remove from queue
            await this.removeQueuedRequest(request.id);
            
            // Remove optimistic data
            if (request.optimisticId) {
              await this.removeOptimisticData(request.optimisticId);
            }
            
            // Invalidate related cache
            if (request.entityType) {
              await this.invalidateCachePattern(`/api/${request.entityType}`);
            }
            
            result.success++;
          } else if (response.status === 409 || response.status === 422) {
            // Conflict or validation error
            const serverData = await response.json();
            await this.storeConflict({
              id: request.id,
              localData: request.data,
              serverData: serverData,
              timestamp: Date.now(),
              resolved: false
            });
            
            await this.updateRequestStatus(request.id, 'conflict');
            result.conflicts++;
          } else {
            // Other error - retry later
            request.retryCount++;
            
            if (request.retryCount >= 3) {
              await this.updateRequestStatus(request.id, 'failed');
              result.failed++;
              result.errors.push({
                requestId: request.id,
                error: `HTTP ${response.status}: ${response.statusText}`
              });
            } else {
              await this.updateRequestStatus(request.id, 'pending');
              await this.updateRetryCount(request.id, request.retryCount);
            }
          }
        } catch (error) {
          console.error(`Failed to sync request ${request.id}:`, error);
          result.failed++;
          result.errors.push({
            requestId: request.id,
            error: error.message
          });
        }
      }

      // Notify callbacks
      this.syncCallbacks.forEach(cb => cb(result));
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Store conflict
   */
  async storeConflict(conflict) {
    await this.ensureDB();
    
    const transaction = this.db.transaction(['conflicts'], 'readwrite');
    const store = transaction.objectStore('conflicts');
    await store.put(conflict);
  }

  /**
   * Get conflicts
   */
  async getConflicts() {
    await this.ensureDB();
    
    const transaction = this.db.transaction(['conflicts'], 'readonly');
    const store = transaction.objectStore('conflicts');
    const index = store.index('resolved');
    const conflicts = await this.promisifyRequest(index.getAll(false));
    
    return conflicts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Resolve conflict
   */
  async resolveConflict(conflictId, resolution, customData) {
    await this.ensureDB();
    
    const transaction = this.db.transaction(['conflicts', 'queue'], 'readwrite');
    const conflictsStore = transaction.objectStore('conflicts');
    const queueStore = transaction.objectStore('queue');
    
    // Get conflict
    const conflict = await this.promisifyRequest(conflictsStore.get(conflictId));
    if (!conflict) throw new Error('Conflict not found');
    
    // Mark as resolved
    conflict.resolved = true;
    await conflictsStore.put(conflict);
    
    // Update queued request
    const request = await this.promisifyRequest(queueStore.get(conflictId));
    if (request) {
      if (resolution === 'server') {
        // Accept server version - remove from queue
        await queueStore.delete(conflictId);
      } else if (resolution === 'local') {
        // Keep local version - reset for retry
        request.status = 'pending';
        request.retryCount = 0;
        await queueStore.put(request);
      } else if (resolution === 'custom' && customData) {
        // Use custom merged data
        request.data = customData;
        request.status = 'pending';
        request.retryCount = 0;
        await queueStore.put(request);
      }
    }
    
    // Remove conflict
    await conflictsStore.delete(conflictId);
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    await this.ensureDB();
    
    const transaction = this.db.transaction(['queue', 'conflicts'], 'readonly');
    const queueStore = transaction.objectStore('queue');
    const conflictsStore = transaction.objectStore('conflicts');
    
    const allRequests = await this.promisifyRequest(queueStore.getAll());
    const pendingIndex = queueStore.index('status');
    const conflicts = await this.promisifyRequest(
      conflictsStore.index('resolved').getAll(false)
    );
    
    const pending = allRequests.filter(r => r.status === 'pending');
    const failed = allRequests.filter(r => r.status === 'failed');
    
    return {
      queuedCount: allRequests.length,
      pendingCount: pending.length,
      failedCount: failed.length,
      conflictCount: conflicts.length,
      isSyncing: this.syncInProgress
    };
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateCachePattern(pattern) {
    await this.ensureDB();
    
    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    const allKeys = await this.promisifyRequest(store.getAllKeys());
    
    const regex = new RegExp(pattern);
    const keysToDelete = allKeys.filter(key => regex.test(key));
    
    for (const key of keysToDelete) {
      await store.delete(key);
    }
  }

  /**
   * Clear all cache
   */
  async clearCache() {
    await this.ensureDB();
    
    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    await store.clear();
  }

  /**
   * Clear queue
   */
  async clearQueue() {
    await this.ensureDB();
    
    const transaction = this.db.transaction(['queue'], 'readwrite');
    const store = transaction.objectStore('queue');
    await store.clear();
  }

  /**
   * Helper methods
   */
  async ensureDB() {
    if (!this.db) {
      await this.init();
    }
  }

  promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateRequestStatus(id, status) {
    const transaction = this.db.transaction(['queue'], 'readwrite');
    const store = transaction.objectStore('queue');
    const request = await this.promisifyRequest(store.get(id));
    if (request) {
      request.status = status;
      await store.put(request);
    }
  }

  async updateRetryCount(id, retryCount) {
    const transaction = this.db.transaction(['queue'], 'readwrite');
    const store = transaction.objectStore('queue');
    const request = await this.promisifyRequest(store.get(id));
    if (request) {
      request.retryCount = retryCount;
      await store.put(request);
    }
  }

  async removeQueuedRequest(id) {
    const transaction = this.db.transaction(['queue'], 'readwrite');
    const store = transaction.objectStore('queue');
    await store.delete(id);
  }

  getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  onSyncComplete(callback) {
    this.syncCallbacks.push(callback);
    return () => {
      this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback);
    };
  }
}

// Create singleton instance
window.OfflineManager = new OfflineManager();
