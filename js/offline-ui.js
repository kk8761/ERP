/**
 * Offline UI Components for Web
 * 
 * Status banner, sync button, and conflict resolution UI for web interface
 */

class OfflineUI {
  constructor() {
    this.statusBanner = null;
    this.syncButton = null;
    this.conflictModal = null;
    
    this.init();
  }

  init() {
    // Create status banner
    this.createStatusBanner();
    
    // Create sync button
    this.createSyncButton();
    
    // Create conflict modal
    this.createConflictModal();
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Update status periodically
    setInterval(() => this.updateStatus(), 5000);
    
    // Initial status check
    this.updateStatus();
  }

  createStatusBanner() {
    const banner = document.createElement('div');
    banner.id = 'offline-status-banner';
    banner.className = 'offline-status-banner hidden';
    banner.innerHTML = `
      <div class="offline-status-content">
        <i class="icon" data-icon="wifi-off"></i>
        <span class="status-text"></span>
        <button class="status-details-btn" onclick="OfflineUI.instance.showSyncModal()">
          Details
        </button>
      </div>
    `;
    
    document.body.insertBefore(banner, document.body.firstChild);
    this.statusBanner = banner;
  }

  createSyncButton() {
    const button = document.createElement('button');
    button.id = 'sync-floating-button';
    button.className = 'sync-floating-button hidden';
    button.innerHTML = `
      <i class="icon" data-icon="sync"></i>
      <span class="badge"></span>
    `;
    button.onclick = () => this.triggerSync();
    
    document.body.appendChild(button);
    this.syncButton = button;
  }

  createConflictModal() {
    const modal = document.createElement('div');
    modal.id = 'offline-modal';
    modal.className = 'offline-modal hidden';
    modal.innerHTML = `
      <div class="modal-backdrop" onclick="OfflineUI.instance.hideModal()"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="modal-title">Sync Status</h2>
          <button class="modal-close" onclick="OfflineUI.instance.hideModal()">
            <i class="icon" data-icon="close"></i>
          </button>
        </div>
        <div class="modal-body" id="modal-body"></div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.conflictModal = modal;
  }

  async updateStatus() {
    const status = await window.OfflineManager.getSyncStatus();
    const isOnline = navigator.onLine;
    
    // Update banner
    if (!isOnline || status.queuedCount > 0 || status.conflictCount > 0) {
      this.showStatusBanner(status, isOnline);
    } else {
      this.hideStatusBanner();
    }
    
    // Update sync button
    if (status.queuedCount > 0) {
      this.showSyncButton(status.queuedCount);
    } else {
      this.hideSyncButton();
    }
  }

  showStatusBanner(status, isOnline) {
    const banner = this.statusBanner;
    const icon = banner.querySelector('.icon');
    const text = banner.querySelector('.status-text');
    
    let iconName, message, className;
    
    if (!isOnline) {
      iconName = 'wifi-off';
      message = `Offline - ${status.queuedCount} changes queued`;
      className = 'status-offline';
    } else if (status.conflictCount > 0) {
      iconName = 'alert-circle';
      message = `${status.conflictCount} conflicts need resolution`;
      className = 'status-conflict';
    } else if (status.isSyncing) {
      iconName = 'sync';
      message = 'Syncing changes...';
      className = 'status-syncing';
    } else if (status.queuedCount > 0) {
      iconName = 'cloud-upload';
      message = `${status.queuedCount} changes pending sync`;
      className = 'status-pending';
    }
    
    icon.setAttribute('data-icon', iconName);
    text.textContent = message;
    banner.className = `offline-status-banner ${className}`;
  }

  hideStatusBanner() {
    this.statusBanner.classList.add('hidden');
  }

  showSyncButton(count) {
    this.syncButton.classList.remove('hidden');
    this.syncButton.querySelector('.badge').textContent = count;
  }

  hideSyncButton() {
    this.syncButton.classList.add('hidden');
  }

  async showSyncModal() {
    const status = await window.OfflineManager.getSyncStatus();
    const conflicts = await window.OfflineManager.getConflicts();
    
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
      <div class="sync-status-grid">
        <div class="status-card">
          <i class="icon ${navigator.onLine ? 'text-success' : 'text-warning'}" data-icon="${navigator.onLine ? 'wifi' : 'wifi-off'}"></i>
          <div class="status-info">
            <div class="status-label">Connection</div>
            <div class="status-value">${navigator.onLine ? 'Online' : 'Offline'}</div>
          </div>
        </div>
        
        <div class="status-card">
          <i class="icon text-primary" data-icon="cloud-upload"></i>
          <div class="status-info">
            <div class="status-label">Queued Changes</div>
            <div class="status-value">${status.queuedCount}</div>
          </div>
        </div>
        
        <div class="status-card">
          <i class="icon text-secondary" data-icon="clock"></i>
          <div class="status-info">
            <div class="status-label">Pending</div>
            <div class="status-value">${status.pendingCount}</div>
          </div>
        </div>
        
        <div class="status-card">
          <i class="icon text-danger" data-icon="alert-circle"></i>
          <div class="status-info">
            <div class="status-label">Conflicts</div>
            <div class="status-value">${status.conflictCount}</div>
          </div>
        </div>
        
        <div class="status-card">
          <i class="icon text-warning" data-icon="close-circle"></i>
          <div class="status-info">
            <div class="status-label">Failed</div>
            <div class="status-value">${status.failedCount}</div>
          </div>
        </div>
      </div>
      
      ${status.conflictCount > 0 ? `
        <button class="btn btn-danger btn-block mt-3" onclick="OfflineUI.instance.showConflicts()">
          <i class="icon" data-icon="alert-circle"></i>
          Resolve ${status.conflictCount} Conflict${status.conflictCount > 1 ? 's' : ''}
        </button>
      ` : ''}
      
      ${navigator.onLine && status.queuedCount > 0 && !status.isSyncing ? `
        <button class="btn btn-primary btn-block mt-2" onclick="OfflineUI.instance.triggerSync()">
          <i class="icon" data-icon="sync"></i>
          Sync Now
        </button>
      ` : ''}
    `;
    
    this.showModal();
  }

  async showConflicts() {
    const conflicts = await window.OfflineManager.getConflicts();
    
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    modalTitle.textContent = 'Resolve Conflicts';
    
    if (conflicts.length === 0) {
      modalBody.innerHTML = `
        <div class="empty-state">
          <i class="icon text-success" data-icon="check-circle"></i>
          <h3>No Conflicts</h3>
          <p>All changes have been synced successfully</p>
        </div>
      `;
      return;
    }
    
    modalBody.innerHTML = conflicts.map((conflict, index) => `
      <div class="conflict-item" id="conflict-${conflict.id}">
        <div class="conflict-header">
          <h4>Conflict #${index + 1}</h4>
          <small>${new Date(conflict.timestamp).toLocaleString()}</small>
        </div>
        
        <div class="conflict-comparison">
          <div class="conflict-version">
            <div class="version-header">
              <i class="icon text-primary" data-icon="cellphone"></i>
              <strong>Your Changes</strong>
            </div>
            <pre class="version-data">${JSON.stringify(conflict.localData, null, 2)}</pre>
            <button class="btn btn-sm btn-primary" onclick="OfflineUI.instance.resolveConflict('${conflict.id}', 'local')">
              Use My Version
            </button>
          </div>
          
          <div class="conflict-divider">VS</div>
          
          <div class="conflict-version">
            <div class="version-header">
              <i class="icon text-success" data-icon="cloud"></i>
              <strong>Server Version</strong>
            </div>
            <pre class="version-data">${JSON.stringify(conflict.serverData, null, 2)}</pre>
            <button class="btn btn-sm btn-success" onclick="OfflineUI.instance.resolveConflict('${conflict.id}', 'server')">
              Use Server Version
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  async resolveConflict(conflictId, resolution) {
    try {
      await window.OfflineManager.resolveConflict(conflictId, resolution);
      
      Toast.success(`Conflict resolved using ${resolution} version`);
      
      // Refresh conflicts view
      this.showConflicts();
      
      // Update status
      this.updateStatus();
    } catch (error) {
      Toast.error(`Failed to resolve conflict: ${error.message}`);
    }
  }

  async triggerSync() {
    if (!navigator.onLine) {
      Toast.warning('Cannot sync while offline');
      return;
    }
    
    try {
      this.hideModal();
      Toast.info('Starting sync...');
      
      const result = await window.OfflineManager.syncOfflineData((current, total, status) => {
        console.log(`Sync progress: ${current}/${total} - ${status}`);
      });
      
      if (result.conflicts > 0) {
        Toast.warning(`Sync complete: ${result.success} succeeded, ${result.conflicts} conflicts`);
        this.showConflicts();
      } else if (result.failed > 0) {
        Toast.warning(`Sync complete: ${result.success} succeeded, ${result.failed} failed`);
      } else {
        Toast.success(`✅ All ${result.success} changes synced successfully`);
      }
      
      this.updateStatus();
    } catch (error) {
      Toast.error(`Sync failed: ${error.message}`);
    }
  }

  handleOnline() {
    Toast.success('🌐 Back online — syncing data...');
    setTimeout(() => {
      window.OfflineManager.syncOfflineData();
    }, 1000);
  }

  handleOffline() {
    Toast.info('📡 Offline mode — using cached data');
  }

  showModal() {
    this.conflictModal.classList.remove('hidden');
  }

  hideModal() {
    this.conflictModal.classList.add('hidden');
  }
}

// Styles for offline UI components
const offlineStyles = `
<style>
.offline-status-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 12px 20px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: transform 0.3s ease;
}

.offline-status-banner.hidden {
  transform: translateY(-100%);
}

.offline-status-banner.status-offline {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.offline-status-banner.status-conflict {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.offline-status-banner.status-syncing {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.offline-status-banner.status-pending {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.offline-status-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.offline-status-content .icon {
  font-size: 20px;
}

.status-details-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.status-details-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.sync-floating-button {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  cursor: pointer;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.sync-floating-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5);
}

.sync-floating-button.hidden {
  opacity: 0;
  pointer-events: none;
}

.sync-floating-button .badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: white;
  border-radius: 12px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.offline-modal {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  transition: opacity 0.3s;
}

.offline-modal.hidden {
  opacity: 0;
  pointer-events: none;
}

.modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: relative;
  background: white;
  border-radius: 16px;
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  color: #6b7280;
  transition: color 0.2s;
}

.modal-close:hover {
  color: #1f2937;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
}

.sync-status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.status-card .icon {
  font-size: 24px;
}

.status-info {
  flex: 1;
}

.status-label {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 4px;
}

.status-value {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.conflict-item {
  background: #fef2f2;
  border: 2px solid #fecaca;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.conflict-header {
  margin-bottom: 16px;
}

.conflict-header h4 {
  margin: 0 0 4px 0;
  color: #991b1b;
}

.conflict-comparison {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 16px;
  align-items: start;
}

.conflict-version {
  background: white;
  border-radius: 8px;
  padding: 16px;
}

.version-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.version-data {
  background: #f9fafb;
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.conflict-divider {
  display: flex;
  align-items: center;
  font-weight: 600;
  color: #6b7280;
  padding-top: 60px;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
}

.empty-state .icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
}

.empty-state p {
  margin: 0;
  color: #6b7280;
}

.text-success { color: #10b981; }
.text-primary { color: #3b82f6; }
.text-warning { color: #f59e0b; }
.text-danger { color: #ef4444; }
.text-secondary { color: #6b7280; }

.btn-block {
  width: 100%;
  display: block;
}

.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', offlineStyles);

// Create singleton instance
window.OfflineUI = {
  instance: new OfflineUI()
};
