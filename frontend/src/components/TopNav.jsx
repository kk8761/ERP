import React, { useState, useEffect } from 'react';
import { 
  Search, Bell, HelpCircle, Sun, Moon, ChevronDown, 
  Store, User, Shield, LogOut, KeyRound, Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function TopNav({ onToggleAI, onNavigate, currentTab, theme, setTheme }) {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

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

      {/* Global Search Bar (Matching screenshot Ctrl+K) */}
      <div style={{ flex: 1, maxWidth: '520px', position: 'relative' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--bg-subtle)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '7px 12px',
          gap: '10px',
          transition: 'all 0.15s ease'
        }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search products, customers, invoices, suppliers..."
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '13px',
              width: '100%',
              color: 'var(--text-main)'
            }}
          />
          <kbd style={{
            fontSize: '11px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            padding: '2px 6px',
            color: 'var(--text-secondary)'
          }}>
            Ctrl + K
          </kbd>
        </div>
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
    </header>
  );
}
