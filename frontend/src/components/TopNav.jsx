import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Bell, HelpCircle, Sun, Moon, ChevronDown, ChevronLeft, ChevronRight,
  Store, User, Shield, LogOut, KeyRound, Sparkles,
  ScanLine, PenTool, Wifi, WifiOff, Sliders, ShieldAlert, Eye, Check,
  RefreshCw, Mail, Building2, Clock, Mic, Globe, UploadCloud, Database
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ModuleSearchModal from './ModuleSearchModal';
import ScreenshotIncidentModal from './ScreenshotIncidentModal';
import UniversalDataImportModal from './UniversalDataImportModal';
import MNCBranchSwitcherModal from './MNCBranchSwitcherModal';
import UserProfileModal from './UserProfileModal';
import CompanySettingsModal from './CompanySettingsModal';
import UserPreferencesModal from './UserPreferencesModal';
import { triggerSyncNow } from '../services/syncManager';
import { API_BASE_URL } from '../services/api';

export default function TopNav({
  onToggleAI,
  onOpenAI,
  onNavigate,
  currentTab,
  onOpenScanner,
  onOpenSignature,
  onSwitchPortal,
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
  
  // MNC Multi-Branch & Universal Data Onboarding Modals
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [currentBranchId, setCurrentBranchId] = useState(1);
  const [currentBranchName, setCurrentBranchName] = useState('Hyderabad Global HQ');
  
  // User Profile, Company Settings & User Preferences Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPrefsModalOpen, setIsPrefsModalOpen] = useState(false);
  
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

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Close profile and notification dropdowns on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setProfileOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Horizontal sideways scroll state for top action toolbar
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
    }
  };

  useEffect(() => {
    checkScroll();
    const timer = setTimeout(checkScroll, 350);
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -220, behavior: 'smooth' });
      setTimeout(checkScroll, 250);
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 220, behavior: 'smooth' });
      setTimeout(checkScroll, 250);
    }
  };

  const handleWheel = (e) => {
    if (scrollContainerRef.current) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        scrollContainerRef.current.scrollLeft += e.deltaY;
        checkScroll();
      }
    }
  };

  useEffect(() => {
    const handleSyncUpdate = (e) => {
      if (e.detail) {
        setSyncState(prev => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener('nexaerp:sync_update', handleSyncUpdate);
    return () => window.removeEventListener('nexaerp:sync_update', handleSyncUpdate);
  }, []);

  // Global event triggers for profile, settings, preferences
  useEffect(() => {
    const handleOpenProfile = () => setIsProfileModalOpen(true);
    const handleOpenSettings = () => setIsSettingsModalOpen(true);
    const handleOpenPrefs = () => setIsPrefsModalOpen(true);

    window.addEventListener('nexaerp:open_user_profile', handleOpenProfile);
    window.addEventListener('nexaerp:open_company_settings', handleOpenSettings);
    window.addEventListener('nexaerp:open_user_preferences', handleOpenPrefs);

    return () => {
      window.removeEventListener('nexaerp:open_user_profile', handleOpenProfile);
      window.removeEventListener('nexaerp:open_company_settings', handleOpenSettings);
      window.removeEventListener('nexaerp:open_user_preferences', handleOpenPrefs);
    };
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
      const res = await fetch(`${API_BASE_URL}/api/security/security-notifications?limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setScreenshotIncidents(data.notifications || []);
        setUnreviewedCount(data.unreviewed_count || 0);
        return;
      }
      
      // Fallback for non-admin accounts or legacy endpoint
      const legacyRes = await fetch(`${API_BASE_URL}/api/security/screenshot-incidents?limit=10`, {
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
      padding: '0 16px',
      gap: '12px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      overflow: 'visible'
    }}>
      {/* Brand Header (Compact & space-efficient) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <div 
          onClick={() => onNavigate('dashboard')}
          title="NexaERP Home"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
        >
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: '#010c22',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0, 100, 210, 0.35)',
            border: '1px solid rgba(0, 152, 255, 0.4)',
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
              fontSize: '14.5px', 
              color: 'var(--text-main)', 
              lineHeight: 1.1,
              letterSpacing: '-0.2px'
            }}>
              Nexa<span style={{ color: 'var(--primary)' }}>ERP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Module & Function Search Bar (Compact) */}
      <div style={{ flex: '0 1 180px', maxWidth: '180px', minWidth: '100px', position: 'relative' }}>
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
            padding: '2px 5px',
            gap: '4px',
            overflow: 'hidden',
            width: '100%',
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
              padding: '2px 4px',
              fontSize: '10.5px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              outline: 'none',
              borderRight: '1px solid var(--border-color)',
              maxWidth: '75px',
              flexShrink: 0
            }}
          >
            <option value="all">Modules</option>
            <option value="sales">Sales</option>
            <option value="inventory">Stock</option>
            <option value="manufacturing">Mfg</option>
            <option value="finance">Finance</option>
            <option value="hr">HR</option>
            <option value="grc">GRC</option>
            <option value="security">Security</option>
            <option value="ai">AI</option>
          </select>

          <Search size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />

          <input
            type="text"
            placeholder="Search (Ctrl+K)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={() => setIsSearchModalOpen(true)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '11px',
              flex: 1,
              minWidth: 0,
              color: 'var(--text-main)'
            }}
          />

          <kbd
            onClick={() => setIsSearchModalOpen(true)}
            style={{
              fontSize: '9px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '3px',
              padding: '1px 4px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            Ctrl+K
          </kbd>
        </form>
      </div>

      {/* Scrollable Middle Action Toolbar with Sideways Navigation */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '4px', 
        flex: '1 1 auto', 
        minWidth: 0,
        position: 'relative',
        margin: '0 8px'
      }}>
        {/* Scroll Left Button */}
        {canScrollLeft && (
          <button
            onClick={handleScrollLeft}
            className="btn btn-ghost"
            title="Scroll sideways left"
            style={{
              padding: '3px 5px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
              flexShrink: 0,
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            <ChevronLeft size={13} color="var(--primary)" />
          </button>
        )}

        {/* Scrollable Action Track */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          onWheel={handleWheel}
          className="no-scrollbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            overflowX: 'auto',
            scrollBehavior: 'smooth',
            width: '100%',
            whiteSpace: 'nowrap'
          }}
        >

        {/* Compact Clock Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '11.5px',
          color: 'var(--text-secondary)',
          padding: '5px 8px',
          backgroundColor: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)',
          whiteSpace: 'nowrap'
        }}>
          <Clock size={13} color="var(--text-muted)" />
          <span>{currentTime ? currentTime.split(' ').slice(-2).join(' ') : '10:30 AM'}</span>
        </div>

        {/* 30-Second Cloud Sync Status Badge */}
        <div 
          onClick={() => triggerSyncNow()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            fontWeight: 600,
            padding: '5px 8px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: !isOnline ? 'rgba(245, 158, 11, 0.15)' : syncState.isSyncing ? 'rgba(2, 132, 199, 0.15)' : 'rgba(16, 185, 129, 0.1)',
            color: !isOnline ? '#d97706' : syncState.isSyncing ? '#0284c7' : '#10b981',
            border: `1px solid ${!isOnline ? 'rgba(245, 158, 11, 0.3)' : syncState.isSyncing ? 'rgba(2, 132, 199, 0.3)' : 'rgba(16, 185, 129, 0.25)'}`,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            userSelect: 'none',
            whiteSpace: 'nowrap'
          }}
          title={isOnline ? "All ERP modules sync with server every 30s. Click to sync now." : "Working in Offline Mode. Transactions will auto-sync on reconnect."}
        >
          {syncState.isSyncing ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : isOnline ? (
            <RefreshCw size={12} />
          ) : (
            <WifiOff size={12} />
          )}
          <span>
            {!isOnline 
              ? 'Offline' 
              : syncState.isSyncing 
              ? 'Syncing' 
              : syncState.secondsRemaining > 0 
              ? `${syncState.secondsRemaining}s` 
              : 'Synced'}
          </span>
        </div>

        {/* Enterprise Cloud Instance & Persistent Storage Status Badge */}
        <div 
          onClick={() => onNavigate('company_portal')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            fontWeight: 600,
            padding: '5px 8px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            userSelect: 'none',
            whiteSpace: 'nowrap'
          }}
          title="Compute: Ephemeral Cloud Container | Storage: 100% Guaranteed Permanent ACID Data Storage. Click to view company portal."
        >
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            boxShadow: '0 0 6px #10b981'
          }} />
          <span>Active (DB)</span>
        </div>

        {/* Universal Barcode Scanner Quick Launch */}
        <button
          onClick={onOpenScanner}
          className="btn btn-ghost"
          title="Scan Product Barcode / SKU (Camera & Optical)"
          style={{
            color: 'var(--text-main)',
            padding: '6px 8px',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <ScanLine size={16} />
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

        {/* Alexa+ Voice Quick Trigger */}
        <button
          onClick={() => {
            if (onOpenAI) onOpenAI();
            else onToggleAI();
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('start-alexa-voice'));
            }, 250);
          }}
          className="btn btn-ghost"
          title="Alexa+ Voice Assistant & MCP Tool Calling"
          style={{
            position: 'relative',
            color: '#0284c7',
            backgroundColor: 'rgba(2, 132, 199, 0.1)',
            border: '1px solid rgba(2, 132, 199, 0.3)',
            padding: '4px 7px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '10.5px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <Mic size={14} />
          <span>Alexa</span>
        </button>

        {/* MNC Branch Selector Trigger */}
        <button
          onClick={() => setIsBranchModalOpen(true)}
          className="btn btn-ghost"
          title="Switch Operating Branch Context or View MNC Consolidated Data"
          style={{
            position: 'relative',
            color: 'var(--text-main)',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
            padding: '5px 10px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11.5px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <Building2 size={13} color="var(--primary)" />
          <span style={{ maxWidth: '175px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentBranchName}
          </span>
          <ChevronDown size={11} color="var(--text-secondary)" />
        </button>



        {/* Universal Document & Data Onboarding Quick Trigger */}
        <button
          onClick={() => setIsImportModalOpen(true)}
          className="btn btn-ghost"
          title="Universal Data Onboarding: Upload Vendor lists, Customer data, Products, Employees, GL Accounts, Expenses, Warehouses (PDF, Excel, CSV, JSON)"
          style={{
            position: 'relative',
            color: '#16a34a',
            backgroundColor: 'rgba(22, 163, 74, 0.08)',
            border: '1px solid rgba(22, 163, 74, 0.25)',
            padding: '4px 6px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '10.5px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <UploadCloud size={12} />
          <span>Onboard Data</span>
        </button>

        {/* Company Settings Quick Trigger */}
        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className="btn btn-ghost"
          title="Organization & Company Settings: GSTIN, Tax Slabs, Currency, Audit Policies"
          style={{
            position: 'relative',
            color: '#475569',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
            padding: '4px 6px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '10.5px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <Building2 size={12} color="var(--primary)" />
          <span>Settings</span>
        </button>

        {/* User Preferences Quick Trigger */}
        <button
          onClick={() => setIsPrefsModalOpen(true)}
          className="btn btn-ghost"
          title="User Preferences: Appearance Themes, Currency Formatting, Date Standards, Alexa Voice"
          style={{
            position: 'relative',
            color: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            padding: '4px 6px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '10.5px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <Sliders size={12} />
          <span>Prefs</span>
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
        </div>

        {/* Scroll Right Button */}
        {canScrollRight && (
          <button
            onClick={handleScrollRight}
            className="btn btn-ghost"
            title="Scroll sideways right"
            style={{
              padding: '3px 5px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
              flexShrink: 0,
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            <ChevronRight size={13} color="var(--primary)" />
          </button>
        )}
      </div>

      {/* Pinned User & Security Area (Always 100% visible on screen, never cut off, overflow visible) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flexShrink: 0,
        marginLeft: 'auto',
        overflow: 'visible'
      }}>
        {/* Notifications Icon with Real-Time DLP Alert Badge */}
        <div ref={notifRef} style={{ position: 'relative' }}>
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
        <div ref={profileRef} style={{ position: 'relative', flexShrink: 0 }}>
          <div
            id="top-nav-profile-chip"
            onClick={(e) => {
              e.stopPropagation();
              setProfileOpen(prev => !prev);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setProfileOpen(prev => !prev);
              }
            }}
            title="User Profile & Settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              transition: 'all var(--transition-fast)',
              backgroundColor: profileOpen ? 'var(--bg-active, rgba(0, 100, 210, 0.15))' : 'var(--bg-subtle)',
              border: profileOpen ? '1px solid var(--primary)' : '1px solid var(--border-color)',
              userSelect: 'none'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#0064d2',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '12px',
              flexShrink: 0
            }}>
              {initials}
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                {user?.full_name || 'Karthik Reddy'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {userRole}
              </div>
            </div>
            <ChevronDown 
              size={13} 
              color="var(--text-muted)"
              style={{
                transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            />
          </div>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div 
              className="nexa-card animate-fade-in"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 6px)',
                width: '240px',
                zIndex: 9999,
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.35)'
              }}
            >
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>{user?.full_name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{user?.email}</div>
              </div>

              <button
                onClick={() => { setProfileOpen(false); setIsProfileModalOpen(true); }}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: '13px' }}
              >
                <User size={15} color="var(--primary)" />
                <span>My Profile & Security (2FA)</span>
              </button>

              <button
                onClick={() => { setProfileOpen(false); setIsSettingsModalOpen(true); }}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: '13px' }}
              >
                <Building2 size={15} color="var(--primary)" />
                <span>Company & Org Settings</span>
              </button>

              <button
                onClick={() => { setProfileOpen(false); setIsPrefsModalOpen(true); }}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: '13px' }}
              >
                <Sliders size={15} color="var(--primary)" />
                <span>Preferences & Themes</span>
              </button>

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
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  color: 'var(--danger)',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Direct Quick Log Out Button */}
        <button
          onClick={logout}
          className="btn btn-ghost"
          title="Sign Out / Log Out"
          style={{
            padding: '6px 10px',
            color: 'var(--danger)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <LogOut size={14} />
          <span>Exit</span>
        </button>
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
      {/* Universal Multi-Format Data Onboarding Modal */}
      <UniversalDataImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        initialEntityType="auto"
        onSuccess={(type, res) => {
          window.dispatchEvent(new CustomEvent('inventory-updated'));
          alert(`Successfully onboarded ${res.created_count || res.total_processed} ${type} into NexaERP!`);
        }}
      />

      {/* MNC Multi-Branch Controller Modal */}
      <MNCBranchSwitcherModal
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        currentBranchId={currentBranchId}
        onSelectBranch={(id, name) => {
          setCurrentBranchId(id);
          setCurrentBranchName(name);
        }}
      />

      {/* User Profile & Security Center Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onLogout={logout}
      />

      {/* Enterprise Company Configuration Modal */}
      <CompanySettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* Workspace & Personal Preferences Modal */}
      <UserPreferencesModal
        isOpen={isPrefsModalOpen}
        onClose={() => setIsPrefsModalOpen(false)}
        currentTheme={theme}
        onThemeChange={setTheme}
      />
    </header>
  );
}
