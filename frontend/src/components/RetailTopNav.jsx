import React, { useState } from 'react';
import { 
  Store, ShoppingBag, Search, ScanLine, Sun, Moon, LogOut, 
  User, DollarSign, ArrowLeftRight, Clock, ShieldCheck, Sparkles, Plus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function RetailTopNav({ 
  onNavigate, 
  currentTab, 
  onOpenScanner, 
  theme, 
  onToggleTheme 
}) {
  const { user, logout } = useAuth();
  const [searchVal, setSearchVal] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchVal.trim()) {
      if (onNavigate) onNavigate('pos');
    }
  };

  return (
    <header style={{
      height: '60px',
      backgroundColor: 'var(--bg-surface, #ffffff)',
      borderBottom: '1px solid var(--border-color, #e2e8f0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
    }}>
      {/* Left: Store Brand & Counter Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div 
          onClick={() => onNavigate('dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Store size={20} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              NexaRetail <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, padding: '1px 6px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '4px' }}>POS</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Cloth, Sports & Retail Store
            </div>
          </div>
        </div>

        {/* Counter Badge */}
        <div style={{
          display: 'none',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '999px',
          fontSize: '12px',
          color: '#059669',
          fontWeight: 600,
          '@media (minWidth: 768px)': { display: 'flex' }
        }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
          <span>Register #1 Open</span>
        </div>
      </div>

      {/* Middle: Quick Product / Barcode Search */}
      <form onSubmit={handleSearchSubmit} style={{ flex: 1, maxWidth: '420px', margin: '0 20px' }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Scan barcode or search clothes, sports, items... (Ctrl+K)"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-subtle, #f8fafc)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>
      </form>

      {/* Right: Quick POS Action, Switcher, Theme & Operator Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={() => onNavigate('pos')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
          }}
        >
          <ShoppingBag size={15} />
          <span>New Bill (POS)</span>
        </button>

        {onOpenScanner && (
          <button
            onClick={onOpenScanner}
            title="Scan Barcode via Camera"
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <ScanLine size={16} />
          </button>
        )}


        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          style={{
            padding: '8px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-subtle)',
            color: 'var(--text-primary)',
            cursor: 'pointer'
          }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Operator Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '13px'
          }}>
            {user?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'R'}
          </div>
          <button
            onClick={logout}
            title="Close Register & Exit Store"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              color: '#ef4444',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <LogOut size={13} />
            <span>Exit</span>
          </button>
        </div>
      </div>
    </header>
  );
}
