import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, AlertTriangle, ShieldCheck, CheckCircle2,
  FileCheck, RefreshCw, BarChart2, Award, ExternalLink
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function GRCPage({ initialTab = 'heatmap' }) {
  const [activeTab, setActiveTab] = useState(
    ['heatmap', 'register', 'frameworks', 'audits'].includes(initialTab) ? initialTab : 'heatmap'
  );
  const [metrics, setMetrics] = useState(null);
  const [risks, setRisks] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRisk, setSelectedRisk] = useState(null);

  useEffect(() => {
    if (['heatmap', 'register', 'frameworks', 'audits'].includes(initialTab)) {
      setActiveTab(initialTab);
    } else if (initialTab === 'compliance') {
      setActiveTab('frameworks');
    } else if (initialTab === 'grc') {
      setActiveTab('heatmap');
    }
  }, [initialTab]);

  useEffect(() => {
    loadGRCData();
  }, []);

  const loadGRCData = async () => {
    setLoading(true);
    try {
      const [mRes, rRes, fRes, aRes] = await Promise.all([
        apiRequest('/api/grc/metrics'),
        apiRequest('/api/grc/risks'),
        apiRequest('/api/grc/frameworks'),
        apiRequest('/api/grc/audits')
      ]);
      setMetrics(mRes);
      setRisks(rRes);
      setFrameworks(fRes);
      setAudits(aRes);
    } catch (err) {
      console.error('Failed to load GRC data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get cell color for 5x5 heatmap (likelihood * impact)
  const getCellColor = (likelihood, impact) => {
    const score = likelihood * impact;
    if (score >= 15) return { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', level: 'CRITICAL' };
    if (score >= 10) return { bg: '#ffedd5', border: '#fdba74', text: '#9a3412', level: 'HIGH' };
    if (score >= 5) return { bg: '#fef9c3', border: '#fde047', text: '#854d0e', level: 'MEDIUM' };
    return { bg: '#dcfce7', border: '#86efac', text: '#166534', level: 'LOW' };
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
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              Governance, Risk & Compliance (GRC)
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
              Enterprise Risk Heatmap, Mitigation Tracking, SOX / ISO 27001 Regulatory Frameworks
            </p>
          </div>
        </div>

        <button
          onClick={loadGRCData}
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
      </div>

      {/* KPI Stats */}
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
            border: '1px solid var(--border-color, #e2e8f0)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>OVERALL COMPLIANCE RATING</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
              {metrics.overall_compliance_score}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
              Status: <strong>Audit-Ready</strong>
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-card, #fff)',
            borderRadius: '12px',
            padding: '18px',
            border: '1px solid var(--border-color, #e2e8f0)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>ACTIVE IDENTIFIED RISKS</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0064d2', marginTop: '4px' }}>
              {metrics.active_risks_count}
            </div>
            <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', fontWeight: 600 }}>
              {metrics.critical_risks_count} Critical, {metrics.high_risks_count} High
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-card, #fff)',
            borderRadius: '12px',
            padding: '18px',
            border: '1px solid var(--border-color, #e2e8f0)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>FRAMEWORK CERTIFICATIONS</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#6366f1', marginTop: '4px' }}>
              {metrics.certifications_active} Active
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
              ISO 27001, SOC 2, SOX 404, GDPR
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid var(--border-color, #e2e8f0)',
        paddingBottom: '8px'
      }}>
        {[
          { id: 'heatmap', label: '5×5 Risk Heatmap', icon: BarChart2 },
          { id: 'register', label: 'Risk Register & Mitigation', icon: ShieldAlert },
          { id: 'frameworks', label: 'Regulatory Frameworks', icon: Award },
          { id: 'audits', label: 'Internal Audit Log', icon: FileCheck }
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

      {/* TAB 1: 5x5 HEATMAP */}
      {activeTab === 'heatmap' && (
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
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Interactive 5×5 Enterprise Risk Matrix</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
              Vertical Axis: <strong>Impact Severity (1-5)</strong> • Horizontal Axis: <strong>Likelihood Probability (1-5)</strong>
            </p>
          </div>

          {/* 5x5 Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(5, 1fr)', gap: '8px' }}>
            <div />
            {[1, 2, 3, 4, 5].map(l => (
              <div key={l} style={{ textAlign: 'center', fontWeight: 700, fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                Likelihood {l}
              </div>
            ))}

            {[5, 4, 3, 2, 1].map(impact => (
              <React.Fragment key={impact}>
                <div style={{ display: 'flex', alignItems: 'center', fontWeight: 700, fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                  Impact {impact}
                </div>
                {[1, 2, 3, 4, 5].map(likelihood => {
                  const style = getCellColor(likelihood, impact);
                  const cellRisks = risks.filter(r => r.likelihood === likelihood && r.impact === impact);
                  return (
                    <div
                      key={`${impact}-${likelihood}`}
                      style={{
                        height: '75px',
                        borderRadius: '8px',
                        backgroundColor: style.bg,
                        border: `1px solid ${style.border}`,
                        padding: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        cursor: cellRisks.length > 0 ? 'pointer' : 'default',
                        transition: 'transform 0.1s ease',
                        boxShadow: cellRisks.length > 0 ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                      }}
                      onClick={() => cellRisks.length > 0 && setSelectedRisk(cellRisks[0])}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, color: style.text }}>
                        <span>{likelihood * impact}</span>
                        <span>{style.level}</span>
                      </div>
                      {cellRisks.length > 0 && (
                        <div style={{
                          backgroundColor: style.text,
                          color: '#fff',
                          borderRadius: '6px',
                          padding: '2px 6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          textAlign: 'center',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {cellRisks.length} Risk{cellRisks.length > 1 ? 's' : ''} ({cellRisks[0].id})
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* Selected Risk Card */}
          {selectedRisk && (
            <div style={{
              marginTop: '12px',
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-app, #f8fafc)',
              border: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: '15px', color: '#0064d2' }}>
                  {selectedRisk.id}: {selectedRisk.title}
                </span>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: selectedRisk.severity === 'CRITICAL' ? '#fee2e2' : '#ffedd5',
                  color: selectedRisk.severity === 'CRITICAL' ? '#b91c1c' : '#c2410c'
                }}>
                  {selectedRisk.severity} (Score: {selectedRisk.score} → Residual: {selectedRisk.residual_score})
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-main, #334155)' }}>
                <strong>Mitigation Plan:</strong> {selectedRisk.mitigation_plan}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                Owner: <strong>{selectedRisk.owner}</strong> • Category: <strong>{selectedRisk.category}</strong> • Status: <strong>{selectedRisk.status}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RISK REGISTER */}
      {activeTab === 'register' && (
        <div style={{
          backgroundColor: 'var(--bg-card, #fff)',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #e2e8f0)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-app, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Risk ID</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Risk Scenario & Category</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>L × I Score</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Severity</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Owner</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Mitigation Strategy</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {risks.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0064d2' }}>{r.id}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                    {r.title}
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>Category: {r.category}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700 }}>
                    {r.likelihood} × {r.impact} = {r.score}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: r.severity === 'CRITICAL' ? '#fee2e2' : r.severity === 'HIGH' ? '#ffedd5' : '#fef9c3',
                      color: r.severity === 'CRITICAL' ? '#b91c1c' : r.severity === 'HIGH' ? '#c2410c' : '#854d0e'
                    }}>
                      {r.severity}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted, #475569)' }}>{r.owner}</td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-muted, #475569)', maxWidth: '260px' }}>
                    {r.mitigation_plan}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: r.status === 'VERIFIED' || r.status === 'MITIGATED' ? '#dcfce7' : '#dbeafe',
                      color: r.status === 'VERIFIED' || r.status === 'MITIGATED' ? '#15803d' : '#1d4ed8'
                    }}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: FRAMEWORKS */}
      {activeTab === 'frameworks' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px'
        }}>
          {frameworks.map(fw => (
            <div
              key={fw.id}
              style={{
                backgroundColor: 'var(--bg-card, #fff)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid var(--border-color, #e2e8f0)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '16px' }}>{fw.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>{fw.scope}</div>
                </div>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: '#dcfce7',
                  color: '#15803d'
                }}>
                  {fw.status}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${fw.compliance_rate}%`, height: '100%', backgroundColor: '#10b981' }} />
                </div>
                <span style={{ fontWeight: 800, fontSize: '14px', color: '#10b981' }}>{fw.compliance_rate}%</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                <span>Controls: <strong>{fw.controls_passed} / {fw.controls_total} passed</strong></span>
                <span>Next Audit: <strong>{fw.next_audit_date}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'audits' && (
        <div style={{
          backgroundColor: 'var(--bg-card, #fff)',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #e2e8f0)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-app, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Audit ID</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Audit Title & Scope</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Lead Auditor</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Deficiencies / Findings</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Target / Completion</th>
              </tr>
            </thead>
            <tbody>
              {audits.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0064d2' }}>{a.id}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>{a.title}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted, #475569)' }}>{a.auditor}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: a.findings === 0 ? '#10b981' : '#f59e0b' }}>
                    {a.findings} Findings
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: a.status === 'CLOSED' ? '#dcfce7' : '#ffedd5',
                      color: a.status === 'CLOSED' ? '#15803d' : '#c2410c'
                    }}>
                      {a.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted, #64748b)' }}>{a.completed_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
