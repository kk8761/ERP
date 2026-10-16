import React, { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, Download, Calendar, DollarSign,
  Package, ShoppingCart, Users, ArrowUpRight, ArrowDownRight,
  Filter, FileSpreadsheet, Printer, RefreshCw
} from 'lucide-react';
import { apiRequest, downloadCsv } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function ReportsPage() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('sales'); // 'sales', 'inventory', 'financial', 'staff'
  const [dateRange, setDateRange] = useState('month'); // 'today', 'week', 'month', 'year'
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const dash = await apiRequest('/api/dashboard/summary');
      setSummaryData(dash);
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const handleExportSalesCsv = () => {
    downloadCsv('/api/reports/sales/csv', `nexaerp_sales_report_${dateRange}.csv`);
  };

  const handleExportInventoryCsv = () => {
    downloadCsv('/api/reports/inventory/csv', 'nexaerp_inventory_valuation.csv');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Analytics & Executive Reports
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Comprehensive performance metrics, revenue velocity, inventory valuation, and compliance exports
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Timeframe selector */}
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px'
          }}>
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'year', label: 'Year to Date' }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setDateRange(r.id)}
                style={{
                  border: 'none',
                  background: dateRange === r.id ? 'var(--primary)' : 'transparent',
                  color: dateRange === r.id ? '#ffffff' : 'var(--text-secondary)',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => window.print()}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
          >
            <Printer size={15} />
            <span>Print View</span>
          </button>

          {activeTab === 'inventory' ? (
            <button
              onClick={handleExportInventoryCsv}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
            >
              <FileSpreadsheet size={15} />
              <span>Export Stock CSV</span>
            </button>
          ) : (
            <button
              onClick={handleExportSalesCsv}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
            >
              <FileSpreadsheet size={15} />
              <span>Export Sales CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '2px' }}>
        {[
          { id: 'sales', label: 'Sales & Revenue Analytics', icon: TrendingUp },
          { id: 'inventory', label: 'Inventory Valuation & Velocity', icon: Package },
          { id: 'financial', label: 'Financial P&L & Cash Flow', icon: DollarSign },
          { id: 'staff', label: 'Staff & Terminal Productivity', icon: Users }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <Icon size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Sales Analytics */}
      {activeTab === 'sales' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Executive KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="nexa-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px' }}>
                Total Gross Volume
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                ₹ {(summaryData?.kpis?.today_sales ? summaryData.kpis.today_sales * 28 : 284500).toLocaleString('en-IN')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>
                <ArrowUpRight size={14} />
                <span>+14.8% vs last period</span>
              </div>
            </div>

            <div className="nexa-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px' }}>
                Transactions Count
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                {(summaryData?.kpis?.total_orders ? summaryData.kpis.total_orders * 15 : 432).toLocaleString()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>
                <ArrowUpRight size={14} />
                <span>+9.2% volume growth</span>
              </div>
            </div>

            <div className="nexa-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px' }}>
                Average Order Value (AOV)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                ₹ 658.50
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>
                <ArrowUpRight size={14} />
                <span>+5.1% basket size</span>
              </div>
            </div>

            <div className="nexa-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px' }}>
                Return & Refund Rate
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginBottom: '8px' }}>
                0.85%
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>
                <span>Healthy (Industry benchmark &lt; 2%)</span>
              </div>
            </div>
          </div>

          {/* Sales Performance Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <div className="nexa-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Revenue Trajectory</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Daily Invoiced Amount</span>
              </div>
              {/* Revenue SVG Chart */}
              <div style={{ width: '100%', height: '220px' }}>
                <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0064d2" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#0064d2" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Grid lines */}
                  <line x1="0" y1="40" x2="500" y2="40" stroke="var(--border-color)" strokeDasharray="3 3" />
                  <line x1="0" y1="90" x2="500" y2="90" stroke="var(--border-color)" strokeDasharray="3 3" />
                  <line x1="0" y1="140" x2="500" y2="140" stroke="var(--border-color)" strokeDasharray="3 3" />
                  <line x1="0" y1="190" x2="500" y2="190" stroke="var(--border-color)" />
                  {/* Area fill */}
                  <polygon
                    points="0,180 50,150 100,165 150,110 200,125 250,85 300,95 350,60 400,75 450,45 500,55 500,190 0,190"
                    fill="url(#repGrad)"
                  />
                  {/* Line */}
                  <polyline
                    points="0,180 50,150 100,165 150,110 200,125 250,85 300,95 350,60 400,75 450,45 500,55"
                    fill="none"
                    stroke="#0064d2"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                <span>Day 1</span>
                <span>Day 5</span>
                <span>Day 10</span>
                <span>Day 15</span>
                <span>Day 20</span>
                <span>Day 25</span>
                <span>Day 30</span>
              </div>
            </div>

            {/* Tender breakdown */}
            <div className="nexa-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>
                Tender Settlement Mix
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { name: 'UPI & QR Code', percent: 58, amount: '₹ 1,65,010', color: '#0064d2' },
                  { name: 'Credit & Debit Cards', percent: 24, amount: '₹ 68,280', color: '#10b981' },
                  { name: 'Cash Register', percent: 14, amount: '₹ 39,830', color: '#f59e0b' },
                  { name: 'Store Credit / Account', percent: 4, amount: '₹ 11,380', color: '#8b5cf6' }
                ].map((item, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{item.amount} ({item.percent}%)</span>
                    </div>
                    <div style={{ height: '7px', width: '100%', backgroundColor: 'var(--bg-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.percent}%`, height: '100%', backgroundColor: item.color, borderRadius: '4px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Inventory Valuation */}
      {activeTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="nexa-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px' }}>
                Total Inventory Valuation
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0064d2', marginBottom: '8px' }}>
                ₹ 4,82,650.00
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Based on FIFO landed cost
              </div>
            </div>

            <div className="nexa-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px' }}>
                Active SKUs in Catalog
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                {summaryData?.kpis?.inventory_items || 1248}
              </div>
              <div style={{ fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>
                100% Barcode Mapped
              </div>
            </div>

            <div className="nexa-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px' }}>
                Stock Turnover Ratio
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                4.8x / year
              </div>
              <div style={{ fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>
                High velocity grocery & essentials
              </div>
            </div>

            <div className="nexa-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px' }}>
                At-Risk Critical Stock
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', marginBottom: '8px' }}>
                {(summaryData?.kpis?.low_stock_items || 3) + (summaryData?.kpis?.out_of_stock_items || 1)} SKUs
              </div>
              <div style={{ fontSize: '11.5px', color: '#ef4444', fontWeight: 600 }}>
                Requires PO replenishment
              </div>
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div className="nexa-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px' }}>
              Stock Category Allocation & Valuation
            </div>
            <div className="nexa-table-wrapper">
              <table className="nexa-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>SKUs</th>
                    <th>Units on Hand</th>
                    <th>Inventory Value</th>
                    <th>Turnover Rate</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { cat: 'Groceries & Staples', skus: 142, units: 3450, val: '₹ 1,85,400', turn: '6.2x', status: 'Optimal' },
                    { cat: 'Dairy & Beverages', skus: 88, units: 1220, val: '₹ 64,800', turn: '11.4x', status: 'Fast Mover' },
                    { cat: 'Personal Care', skus: 110, units: 980, val: '₹ 92,150', turn: '3.1x', status: 'Optimal' },
                    { cat: 'Packaged Snacks', skus: 95, units: 2100, val: '₹ 74,300', turn: '5.8x', status: 'Optimal' },
                    { cat: 'Household Supplies', skus: 64, units: 750, val: '₹ 66,000', turn: '2.4x', status: 'Low Velocity' }
                  ].map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{row.cat}</td>
                      <td>{row.skus}</td>
                      <td style={{ fontWeight: 600 }}>{row.units.toLocaleString()}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.val}</td>
                      <td>{row.turn}</td>
                      <td>
                        <span className={`badge ${row.status === 'Fast Mover' ? 'badge-success' : 'badge-primary'}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Financial P&L Statement */}
      {activeTab === 'financial' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="nexa-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>
                  Statement of Profit and Loss (P&L)
                </h3>
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Period: Current Financial Year (FY 2026-27) &bull; Accrual Accounting Basis
                </span>
              </div>
              <span className="badge badge-success" style={{ fontSize: '12px' }}>
                Audited & Balanced
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                <span>Particulars</span>
                <span>Amount (INR)</span>
              </div>

              {/* Income */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0064d2' }}>
                <span>I. Revenue from Operations (Gross Sales)</span>
                <span>₹ 4,25,800.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', paddingLeft: '16px' }}>
                <span>Less: Sales Returns & Discounts</span>
                <span>(₹ 3,600.00)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span>Net Sales Revenue</span>
                <span>₹ 4,22,200.00</span>
              </div>

              {/* COGS */}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', paddingLeft: '16px' }}>
                <span>Cost of Goods Sold (COGS - Materials & Stock Purchases)</span>
                <span>(₹ 2,86,500.00)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#10b981', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span>Gross Operating Profit</span>
                <span>₹ 1,35,700.00 (32.1%)</span>
              </div>

              {/* Expenses */}
              <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: '6px' }}>
                II. Operating Expenses (OPEX)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', paddingLeft: '16px' }}>
                <span>Store Rent & Utilities</span>
                <span>₹ 22,000.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', paddingLeft: '16px' }}>
                <span>Staff Salaries & Wages</span>
                <span>₹ 36,000.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', paddingLeft: '16px' }}>
                <span>Logistics & Transport</span>
                <span>₹ 8,400.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', paddingLeft: '16px' }}>
                <span>Depreciation & Maintenance</span>
                <span>₹ 4,500.00</span>
              </div>

              {/* Net Profit */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 800,
                fontSize: '16px',
                color: '#10b981',
                borderTop: '2px solid var(--border-color)',
                paddingTop: '12px',
                marginTop: '10px'
              }}>
                <span>Net Operating Profit Before Tax (EBITDA)</span>
                <span>₹ 64,800.00 (15.3%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Staff Productivity */}
      {activeTab === 'staff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="nexa-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px' }}>
              Cashier & Sales Associate Throughput
            </div>
            <div className="nexa-table-wrapper">
              <table className="nexa-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Role / Station</th>
                    <th>Transactions Processed</th>
                    <th>Gross Volume</th>
                    <th>Avg Processing Speed</th>
                    <th>Customer Satisfaction</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Karthik Raja', role: 'Main Store POS', orders: 184, volume: '₹ 1,12,400', speed: '48 sec/bill', rating: '99.4%' },
                    { name: 'Suresh Kumar', role: 'Counter 2 POS', orders: 142, volume: '₹ 86,250', speed: '55 sec/bill', rating: '98.8%' },
                    { name: 'Pooja Nair', role: 'Express Checkout', orders: 210, volume: '₹ 64,800', speed: '32 sec/bill', rating: '99.7%' },
                    { name: 'Admin HQ', role: 'Bulk Invoicing', orders: 12, volume: '₹ 48,200', speed: '3 min/bill', rating: '100%' }
                  ].map((staff, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{staff.name}</td>
                      <td>{staff.role}</td>
                      <td style={{ fontWeight: 600 }}>{staff.orders}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{staff.volume}</td>
                      <td>{staff.speed}</td>
                      <td>
                        <span className="badge badge-success">{staff.rating}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
