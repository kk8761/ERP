import React from 'react';
import { 
  ShoppingCart, Tag, Package, Users, Receipt, 
  RotateCcw, DollarSign, BarChart3, ScanLine, LayoutDashboard,
  Store, Award, Sparkles, LogOut, ArrowLeftRight, MapPin
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRetailBranch } from '../contexts/RetailBranchContext';

export default function RetailSidebar({ currentTab, onNavigate, onSwitchPortal }) {
  const { user, logout } = useAuth();
  const { currentBranch } = useRetailBranch();

  const retailNavItems = [
    { id: 'dashboard', label: 'Store Overview', icon: LayoutDashboard },
    { id: 'pos', label: 'Point of Sale (POS)', icon: ShoppingCart, badge: 'Active' },
    { id: 'inventory', label: 'Clothes, Sports & Stock', icon: Tag },
    { id: 'orders', label: 'Customer Bills & Orders', icon: Receipt },
    { id: 'customers', label: 'Customers & Loyalty', icon: Users },
    { id: 'returns', label: 'Returns & Exchanges', icon: RotateCcw },
    { id: 'cash_register', label: 'Daily Cash Register', icon: DollarSign },
    { id: 'employees', label: 'Store Staff & Cashiers', icon: Users, badge: 'Admin' },
    { id: 'reports', label: 'Store Sales Reports', icon: BarChart3 }
  ];

  return (
    <aside style={{
      width: '240px',
      backgroundColor: 'var(--bg-surface, #ffffff)',
      borderRight: '1px solid var(--border-color, #e2e8f0)',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 60px)',
      userSelect: 'none',
      flexShrink: 0
    }}>
      {/* Retail Storefront Section Tag */}
      <div style={{
        padding: '16px 18px 8px',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: '#10b981',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <Store size={14} />
        <span>Retail Merchant Hub</span>
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, padding: '8px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {retailNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                color: isActive ? '#059669' : 'var(--text-secondary, #64748b)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '13.5px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-subtle, #f1f5f9)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon size={18} color={isActive ? '#10b981' : 'currentColor'} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span style={{
                  padding: '2px 6px',
                  borderRadius: '999px',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 700
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>


      {/* Operator Session Info Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border-color, #e2e8f0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-surface)'
      }}>
        <div style={{ overflow: 'hidden', flex: 1, marginRight: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {user?.full_name || 'Store Cashier'}
          </div>
          <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
            <MapPin size={11} flexShrink={0} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentBranch?.name || 'Main Store'}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign Out"
          style={{
            background: 'none',
            border: 'none',
            color: '#ef4444',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
