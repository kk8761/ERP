import React, { useState, useEffect } from 'react';
import {
  TrendingDown, AlertTriangle, Clock, Calendar, CheckCircle,
  Users, ShoppingBag, Truck, Building, Zap, RefreshCw, ShoppingCart,
  ArrowRight, Flame, Layers
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function StockDepletionPredictor({ onNavigateToProcurement }) {
  const [segment, setSegment] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [toastNotice, setToastNotice] = useState(null);

  // Quick Daily Sale Simulation Modal State
  const [quickSaleTarget, setQuickSaleTarget] = useState(null);
  const [saleQuantity, setSaleQuantity] = useState(2);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  const handleReorderClick = (p) => {
    if (onNavigateToProcurement) {
      onNavigateToProcurement(p);
    } else {
      setToastNotice(`Purchase Requisition PO-REQ-AUTO triggered for ${p.recommended_reorder_qty} ${p.unit_of_measure} of ${p.name}`);
      setTimeout(() => setToastNotice(null), 4500);
    }
  };

  useEffect(() => {
    loadPredictions(segment, selectedBranch);
  }, [segment, selectedBranch]);

  const loadPredictions = async (seg = segment, branch = selectedBranch) => {
    setLoading(true);
    try {
      let url = `/api/inventory/stock-exhaustion-predictions?consumer_segment=${seg}`;
      if (branch) url += `&branch_id=${branch}`;
      const res = await apiRequest(url);
      setData(res);
    } catch (err) {
      console.error('Failed to load stock exhaustion predictions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDailySale = async () => {
    if (!quickSaleTarget || saleQuantity <= 0) return;
    setIsSubmittingSale(true);
    try {
      const res = await apiRequest('/api/inventory/stock-exhaustion-predictions/record-daily-sale', 'POST', {
        product_id: quickSaleTarget.product_id,
        quantity: Number(saleQuantity),
        branch_id: selectedBranch ? Number(selectedBranch) : null,
        notes: `POS Daily Sale: Recorded via Stock Exhaustion Predictor`
      });

      setToastNotice(
        `⚡ Sale of ${saleQuantity}x ${quickSaleTarget.name} recorded! Predicted exhaustion shifted from ${quickSaleTarget.days_until_exhaustion}d to ${res.updated_days_until_exhaustion}d (${res.updated_projected_exhaustion_date}).`
      );
      setQuickSaleTarget(null);
      setSaleQuantity(2);
      await loadPredictions(segment, selectedBranch);
    } catch (err) {
      alert(err.message || 'Failed to record daily sale');
    } finally {
      setIsSubmittingSale(false);
    }
  };

  const getUrgencyBadge = (urgency, days) => {
    switch (urgency) {
      case 'OUT_OF_STOCK':
        return { label: 'Out of Stock', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' };
      case 'CRITICAL':
        return { label: `Critical (Runs out in ${days}d)`, bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' };
      case 'URGENT':
        return { label: `Urgent (${days}d left)`, bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' };
      case 'MODERATE':
        return { label: `Moderate (${days}d left)`, bg: '#fef9c3', color: '#854d0e', border: '#fef08a' };
      case 'SAFE':
        return { label: `Healthy Stock (${days}d)`, bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
      case 'OVERSTOCKED':
        return { label: `Overstocked (${days}d)`, bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' };
      default:
        return { label: `${days} Days`, bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    }
  };

  const segmentIcons = {
    all: Users,
    retail_b2c: ShoppingBag,
    wholesale_b2b: Truck,
    enterprise_contract: Building,
    surge_promo: Zap
  };

  const filteredPredictions = (data?.predictions || []).filter(p => {
    if (filterUrgency === 'critical_only') return p.urgency === 'CRITICAL' || p.urgency === 'OUT_OF_STOCK';
    if (filterUrgency === 'reorder_needed') return ['OUT_OF_STOCK', 'CRITICAL', 'URGENT'].includes(p.urgency);
    if (filterUrgency === 'live_sales_only') return p.has_live_sales;
    return true;
  });

  const totalSoldToday = (data?.predictions || []).reduce((acc, p) => acc + (p.sales_today || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {toastNotice && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '10px',
          backgroundColor: '#ecfdf5',
          border: '1px solid #10b981',
          color: '#065f46',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={17} color="#10b981" />
            <span>{toastNotice}</span>
          </div>
          <button
            onClick={() => setToastNotice(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46', padding: '2px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Dynamic Daily Sales Indicator Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '12px',
        padding: '16px 20px',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            padding: '10px',
            borderRadius: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171'
          }}>
            <Flame size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.2px' }}>
              Adaptive Daily Sales Velocity Engine
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              Predictions dynamically update based on every day's sales (today's pace + 7-day rolling velocity). Record a sale anytime to see projected stockout dates immediately accelerate.
            </div>
          </div>
        </div>

        {/* Branch Context Selector for MNC Multi-Branch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>Operating Branch:</span>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              backgroundColor: '#1e293b',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <option value="">🏢 Global Enterprise (All Branches)</option>
            <option value="1">Main Store (Hyderabad HQ)</option>
            <option value="2">North Warehouse (Secunderabad)</option>
            <option value="3">Mumbai Financial Hub</option>
            <option value="4">Dubai MENA Center</option>
            <option value="5">Singapore APAC Center</option>
          </select>
        </div>
      </div>

      {/* Consumer Demand Profile Selector */}
      <div style={{
        backgroundColor: 'var(--bg-card, #ffffff)',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid var(--border-color, #e2e8f0)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
              Consumer Demand Profile & Velocity Model
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
              Select consumer segment to recalibrate real-time burn rate and predicted stockout dates
            </p>
          </div>
          <button
            onClick={() => loadPredictions(segment, selectedBranch)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Recalculate
          </button>
        </div>

        {/* Consumer Segment Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {(data?.available_segments || [
            { id: 'all', name: 'All Consumers (Blended)', multiplier: 1.0, description: 'Store-wide average' },
            { id: 'retail_b2c', name: 'Retail Direct B2C', multiplier: 1.25, description: 'Walk-in & Consumer' },
            { id: 'wholesale_b2b', name: 'Wholesale B2B Bulk', multiplier: 2.2, description: 'Large single drops' },
            { id: 'enterprise_contract', name: 'Enterprise Contracts', multiplier: 0.85, description: 'Scheduled SLA' },
            { id: 'surge_promo', name: 'Peak Surge Demand', multiplier: 3.5, description: 'Flash sale pace' }
          ]).map(s => {
            const Icon = segmentIcons[s.id] || Users;
            const isSelected = segment === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSegment(s.id)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #0064d2' : '1px solid var(--border-color, #e2e8f0)',
                  backgroundColor: isSelected ? 'rgba(0, 100, 210, 0.05)' : 'var(--bg-app, #f8fafc)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{
                  padding: '6px',
                  borderRadius: '6px',
                  backgroundColor: isSelected ? '#0064d2' : '#cbd5e1',
                  color: '#ffffff'
                }}>
                  <Icon size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: isSelected ? '#0064d2' : 'var(--text-main, #1e293b)' }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                    {s.multiplier}× Burn Rate • {s.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary KPI Cards Strip */}
      {data?.summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card, #fff)',
            borderRadius: '12px',
            padding: '18px',
            border: '1px solid var(--border-color, #e2e8f0)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
              CRITICAL STOCKOUTS (≤3 DAYS)
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
              {data.summary.critical_stockouts_count} SKUs
            </div>
            <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '4px', fontWeight: 600 }}>
              Action Required: Immediate Purchase Order
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-card, #fff)',
            borderRadius: '12px',
            padding: '18px',
            border: '1px solid var(--border-color, #e2e8f0)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
              URGENT REORDERS (4-7 DAYS)
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
              {data.summary.urgent_reorders_count} SKUs
            </div>
            <div style={{ fontSize: '11px', color: '#b45309', marginTop: '4px', fontWeight: 600 }}>
              Initiate Supplier Quotations Today
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-card, #fff)',
            borderRadius: '12px',
            padding: '18px',
            border: '1px solid var(--border-color, #e2e8f0)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
              TODAY'S SALES VELOCITY
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0064d2', marginTop: '4px' }}>
              {totalSoldToday} Units
            </div>
            <div style={{ fontSize: '11px', color: '#0369a1', marginTop: '4px', fontWeight: 600 }}>
              Across {data.summary.live_sales_active_skus || 0} active selling catalog items
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-card, #fff)',
            borderRadius: '12px',
            padding: '18px',
            border: '1px solid var(--border-color, #e2e8f0)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
              AVG DAYS INVENTORY REMAINING
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
              {data.summary.average_days_inventory_remaining} Days
            </div>
            <div style={{ fontSize: '11px', color: '#047857', marginTop: '4px', fontWeight: 600 }}>
              Replenishment Target: {data.summary.total_recommended_replenishment_units.toLocaleString()} units
            </div>
          </div>
        </div>
      )}

      {/* Main Predictions Table Card */}
      <div style={{
        backgroundColor: 'var(--bg-card, #ffffff)',
        borderRadius: '12px',
        border: '1px solid var(--border-color, #e2e8f0)',
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
              Product Runout Horizon & Daily Sales Velocity
            </h4>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
              Showing {filteredPredictions.length} products • Burn rates calculated dynamically from POS & B2B order items
            </div>
          </div>

          {/* Table Filters */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setFilterUrgency('all')}
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #cbd5e1)',
                backgroundColor: filterUrgency === 'all' ? '#0064d2' : '#fff',
                color: filterUrgency === 'all' ? '#fff' : '#475569',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              All SKUs
            </button>
            <button
              onClick={() => setFilterUrgency('live_sales_only')}
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #cbd5e1)',
                backgroundColor: filterUrgency === 'live_sales_only' ? '#0064d2' : '#fff',
                color: filterUrgency === 'live_sales_only' ? '#fff' : '#475569',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              ⚡ With Daily Sales
            </button>
            <button
              onClick={() => setFilterUrgency('reorder_needed')}
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #cbd5e1)',
                backgroundColor: filterUrgency === 'reorder_needed' ? '#f59e0b' : '#fff',
                color: filterUrgency === 'reorder_needed' ? '#fff' : '#475569',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Reorder Needed (&le;7d)
            </button>
            <button
              onClick={() => setFilterUrgency('critical_only')}
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #cbd5e1)',
                backgroundColor: filterUrgency === 'critical_only' ? '#ef4444' : '#fff',
                color: filterUrgency === 'critical_only' ? '#fff' : '#475569',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Critical Only (&le;3d)
            </button>
          </div>
        </div>

        {/* Predictions Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-app, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Product & SKU</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Current Stock</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Daily Sales Pace</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Effective Burn Rate</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Runout Horizon</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Predicted Exhaustion</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Urgency Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Suggested Reorder</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPredictions.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
                    No products match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredPredictions.map((p) => {
                  const badge = getUrgencyBadge(p.urgency, p.days_until_exhaustion);
                  const barWidth = Math.min(100, Math.max(8, (p.days_until_exhaustion / 45) * 100));
                  const barColor = p.days_until_exhaustion <= 3 ? '#ef4444' : (p.days_until_exhaustion <= 7 ? '#f59e0b' : '#10b981');

                  return (
                    <tr key={p.product_id} style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                          SKU: {p.sku} • {p.category_name}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', fontWeight: 800, fontSize: '14px' }}>
                        {p.current_stock}{' '}
                        <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748b' }}>{p.unit_of_measure}</span>
                      </td>

                      {/* Everyday Sales & Velocity Column */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            padding: '2px 7px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: p.sales_today > 0 ? '#eff6ff' : '#f1f5f9',
                            color: p.sales_today > 0 ? '#0064d2' : '#64748b',
                            border: p.sales_today > 0 ? '1px solid #bfdbfe' : '1px solid #e2e8f0'
                          }}>
                            {p.sales_today > 0 ? `🔥 ${p.sales_today} sold today` : '0 sold today'}
                          </span>
                          {p.sales_trend === 'ACCELERATING' && (
                            <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>⚡ Spiking</span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                          7d: {p.sales_last_7d} units (~{p.avg_daily_sales_7d}/d)
                        </div>
                      </td>

                      {/* Burn Rate */}
                      <td style={{ padding: '14px 16px', color: 'var(--text-main, #334155)', fontWeight: 700 }}>
                        ~{p.daily_burn_rate} {p.unit_of_measure}/day
                      </td>

                      {/* Runout Horizon Bar */}
                      <td style={{ padding: '14px 16px', minWidth: '140px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            flex: 1,
                            height: '7px',
                            backgroundColor: '#e2e8f0',
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${barWidth}%`,
                              height: '100%',
                              backgroundColor: barColor,
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color: barColor,
                            minWidth: '40px',
                            textAlign: 'right'
                          }}>
                            {p.days_until_exhaustion}d
                          </span>
                        </div>
                      </td>

                      {/* Predicted Exhaustion Date */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: p.days_until_exhaustion <= 3 ? '#b91c1c' : '#334155' }}>
                          <Calendar size={14} color="#64748b" />
                          <span>{p.projected_exhaustion_date}</span>
                        </div>
                      </td>

                      {/* Urgency Badge */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          whiteSpace: 'nowrap'
                        }}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Suggested Reorder */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0064d2' }}>
                          +{p.recommended_reorder_qty} {p.unit_of_measure}
                        </div>
                        {p.estimated_reorder_cost > 0 && (
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            Cost: ₹{p.estimated_reorder_cost.toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setQuickSaleTarget(p)}
                            title="Record a sale to watch stock exhaustion accelerate in real time"
                            style={{
                              padding: '5px 10px',
                              borderRadius: '7px',
                              border: '1px solid #bfdbfe',
                              backgroundColor: '#eff6ff',
                              color: '#0064d2',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <Flame size={12} /> Sell Units
                          </button>
                          <button
                            onClick={() => handleReorderClick(p)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '7px',
                              border: 'none',
                              backgroundColor: p.days_until_exhaustion <= 3 ? '#ef4444' : '#0064d2',
                              color: '#fff',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <ShoppingCart size={12} /> Reorder
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK SALE SIMULATION MODAL */}
      {quickSaleTarget && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '460px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  padding: '8px',
                  borderRadius: '8px',
                  backgroundColor: '#fee2e2',
                  color: '#ef4444'
                }}>
                  <Flame size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Record Daily Sale</h3>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Watch prediction shift upon store sale</div>
                </div>
              </div>
              <button
                onClick={() => setQuickSaleTarget(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{
              padding: '14px',
              backgroundColor: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{quickSaleTarget.name}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                SKU: {quickSaleTarget.sku} • Available Stock: <strong>{quickSaleTarget.current_stock} {quickSaleTarget.unit_of_measure}</strong>
              </div>
              <div style={{
                marginTop: '10px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                fontSize: '12px'
              }}>
                <div style={{ padding: '8px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b' }}>Current Pace:</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>~{quickSaleTarget.daily_burn_rate}/day</div>
                </div>
                <div style={{ padding: '8px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b' }}>Exhaustion Date:</div>
                  <div style={{ fontWeight: 700, color: '#ef4444', marginTop: '2px' }}>{quickSaleTarget.projected_exhaustion_date}</div>
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Units Sold Today:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 5, 10].map(qty => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setSaleQuantity(qty)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: '8px',
                      border: saleQuantity === qty ? '2px solid #0064d2' : '1px solid #cbd5e1',
                      backgroundColor: saleQuantity === qty ? '#eff6ff' : '#fff',
                      color: saleQuantity === qty ? '#0064d2' : '#334155',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    {qty}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                max={quickSaleTarget.current_stock}
                value={saleQuantity}
                onChange={(e) => setSaleQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setQuickSaleTarget(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#fff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDailySale}
                disabled={isSubmittingSale}
                style={{
                  flex: 2,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#0064d2',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {isSubmittingSale ? 'Recording Sale...' : 'Confirm Sale & Recalculate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
