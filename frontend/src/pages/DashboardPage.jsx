import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, FileText, Package, Users, TrendingUp,
  ArrowUpRight, AlertTriangle, ChevronRight, Store, Calendar,
  CreditCard, ShieldAlert, CheckCircle2, Info, Bell, RefreshCw, Clock, BookOpen,
  PlusCircle, Plus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../services/api';
import QuickActions from '../components/QuickActions';

export default function DashboardPage({ onNavigate }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('Last 30 Days');
  const [expenseFilter, setExpenseFilter] = useState('This Month');
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [pendingRequests, setPendingRequests] = useState([]);
  const [branchInfo, setBranchInfo] = useState(null);

  // Auto-updating live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentDateTime.getHours();
    const name = user?.full_name?.split(' ')[0] || user?.username || 'Team Member';
    if (hour >= 5 && hour < 12) {
      return {
        title: `Good Morning, ${name}! 🌅`,
        badge: 'Morning Shift',
        subtext: "Here's your morning operational snapshot and enterprise sales velocity."
      };
    } else if (hour >= 12 && hour < 17) {
      return {
        title: `Good Afternoon, ${name}! ☀️`,
        badge: 'Afternoon Ops',
        subtext: 'Mid-day transactions, inventory movements, and subsidiary performance.'
      };
    } else if (hour >= 17 && hour < 21) {
      return {
        title: `Good Evening, ${name}! 🌆`,
        badge: 'Evening Rollup',
        subtext: 'Daily reconciliation, cash drawer closures, and regional summaries.'
      };
    } else {
      return {
        title: `Working Late / Night Shift, ${name}! 🌙`,
        badge: 'Night Operations',
        subtext: '24/7 Global multi-branch consolidation, transit tracking, and security monitoring.'
      };
    }
  };

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const [metrics, reqs, bAccess] = await Promise.all([
        apiRequest('/api/dashboard/metrics'),
        apiRequest('/api/branches/access-requests').catch(() => []),
        apiRequest('/api/branches/my-access').catch(() => null)
      ]);
      setData(metrics);
      setPendingRequests(reqs || []);
      setBranchInfo(bAccess);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const greeting = getGreeting();
  const isAdmin = user?.is_superuser || branchInfo?.can_access_all;
  const pendingCount = pendingRequests.filter(r => r.status === 'PENDING').length;

  const kpis = data?.kpis || {
    total_sales: 0,
    total_orders: 0,
    inventory_items: 0,
    low_stock_items: 0,
    out_of_stock_items: 0,
    total_customers: 0,
    monthly_profit: 0,
    total_expenses: 0
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Greeting */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 800,
              fontFamily: 'var(--font-brand)',
              color: 'var(--text-main)',
              letterSpacing: '-0.3px',
              margin: 0
            }}>
              {greeting.title}
            </h1>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              padding: '2px 8px',
              borderRadius: '999px',
              border: '1px solid var(--primary-border)'
            }}>
              {greeting.badge}
            </span>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            {greeting.subtext}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            fontSize: '12.5px',
            fontWeight: 700
          }}>
            <Store size={14} color="var(--primary)" />
            <span>{branchInfo?.current_branch || user?.branch_name || 'Hyderabad Global HQ'}</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            fontSize: '12.5px',
            color: 'var(--text-secondary)',
            fontWeight: 600
          }}>
            <Clock size={14} color="var(--primary)" />
            <span>
              {currentDateTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} • {currentDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <button
            onClick={fetchMetrics}
            className="btn btn-ghost"
            style={{ padding: '7px' }}
            title="Refresh Live Metrics"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Cross-Branch Access Request Alert Banner for Admins or Employees */}
      {isAdmin && pendingCount > 0 && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '10px',
          backgroundColor: 'rgba(234, 179, 8, 0.1)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={18} color="#b45309" />
            <div>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#92400e' }}>
                {pendingCount} Pending Cross-Branch & Authority Access Request{pendingCount > 1 ? 's' : ''}
              </span>
              <div style={{ fontSize: '12px', color: '#b45309', marginTop: '2px' }}>
                Employees are requesting authorized access to other subsidiaries. Review in the MNC Multi-Branch Controller.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('people')}
            className="btn btn-primary"
            style={{ fontSize: '12px', padding: '6px 14px', backgroundColor: '#d97706', borderColor: '#d97706' }}
          >
            Review Requests in HR / Switcher →
          </button>
        </div>
      )}

      {/* Shopkeeper 2-Step Workflow Guide Banner */}
      {kpis.inventory_items === 0 && (
        <div className="nexa-card animate-fade-in" style={{
          padding: '22px 24px',
          background: 'linear-gradient(135deg, rgba(0, 100, 210, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)',
          border: '1.5px solid var(--primary-border)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="badge badge-primary" style={{ fontSize: '11.5px', padding: '3px 8px' }}>Store Setup Guide</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
                  Set Up Your Shop in 2 Simple Steps
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                First add all your items into the product catalog. Later, you can manage stock quantities and receive shipments!
              </p>
            </div>
            <button
              onClick={() => onNavigate('add_product')}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', fontSize: '13px', fontWeight: 700 }}
            >
              <PlusCircle size={16} />
              <span>Step 1: Add Your First Item</span>
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px'
          }}>
            <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--primary)', marginBottom: '3px' }}>
                1. Add Products First
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Register item names, barcodes, and selling prices into your store catalog first.
              </div>
            </div>

            <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#10b981', marginBottom: '3px' }}>
                2. Manage Quantities Later
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Receive stock shipments, adjust quantities, set reorder levels, and track movements.
              </div>
            </div>

            <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#8b5cf6', marginBottom: '3px' }}>
                3. Fast POS Billing
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Scan barcodes, issue instant thermal invoices, and auto-deduct sold inventory.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5 KPI Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px'
      }}>
        {/* Card 1: Total Sales */}
        <div
          onClick={() => onNavigate('sales_orders')}
          className="nexa-card"
          title="Click to view Sales Orders ledger"
          style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.15s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Total Sales</span>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: '#ecfdf5', color: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ShoppingCart size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
            ₹ {kpis.total_sales.toLocaleString('en-IN')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>
              <ArrowUpRight size={14} />
              <span>+12.5%</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs. yesterday</span>
            </div>
            {/* Mini SVG trend */}
            <svg width="45" height="18" viewBox="0 0 50 20">
              <path d="M0 16 Q 15 5, 25 12 T 50 2" fill="none" stroke="#10b981" strokeWidth="2.5" />
            </svg>
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div
          onClick={() => onNavigate('invoices')}
          className="nexa-card"
          title="Click to view Tax Invoices & Billing"
          style={{ padding: '18px 20px', cursor: 'pointer', transition: 'transform 0.15s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Total Orders</span>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: '#e8f3ff', color: '#0064d2',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FileText size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
            {kpis.total_orders}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>
              <ArrowUpRight size={14} />
              <span>+8.3%</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs. yesterday</span>
            </div>
            {/* Mini bar chart */}
            <svg width="40" height="16" viewBox="0 0 40 16">
              <rect x="2" y="8" width="6" height="8" rx="1" fill="#93c5fd" />
              <rect x="12" y="4" width="6" height="12" rx="1" fill="#60a5fa" />
              <rect x="22" y="6" width="6" height="10" rx="1" fill="#3b82f6" />
              <rect x="32" y="1" width="6" height="15" rx="1" fill="#0064d2" />
            </svg>
          </div>
        </div>

        {/* Card 3: Inventory Items */}
        <div
          onClick={() => onNavigate('inventory')}
          className="nexa-card"
          title="Click to view Inventory Stock Overview"
          style={{ padding: '18px 20px', cursor: 'pointer', transition: 'transform 0.15s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Inventory Items</span>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: '#fff7ed', color: '#f97316',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Package size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
            {kpis.inventory_items.toLocaleString('en-IN')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px' }}>
            <span style={{ color: '#d97706', fontWeight: 600 }}>{kpis.low_stock_items} low stock</span>
            <span style={{ color: '#dc2626', fontWeight: 600 }}>{kpis.out_of_stock_items} out of stock</span>
          </div>
        </div>

        {/* Card 4: Total Customers */}
        <div
          onClick={() => onNavigate('customers')}
          className="nexa-card"
          title="Click to view Customer CRM Directory"
          style={{ padding: '18px 20px', cursor: 'pointer', transition: 'transform 0.15s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Total Customers</span>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: '#f5f3ff', color: '#8b5cf6',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
            {kpis.total_customers}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>
              <ArrowUpRight size={14} />
              <span>+18 new</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>this month</span>
            </div>
            <svg width="40" height="16" viewBox="0 0 40 16">
              <rect x="2" y="10" width="6" height="6" rx="1" fill="#ddd6fe" />
              <rect x="12" y="6" width="6" height="10" rx="1" fill="#c4b5fd" />
              <rect x="22" y="3" width="6" height="13" rx="1" fill="#a78bfa" />
              <rect x="32" y="1" width="6" height="15" rx="1" fill="#8b5cf6" />
            </svg>
          </div>
        </div>

        {/* Card 5: Monthly Profit */}
        <div
          onClick={() => onNavigate('financial_reports')}
          className="nexa-card"
          title="Click to view Financial Reports & Profit Statements"
          style={{ padding: '18px 20px', cursor: 'pointer', transition: 'transform 0.15s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Monthly Profit</span>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: '#fdf2f8', color: '#ec4899',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
            ₹ {kpis.monthly_profit.toLocaleString('en-IN')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>
              <ArrowUpRight size={14} />
              <span>+15.2%</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs. last month</span>
            </div>
            <svg width="40" height="16" viewBox="0 0 40 16">
              <rect x="2" y="9" width="6" height="7" rx="1" fill="#fbcfe8" />
              <rect x="12" y="7" width="6" height="9" rx="1" fill="#f472b6" />
              <rect x="22" y="4" width="6" height="12" rx="1" fill="#ec4899" />
              <rect x="32" y="1" width="6" height="15" rx="1" fill="#db2777" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Charts Row: Sales Overview (Line Area) & Expense Breakdown (Donut) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '20px'
      }}>
        {/* Sales Overview Chart */}
        <div className="nexa-card" style={{ padding: '20px', gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>Sales Overview</span>
              {/* Legends matching screenshot */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0064d2' }}></span>
                  <span>Sales</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
                  <span>Purchases</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                  <span>Profit</span>
                </span>
              </div>
            </div>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-surface)',
                fontSize: '12px',
                color: 'var(--text-main)',
                cursor: 'pointer'
              }}
            >
              <option>Last 30 Days</option>
              <option>This Week</option>
              <option>This Quarter</option>
            </select>
          </div>

          {/* Smooth Multi-wave Area Chart matching screenshot */}
          <div style={{ width: '100%', height: '220px', position: 'relative' }}>
            <svg width="100%" height="100%" viewBox="0 0 600 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0064d2" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0064d2" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="purchGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              <line x1="30" y1="30" x2="590" y2="30" stroke="var(--border-color)" strokeDasharray="3 3" />
              <line x1="30" y1="80" x2="590" y2="80" stroke="var(--border-color)" strokeDasharray="3 3" />
              <line x1="30" y1="130" x2="590" y2="130" stroke="var(--border-color)" strokeDasharray="3 3" />
              <line x1="30" y1="170" x2="590" y2="170" stroke="var(--border-color)" />

              {/* Y Axis labels */}
              <text x="5" y="34" fontSize="10" fill="var(--text-muted)">₹ 60K</text>
              <text x="5" y="84" fontSize="10" fill="var(--text-muted)">₹ 40K</text>
              <text x="5" y="134" fontSize="10" fill="var(--text-muted)">₹ 20K</text>
              <text x="12" y="174" fontSize="10" fill="var(--text-muted)">₹ 0</text>

              {/* Profit Area (Bottom wave) */}
              <path
                d="M 40 160 Q 120 145, 180 150 T 320 135 T 450 140 T 580 130 L 580 170 L 40 170 Z"
                fill="url(#profitGrad)"
              />
              <path
                d="M 40 160 Q 120 145, 180 150 T 320 135 T 450 140 T 580 130"
                fill="none" stroke="#10b981" strokeWidth="2.5"
              />

              {/* Purchases Area (Middle wave) */}
              <path
                d="M 40 140 Q 120 120, 180 130 T 320 105 T 450 115 T 580 95 L 580 170 L 40 170 Z"
                fill="url(#purchGrad)"
              />
              <path
                d="M 40 140 Q 120 120, 180 130 T 320 105 T 450 115 T 580 95"
                fill="none" stroke="#ef4444" strokeWidth="2.5"
              />

              {/* Sales Area (Top wave) */}
              <path
                d="M 40 110 Q 120 70, 180 95 T 320 60 T 450 75 T 580 45 L 580 170 L 40 170 Z"
                fill="url(#salesGrad)"
              />
              <path
                d="M 40 110 Q 120 70, 180 95 T 320 60 T 450 75 T 580 45"
                fill="none" stroke="#0064d2" strokeWidth="3"
              />

              {/* X Axis dates */}
              <text x="40" y="190" fontSize="10" fill="var(--text-muted)">Sep 16</text>
              <text x="130" y="190" fontSize="10" fill="var(--text-muted)">Sep 20</text>
              <text x="220" y="190" fontSize="10" fill="var(--text-muted)">Sep 24</text>
              <text x="310" y="190" fontSize="10" fill="var(--text-muted)">Sep 28</text>
              <text x="400" y="190" fontSize="10" fill="var(--text-muted)">Oct 2</text>
              <text x="480" y="190" fontSize="10" fill="var(--text-muted)">Oct 6</text>
              <text x="550" y="190" fontSize="10" fill="var(--text-muted)">Oct 14</text>
            </svg>
          </div>
        </div>

        {/* Expense Breakdown Donut Chart */}
        <div className="nexa-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>Expense Breakdown</span>
            <select
              value={expenseFilter}
              onChange={(e) => setExpenseFilter(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-surface)',
                fontSize: '12px',
                color: 'var(--text-main)',
                cursor: 'pointer'
              }}
            >
              <option>This Month</option>
              <option>Last Month</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', minHeight: '200px' }}>
            {/* SVG Donut */}
            <div style={{ position: 'relative', width: '150px', height: '150px' }}>
              <svg width="150" height="150" viewBox="0 0 100 100">
                {kpis.total_expenses === 0 ? (
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--border-color)" strokeWidth="12" />
                ) : (
                  <>
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#0064d2" strokeWidth="16" strokeDasharray="95 156" strokeDashoffset="0" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="16" strokeDasharray="55 196" strokeDashoffset="-95" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f59e0b" strokeWidth="16" strokeDasharray="38 213" strokeDashoffset="-150" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ec4899" strokeWidth="16" strokeDasharray="20 231" strokeDashoffset="-188" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#8b5cf6" strokeWidth="16" strokeDasharray="43 208" strokeDashoffset="-208" />
                  </>
                )}
              </svg>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
                  ₹ {kpis.total_expenses.toLocaleString('en-IN')}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Total Expenses</span>
              </div>
            </div>

            {/* Legend */}
            {kpis.total_expenses === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '140px', lineHeight: 1.5 }}>
                No store expenses booked yet for this period.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0064d2' }}></span>
                    <span>Inventory</span>
                  </span>
                  <span style={{ fontWeight: 600 }}>38%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                    <span>Staff & Payroll</span>
                  </span>
                  <span style={{ fontWeight: 600 }}>22%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
                    <span>Rent & Utilities</span>
                  </span>
                  <span style={{ fontWeight: 600 }}>15%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ec4899' }}></span>
                    <span>Marketing</span>
                  </span>
                  <span style={{ fontWeight: 600 }}>8%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#8b5cf6' }}></span>
                    <span>Other</span>
                  </span>
                  <span style={{ fontWeight: 600 }}>17%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Ribbon */}
      <QuickActions onNavigate={onNavigate} />

      {/* 3 Column Data Widgets: Low Stock Items, Recent Sales, Alerts & Notifications */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {/* Widget 1: Low Stock Items */}
        <div className="nexa-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Low Stock Items</span>
            <button onClick={() => onNavigate('stock_depletion')} className="btn btn-ghost" style={{ fontSize: '12px', color: 'var(--primary)', padding: '4px 8px' }} title="View predictive stock exhaustion analysis">
              Forecast Depletion
            </button>
          </div>

          <div className="nexa-table-wrapper">
            <table className="nexa-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Current Stock</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(data?.low_stock_table && data.low_stock_table.length > 0) ? (
                  data.low_stock_table.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td style={{ fontWeight: 700, color: item.status === 'Out of Stock' ? 'var(--danger)' : 'var(--warning-text)' }}>
                        {item.current_stock}
                      </td>
                      <td>{item.reorder_level}</td>
                      <td>
                        <span className={`badge ${item.status === 'Out of Stock' ? 'badge-danger' : 'badge-warning'}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      No low-stock items detected. All store inventory is at healthy operational levels.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Widget 2: Recent Sales */}
        <div className="nexa-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Recent Sales</span>
            <button onClick={() => onNavigate('sales_orders')} className="btn btn-ghost" style={{ fontSize: '12px', color: 'var(--primary)', padding: '4px 8px' }}>
              View All
            </button>
          </div>

          <div className="nexa-table-wrapper">
            <table className="nexa-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recent_sales && data.recent_sales.length > 0) ? (
                  data.recent_sales.map((sale, idx) => (
                    <tr key={idx}>
                      <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{sale.invoice}</td>
                      <td>{sale.customer}</td>
                      <td>{sale.items_count}</td>
                      <td style={{ fontWeight: 700 }}>₹ {sale.amount.toLocaleString('en-IN')}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{sale.time}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      No sales recorded yet. Register items in Step 1, manage stock in Step 2, and checkout via POS.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Widget 3: Alerts & Notifications */}
        <div className="nexa-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Alerts & Notifications</span>
            <button onClick={() => onNavigate('admin')} className="btn btn-ghost" style={{ fontSize: '12px', color: 'var(--primary)', padding: '4px 8px' }}>
              View All
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {((data?.alerts && data.alerts.length > 0) ? data.alerts : [
              { id: 1, type: 'info', title: 'Store System Ready', description: 'Step 1: Add products in the Product Catalog. Step 2: Manage stock quantities.', time: 'Active' }
            ]).map((alert) => {
              const bgColors = {
                danger: '#fef2f2',
                warning: '#fffbeb',
                info: '#f0f9ff',
                success: '#ecfdf5',
                primary: '#f5f3ff'
              };
              const iconColors = {
                danger: '#ef4444',
                warning: '#f59e0b',
                info: '#0284c7',
                success: '#10b981',
                primary: '#8b5cf6'
              };

              return (
                <div key={alert.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    backgroundColor: bgColors[alert.type] || '#f1f5f9',
                    color: iconColors[alert.type] || '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {alert.type === 'danger' && <AlertTriangle size={15} />}
                    {alert.type === 'warning' && <Clock size={15} />}
                    {alert.type === 'info' && <Users size={15} />}
                    {alert.type === 'success' && <CheckCircle2 size={15} />}
                    {alert.type === 'primary' && <Info size={15} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {alert.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {alert.description}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {alert.time}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Business Modules Shortcut Bar matching bottom row in screenshot */}
      <div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>
          Business Modules
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px'
        }}>
          {[
            { id: 'pos', title: 'Point of Sale', subtitle: 'Fast & easy billing', icon: ShoppingCart, color: '#10b981', bg: '#ecfdf5' },
            { id: 'inventory', title: 'Inventory', subtitle: 'Manage stock & products', icon: Package, color: '#0064d2', bg: '#e8f3ff' },
            { id: 'accounting', title: 'Accounting', subtitle: 'Track income & expenses', icon: BookOpen, color: '#f59e0b', bg: '#fffbeb' },
            { id: 'payroll', title: 'Payroll', subtitle: 'Manage staff salaries', icon: Users, color: '#ec4899', bg: '#fdf2f8' },
            { id: 'reports', title: 'Reports', subtitle: 'Detailed analytics', icon: TrendingUp, color: '#8b5cf6', bg: '#f5f3ff' },
            { id: 'settings', title: 'Settings', subtitle: 'Configure your system', icon: Store, color: '#64748b', bg: '#f8fafc' }
          ].map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                onClick={() => onNavigate(mod.id)}
                className="nexa-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = mod.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  backgroundColor: mod.bg, color: mod.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{mod.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{mod.subtitle}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
