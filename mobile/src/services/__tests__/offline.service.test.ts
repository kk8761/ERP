/**
 * Tests for Enhanced Offline Service
 * 
 * Validates requirements 22.3, 22.4: offline data caching and synchronization
 */

import {OfflineService} from '../offline.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

describe('OfflineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cache Management', () => {
    it('should cache data with TTL', async () => {
      await OfflineService.cacheData('test-key', {data: 'test'}, 60000);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@nexaerp:cache:test-key',
        expect.stringContaining('"data":{"data":"test"}'),
      );
    });

    it('should retrieve cached data when not stale', async () => {
      const cachedData = {
        data: {test: 'value'},
        timestamp: Date.now(),
        ttl: 60000,
        version: 1,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(cachedData),
      );

      const result = await OfflineService.getCachedData('test-key');

      expect(result).not.toBeNull();
      expect(result?.data).toEqual({test: 'value'});
      expect(result?.isStale).toBe(false);
    });

    it('should detect stale cached data', async () => {
      const staleData = {
        data: {test: 'value'},
        timestamp: Date.now() - 100000, // Old timestamp
        ttl: 60000, // 60 seconds TTL
        version: 1,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(staleData),
      );

      const result = await OfflineService.getCachedData('test-key');

      expect(result?.isStale).toBe(true);
    });

    it('should invalidate cache by key', async () => {
      await OfflineService.invalidateCache('test-key');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        '@nexaerp:cache:test-key',
      );
    });

    it('should invalidate cache by pattern', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        '@nexaerp:cache:/api/products/1',
        '@nexaerp:cache:/api/products/2',
        '@nexaerp:cache:/api/orders/1',
      ]);

      await OfflineService.invalidateCachePattern('/api/products');

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@nexaerp:cache:/api/products/1',
        '@nexaerp:cache:/api/products/2',
      ]);
    });
  });

  describe('Request Queuing', () => {
    it('should queue request for offline sync', async () => {
      const requestId = await OfflineService.queueRequest({
        method: 'POST',
        url: '/api/products',
        data: {name: 'Test Product'},
        entityType: 'products',
      });

      expect(requestId).toBeTruthy();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('@nexaerp:queue:'),
        expect.any(String),
      );
    });

    it('should store optimistic data with queued request', async () => {
      const optimisticId = 'temp-123';
      const optimisticData = {id: optimisticId, name: 'Test Product'};

      await OfflineService.queueRequest(
        {
          method: 'POST',
          url: '/api/products',
          data: {name: 'Test Product'},
          optimisticId,
        },
        optimisticData,
      );

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        `@nexaerp:optimistic:${optimisticId}`,
        JSON.stringify(optimisticData),
      );
    });

    it('should retrieve queued requests sorted by timestamp', async () => {
      const request1 = {
        id: 'req_1',
        method: 'POST',
        url: '/api/products',
        timestamp: 1000,
        retryCount: 0,
        status: 'pending',
      };

      const request2 = {
        id: 'req_2',
        method: 'PUT',
        url: '/api/products/1',
        timestamp: 2000,
        retryCount: 0,
        status: 'pending',
      };

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        '@nexaerp:queue:req_2',
        '@nexaerp:queue:req_1',
      ]);

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(request2))
        .mockResolvedValueOnce(JSON.stringify(request1));

      const requests = await OfflineService.getQueuedRequests();

      expect(requests).toHaveLength(2);
      expect(requests[0].id).toBe('req_1'); // Oldest first
      expect(requests[1].id).toBe('req_2');
    });
  });

  describe('Optimistic Updates', () => {
    it('should retrieve optimistic data', async () => {
      const optimisticData = {id: 'temp-123', name: 'Test'};

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(optimisticData),
      );

      const result = await OfflineService.getOptimisticData('temp-123');

      expect(result).toEqual(optimisticData);
    });

    it('should remove optimistic data after sync', async () => {
      await OfflineService.removeOptimisticData('temp-123');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        '@nexaerp:optimistic:temp-123',
      );
    });
  });

  describe('Conflict Resolution', () => {
    it('should retrieve unresolved conflicts', async () => {
      const conflict1 = {
        id: 'conflict_1',
        localData: {name: 'Local'},
        serverData: {name: 'Server'},
        timestamp: Date.now(),
        resolved: false,
      };

      const conflict2 = {
        id: 'conflict_2',
        localData: {name: 'Local2'},
        serverData: {name: 'Server2'},
        timestamp: Date.now(),
        resolved: true, // This should be filtered out
      };

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        '@nexaerp:conflict:conflict_1',
        '@nexaerp:conflict:conflict_2',
      ]);

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(conflict1))
        .mockResolvedValueOnce(JSON.stringify(conflict2));

      const conflicts = await OfflineService.getConflicts();

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].id).toBe('conflict_1');
    });

    it('should resolve conflict with local version', async () => {
      const conflict = {
        id: 'req_123',
        localData: {name: 'Local'},
        serverData: {name: 'Server'},
        timestamp: Date.now(),
        resolved: false,
      };

      const queuedRequest = {
        id: 'req_123',
        method: 'PUT',
        url: '/api/products/1',
        data: {name: 'Local'},
        status: 'conflict',
        retryCount: 2,
      };

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(conflict))
        .mockResolvedValueOnce(JSON.stringify(queuedRequest));

      await OfflineService.resolveConflict('req_123', 'local');

      // Should update request status to pending with reset retry count
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@nexaerp:queue:req_123',
        expect.stringContaining('"status":"pending"'),
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@nexaerp:queue:req_123',
        expect.stringContaining('"retryCount":0'),
      );
    });

    it('should resolve conflict with server version', async () => {
      const conflict = {
        id: 'req_123',
        localData: {name: 'Local'},
        serverData: {name: 'Server'},
        timestamp: Date.now(),
        resolved: false,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(conflict),
      );

      await OfflineService.resolveConflict('req_123', 'server');

      // Should remove request from queue
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        '@nexaerp:queue:req_123',
      );
    });
  });

  describe('Sync Status', () => {
    it('should return detailed sync status', async () => {
      const requests = [
        {id: 'req_1', status: 'pending', retryCount: 0},
        {id: 'req_2', status: 'pending', retryCount: 0},
        {id: 'req_3', status: 'failed', retryCount: 3},
        {id: 'req_4', status: 'conflict', retryCount: 1},
      ];

      (AsyncStorage.getAllKeys as jest.Mock)
        .mockResolvedValueOnce([
          '@nexaerp:queue:req_1',
          '@nexaerp:queue:req_2',
          '@nexaerp:queue:req_3',
          '@nexaerp:queue:req_4',
        ])
        .mockResolvedValueOnce(['@nexaerp:conflict:conflict_1']);

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(requests[0]))
        .mockResolvedValueOnce(JSON.stringify(requests[1]))
        .mockResolvedValueOnce(JSON.stringify(requests[2]))
        .mockResolvedValueOnce(JSON.stringify(requests[3]))
        .mockResolvedValueOnce(
          JSON.stringify({id: 'conflict_1', resolved: false}),
        )
        .mockResolvedValueOnce('12345678');

      const status = await OfflineService.getSyncStatus();

      expect(status.queuedCount).toBe(4);
      expect(status.pendingCount).toBe(2);
      expect(status.failedCount).toBe(1);
      expect(status.conflictCount).toBe(1);
      expect(status.lastSyncTime).toBe(12345678);
    });
  });

  describe('Cache Statistics', () => {
    it('should calculate cache statistics', async () => {
      const oldTimestamp = Date.now() - 100000;
      const newTimestamp = Date.now();

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        '@nexaerp:cache:key1',
        '@nexaerp:cache:key2',
      ]);

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(
          JSON.stringify({
            data: {test: 'data1'},
            timestamp: oldTimestamp,
            ttl: 60000,
          }),
        )
        .mockResolvedValueOnce(
          JSON.stringify({
            data: {test: 'data2'},
            timestamp: newTimestamp,
            ttl: 60000,
          }),
        );

      const stats = await OfflineService.getCacheStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBe(oldTimestamp);
      expect(stats.newestEntry).toBe(newTimestamp);
    });

    it('should prune old cache entries', async () => {
      const oldTimestamp = Date.now() - 200000; // Very old
      const newTimestamp = Date.now();

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        '@nexaerp:cache:old-key',
        '@nexaerp:cache:new-key',
      ]);

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(
          JSON.stringify({
            data: {test: 'old'},
            timestamp: oldTimestamp,
            ttl: 60000,
          }),
        )
        .mockResolvedValueOnce(
          JSON.stringify({
            data: {test: 'new'},
            timestamp: newTimestamp,
            ttl: 60000,
          }),
        );

      const prunedCount = await OfflineService.pruneCache(100000); // Prune older than 100s

      expect(prunedCount).toBe(1);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        '@nexaerp:cache:old-key',
      );
    });
  });
});
