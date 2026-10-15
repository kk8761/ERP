import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, FileText, Package, Users, TrendingUp,
  ArrowUpRight, AlertTriangle, ChevronRight, Store, Calendar,
  CreditCard, ShieldAlert, CheckCircle2, Info, Bell, RefreshCw
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

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const metrics = await apiRequest('/api/dashboard/metrics');
      setData(metrics);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const kpis = data?.kpis || {
    total_sales: 24850,
    total_orders: 48,
    inventory_items: 1247,
    low_stock_items: 12,
    out_of_stock_items: 3,
    total_customers: 892,
    monthly_profit: 145600,
    total_expenses: 85400
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
          <h1 style={{
            fontSize: '24px',
            fontWeight: 800,
            fontFamily: 'var(--font-brand)',
            color: 'var(--text-main)',
            letterSpacing: '-0.3px'
          }}>
            Good Morning, {user?.full_name?.split(' ')[0] || 'Karthik'}
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
            Here's what's happening in your business today.
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
            fontWeight: 600
          }}>
            <Store size={14} color="var(--primary)" />
            <span>{user?.branch_name || 'Main Store'}</span>
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
            color: 'var(--text-secondary)'
          }}>
            <Calendar size={14} />
            <span>Wednesday, 15 Oct 2026 10:30 AM</span>
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

      {/* 5 KPI Cards Row matching screenshot */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px'
      }}>
        {/* Card 1: Total Sales */}
        <div className="nexa-card" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
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
        <div className="nexa-card" style={{ padding: '18px 20px' }}>
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
        <div className="nexa-card" style={{ padding: '18px 20px' }}>
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
        <div className="nexa-card" style={{ padding: '18px 20px' }}>
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
        <div className="nexa-card" style={{ padding: '18px 20px' }}>
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
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#0064d2" strokeWidth="16" strokeDasharray="95 156" strokeDashoffset="0" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="16" strokeDasharray="55 196" strokeDashoffset="-95" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f59e0b" strokeWidth="16" strokeDasharray="38 213" strokeDashoffset="-150" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ec4899" strokeWidth="16" strokeDasharray="20 231" strokeDashoffset="-188" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#8b5cf6" strokeWidth="16" strokeDasharray="43 208" strokeDashoffset="-208" />
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

            {/* Legend matching screenshot */}
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
            <button onClick={() => onNavigate('products')} className="btn btn-ghost" style={{ fontSize: '12px', color: 'var(--primary)', padding: '4px 8px' }}>
              View All
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
                {(data?.low_stock_table || [
                  { name: 'Basmati Rice (5kg)', current_stock: 2, reorder_level: 10, status: 'Out of Stock' },
                  { name: 'Sunflower Oil (1L)', current_stock: 8, reorder_level: 25, status: 'Low Stock' },
                  { name: 'Amul Milk (1L)', current_stock: 5, reorder_level: 20, status: 'Low Stock' },
                  { name: 'Atta (5kg)', current_stock: 12, reorder_level: 30, status: 'Low Stock' },
                  { name: 'Sugar (1kg)', current_stock: 3, reorder_level: 15, status: 'Out of Stock' }
                ]).map((item, idx) => (
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
                ))}
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
                {(data?.recent_sales || [
                  { invoice: '#INV-001245', customer: 'Walk-in Customer', items_count: 3, amount: 450, time: '10:28 AM' },
                  { invoice: '#INV-001244', customer: 'Rajesh Kumar', items_count: 5, amount: 1250, time: '10:15 AM' },
                  { invoice: '#INV-001243', customer: 'Priya Sharma', items_count: 2, amount: 380, time: '09:45 AM' },
                  { invoice: '#INV-001242', customer: 'Walk-in Customer', items_count: 7, amount: 2180, time: '09:30 AM' },
                  { invoice: '#INV-001241', customer: 'Amit Singh', items_count: 4, amount: 890, time: '09:12 AM' }
                ]).map((sale, idx) => (
                  <tr key={idx}>
                    <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{sale.invoice}</td>
                    <td>{sale.customer}</td>
                    <td>{sale.items_count}</td>
                    <td style={{ fontWeight: 700 }}>₹ {sale.amount.toLocaleString('en-IN')}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{sale.time}</td>
                  </tr>
                ))}
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
            {(data?.alerts || [
              { id: 1, type: 'danger', title: 'Low Stock Alert', description: 'Basmati Rice (5kg) is out of stock', time: '5 minutes ago' },
              { id: 2, type: 'warning', title: 'Payment Due', description: 'Supplier payment of ₹ 25,000 due tomorrow', time: '1 hour ago' },
              { id: 3, type: 'info', title: 'New Customer', description: 'Rahul Verma registered as new customer', time: '2 hours ago' },
              { id: 4, type: 'success', title: 'Backup Completed', description: 'Daily automated backup completed successfully', time: '3 hours ago' },
              { id: 5, type: 'primary', title: 'System Update', description: 'New features available in version 2.1.0', time: '5 hours ago' }
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
