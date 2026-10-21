# Offline Mode Testing Plan

## Overview

This document provides a comprehensive test plan for validating the enhanced offline mode implementation (Task 40.3) against requirements 22.3 and 22.4.

## Requirements Coverage

- **Requirement 22.3**: Cache data for offline access ✅
- **Requirement 22.4**: Synchronize offline changes when online ✅

## Automated Tests

### Unit Tests (`src/services/__tests__/offline.service.test.ts`)

Run with: `npm test -- offline.service.test`

**Test Suites:**

1. **Cache Management** (8 tests)
   - ✅ Cache data with TTL
   - ✅ Retrieve cached data when not stale
   - ✅ Detect stale cached data
   - ✅ Return stale data when allowed
   - ✅ Invalidate cache by key
   - ✅ Invalidate cache by pattern
   - ✅ Calculate cache statistics
   - ✅ Prune old cache entries

2. **Request Queuing** (3 tests)
   - ✅ Queue request for offline sync
   - ✅ Store optimistic data with request
   - ✅ Retrieve queued requests sorted by timestamp

3. **Optimistic Updates** (2 tests)
   - ✅ Store and retrieve optimistic data
   - ✅ Remove optimistic data after sync

4. **Conflict Resolution** (3 tests)
   - ✅ Retrieve unresolved conflicts
   - ✅ Resolve conflict with local version
   - ✅ Resolve conflict with server version

5. **Sync Status** (1 test)
   - ✅ Return detailed sync status with counts

**Expected Results:** All 17 tests should pass

## Manual Testing Scenarios

### Scenario 1: Basic Offline Data Entry

**Objective:** Verify data can be entered and queued while offline

**Steps:**
1. Launch mobile app
2. Ensure connected to network
3. Navigate to Inventory screen
4. Turn off WiFi/mobile data (airplane mode)
5. Observe "Offline" banner appears
6. Tap "Add Product" button
7. Enter product details:
   - Name: "Test Product Offline"
   - SKU: "TEST-001"
   - Price: 99.99
   - Quantity: 10
8. Tap "Save"

**Expected Results:**
- ✅ Product appears in list immediately (optimistic update)
- ✅ Product shows pending indicator (e.g., clock icon)
- ✅ Sync status banner shows "1 change queued"
- ✅ No error message displayed
- ✅ User can continue using app

**Validates:** Requirement 22.3 - Offline data entry

---

### Scenario 2: Automatic Sync When Online

**Objective:** Verify queued changes sync automatically when connectivity restored

**Prerequisites:** Complete Scenario 1

**Steps:**
1. Verify "1 change queued" in sync status
2. Turn on WiFi/mobile data
3. Observe banner changes to "Syncing..."
4. Wait for sync to complete

**Expected Results:**
- ✅ Banner shows "Syncing..." immediately
- ✅ Product syncs within 5 seconds
- ✅ Pending indicator removed from product
- ✅ Product ID updated with server ID
- ✅ Toast notification: "✅ 1 change synced successfully"
- ✅ Sync status banner disappears
- ✅ Product persists after app restart

**Validates:** Requirement 22.4 - Automatic synchronization

---

### Scenario 3: Offline Data Caching

**Objective:** Verify cached data accessible while offline

**Steps:**
1. Ensure connected to network
2. Navigate to Inventory screen
3. View product list (loads from server)
4. Pull to refresh (caches latest data)
5. Note timestamp of last refresh
6. Turn off network (airplane mode)
7. Close and reopen app
8. Navigate to Inventory screen again

**Expected Results:**
- ✅ Product list displays immediately
- ✅ No loading spinner
- ✅ All previously viewed products visible
- ✅ Banner indicates "Offline - using cached data"
- ✅ Data matches last online state
- ✅ Cached data age < 24 hours

**Validates:** Requirement 22.3 - Data caching

---

### Scenario 4: Multiple Offline Operations

**Objective:** Verify multiple operations queued correctly

**Steps:**
1. Go offline (airplane mode)
2. Create 2 new products
3. Edit 1 existing product
4. Delete 1 product
5. Check sync status

**Expected Results:**
- ✅ All 4 operations appear in UI immediately
- ✅ Sync status shows "4 changes queued"
- ✅ Each operation maintains its type (create/update/delete)
- ✅ Operations ordered by timestamp

**Next Steps:**
6. Go back online
7. Observe automatic sync

**Expected Results After Sync:**
- ✅ All 4 operations sync successfully
- ✅ Sync order preserved (DELETE → POST → PUT)
- ✅ Toast: "✅ All 4 changes synced successfully"
- ✅ No conflicts detected

**Validates:** Requirements 22.3 & 22.4 - Queuing and sync

---

### Scenario 5: Conflict Detection and Resolution

**Objective:** Verify conflicts detected and resolved properly

**Setup:**
1. Use two devices or simulate server-side change
2. Have same product open on both

**Steps:**
1. **Device A:** Edit product "Test Product" → Change price to $89.99 → Save (online)
2. **Device B:** Go offline
3. **Device B:** Edit same product → Change price to $79.99 → Save (queued)
4. **Device B:** Go back online
5. Observe conflict notification
6. Tap "Resolve Conflicts" button
7. Review conflict details:
   - Local: $79.99
   - Server: $89.99
8. Tap "Use My Version" (local)

**Expected Results:**
- ✅ Conflict detected during sync
- ✅ Banner shows "1 conflict needs resolution"
- ✅ Sync pauses for that item
- ✅ Other items sync normally
- ✅ Conflict modal shows both versions
- ✅ Selecting "Use My Version" requeues with local data
- ✅ Re-syncing overwrites server version
- ✅ Final product price: $79.99

**Alternate Test:**
- Choose "Use Server Version" instead
- Final product price should be $89.99

**Validates:** Conflict resolution mechanism

---

### Scenario 6: Long Offline Session

**Objective:** Verify app handles extended offline periods

**Steps:**
1. Go offline
2. Perform 10-15 operations over 30 minutes:
   - Create products
   - Edit products
   - View different screens
   - Search products
3. Check sync status periodically
4. After 30 minutes, go back online

**Expected Results:**
- ✅ All operations queued successfully
- ✅ Sync status accurate throughout
- ✅ No memory leaks or performance issues
- ✅ UI remains responsive
- ✅ Cached data remains accessible
- ✅ Auto-sync works after reconnection
- ✅ All queued operations sync successfully
- ✅ Sync completes within 60 seconds

**Validates:** Stability and performance

---

### Scenario 7: Stale Cache Handling

**Objective:** Verify stale cache detected and refreshed

**Steps:**
1. View product list (caches data)
2. Wait 25 hours (or mock timestamp)
3. Go offline
4. View product list again
5. Observe stale data indicator
6. Go back online
7. Pull to refresh

**Expected Results:**
- ✅ Stale data still displayed offline
- ✅ Indicator shows "Data may be outdated"
- ✅ Going online triggers background refresh
- ✅ Fresh data loaded after refresh
- ✅ Stale indicator removed

**Validates:** Cache TTL and staleness detection

---

### Scenario 8: Sync Status Visibility

**Objective:** Verify sync status accurately reflected in UI

**Steps:**
1. Go offline
2. Create 3 products
3. Tap sync status banner
4. Review detailed status modal

**Expected Results:**
- ✅ Connection: Offline
- ✅ Queued Changes: 3
- ✅ Pending: 3
- ✅ Conflicts: 0
- ✅ Failed: 0
- ✅ Last Sync: (timestamp)

**Next Steps:**
5. Go online
6. Let 1 item sync successfully
7. Simulate 1 conflict
8. Simulate 1 failure
9. Review status again

**Expected Results:**
- ✅ Connection: Online
- ✅ Queued Changes: 2
- ✅ Pending: 0
- ✅ Conflicts: 1
- ✅ Failed: 1
- ✅ Last Sync: (updated timestamp)
- ✅ "Resolve Conflicts" button visible

**Validates:** Status tracking accuracy

---

### Scenario 9: Optimistic UI Updates

**Objective:** Verify optimistic updates provide immediate feedback

**Steps:**
1. Go offline
2. Create new product
3. Note timestamp T0
4. Verify product appears immediately (T1)
5. Calculate T1 - T0

**Expected Results:**
- ✅ Product visible in < 100ms
- ✅ No waiting for network
- ✅ Product shows "pending" indicator
- ✅ Product has temporary ID
- ✅ Product fully interactive (can edit/view)

**Next Steps:**
6. Go online
7. Wait for sync
8. Verify product updated

**Expected Results After Sync:**
- ✅ Pending indicator removed
- ✅ Temporary ID replaced with server ID
- ✅ Product remains in same position
- ✅ No UI flicker or jump

**Validates:** Optimistic updates

---

### Scenario 10: Error Recovery

**Objective:** Verify graceful error handling

**Steps:**
1. Go offline
2. Create product with invalid data (e.g., negative price)
3. Go online
4. Observe sync attempt
5. Review error handling

**Expected Results:**
- ✅ Sync attempts request
- ✅ Server returns 422 Validation Error
- ✅ Request marked as "failed"
- ✅ Error details shown in status modal
- ✅ User can retry or delete queued item
- ✅ Other valid requests sync normally

**Next Steps:**
6. Edit queued item to fix validation error
7. Trigger manual sync
8. Verify successful sync

**Expected Results:**
- ✅ Corrected data syncs successfully
- ✅ Item removed from queue
- ✅ Toast: "Changes synced"

**Validates:** Error handling and recovery

---

## Web Interface Tests

### Scenario 11: Web Offline Mode

**Objective:** Verify web interface offline support

**Steps:**
1. Open dashboard in browser (Chrome/Firefox)
2. Open DevTools → Network tab
3. Set throttling to "Offline"
4. Navigate to Inventory module
5. Try to create new product

**Expected Results:**
- ✅ Offline banner appears at top
- ✅ Product creation queued automatically
- ✅ Floating sync button shows badge
- ✅ Product appears in list immediately
- ✅ IndexedDB stores request

**Next Steps:**
6. Set throttling to "Online"
7. Observe automatic sync

**Expected Results:**
- ✅ Banner shows "Syncing..."
- ✅ Request syncs from IndexedDB
- ✅ Product updated with server ID
- ✅ Badge count decreases

**Validates:** Web offline mode (Req 22.3, 22.4)

---

### Scenario 12: Web Conflict Resolution

**Objective:** Verify web conflict resolution UI

**Steps:**
1. Create conflict (see Scenario 5)
2. Click "Resolve Conflicts" button in modal
3. Review side-by-side comparison
4. Choose resolution

**Expected Results:**
- ✅ Modal shows conflict details
- ✅ Local and server versions displayed
- ✅ JSON formatted and readable
- ✅ "Use My Version" button works
- ✅ "Use Server Version" button works
- ✅ Conflict removed after resolution

**Validates:** Web conflict resolution

---

## Performance Tests

### Test 1: Sync Performance

**Objective:** Measure sync throughput

**Steps:**
1. Queue 100 operations offline
2. Go online and measure sync time

**Target:** All 100 operations sync in < 30 seconds

**Metrics:**
- Operations per second: > 3
- Network requests: Batched when possible
- UI responsiveness: No blocking

---

### Test 2: Cache Performance

**Objective:** Measure cache read/write speed

**Steps:**
1. Cache 50 API responses
2. Measure read time for each

**Target:**
- Write: < 50ms per entry
- Read: < 10ms per entry
- Total cache size: < 5MB

---

### Test 3: UI Responsiveness

**Objective:** Ensure offline mode doesn't block UI

**Steps:**
1. Queue 50 operations
2. Interact with UI during sync

**Target:**
- Frame rate: 60fps maintained
- Touch response: < 100ms
- No ANR (Application Not Responding)

---

## Acceptance Criteria

### Must Pass

- ✅ All 17 unit tests pass
- ✅ Scenarios 1-5 complete successfully
- ✅ Zero data loss in offline mode
- ✅ Conflicts detected and resolved correctly
- ✅ Auto-sync works reliably

### Should Pass

- ✅ Scenarios 6-10 complete successfully  
- ✅ Performance targets met
- ✅ Web interface offline mode works
- ✅ No memory leaks after extended use

### Nice to Have

- ✅ Scenarios 11-12 work perfectly
- ✅ All performance tests exceed targets
- ✅ Zero user-reported issues

---

## Test Environment

### Mobile

- **Devices:** iOS 14+, Android 8+
- **Simulators:** iPhone 15 Pro, Pixel 7
- **Network:** WiFi, 4G, Offline (airplane mode)

### Web

- **Browsers:** Chrome 90+, Firefox 88+, Safari 14+
- **Tools:** DevTools Network throttling
- **Storage:** IndexedDB support required

---

## Regression Testing

After any changes to offline functionality, rerun:

1. **Critical Path:** Scenarios 1-5
2. **Full Suite:** All scenarios
3. **Performance:** All performance tests

---

## Bug Reporting Template

```markdown
**Title:** [Brief description]

**Scenario:** [Test scenario number]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected:** [What should happen]

**Actual:** [What actually happened]

**Environment:**
- Device/Browser:
- OS Version:
- App Version:
- Network: Online/Offline

**Logs:** [Error logs, screenshots]

**Priority:** Critical / High / Medium / Low
```

---

## Test Status Tracking

| Scenario | Status | Tester | Date | Notes |
|----------|--------|--------|------|-------|
| 1. Basic Offline Entry | ⏳ Pending | - | - | - |
| 2. Auto Sync | ⏳ Pending | - | - | - |
| 3. Data Caching | ⏳ Pending | - | - | - |
| 4. Multiple Operations | ⏳ Pending | - | - | - |
| 5. Conflict Resolution | ⏳ Pending | - | - | - |
| 6. Long Offline Session | ⏳ Pending | - | - | - |
| 7. Stale Cache | ⏳ Pending | - | - | - |
| 8. Sync Status | ⏳ Pending | - | - | - |
| 9. Optimistic Updates | ⏳ Pending | - | - | - |
| 10. Error Recovery | ⏳ Pending | - | - | - |
| 11. Web Offline | ⏳ Pending | - | - | - |
| 12. Web Conflicts | ⏳ Pending | - | - | - |

Legend:
- ⏳ Pending
- ✅ Passed
- ❌ Failed
- ⚠️ Blocked

---

## Conclusion

This test plan ensures comprehensive validation of the enhanced offline mode implementation. All critical scenarios must pass before considering Task 40.3 complete.
