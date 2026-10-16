import React, { useState, useEffect } from 'react';
import {
  Sparkles, TrendingUp, Sliders, Activity, AlertCircle,
  RefreshCw, CheckCircle2, ArrowUpRight, ArrowDownRight, Zap
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function PredictiveAIPage() {
  const [activeTab, setActiveTab] = useState('simulation'); // 'simulation' | 'forecast' | 'maintenance'
  const [forecastData, setForecastData] = useState(null);
  const [maintenanceList, setMaintenanceList] = useState([]);
  const [loading, setLoading] = useState(true);

  // What-If Simulation Controls
  const [priceChange, setPriceChange] = useState(5); // +5%
  const [demandShock, setDemandShock] = useState(0);  // 0%
  const [cogsInflation, setCogsInflation] = useState(3); // +3%
  const [leadTimeBuffer, setLeadTimeBuffer] = useState(2); // 2 days
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    loadPredictiveData();
    runSimulation(priceChange, demandShock, cogsInflation, leadTimeBuffer);
  }, []);

  const loadPredictiveData = async () => {
    setLoading(true);
    try {
      const [fRes, mRes] = await Promise.all([
        apiRequest('/api/predictive/demand-forecast?horizon_days=30'),
        apiRequest('/api/predictive/predictive-maintenance')
      ]);
      setForecastData(fRes);
      setMaintenanceList(mRes);
    } catch (err) {
      console.error('Failed to load predictive data:', err);
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = async (p = priceChange, d = demandShock, c = cogsInflation, l = leadTimeBuffer) => {
    setSimulating(true);
    try {
      const res = await apiRequest('/api/predictive/what-if-simulation', {
        method: 'POST',
        body: JSON.stringify({
          price_change_percent: Number(p),
          demand_shock_percent: Number(d),
          cogs_inflation_percent: Number(c),
          lead_time_buffer_days: Number(l)
        })
      });
      setSimulationResult(res);
    } catch (err) {
      console.error('Failed to run simulation:', err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
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
            <Sparkles size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              Predictive AI & Decision Engine
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
              What-If Financial Modeling, Time-Series Demand Forecasting & RUL Predictive Maintenance
            </p>
          </div>
        </div>

        <button
          onClick={loadPredictiveData}
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
          <RefreshCw size={15} /> Refresh AI Models
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid var(--border-color, #e2e8f0)',
        paddingBottom: '8px'
      }}>
        {[
          { id: 'simulation', label: 'What-If Scenario Simulator', icon: Sliders },
          { id: 'forecast', label: '30-Day Demand Forecasting', icon: TrendingUp },
          { id: 'maintenance', label: 'Equipment Predictive Maintenance', icon: Activity }
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

      {/* TAB 1: WHAT-IF SIMULATION */}
      {activeTab === 'simulation' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 400px) 1fr', gap: '24px' }}>
          {/* Controls Panel */}
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
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Simulation Parameters</h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                Slide variables to model real-time gross margin and cashflow impact.
              </p>
            </div>

            {/* Slider 1: Price Change */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                <span>Unit Price Adjustment</span>
                <span style={{ color: priceChange >= 0 ? '#10b981' : '#ef4444' }}>
                  {priceChange > 0 ? `+${priceChange}` : priceChange}%
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="25"
                step="1"
                value={priceChange}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPriceChange(val);
                  runSimulation(val, demandShock, cogsInflation, leadTimeBuffer);
                }}
                style={{ width: '100%', marginTop: '8px', accentColor: '#0064d2' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                <span>-20% (Discount)</span>
                <span>0% (Base)</span>
                <span>+25% (Premium)</span>
              </div>
            </div>

            {/* Slider 2: Demand Shock */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                <span>Market Demand Shock</span>
                <span style={{ color: demandShock >= 0 ? '#10b981' : '#ef4444' }}>
                  {demandShock > 0 ? `+${demandShock}` : demandShock}%
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="30"
                step="1"
                value={demandShock}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDemandShock(val);
                  runSimulation(priceChange, val, cogsInflation, leadTimeBuffer);
                }}
                style={{ width: '100%', marginTop: '8px', accentColor: '#0064d2' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                <span>-30% (Slump)</span>
                <span>0% (Neutral)</span>
                <span>+30% (Surge)</span>
              </div>
            </div>

            {/* Slider 3: COGS Inflation */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                <span>Supply Chain Cost Inflation</span>
                <span style={{ color: '#ef4444' }}>+{cogsInflation}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={cogsInflation}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCogsInflation(val);
                  runSimulation(priceChange, demandShock, val, leadTimeBuffer);
                }}
                style={{ width: '100%', marginTop: '8px', accentColor: '#ef4444' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                <span>0% (Stable)</span>
                <span>+12%</span>
                <span>+25% (High Inflation)</span>
              </div>
            </div>

            {/* Slider 4: Lead Time Buffer */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                <span>Supplier Lead-Time Buffer</span>
                <span style={{ color: '#f59e0b' }}>+{leadTimeBuffer} Days</span>
              </div>
              <input
                type="range"
                min="0"
                max="14"
                step="1"
                value={leadTimeBuffer}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setLeadTimeBuffer(val);
                  runSimulation(priceChange, demandShock, cogsInflation, val);
                }}
                style={{ width: '100%', marginTop: '8px', accentColor: '#f59e0b' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                <span>0 Days</span>
                <span>7 Days</span>
                <span>14 Days (Delayed)</span>
              </div>
            </div>
          </div>

          {/* Outcome Projection Display */}
          {simulationResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Executive Recommendation Banner */}
              <div style={{
                padding: '16px 20px',
                borderRadius: '12px',
                backgroundColor: simulationResult.simulation.margin_variance_usd >= 0 ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${simulationResult.simulation.margin_variance_usd >= 0 ? '#bbf7d0' : '#fecaca'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Zap size={22} color={simulationResult.simulation.margin_variance_usd >= 0 ? '#16a34a' : '#dc2626'} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: simulationResult.simulation.margin_variance_usd >= 0 ? '#166534' : '#991b1b' }}>
                    AI Executive Recommendation
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-main, #334155)', marginTop: '2px' }}>
                    {simulationResult.executive_recommendation}
                  </div>
                </div>
              </div>

              {/* Dynamic KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div style={{
                  backgroundColor: 'var(--bg-card, #fff)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color, #e2e8f0)'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>PROJECTED REVENUE</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>
                    ${simulationResult.simulation.projected_revenue.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
                    Baseline: ${simulationResult.baseline.monthly_revenue.toLocaleString()}
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'var(--bg-card, #fff)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color, #e2e8f0)'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>PROJECTED GROSS MARGIN</div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 800,
                    marginTop: '4px',
                    color: simulationResult.simulation.margin_variance_usd >= 0 ? '#10b981' : '#ef4444'
                  }}>
                    ${simulationResult.simulation.projected_gross_margin.toLocaleString()}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    marginTop: '4px',
                    color: simulationResult.simulation.margin_variance_usd >= 0 ? '#10b981' : '#ef4444'
                  }}>
                    {simulationResult.simulation.margin_variance_percent > 0 ? '+' : ''}
                    {simulationResult.simulation.margin_variance_percent}% (${simulationResult.simulation.margin_variance_usd.toLocaleString()})
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'var(--bg-card, #fff)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color, #e2e8f0)'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>FREE CASHFLOW IMPACT</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: '#0064d2' }}>
                    ${simulationResult.simulation.projected_free_cashflow_impact.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
                    After working capital buffer drag
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DEMAND FORECAST */}
      {activeTab === 'forecast' && forecastData && (
        <div style={{
          backgroundColor: 'var(--bg-card, #fff)',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #e2e8f0)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                Time-Series 30-Day Demand Projections
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                Model: <strong>{forecastData.model_architecture}</strong> • Accuracy: <strong>{forecastData.training_accuracy}%</strong> • MAPE: <strong>{forecastData.mean_absolute_percentage_error_mape}%</strong>
              </p>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0064d2' }}>
              Projected Total: {forecastData.projected_total_volume.toFixed(0)} units
            </div>
          </div>

          {/* Bar Chart Simulation */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '8px',
            height: '220px',
            paddingTop: '20px',
            paddingBottom: '24px',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            overflowX: 'auto'
          }}>
            {forecastData.forecast.slice(0, 24).map((pt, i) => {
              const heightPct = Math.min(100, Math.max(10, (pt.projected_units / 120) * 100));
              const isHighRisk = pt.stockout_risk === 'HIGH';
              return (
                <div
                  key={i}
                  style={{
                    flex: '0 0 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end'
                  }}
                  title={`${pt.day}: ${pt.projected_units} units (Range: ${pt.lower_bound} - ${pt.upper_bound})`}
                >
                  <div style={{
                    width: '100%',
                    height: `${heightPct}%`,
                    backgroundColor: isHighRisk ? '#ef4444' : '#0064d2',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s ease'
                  }} />
                  <span style={{ fontSize: '9px', color: '#64748b', marginTop: '6px', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                    {pt.day}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#0064d2', borderRadius: '2px' }} />
              Normal Projected Consumption
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '2px' }} />
              Stockout Warning Threshold (&gt;110 units)
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PREDICTIVE MAINTENANCE */}
      {activeTab === 'maintenance' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px'
        }}>
          {maintenanceList.map(eq => (
            <div
              key={eq.equipment_id}
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
                  <div style={{ fontWeight: 800, fontSize: '15px' }}>{eq.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                    ID: {eq.equipment_id} • {eq.work_center}
                  </div>
                </div>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: eq.status === 'HEALTHY' ? '#dcfce7' : eq.status === 'ATTENTION_REQUIRED' ? '#fef3c7' : '#fee2e2',
                  color: eq.status === 'HEALTHY' ? '#15803d' : eq.status === 'ATTENTION_REQUIRED' ? '#b45309' : '#b91c1c'
                }}>
                  {eq.status}
                </span>
              </div>

              {/* RUL Gauge */}
              <div style={{
                backgroundColor: 'var(--bg-app, #f8fafc)',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>Remaining Useful Life (RUL)</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0064d2' }}>
                    {eq.remaining_useful_life_hours} hrs
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>30-Day Failure Probability</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: eq.failure_probability_30d > 20 ? '#ef4444' : '#10b981' }}>
                    {eq.failure_probability_30d}%
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                Next Recommended Service: <strong>{eq.next_recommended_service}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
