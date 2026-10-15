import React from 'react';
import {
  ShoppingCart, PlusCircle, UserPlus, Truck,
  ScanLine, FileText, Wallet, UserCheck, MoreHorizontal
} from 'lucide-react';

export default function QuickActions({ onNavigate, onOpenActionModal }) {
  const actions = [
    {
      id: 'new_sale',
      label: 'New Sale',
      icon: ShoppingCart,
      color: '#10b981', // green
      bg: '#ecfdf5',
      action: () => onNavigate('pos')
    },
    {
      id: 'add_product',
      label: 'Add Product',
      icon: PlusCircle,
      color: '#0064d2', // blue
      bg: '#e8f3ff',
      action: () => onNavigate('products')
    },
    {
      id: 'add_customer',
      label: 'Add Customer',
      icon: UserPlus,
      color: '#8b5cf6', // purple
      bg: '#f5f3ff',
      action: () => onNavigate('customers')
    },
    {
      id: 'new_purchase',
      label: 'New Purchase',
      icon: Truck,
      color: '#f97316', // orange
      bg: '#fff7ed',
      action: () => onNavigate('procurement')
    },
    {
      id: 'scan_barcode',
      label: 'Scan Barcode',
      icon: ScanLine,
      color: '#06b6d4', // cyan
      bg: '#ecfeff',
      action: () => onNavigate('pos')
    },
    {
      id: 'generate_report',
      label: 'Generate Report',
      icon: FileText,
      color: '#ef4444', // red
      bg: '#fef2f2',
      action: () => onNavigate('reports')
    },
    {
      id: 'record_expense',
      label: 'Record Expense',
      icon: Wallet,
      color: '#a855f7', // violet
      bg: '#faf5ff',
      action: () => onNavigate('expenses')
    },
    {
      id: 'add_staff',
      label: 'Add Staff',
      icon: UserCheck,
      color: '#14b8a6', // emerald
      bg: '#f0fdfa',
      action: () => onNavigate('employees')
    },
    {
      id: 'more',
      label: 'More',
      icon: MoreHorizontal,
      color: '#64748b', // slate
      bg: '#f8fafc',
      action: () => onNavigate('admin')
    }
  ];

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>
        Quick Actions
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
        gap: '12px'
      }}>
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <div
              key={act.id}
              onClick={act.action}
              className="nexa-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 10px',
                cursor: 'pointer',
                textAlign: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
                backgroundColor: 'var(--bg-surface)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = act.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: act.bg,
                color: act.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon size={20} />
              </div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                {act.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
