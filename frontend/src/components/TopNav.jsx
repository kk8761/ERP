import React, { useState, useEffect } from 'react';
import { 
  Search, Bell, HelpCircle, Sun, Moon, ChevronDown, 
  Store, User, Shield, LogOut, KeyRound, Sparkles,
  ScanLine, PenTool, Wifi, WifiOff, Sliders
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ModuleSearchModal from './ModuleSearchModal';

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
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #0064d2 0%, #0098ff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '18px',
            boxShadow: '0 2px 8px rgba(0, 100, 210, 0.3)'
          }}>
            N
          </div>
          <div>
            <div style={{ 
              fontFamily: 'var(--font-brand)', 
              fontWeight: 800, 
              fontSize: '18px', 
              color: 'var(--text-main)', 
              lineHeight: 1.1 
            }}>
              Nexa<span style={{ color: 'var(--primary)' }}>ERP</span>
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Grow Your Business
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

        {/* Offline / Cloud Sync Status Badge from NexaERP */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11.5px',
          fontWeight: 600,
          padding: '5px 10px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.15)',
          color: isOnline ? '#10b981' : '#d97706',
          border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.3)'}`
        }}
        title={isOnline ? "All enterprise records synchronized with cloud ledger" : "Working in Offline Mode. Transactions will auto-sync on reconnect."}
        >
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{isOnline ? 'Cloud Synced' : 'Offline'}</span>
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

        {/* Notifications Icon with Badge 3 */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setNotifOpen(!notifOpen)}
            className="btn btn-ghost" 
            style={{ padding: '8px', borderRadius: 'var(--radius-full)' }}
          >
            <Bell size={18} />
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              backgroundColor: 'var(--danger)',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 700,
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--bg-surface)'
            }}>
              3
            </span>
          </button>
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
    </header>
  );
}
