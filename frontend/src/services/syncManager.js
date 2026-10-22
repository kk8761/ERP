/**
 * NexaERP Multi-Module 30-Second Background Sync Engine
 * Synchronizes client drafts, journal lines, inventory adjustments, and module telemetry
 * to the server every 30 seconds across all modules.
 */

import { apiRequest } from './api';

const SYNC_INTERVAL_SEC = 30;
let initialTimeout = null;
let countdownTimer = null;
let isRunning = false;
let secondsRemaining = SYNC_INTERVAL_SEC;
let lastSyncTimestamp = null;
let isSyncing = false;
let lastMetrics = null;

// Registry of module state providers that can register draft payloads to be synced
const moduleProviders = new Map();

export function registerModuleSyncProvider(moduleName, providerFn) {
  moduleProviders.set(moduleName, providerFn);
  return () => moduleProviders.delete(moduleName);
}

export function getSyncState() {
  return {
    isSyncing,
    secondsRemaining,
    lastSyncTimestamp,
    interval: SYNC_INTERVAL_SEC,
    metrics: lastMetrics
  };
}

function broadcastSyncState(status = 'idle') {
  window.dispatchEvent(new CustomEvent('nexaerp:sync_update', {
    detail: {
      status,
      isSyncing,
      secondsRemaining,
      lastSyncTimestamp,
      metrics: lastMetrics
    }
  }));
}

export async function triggerSyncNow() {
  if (isSyncing) return;
  isSyncing = true;
  broadcastSyncState('syncing');

  try {
    // Gather module draft states
    const modulesPayload = {};
    for (const [moduleName, providerFn] of moduleProviders.entries()) {
      try {
        const data = providerFn();
        if (data !== undefined && data !== null) {
          modulesPayload[moduleName] = data;
        }
      } catch (err) {
        console.warn(`[SyncManager] Error collecting data for ${moduleName}:`, err);
      }
    }

    // Call unified backend multi-module sync
    const res = await apiRequest('/api/sync/all', {
      method: 'POST',
      body: JSON.stringify({
        client_timestamp: new Date().toISOString(),
        modules: modulesPayload
      })
    });

    // BUG-63 & BUG-66: Invoke authorized processing endpoint to durably commit drafts
    const processingRequired = Object.keys(modulesPayload).length > 0 || res.status === 'PENDING';
    let processRes = null;
    let processError = null;

    if (processingRequired) {
      try {
        processRes = await apiRequest('/api/sync/process', {
          method: 'POST'
        });
      } catch (procErr) {
        processError = procErr;
        console.error('[SyncManager] Draft processing failed:', procErr);
      }
    }

    lastSyncTimestamp = new Date();
    lastMetrics = res.module_metrics || null;
    secondsRemaining = SYNC_INTERVAL_SEC;

    // BUG-66: Validate the actual response returned by the backend
    const processSucceeded = !processingRequired || (
      !processError &&
      processRes?.status === 'SUCCESS' &&
      Array.isArray(processRes.errors) &&
      processRes.errors.length === 0 &&
      processRes.synced === processRes.total_evaluated
    );

    broadcastSyncState(processSucceeded ? 'success' : 'error');

    // Notify modules that server sync has completed so they can update themselves
    window.dispatchEvent(new CustomEvent('nexaerp:module_synced', {
      detail: {
        serverTime: res.server_time,
        metrics: res.module_metrics,
        syncId: res.sync_id,
        processResult: processRes
      }
    }));
  } catch (err) {
    console.error('[SyncManager] Auto-sync failed:', err);
    broadcastSyncState('error');
  } finally {
    isSyncing = false;
  }
}

export function startAutoSync() {
  if (isRunning) return;
  isRunning = true;

  // Run initial sync after a short delay and track the timer ID (BUG-64)
  initialTimeout = setTimeout(() => {
    initialTimeout = null;
    triggerSyncNow();
  }, 1500);

  // 1-second countdown tick for live UI countdown
  countdownTimer = setInterval(() => {
    secondsRemaining = Math.max(0, secondsRemaining - 1);
    broadcastSyncState(isSyncing ? 'syncing' : 'countdown');
    if (secondsRemaining <= 0) {
      triggerSyncNow();
    }
  }, 1000);
}

export function stopAutoSync() {
  isRunning = false;
  if (initialTimeout) {
    clearTimeout(initialTimeout);
    initialTimeout = null;
  }
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}
