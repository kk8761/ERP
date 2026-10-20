import React, { useState } from 'react';
import {
  Home, ShoppingCart, Package, DollarSign, Users, Wrench,
  ChevronDown, ChevronRight, FileText, UserCheck, RotateCcw,
  Boxes, Truck, ScanLine, Wallet, BookOpen, Clock, Calendar,
  ShieldAlert, Sparkles, BarChart3, Sliders, ArrowLeftRight,
  Factory, Layers, Cpu, ShieldCheck, Award, TrendingDown,
  Database, KeyRound, FileSpreadsheet, Mail, Camera, Building2,
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar({ currentTab, onNavigate, onToggleAI }) {
  const { user, logout, hasPermission } = useAuth();

  // Track accordion expand/collapse state
  const [expanded, setExpanded] = useState({
    sales: true,
    inventory: true,
    manufacturing: false,
    grc: false,
    finance: false,
    people: false,
    tools: false
  });

  const toggleSection = (section) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'KR';

  const userRole = user?.is_superuser
    ? 'Administrator'
    : (user?.roles?.[0] || 'Employee');

  const menuSections = [
    {
      id: 'sales',
      title: 'Sales',
      icon: ShoppingCart,
      items: [
        { id: 'pos', label: 'Point of Sale', icon: ShoppingCart, perm: 'sales.create' },
        { id: 'sales_orders', label: 'Sales Orders', icon: FileText, perm: 'sales.view' },
        { id: 'customers', label: 'Customers', icon: UserCheck, perm: 'customers.manage' },
        { id: 'returns', label: 'Returns', icon: RotateCcw, perm: 'sales.refund' }
      ]
    },
    {
      id: 'inventory',
      title: 'Inventory',
      icon: Package,
      items: [
        { id: 'products', label: 'Products', icon: Boxes, perm: 'inventory.view' },
        { id: 'inventory', label: 'Stock Overview', icon: Package, perm: 'inventory.view' },
        { id: 'procurement', label: 'Purchase Orders', icon: FileText, perm: 'procurement.view' },
        { id: 'suppliers', label: 'Suppliers', icon: Truck, perm: 'procurement.view' },
        { id: 'stock_movements', label: 'Stock Movements', icon: ArrowLeftRight, perm: 'inventory.adjust' },
        { id: 'barcode_scanner', label: 'Barcode Scanner', icon: ScanLine, perm: 'sales.create' },
        { id: 'stock_depletion', label: 'Stock Exhaustion Predictor', icon: TrendingDown, perm: 'inventory.view' }
      ]
    },
    {
      id: 'manufacturing',
      title: 'Manufacturing',
      icon: Factory,
      items: [
        { id: 'manufacturing', label: 'Work Orders & OEE', icon: Factory, perm: 'inventory.view' },
        { id: 'boms', label: 'Bill of Materials', icon: Layers, perm: 'inventory.view' },
        { id: 'work_centers', label: 'IoT Work Centers', icon: Cpu, perm: 'inventory.view' }
      ]
    },
    {
      id: 'grc',
      title: 'GRC & Risk',
      icon: ShieldCheck,
      items: [
        { id: 'grc', label: '5×5 Risk Heatmap', icon: ShieldAlert, perm: 'audit_logs.view' },
        { id: 'compliance', label: 'Compliance & Frameworks', icon: Award, perm: 'audit_logs.view' }
      ]
    },
    {
      id: 'finance',
      title: 'Finance',
      icon: DollarSign,
      items: [
        { id: 'spreadsheet', label: 'ACDOCA Universal Journal', icon: FileSpreadsheet, perm: 'finance.view' },
        { id: 'invoices', label: 'Invoices', icon: FileText, perm: 'sales.view' },
        { id: 'expenses', label: 'Expenses', icon: Wallet, perm: 'expenses.record' },
        { id: 'accounting', label: 'Accounting', icon: BookOpen, perm: 'finance.view' },
        { id: 'payroll', label: 'Payroll', icon: DollarSign, perm: 'payroll.view' },
        { id: 'financial_reports', label: 'Financial Reports', icon: BarChart3, perm: 'reports.view' },
        { id: 'chart_of_accounts', label: 'Chart of Accounts', icon: BookOpen, perm: 'finance.view' }
      ]
    },
    {
      id: 'people',
      title: 'People',
      icon: Users,
      items: [
        { id: 'employees', label: 'Employees', icon: Users, perm: 'hr.view' },
        { id: 'attendance', label: 'Attendance', icon: Clock, perm: 'attendance.record' },
        { id: 'leaves', label: 'Leave Management', icon: Calendar, perm: 'hr.view' },
        { id: 'users', label: 'User Directory & Roles', icon: UserCheck, perm: 'users.view' },
        { id: 'elevation', label: 'JIT Privilege Elevation', icon: KeyRound, perm: 'roles.manage' }
      ]
    },
    {
      id: 'tools',
      title: 'Tools',
      icon: Wrench,
      items: [
        { id: 'email_hub', label: 'Mail Center & AI Hub', icon: Mail, perm: 'sales.view' },
        { id: 'predictive_ai', label: 'Predictive AI & What-If', icon: Sparkles, perm: 'ai.use' },
        { id: 'ai_tool', label: 'AI Assistant', icon: Sparkles, action: onToggleAI, perm: 'ai.use' },
        { id: 'reports', label: 'Analytics & Reports', icon: BarChart3, perm: 'reports.view' },
        { id: 'admin', label: 'Security & Audit', icon: ShieldCheck, perm: 'audit_logs.view' },
        { id: 'screenshots', label: 'DLP Screenshot Vault', icon: Camera, perm: 'audit_logs.view' },
        { id: 'company_portal', label: 'Company & Instance Info', icon: Building2, perm: 'dashboard.view' },
        { id: 'disaster_recovery', label: 'Disaster Recovery & PITR', icon: Database, perm: 'settings.manage' },
        { id: 'settings', label: 'System Settings', icon: Sliders, perm: 'settings.manage' }
      ]
    }
  ];

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      backgroundColor: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - var(--header-height))',
      userSelect: 'none'
    }}>
      {/* Scrollable Navigation Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 10px'
      }}>
        {/* Home Button */}
        <button
          onClick={() => onNavigate('dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13.5px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            marginBottom: '16px',
            transition: 'all 0.15s ease',
            backgroundColor: currentTab === 'dashboard' ? 'var(--primary-light)' : 'transparent',
            color: currentTab === 'dashboard' ? 'var(--primary)' : 'var(--text-main)',
            boxShadow: currentTab === 'dashboard' ? 'inset 0 0 0 1px var(--primary-border)' : 'none'
          }}
        >
          <Home size={18} color={currentTab === 'dashboard' ? 'var(--primary)' : 'var(--text-secondary)'} />
          <span>Home</span>
        </button>

        {/* Accordion Categories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {menuSections.map((sec) => {
            const isExp = expanded[sec.id];
            return (
              <div key={sec.id} style={{ marginBottom: '4px' }}>
                {/* Category Header */}
                <div
                  onClick={() => toggleSection(sec.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    transition: 'background 0.15s ease'
                  }}
                >
                  <span>{sec.title}</span>
                  {isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>

                {/* Category Items */}
                {isExp && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '6px' }}>
                    {sec.items
                      .filter((item) => !item.perm || hasPermission(item.perm))
                      .map((item) => {
                        const isActive = currentTab === item.id;
                        const Icon = item.icon;

                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (item.action) {
                                item.action();
                              } else {
                                onNavigate(item.id);
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              width: '100%',
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '13px',
                              fontWeight: isActive ? 600 : 400,
                              border: 'none',
                              cursor: 'pointer',
                              backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                              color: isActive ? 'var(--primary)' : 'var(--text-main)',
                              textAlign: 'left',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <Icon size={16} color={isActive ? 'var(--primary)' : 'var(--text-secondary)'} />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom User Profile & Direct Sign Out */}
      <div style={{
        padding: '12px 10px',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
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
          <div style={{ overflow: 'hidden', lineHeight: 1.2 }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-main)',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden'
            }}>
              {user?.full_name || 'Karthik Reddy'}
            </div>
            <div style={{
              fontSize: '10.5px',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden'
            }}>
              {userRole}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign Out / Log Out"
          className="btn btn-ghost"
          style={{
            padding: '6px 8px',
            color: 'var(--danger)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 700,
            flexShrink: 0
          }}
        >
          <LogOut size={14} />
          <span>Exit</span>
        </button>
      </div>
    </aside>
  );
}
