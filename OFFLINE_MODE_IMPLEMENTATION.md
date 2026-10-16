# Offline Mode Implementation

## Overview

This document describes the enhanced offline mode implementation for NexaERP, fulfilling requirements 22.3 and 22.4 from the comprehensive ERP enhancement specification.

**Requirements:**
- **22.3**: WHEN offline mode is enabled, THE System SHALL cache data for offline access
- **22.4**: WHEN connectivity is restored, THE System SHALL synchronize offline changes

## Architecture

### Mobile App (React Native)

The mobile offline implementation uses AsyncStorage for data persistence with the following components:

#### 1. Enhanced OfflineService (`mobile/src/services/offline.service.ts`)

**Features:**
- Smart caching with configurable TTL (Time-To-Live)
- Request queuing for offline mutations
- Optimistic updates for immediate UI feedback
- Conflict detection and resolution
- Retry logic with exponential backoff
- Stale data detection
- Cache invalidation by pattern
- Comprehensive sync status tracking

**Key Methods:**

```typescript
// Cache management
async cacheData(key: string, data: any, ttl?: number, etag?: string)
async getCachedData(key: string, allowStale?: boolean)
async invalidateCache(key: string)
async invalidateCachePattern(pattern: string)

// Request queuing
async queueRequest(request: QueueRequest, optimisticData?: any)
async getQueuedRequests()
async removeQueuedRequest(id: string)

// Optimistic updates
async storeOptimisticData(id: string, data: any)
async getOptimisticData(id: string)
async removeOptimisticData(id: string)

// Synchronization
async syncOfflineData(onProgress?: ProgressCallback)
onSyncComplete(callback: SyncCallback)

// Conflict resolution
async getConflicts()
async resolveConflict(id: string, resolution: 'local' | 'server' | 'custom', customData?: any)

// Status and statistics
async getSyncStatus()
async getCacheStats()
async pruneCache(maxAge?: number)
```

#### 2. SyncStatusBanner Component (`mobile/src/components/SyncStatusBanner.tsx`)

**Purpose:** Provides real-time visual feedback for offline mode status

**Features:**
- Displays connection status (online/offline)
- Shows pending changes count
- Indicates sync progress
- Alerts for conflicts
- Manual sync trigger
- Detailed status modal

**Usage:**

```tsx
import SyncStatusBanner from '../components/SyncStatusBanner';

<SyncStatusBanner 
  onConflictPress={() => navigation.navigate('ConflictResolution')}
/>
```

#### 3. ConflictResolutionScreen (`mobile/src/screens/main/ConflictResolutionScreen.tsx`)

**Purpose:** Manual conflict resolution interface

**Features:**
- Lists all unresolved conflicts
- Side-by-side comparison of local vs server data
- Choose local version, server version, or custom merge
- Detailed JSON diff view
- Conflict resolution history

### Web Interface (Vanilla JS)

The web implementation uses IndexedDB for structured storage with better performance:

#### 1. OfflineManager (`js/offline-manager.js`)

**Features:**
- IndexedDB-based storage with object stores
- Cache store for GET responses
- Queue store for pending mutations
- Conflicts store for manual resolution
- Optimistic updates store for UI responsiveness
- Priority-based sync order
- Automatic background sync via Service Worker

**Object Stores:**

```javascript
// cache - Stores GET responses
{
  key: string,          // Cache key (e.g., '/api/products')
  data: any,           // Response data
  timestamp: number,   // Cache creation time
  ttl: number,         // Time to live in ms
  version: number      // Cache version
}

// queue - Stores pending mutations
{
  id: string,          // Unique request ID
  method: string,      // HTTP method
  url: string,         // Request URL
  data: any,           // Request payload
  timestamp: number,   // Queue time
  retryCount: number,  // Retry attempts
  status: string,      // pending | syncing | failed | conflict
  priority: number     // Sync priority (lower = higher priority)
}

// conflicts - Stores sync conflicts
{
  id: string,          // Conflict ID (same as request ID)
  localData: any,      // Local changes
  serverData: any,     // Server response
  timestamp: number,   // Conflict time
  resolved: boolean    // Resolution status
}

// optimistic - Stores temporary optimistic updates
{
  id: string,          // Optimistic update ID
  data: any,           // Optimistic data
  timestamp: number    // Creation time
}
```

#### 2. OfflineUI (`js/offline-ui.js`)

**Purpose:** User interface for offline mode management

**Components:**

1. **Status Banner:** Fixed top banner showing offline/sync status
2. **Floating Sync Button:** Bottom-right FAB for manual sync with badge count
3. **Sync Modal:** Detailed status and statistics
4. **Conflict Resolution UI:** Side-by-side conflict comparison

**Auto Features:**
- Auto-hide when online with no pending changes
- Auto-show when offline or with pending changes
- Auto-sync when back online
- Toast notifications for status changes

## Usage Examples

### Mobile App

#### 1. Cache Data for Offline Access

```typescript
import ApiService from './services/api.service';
import {OfflineService} from './services/offline.service';

// Fetch with automatic caching
const data = await ApiService.get('/api/products');

// Manual caching with custom TTL (1 hour)
await OfflineService.cacheData(
  '/api/products',
  products,
  60 * 60 * 1000
);
```

#### 2. Optimistic Updates

```typescript
// Create product with optimistic UI update
const optimisticId = `temp_${Date.now()}`;
const optimisticProduct = {
  id: optimisticId,
  name: 'New Product',
  price: 99.99,
  _optimistic: true,
};

// Show in UI immediately
setProducts([...products, optimisticProduct]);

// Queue for sync when online
try {
  await ApiService.post('/api/products', {
    name: 'New Product',
    price: 99.99,
  });
  
  // Success - remove optimistic data
  await OfflineService.removeOptimisticData(optimisticId);
} catch (error) {
  // Request queued for offline sync
  console.log('Queued for later sync');
}
```

#### 3. Handle Conflicts

```typescript
// Check for conflicts
const conflicts = await OfflineService.getConflicts();

if (conflicts.length > 0) {
  // Navigate to resolution screen
  navigation.navigate('ConflictResolution');
}

// Resolve conflict
await OfflineService.resolveConflict(
  conflictId,
  'local' // or 'server' or 'custom'
);
```

#### 4. Monitor Sync Status

```typescript
// Get sync status
const status = await OfflineService.getSyncStatus();
console.log(`Pending: ${status.pendingCount}`);
console.log(`Failed: ${status.failedCount}`);
console.log(`Conflicts: ${status.conflictCount}`);

// Listen for sync completion
const unsubscribe = OfflineService.onSyncComplete((result) => {
  console.log(`Synced: ${result.success} succeeded, ${result.failed} failed`);
  
  if (result.conflicts > 0) {
    Alert.alert('Conflicts Detected', 'Some changes need manual resolution');
  }
});

// Clean up listener
return unsubscribe;
```

### Web Interface

#### 1. Queue Offline Mutations

```javascript
// Queue POST request when offline
if (!navigator.onLine) {
  const requestId = await window.OfflineManager.queueRequest(
    'POST',
    '/api/products',
    {name: 'New Product', price: 99.99},
    {
      priority: 5,
      entityType: 'products',
      optimisticId: 'temp-123',
      optimisticData: {
        id: 'temp-123',
        name: 'New Product',
        price: 99.99,
        _pending: true,
      }
    }
  );
  
  // Show optimistic update in UI
  updateProductList();
}
```

#### 2. Manual Sync Trigger

```javascript
// Trigger manual sync with progress
const result = await window.OfflineManager.syncOfflineData(
  (current, total, status) => {
    console.log(`Progress: ${current}/${total} - ${status}`);
    updateProgressBar(current / total);
  }
);

if (result.success > 0) {
  Toast.success(`${result.success} changes synced`);
}

if (result.conflicts > 0) {
  showConflictResolutionModal();
}
```

#### 3. Cache Management

```javascript
// Get cache statistics
const stats = await window.OfflineManager.getCacheStats();
console.log(`Cache size: ${stats.totalSize} bytes`);
console.log(`Total entries: ${stats.totalEntries}`);

// Invalidate specific cache
await window.OfflineManager.invalidateCache('/api/products');

// Invalidate by pattern
await window.OfflineManager.invalidateCachePattern('/api/products/*');

// Clear all cache
await window.OfflineManager.clearCache();
```

## Service Worker Integration

The Service Worker (`sw.js`) handles background caching and sync:

### 1. Network-First for API Calls

```javascript
// API calls try network first, fall back to cache
if (url.pathname.startsWith('/api/')) {
  event.respondWith(networkFirstWithCache(request));
}
```

### 2. Cache-First for Static Assets

```javascript
// Static files served from cache first
event.respondWith(cacheFirstWithNetwork(request));
```

### 3. Background Sync

```javascript
// Trigger background sync when online
self.addEventListener('sync', event => {
  if (event.tag === 'nexaerp-sync') {
    event.waitUntil(syncOfflineActions());
  }
});
```

## Conflict Resolution Strategies

### 1. Last-Write-Wins (Automatic)

Simple conflicts are resolved automatically using timestamps:

```typescript
// Server checks timestamp
if (request.timestamp < serverRecord.updatedAt) {
  // Server version is newer - conflict
  return 409; // Conflict status
}
```

### 2. Manual Resolution (User Choice)

For complex conflicts, user chooses resolution:

- **Use Local Version:** Overwrites server with local changes
- **Use Server Version:** Discards local changes, accepts server
- **Custom Merge:** User manually merges both versions

### 3. Field-Level Merge (Advanced)

For future enhancement, merge non-conflicting fields automatically:

```typescript
const merged = {
  ...serverData,
  ...localData,
  // Keep newer timestamp for each field
};
```

## Testing

### Unit Tests

Run mobile offline service tests:

```bash
cd mobile
npm test -- offline.service.test.ts
```

**Test Coverage:**
- ✅ Cache management with TTL
- ✅ Stale data detection
- ✅ Request queuing
- ✅ Optimistic updates
- ✅ Conflict detection
- ✅ Conflict resolution (local, server, custom)
- ✅ Sync status tracking
- ✅ Cache statistics
- ✅ Cache pruning

### Manual Testing Scenarios

#### Scenario 1: Create Item Offline

1. Disconnect from internet
2. Create new inventory item
3. Item appears in list immediately (optimistic)
4. Check sync status - shows 1 pending
5. Reconnect to internet
6. Verify automatic sync
7. Item updates with server ID

#### Scenario 2: Edit Conflict

1. User A edits product online
2. User B goes offline
3. User B edits same product offline
4. User B reconnects
5. Conflict detected
6. User B resolves conflict manually
7. Changes synced

#### Scenario 3: Long Offline Session

1. Disconnect for extended period
2. Create multiple items
3. Edit existing items
4. Delete some items
5. Check sync status - shows multiple pending
6. Reconnect
7. All changes sync in order
8. No data loss

## Performance Considerations

### Mobile (AsyncStorage)

- **Limitation:** 6MB storage limit on some devices
- **Solution:** Implement cache pruning based on LRU (Least Recently Used)
- **Best Practice:** Cache only essential data, short TTL for large datasets

### Web (IndexedDB)

- **Capacity:** 50MB+ (varies by browser)
- **Performance:** Indexed queries for fast lookups
- **Best Practice:** Use indexes for timestamp, status, and resolved fields

### Optimization Tips

1. **Prioritize Sync:**
   - DELETE requests first (remove obsolete data)
   - POST requests second (create new records)
   - PUT/PATCH requests last (update existing)

2. **Batch Operations:**
   - Group similar requests
   - Use transaction batching in IndexedDB
   - Limit concurrent sync operations

3. **Cache Invalidation:**
   - Invalidate related caches after successful sync
   - Use pattern-based invalidation for efficiency
   - Implement smart cache warming for frequently accessed data

## Security Considerations

1. **Sensitive Data:**
   - Never cache sensitive data (passwords, tokens)
   - Use React Native Keychain for secure storage
   - Clear cache on logout

2. **Data Integrity:**
   - Validate data before sync
   - Use checksums for large payloads
   - Implement conflict resolution to prevent data loss

3. **Offline Auth:**
   - Cache JWT with expiry
   - Refresh tokens when back online
   - Force re-auth after extended offline period

## Future Enhancements

1. **Smart Sync:**
   - ML-based conflict resolution suggestions
   - Predictive caching based on usage patterns
   - Differential sync (only changed fields)

2. **Compression:**
   - Compress large cache entries
   - Delta encoding for updates
   - Binary protocol for efficiency

3. **P2P Sync:**
   - Offline device-to-device sync
   - Mesh network support
   - Bluetooth LE data transfer

4. **Advanced Conflicts:**
   - Three-way merge algorithm
   - Automatic field-level resolution
   - Conflict prediction and prevention

## Troubleshooting

### Issue: Sync Fails Silently

**Symptoms:** Changes queued but never sync
**Cause:** Network error, authentication failure
**Solution:**
```typescript
// Check sync status
const status = await OfflineService.getSyncStatus();
console.log('Failed requests:', status.failedCount);

// View errors
const requests = await OfflineService.getQueuedRequests();
const failed = requests.filter(r => r.status === 'failed');
console.log(failed);
```

### Issue: Cache Growing Too Large

**Symptoms:** App performance degradation
**Cause:** No cache pruning
**Solution:**
```typescript
// Prune old cache entries (older than 7 days)
const pruned = await OfflineService.pruneCache(7 * 24 * 60 * 60 * 1000);
console.log(`Pruned ${pruned} entries`);

// Or clear all cache
await OfflineService.clearCache();
```

### Issue: Conflicts Not Resolving

**Symptoms:** Conflicts remain after resolution
**Cause:** Server validation error
**Solution:**
```typescript
// Check conflict details
const conflicts = await OfflineService.getConflicts();
conflicts.forEach(c => {
  console.log('Local:', c.localData);
  console.log('Server:', c.serverData);
});

// Try custom resolution with merged data
const merged = {...c.serverData, ...c.localData};
await OfflineService.resolveConflict(c.id, 'custom', merged);
```

## Conclusion

The enhanced offline mode provides a robust, user-friendly experience for working without internet connectivity. Key achievements:

✅ **Requirement 22.3:** Smart caching with TTL and stale detection
✅ **Requirement 22.4:** Automatic sync with conflict resolution
✅ Optimistic updates for immediate UI feedback
✅ Comprehensive status tracking and user notifications
✅ Manual conflict resolution with side-by-side comparison
✅ Both mobile and web interface support
✅ Extensive test coverage
✅ Production-ready error handling

Users can now work seamlessly offline with confidence that their changes will sync reliably when connectivity is restored.
