import React, { useState, useEffect } from 'react';
import { 
  Search, Bell, HelpCircle, Sun, Moon, ChevronDown, 
  Store, User, Shield, LogOut, KeyRound, Sparkles,
  ScanLine, PenTool, Wifi, WifiOff, Sliders, ShieldAlert, Eye, Check,
  RefreshCw, Mail, Building2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ModuleSearchModal from './ModuleSearchModal';
import ScreenshotIncidentModal from './ScreenshotIncidentModal';
import { triggerSyncNow } from '../services/syncManager';

export default function TopNav({
  onToggleAI,
  onNavigate,
  currentTab,
  onOpenScanner,
  onOpenSignature,
  theme,
  setTheme
}) {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine !== false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('all');
  
  // DLP Screenshot Security Incidents State
  const [screenshotIncidents, setScreenshotIncidents] = useState([]);
  const [unreviewedCount, setUnreviewedCount] = useState(0);
  const [selectedIncident, setSelectedIncident] = useState(null);

  // 30-Second Server Auto-Sync State across all modules
  const [syncState, setSyncState] = useState({
    isSyncing: false,
    secondsRemaining: 30,
    lastSyncTimestamp: null
  });

  useEffect(() => {
    const handleSyncUpdate = (e) => {
      if (e.detail) {
        setSyncState(prev => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener('nexaerp:sync_update', handleSyncUpdate);
    return () => window.removeEventListener('nexaerp:sync_update', handleSyncUpdate);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = { 
        weekday: 'Wednesday', 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      };
      // Format to match screenshot: "Wednesday, 15 Oct 2026 10:30 AM"
      const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      setCurrentTime(`${dateStr} ${timeStr}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut Ctrl+K or Cmd+K to launch Module Search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch Unified Security & DLP Incidents for Admin notification badge & popover
  const fetchSecurityIncidents = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('nexaerp_token');
      if (!token) return;
      
      // Try unified security notifications endpoint (includes SQL Injection & IDS events)
      const res = await fetch('/api/security/security-notifications?limit=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setScreenshotIncidents(data.notifications || []);
        setUnreviewedCount(data.unreviewed_count || 0);
        return;
      }
      
      // Fallback for non-admin accounts or legacy endpoint
      const legacyRes = await fetch('/api/security/screenshot-incidents?limit=10', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (legacyRes.ok) {
        const data = await legacyRes.json();
        setScreenshotIncidents(data);
        const unread = data.filter(i => !i.is_reviewed).length;
        setUnreviewedCount(unread);
      }
    } catch (err) {
      // Non-critical background poll
    }
  };

  useEffect(() => {
    fetchSecurityIncidents();
    const interval = setInterval(fetchSecurityIncidents, 15000);
    const handleLiveIncident = () => {
      fetchSecurityIncidents();
    };
    window.addEventListener('screenshot-incident-logged', handleLiveIncident);
    return () => {
      clearInterval(interval);
      window.removeEventListener('screenshot-incident-logged', handleLiveIncident);
    };
  }, []);

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'KR';

  const userRole = user?.is_superuser
    ? 'System Administrator'
    : (user?.roles?.[0] || 'Employee');

  return (
    <header style={{
      height: 'var(--header-height)',
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      gap: '20px',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', minWidth: '220px' }}>
        <div 
          onClick={() => onNavigate('dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '9px',
            background: '#010c22',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(0, 100, 210, 0.35)',
            border: '1px solid rgba(0, 152, 255, 0.35)',
            overflow: 'hidden',
            padding: '2px',
            flexShrink: 0
          }}>
            <img
              src="/assets/nexa_icon_transparent.png"
              alt="Nexa ERP"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div>
            <div style={{ 
              fontFamily: 'var(--font-brand)', 
              fontWeight: 800, 
              fontSize: '18px', 
              color: 'var(--text-main)', 
              lineHeight: 1.1,
              letterSpacing: '-0.3px'
            }}>
              Nexa<span style={{ color: 'var(--primary)' }}>ERP</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.2px' }}>
              An ERP Tool For Everyone
            </div>
          </div>
        </div>
      </div>

      {/* Global Module & Function Search Bar with Filter and Search Button */}
      <div style={{ flex: 1, maxWidth: '580px', position: 'relative' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setIsSearchModalOpen(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '3px 4px 3px 8px',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          {/* Category Filter Selector */}
          <select
            value={searchCategory}
            onChange={(e) => setSearchCategory(e.target.value)}
            style={{
              border: 'none',
              background: 'var(--bg-surface)',
              borderRadius: '4px',
              padding: '4px 6px',
              fontSize: '11.5px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              outline: 'none',
              borderRight: '1px solid var(--border-color)'
            }}
          >
            <option value="all">All Modules</option>
            <option value="sales">Sales & POS</option>
            <option value="inventory">Inventory & Stock</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="finance">Finance & GL</option>
            <option value="hr">People & HR</option>
            <option value="grc">GRC & Risk</option>
            <option value="security">Security & Admin</option>
            <option value="ai">AI & Tools</option>
          </select>

          <Search size={15} color="var(--text-muted)" />

          <input
            type="text"
            placeholder="Search modules, functions, operations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={() => setIsSearchModalOpen(true)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '13px',
              width: '100%',
              color: 'var(--text-main)'
            }}
          />

          <kbd
            onClick={() => setIsSearchModalOpen(true)}
            style={{
              fontSize: '11px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '2px 6px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Ctrl + K
          </kbd>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              borderRadius: '4px',
              whiteSpace: 'nowrap'
            }}
          >
            <Search size={13} />
            <span>Search</span>
          </button>
        </form>
      </div>

      {/* Right Controls: Branch, DateTime, Alerts, Theme, Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Branch Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12.5px',
          fontWeight: 600,
          color: 'var(--text-main)',
          padding: '6px 12px',
          backgroundColor: 'var(--bg-subtle)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer'
        }}>
          <Store size={15} color="var(--primary)" />
          <span>{user?.branch_name || 'Main Store'}</span>
          <ChevronDown size={14} color="var(--text-muted)" />
        </div>

        {/* Date Time Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          padding: '6px 12px',
          backgroundColor: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)',
          whiteSpace: 'nowrap'
        }}>
          <span>{currentTime || 'Wednesday, 15 Oct 2026 10:30 AM'}</span>
        </div>

        {/* Enterprise Multi-Module 30-Second Cloud Sync Status Badge */}
        <div 
          onClick={() => triggerSyncNow()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11.5px',
            fontWeight: 600,
            padding: '5px 10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: !isOnline ? 'rgba(245, 158, 11, 0.15)' : syncState.isSyncing ? 'rgba(2, 132, 199, 0.15)' : 'rgba(16, 185, 129, 0.1)',
            color: !isOnline ? '#d97706' : syncState.isSyncing ? '#0284c7' : '#10b981',
            border: `1px solid ${!isOnline ? 'rgba(245, 158, 11, 0.3)' : syncState.isSyncing ? 'rgba(2, 132, 199, 0.3)' : 'rgba(16, 185, 129, 0.25)'}`,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            userSelect: 'none'
          }}
          title={isOnline ? "All ERP modules sync with server every 30s. Click to sync now." : "Working in Offline Mode. Transactions will auto-sync on reconnect."}
        >
          {syncState.isSyncing ? (
            <RefreshCw size={13} className="animate-spin" />
          ) : isOnline ? (
            <RefreshCw size={13} />
          ) : (
            <WifiOff size={13} />
          )}
          <span>
            {!isOnline 
              ? 'Offline' 
              : syncState.isSyncing 
              ? 'Syncing...' 
              : syncState.secondsRemaining > 0 
              ? `Sync: in ${syncState.secondsRemaining}s` 
              : 'Synced'}
          </span>
        </div>

        {/* Enterprise Cloud Instance & Persistent Storage Status Badge */}
        <div 
          onClick={() => onNavigate('company_portal')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11.5px',
            fontWeight: 600,
            padding: '5px 10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            userSelect: 'none',
            whiteSpace: 'nowrap'
          }}
          title="Compute: Ephemeral Cloud Container | Storage: 100% Guaranteed Permanent ACID Data Storage. Click to view company overview & instance portal."
        >
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            boxShadow: '0 0 6px #10b981'
          }} />
          <span>Instance Active (Persistent DB)</span>
        </div>

        {/* Universal Barcode Scanner Quick Launch */}
        <button
          onClick={onOpenScanner}
          className="btn btn-ghost"
          title="Scan Product Barcode / SKU (Camera & Optical)"
          style={{
            color: 'var(--text-main)',
            padding: '7px 10px',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <ScanLine size={17} />
        </button>

        {/* Digital E-Signature Quick Launch */}
        <button
          onClick={onOpenSignature}
          className="btn btn-ghost"
          title="Digital E-Signature Pad & Document Seal"
          style={{
            color: 'var(--text-main)',
            padding: '7px 10px',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <PenTool size={17} />
        </button>

        {/* AI Assistant Quick Trigger */}
        <button
          onClick={onToggleAI}
          className="btn btn-ghost"
          title="Toggle Nexa AI Assistant"
          style={{
            position: 'relative',
            color: 'var(--primary)',
            background: 'var(--primary-light)',
            padding: '7px 10px',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <Sparkles size={17} />
        </button>

        {/* Mail Center & AI Hub Quick Trigger */}
        <button
          onClick={() => onNavigate('email_hub')}
          className="btn btn-ghost"
          title="Open Mail Center & AI Hub"
          style={{
            position: 'relative',
            color: currentTab === 'email_hub' ? 'var(--primary)' : 'var(--text-main)',
            backgroundColor: currentTab === 'email_hub' ? 'var(--primary-light)' : 'transparent',
            padding: '7px 10px',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <Mail size={17} />
          {(syncState?.metrics?.emails?.unread_emails > 0) && (
            <span
              style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                fontSize: '9px',
                fontWeight: 800,
                borderRadius: '8px',
                padding: '1px 4px',
                lineHeight: 1
              }}
            >
              {syncState.metrics.emails.unread_emails}
            </span>
          )}
        </button>

        {/* Notifications Icon with Real-Time DLP Alert Badge */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setNotifOpen(!notifOpen)}
            className="btn btn-ghost" 
            title="DLP Security & System Notifications"
            style={{ 
              padding: '8px', 
              borderRadius: 'var(--radius-full)',
              color: unreviewedCount > 0 ? '#ef4444' : 'var(--text-main)',
              position: 'relative'
            }}
          >
            <Bell size={18} />
            {unreviewedCount > 0 && (
              <span 
                className="animate-pulse"
                style={{
                  position: 'absolute',
                  top: '3px',
                  right: '3px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 800,
                  minWidth: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                  border: '2px solid var(--bg-surface)',
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
                }}
              >
                {unreviewedCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Popover */}
          {notifOpen && (
            <div 
              className="nexa-card animate-fade-in"
              style={{
                position: 'absolute',
                right: 0,
                top: '46px',
                width: '390px',
                maxHeight: '480px',
                zIndex: 250,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden'
              }}
            >
              {/* Header */}
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-app)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={16} color="#ef4444" />
                  <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>
                    Security & DLP Alerts
                  </span>
                  {unreviewedCount > 0 && (
                    <span style={{
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '10px'
                    }}>
                      {unreviewedCount} new
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setNotifOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Incidents List */}
              <div style={{ overflowY: 'auto', maxHeight: '380px', padding: '8px' }}>
                {screenshotIncidents.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Shield size={28} color="var(--primary)" style={{ opacity: 0.5, marginBottom: '8px' }} />
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Zero DLP Incidents Detected</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      All workspace screenshot attempts are logged and alerted in real-time.
                    </div>
                  </div>
                ) : (
                  screenshotIncidents.map(inc => (
                    <div
                      key={inc.id}
                      onClick={() => {
                        setSelectedIncident(inc);
                        setNotifOpen(false);
                      }}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        marginBottom: '6px',
                        backgroundColor: inc.is_reviewed ? 'var(--bg-app)' : 'rgba(239, 68, 68, 0.07)',
                        border: inc.is_reviewed ? '1px solid var(--border-color)' : '1px solid rgba(239, 68, 68, 0.35)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {/* Thumbnail or Attack Icon */}
                        {inc.category === 'IDS_INTRUSION' || inc.attack_type === 'SQL_INJECTION' ? (
                          <div style={{
                            width: '56px',
                            height: '50px',
                            borderRadius: '6px',
                            backgroundColor: '#fef2f2',
                            border: '1px solid #f87171',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <ShieldAlert size={24} color="#dc2626" />
                          </div>
                        ) : (
                          <div style={{
                            width: '60px',
                            height: '46px',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            backgroundColor: '#000000',
                            flexShrink: 0,
                            border: '1px solid rgba(239, 68, 68, 0.5)',
                            position: 'relative'
                          }}>
                            <img 
                              src={inc.image_data} 
                              alt="capture thumbnail" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          </div>
                        )}

                        {/* Details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ 
                              fontSize: '11px', 
                              fontWeight: 700, 
                              color: inc.category === 'IDS_INTRUSION' ? '#dc2626' : '#ef4444' 
                            }}>
                              {inc.category === 'IDS_INTRUSION' ? '🚨 SQL Injection Intercepted' : 'Screen Capture Attempt'}
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              {new Date(inc.detected_at || inc.captured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          
                          <div style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text-main)',
                            marginTop: '1px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {inc.category === 'IDS_INTRUSION' 
                              ? `Gateway: ${inc.target_endpoint || '/api/auth/login'}` 
                              : inc.user_name}
                          </div>

                          <div style={{
                            fontSize: '10.5px',
                            color: inc.category === 'IDS_INTRUSION' ? '#991b1b' : 'var(--primary)',
                            fontFamily: 'monospace',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {inc.category === 'IDS_INTRUSION' 
                              ? `Attacker IP: ${inc.client_ip}` 
                              : inc.user_email}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              {inc.category === 'IDS_INTRUSION' 
                                ? (inc.payload_sample ? `Sample: ${inc.payload_sample.substring(0, 18)}` : 'Auth Bypass') 
                                : (inc.page_url?.substring(0, 24) || '')}
                            </span>
                            <span style={{
                              fontSize: '9.5px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: inc.category === 'IDS_INTRUSION' ? '#fee2e2' : (inc.is_reviewed ? '#dcfce7' : '#fee2e2'),
                              color: inc.category === 'IDS_INTRUSION' ? '#991b1b' : (inc.is_reviewed ? '#16a34a' : '#ef4444')
                            }}>
                              {inc.category === 'IDS_INTRUSION' ? 'Admin Alert Dispatched' : (inc.is_reviewed ? '✓ Reviewed' : '● Needs Review')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Popover Footer */}
              <div style={{
                padding: '10px 14px',
                borderTop: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-app)',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => {
                    setNotifOpen(false);
                    onNavigate('screenshots');
                  }}
                  className="btn btn-ghost"
                  style={{
                    width: '100%',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--primary-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '6px 12px'
                  }}
                >
                  <Eye size={14} />
                  <span>Open DLP Screenshot Evidence Vault →</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Theme Switcher */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="btn btn-ghost"
          style={{ padding: '8px', borderRadius: 'var(--radius-full)' }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} />}
        </button>

        {/* User Profile Chip */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setProfileOpen(!profileOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              transition: 'background var(--transition-fast)'
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#0064d2',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '13px'
            }}>
              {initials}
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                {user?.full_name || 'Karthik Reddy'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {userRole}
              </div>
            </div>
            <ChevronDown size={14} color="var(--text-muted)" />
          </div>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div 
              className="nexa-card animate-fade-in"
              style={{
                position: 'absolute',
                right: 0,
                top: '48px',
                width: '230px',
                zIndex: 200,
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>{user?.full_name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{user?.email}</div>
              </div>

              <button
                onClick={() => { setProfileOpen(false); onNavigate('elevation'); }}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: '13px' }}
              >
                <KeyRound size={15} color="var(--primary)" />
                <span>Role Elevation (JIT)</span>
              </button>

              <button
                onClick={() => { setProfileOpen(false); onNavigate('admin'); }}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: '13px' }}
              >
                <Shield size={15} color="var(--primary)" />
                <span>Security & Admin</span>
              </button>

              <button
                onClick={() => { setProfileOpen(false); onNavigate('settings'); }}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: '13px' }}
              >
                <Sliders size={15} color="var(--primary)" />
                <span>System Settings</span>
              </button>

              <button
                onClick={() => { setProfileOpen(false); onNavigate('company_portal'); }}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: '13px' }}
              >
                <Building2 size={15} color="var(--primary)" />
                <span>Company & Instance Portal</span>
              </button>

              <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />

              <button
                onClick={() => { setProfileOpen(false); logout(); }}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger)', fontSize: '13px' }}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global Enterprise Module & Function Search Modal */}
      <ModuleSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onNavigate={onNavigate}
        onToggleAI={onToggleAI}
        onOpenScanner={onOpenScanner}
        onOpenSignature={onOpenSignature}
        initialQuery={searchQuery}
        initialCategory={searchCategory}
      />

      {/* DLP Screenshot Incident Detail & Evidence Modal */}
      {selectedIncident && (
        <ScreenshotIncidentModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onReviewed={() => fetchSecurityIncidents()}
        />
      )}
    </header>
  );
}
