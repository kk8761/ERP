import React, { useState, useEffect } from 'react';
import {
  Factory, Gauge, Layers, Cpu, Play, CheckCircle2, Clock,
  AlertTriangle, RefreshCw, ChevronRight, Activity, Wrench
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function ManufacturingPage({ initialTab = 'orders' }) {
  const [activeTab, setActiveTab] = useState(
    ['orders', 'work_centers', 'boms', 'oee'].includes(initialTab) ? initialTab : 'orders'
  );
  const [metrics, setMetrics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [workCenters, setWorkCenters] = useState([]);
  const [boms, setBoms] = useState([]);
  const [selectedBom, setSelectedBom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mrpResult, setMrpResult] = useState(null);
  const [mrpRunning, setMrpRunning] = useState(false);

  useEffect(() => {
    if (['orders', 'work_centers', 'boms', 'oee'].includes(initialTab)) {
      setActiveTab(initialTab);
    } else if (initialTab === 'manufacturing') {
      setActiveTab('orders');
    }
  }, [initialTab]);

  useEffect(() => {
    loadManufacturingData();
  }, []);

  const loadManufacturingData = async () => {
    setLoading(true);
    try {
      const [mRes, oRes, wcRes, bRes] = await Promise.all([
        apiRequest('/api/manufacturing/metrics'),
        apiRequest('/api/manufacturing/orders'),
        apiRequest('/api/manufacturing/work-centers'),
        apiRequest('/api/manufacturing/boms')
      ]);
      setMetrics(mRes);
      setOrders(oRes);
      setWorkCenters(wcRes);
      setBoms(bRes);
      if (bRes.length > 0) setSelectedBom(bRes[0]);
    } catch (err) {
      console.error('Failed to load manufacturing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunMRP = async () => {
    setMrpRunning(true);
    try {
      const res = await apiRequest('/api/manufacturing/mrp-run', { method: 'POST' });
      setMrpResult(res);
    } catch (err) {
      console.error('Failed to run MRP simulation:', err);
    } finally {
      setMrpRunning(false);
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            backgroundColor: '#0064d2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 14px rgba(0, 100, 210, 0.3)'
          }}>
            <Factory size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              Manufacturing & Industry 4.0 Execution
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
              BOM Explosion, Work Centers, MRP Calculation Engine & IoT Machine Telemetry
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadManufacturingData}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--bg-card, #fff)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-main, #334155)'
            }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            onClick={handleRunMRP}
            disabled={mrpRunning}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #0064d2 0%, #004b99 100%)',
              color: '#fff',
              cursor: mrpRunning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0, 100, 210, 0.25)'
            }}
          >
            <Play size={16} /> {mrpRunning ? 'Calculating Net Shortages...' : 'Execute MRP Run'}
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      {metrics && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card, #fff)',
            borderRadius: '12px',
            padding: '18px',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>OVERALL OEE SCORE</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0064d2', marginTop: '4px' }}>
              {metrics.oee.overall_oee}%
            </div>
            <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px', fontWeight: 600 }}>
              {metrics.oee.trend}
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-card, #fff)',
            borderRadius: '12px',
            padding: '18px',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>AVAILABILITY & UPTIME</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
              {metrics.oee.availability}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
              {metrics.work_centers_online} of {metrics.work_centers_total} Work Centers Online
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-card, #fff)',
            borderRadius: '12px',
            padding: '18px',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>PERFORMANCE EFFICIENCY</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
              {metrics.oee.performance}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
              Output: {metrics.daily_output_units} units / shift
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-card, #fff)',
            borderRadius: '12px',
            padding: '18px',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>QUALITY YIELD (FIRST PASS)</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#6366f1', marginTop: '4px' }}>
              {metrics.oee.quality}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
              Defect rate: {metrics.defect_rate_ppm} PPM
            </div>
          </div>
        </div>
      )}

      {/* MRP Results Banner if triggered */}
      {mrpResult && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e40af', fontWeight: 700 }}>
              <CheckCircle2 size={18} /> Material Requirements Planning (MRP) Completed
            </div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{mrpResult.timestamp}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '13px' }}>
            <div>Gross Demand: <strong>{mrpResult.gross_requirements} units</strong></div>
            <div>On-Hand Free Stock: <strong>{mrpResult.available_stock} units</strong></div>
            <div>Allocated Reservations: <strong>{mrpResult.allocated_stock} units</strong></div>
            <div style={{ color: '#b91c1c' }}>Net Shortage To Order: <strong>{mrpResult.net_shortage} units</strong></div>
          </div>
          <div style={{ fontSize: '12px', color: '#1e3a8a' }}>
            Generated <strong>{mrpResult.recommended_purchase_requisitions.length} Purchase Requisitions</strong> and <strong>{mrpResult.planned_work_orders.length} Planned Production Order</strong>.
          </div>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid var(--border-color, #e2e8f0)',
        paddingBottom: '8px'
      }}>
        {[
          { id: 'orders', label: 'Production Work Orders', icon: Layers },
          { id: 'work_centers', label: 'Work Centers & IoT Telemetry', icon: Cpu },
          { id: 'boms', label: 'Bill of Materials (BOM)', icon: Factory },
          { id: 'oee', label: 'OEE Operational Breakdown', icon: Gauge }
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
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? '#0064d2' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-muted, #64748b)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PRODUCTION ORDERS */}
      {activeTab === 'orders' && (
        <div style={{
          backgroundColor: 'var(--bg-card, #fff)',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #e2e8f0)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-app, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Order #</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Product & Assembly</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Work Center</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Priority</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Progress</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0064d2' }}>
                    {o.order_number}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                    {o.product_name}
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>BOM Ref: {o.bom_id}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted, #475569)' }}>
                    {o.work_center}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: o.priority === 'CRITICAL' ? '#fee2e2' : o.priority === 'HIGH' ? '#ffedd5' : '#f1f5f9',
                      color: o.priority === 'CRITICAL' ? '#b91c1c' : o.priority === 'HIGH' ? '#c2410c' : '#475569'
                    }}>
                      {o.priority}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        flex: 1,
                        height: '7px',
                        backgroundColor: '#e2e8f0',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${o.progress_percent}%`,
                          height: '100%',
                          backgroundColor: o.progress_percent === 100 ? '#10b981' : '#0064d2'
                        }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{o.progress_percent}%</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                      {o.quantity_completed} / {o.quantity_planned} units
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: o.status === 'COMPLETED' ? '#dcfce7' : o.status === 'IN_PROGRESS' ? '#dbeafe' : '#fef3c7',
                      color: o.status === 'COMPLETED' ? '#15803d' : o.status === 'IN_PROGRESS' ? '#1d4ed8' : '#b45309'
                    }}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted, #64748b)' }}>
                    {o.due_date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: WORK CENTERS & TELEMETRY */}
      {activeTab === 'work_centers' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px'
        }}>
          {workCenters.map(wc => (
            <div
              key={wc.id}
              style={{
                backgroundColor: 'var(--bg-card, #fff)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid var(--border-color, #e2e8f0)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-main, #0f172a)' }}>
                    {wc.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                    Code: {wc.code} • Dept: {wc.department}
                  </div>
                </div>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: wc.status === 'OPERATIONAL' ? '#dcfce7' : '#fee2e2',
                  color: wc.status === 'OPERATIONAL' ? '#15803d' : '#b91c1c'
                }}>
                  {wc.status}
                </span>
              </div>

              {/* IoT Live Sensor Strip */}
              <div style={{
                backgroundColor: 'var(--bg-app, #f8fafc)',
                borderRadius: '8px',
                padding: '12px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>Health Score</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: wc.health > 90 ? '#10b981' : '#f59e0b' }}>
                    {wc.health}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>Spindle Temp</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: wc.temperature_c > 50 ? '#ef4444' : '#0f172a' }}>
                    {wc.temperature_c}°C
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>Vibration</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: wc.vibration_g > 0.3 ? '#ef4444' : '#0f172a' }}>
                    {wc.vibration_g} g
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                <span>Operator: <strong>{wc.operator}</strong></span>
                <span>Efficiency: <strong>{wc.efficiency}%</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: BILL OF MATERIALS (BOM) */}
      {activeTab === 'boms' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
          {/* BOM List */}
          <div style={{
            backgroundColor: 'var(--bg-card, #fff)',
            borderRadius: '12px',
            border: '1px solid var(--border-color, #e2e8f0)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>Configured Master BOMs</div>
            {boms.map(b => (
              <div
                key={b.id}
                onClick={() => setSelectedBom(b)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: selectedBom?.id === b.id ? '2px solid #0064d2' : '1px solid var(--border-color, #e2e8f0)',
                  backgroundColor: selectedBom?.id === b.id ? 'rgba(0,100,210,0.04)' : 'transparent'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '13px' }}>{b.product_name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                  SKU: {b.product_code} • Rev: {b.revision} • Cost: ${b.total_cost.toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Selected BOM Components Breakdown */}
          {selectedBom && (
            <div style={{
              backgroundColor: 'var(--bg-card, #fff)',
              borderRadius: '12px',
              border: '1px solid var(--border-color, #e2e8f0)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                    {selectedBom.product_name}
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                    BOM ID: {selectedBom.id} • Lead Time: {selectedBom.routing_lead_time_days} days
                  </div>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0064d2' }}>
                  Total Cost: ${selectedBom.total_cost.toFixed(2)}
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-app, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Part Code</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Component Name</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Quantity</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Unit Cost</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Extended Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBom.components.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#0064d2' }}>{c.id}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{c.name}</td>
                      <td style={{ padding: '10px 14px' }}>{c.quantity} {c.unit}</td>
                      <td style={{ padding: '10px 14px' }}>${c.cost.toFixed(2)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700 }}>${(c.quantity * c.cost).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: OEE BREAKDOWN */}
      {activeTab === 'oee' && (
        <div style={{
          backgroundColor: 'var(--bg-card, #fff)',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #e2e8f0)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Overall Equipment Effectiveness (OEE) Framework</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
              World-Class OEE benchmark is 85%. Current enterprise factory index is <strong>{metrics?.oee.overall_oee}%</strong>.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-app, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#10b981' }}>1. Availability (92.4%)</div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', margin: '6px 0 0' }}>
                Measures planned production time against downtime losses (unplanned stops, tool changes, equipment breakdown).
              </p>
            </div>
            <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-app, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#f59e0b' }}>2. Performance (89.6%)</div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', margin: '6px 0 0' }}>
                Measures actual operating speed vs maximum nameplate speed. Tracks minor stops and reduced speed cycles.
              </p>
            </div>
            <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-app, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#6366f1' }}>3. Quality (98.8%)</div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', margin: '6px 0 0' }}>
                Measures good parts produced against total parts initiated. Minimizes scrap and rework cycles.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
