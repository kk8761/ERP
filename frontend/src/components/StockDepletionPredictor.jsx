import React, { useState, useEffect } from 'react';
import {
  TrendingDown, AlertTriangle, Clock, Calendar, CheckCircle,
  Users, ShoppingBag, Truck, Building, Zap, RefreshCw, ShoppingCart
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function StockDepletionPredictor({ onNavigateToProcurement }) {
  const [segment, setSegment] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [toastNotice, setToastNotice] = useState(null);

  const handleReorderClick = (p) => {
    if (onNavigateToProcurement) {
      onNavigateToProcurement(p);
    } else {
      setToastNotice(`Purchase Requisition PO-REQ-AUTO triggered for ${p.recommended_reorder_qty} ${p.unit_of_measure} of ${p.name}`);
      setTimeout(() => setToastNotice(null), 4500);
    }
  };

  useEffect(() => {
    loadPredictions(segment);
  }, [segment]);

  const loadPredictions = async (seg) => {
    setLoading(true);
    try {
      const res = await apiRequest(`/api/inventory/stock-exhaustion-predictions?consumer_segment=${seg}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load stock exhaustion predictions:', err);
    } finally {
      setLoading(false);
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
    return true;
  });

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
            onClick={() => loadPredictions(segment)}
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
            <RefreshCw size={13} /> Recalculate
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
              CRITICAL STOCKOUTS (≤4 DAYS)
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
              {data.summary.critical_stockouts_count} SKUs
            </div>
            <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '4px', fontWeight: 600 }}>
              Action Required: Immediate Supplier Purchase Order
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-card, #fff)',
            borderRadius: '12px',
            padding: '18px',
            border: '1px solid var(--border-color, #e2e8f0)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
              URGENT ATTENTION (5–8 DAYS)
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
              {data.summary.urgent_reorders_count} SKUs
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
              Reorder within standard lead-time
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-card, #fff)',
            borderRadius: '12px',
            padding: '18px',
            border: '1px solid var(--border-color, #e2e8f0)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
              AVERAGE RUNOUT HORIZON
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0064d2', marginTop: '4px' }}>
              {data.summary.average_days_inventory_remaining} Days
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
              Across {data.summary.total_skus_analyzed} active catalog items
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-card, #fff)',
            borderRadius: '12px',
            padding: '18px',
            border: '1px solid var(--border-color, #e2e8f0)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
              SUGGESTED REORDER VOLUME
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
              {data.summary.total_recommended_replenishment_units} units
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
              For 30-day stock buffer target
            </div>
          </div>
        </div>
      )}

      {/* Filter and Table List */}
      <div style={{
        backgroundColor: 'var(--bg-card, #ffffff)',
        borderRadius: '12px',
        border: '1px solid var(--border-color, #e2e8f0)',
        overflow: 'hidden'
      }}>
        {/* Table Toolbar */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-app, #f8fafc)',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ fontWeight: 700, fontSize: '14px' }}>
            Predicted Stockout Timeline & Replenishment Schedule
          </div>
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
              All Items ({data?.predictions?.length || 0})
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
              Reorder Needed (&lt;8d)
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
              Critical Only (&lt;4d)
            </button>
          </div>
        </div>

        {/* Predictions Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-app, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Product & SKU</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Current Stock</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Burn Rate / Day</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Runout Horizon</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Predicted Exhaustion Date</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Urgency Status</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Suggested Reorder</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredPredictions.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
                  No products available for depletion forecasting. Register items in Step 1 (Product Catalog) and manage inventory in Step 2 to generate predictive runout schedules.
                </td>
              </tr>
            ) : (
              filteredPredictions.map((p) => {
              const badge = getUrgencyBadge(p.urgency, p.days_until_exhaustion);
              const barWidth = Math.min(100, Math.max(8, (p.days_until_exhaustion / 45) * 100));
              const barColor = p.days_until_exhaustion <= 4 ? '#ef4444' : (p.days_until_exhaustion <= 8 ? '#f59e0b' : '#10b981');

              return (
                <tr key={p.product_id} style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                      SKU: {p.sku} • Category: {p.category_name}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', fontWeight: 800, fontSize: '14px' }}>
                    {p.current_stock}{' '}
                    <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748b' }}>{p.unit_of_measure}</span>
                  </td>

                  <td style={{ padding: '14px 16px', color: 'var(--text-main, #334155)', fontWeight: 600 }}>
                    ~{p.daily_burn_rate} {p.unit_of_measure}/day
                  </td>

                  <td style={{ padding: '14px 16px', minWidth: '150px' }}>
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

                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: p.days_until_exhaustion <= 4 ? '#b91c1c' : '#334155' }}>
                      <Calendar size={14} color="#64748b" />
                      <span>{p.projected_exhaustion_date}</span>
                    </div>
                  </td>

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

                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleReorderClick(p)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: p.days_until_exhaustion <= 4 ? '#ef4444' : '#0064d2',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <ShoppingCart size={13} /> Reorder
                    </button>
                  </td>
                </tr>
              );
            })
          )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
