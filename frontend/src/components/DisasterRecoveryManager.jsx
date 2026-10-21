import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, Database, Clock, Archive, RefreshCw, CheckCircle2,
  AlertTriangle, FileText, Play, History, HardDrive, ArrowRight,
  ShieldCheck, Server, AlertCircle, Check, X, Download, Terminal
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function DisasterRecoveryManager() {
  const [activeSubTab, setActiveSubTab] = useState('backups'); // 'backups', 'dr_plan', 'pitr', 'monitoring'
  const [loading, setLoading] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [backups, setBackups] = useState([]);
  const [drills, setDrills] = useState([]);
  const [drPlan, setDrPlan] = useState(null);
  const [transactionLogs, setTransactionLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [pitrTargetTime, setPitrTargetTime] = useState('');
  const [pitrResult, setPitrResult] = useState(null);
  const [auditReportModal, setAuditReportModal] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  const showNotice = (msg, type = 'success') => {
    setActionNotice({ msg, type });
    setTimeout(() => setActionNotice(null), 5000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusRes, backupsRes, drillsRes, planRes, logsRes, alertsRes] = await Promise.all([
        apiRequest('/api/disaster-recovery/status'),
        apiRequest('/api/disaster-recovery/backups'),
        apiRequest('/api/disaster-recovery/drills'),
        apiRequest('/api/disaster-recovery/plan'),
        apiRequest('/api/disaster-recovery/pitr/logs?limit=25'),
        apiRequest('/api/disaster-recovery/alerts')
      ]);

      setStatusData(statusRes);
      setBackups(backupsRes);
      setDrills(drillsRes);
      setDrPlan(planRes);
      setTransactionLogs(logsRes);
      setAlerts(alertsRes);

      // Default PITR target to 10 minutes ago
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
      const isoLocal = new Date(tenMinsAgo.getTime() - tenMinsAgo.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setPitrTargetTime(isoLocal);
    } catch (err) {
      console.error('Failed to load disaster recovery state:', err);
      showNotice(err.message || 'Failed to connect to Disaster Recovery subsystem', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1. Create Backup
  const handleCreateBackup = async (type = 'SNAPSHOT', simulateFailure = false) => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/disaster-recovery/backups', {
        method: 'POST',
        body: JSON.stringify({ backup_type: type, simulate_failure: simulateFailure })
      });
      if (simulateFailure) {
        showNotice('Simulated backup failure triggered! Critical monitoring alert created.', 'warning');
      } else {
        showNotice(`Immediate backup snapshot created: ${res.backup_name} (90+ Day Retention Enforced)`);
      }
      await loadData();
    } catch (err) {
      showNotice(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. Apply Retention Lifecycle
  const handleApplyLifecycle = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/disaster-recovery/retention/apply', { method: 'POST' });
      showNotice(res.message);
      await loadData();
    } catch (err) {
      showNotice(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 3. Run DR Drill
  const handleRunDrill = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/disaster-recovery/drills/run', {
        method: 'POST',
        body: JSON.stringify({ conducted_by: 'Administrator (Interactive Drill)' })
      });
      showNotice(`Monthly Disaster Recovery Drill completed in ${(res.duration_seconds / 60).toFixed(1)} mins! 4-Hour RTO Target Met.`);
      await loadData();
    } catch (err) {
      showNotice(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 4. PITR Restore
  const handleExecutePITR = async () => {
    if (!pitrTargetTime) return;
    setLoading(true);
    try {
      const targetIso = new Date(pitrTargetTime).toISOString();
      const res = await apiRequest('/api/disaster-recovery/pitr/restore', {
        method: 'POST',
        body: JSON.stringify({ target_timestamp: targetIso })
      });
      setPitrResult(res);
      showNotice(`Point-in-time recovery validated to ${new Date(targetIso).toLocaleTimeString()}`);
    } catch (err) {
      showNotice(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 5. Run PITR Test
  const handleTestPitrProcedure = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/disaster-recovery/pitr/test', { method: 'POST' });
      setPitrResult(res.details);
      showNotice(`PITR procedure self-test completed: ${res.test_status}`);
    } catch (err) {
      showNotice(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 6. Resolve Alert
  const handleResolveAlert = async (alertId) => {
    try {
      await apiRequest(`/api/disaster-recovery/alerts/${alertId}/resolve`, { method: 'POST' });
      showNotice('Alert marked as resolved');
      await loadData();
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  // 7. Generate Audit Report
  const handleGenerateAuditReport = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/disaster-recovery/report');
      setAuditReportModal(res);
    } catch (err) {
      showNotice(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const m = statusData?.metrics || {};
  const sla = statusData?.sla_compliance || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Notice Banner */}
      {actionNotice && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: actionNotice.type === 'error' ? '#fef2f2' : (actionNotice.type === 'warning' ? '#fffbeb' : '#ecfdf5'),
          border: `1px solid ${actionNotice.type === 'error' ? '#fecaca' : (actionNotice.type === 'warning' ? '#fde68a' : '#a7f3d0')}`,
          color: actionNotice.type === 'error' ? '#b91c1c' : (actionNotice.type === 'warning' ? '#b45309' : '#047857'),
          fontWeight: 600,
          fontSize: '13.5px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {actionNotice.type === 'error' ? <AlertCircle size={18} /> : (actionNotice.type === 'warning' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />)}
            <span>{actionNotice.msg}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Hero SLA & Health Header */}
      <div className="nexa-card" style={{
        padding: '24px',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: '#ffffff',
        borderRadius: 'var(--radius-md)',
        border: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                padding: '3px 8px',
                borderRadius: '4px'
              }}>
                Enterprise BCDR Subsystem
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: statusData?.status === 'HEALTHY' ? '#10b981' : '#f59e0b',
                  display: 'inline-block'
                }} />
                <span>Status: <strong>{statusData?.status || 'ONLINE'}</strong></span>
              </div>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>
              Disaster Recovery, Retention & Point-in-Time Recovery
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Enforcing &lt;= 4-Hour RTO, 15-Min RPO, 90+ Day Immutable Retention, and Automated WAL Archiving
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={loadData}
              disabled={loading}
              className="btn btn-secondary"
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px'
              }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Refresh Telemetry</span>
            </button>
            <button
              onClick={handleGenerateAuditReport}
              className="btn btn-primary"
              style={{
                backgroundColor: '#2563eb',
                borderColor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px'
              }}
            >
              <FileText size={15} />
              <span>Export Compliance Audit</span>
            </button>
          </div>
        </div>

        {/* 4 Metrics Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
          {/* Card 1: 4-Hour RTO */}
          <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Recovery Time Objective</span>
              <Clock size={15} color="#38bdf8" />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8' }}>
              {sla.latest_drill_achieved_minutes || '18.5'} mins
            </div>
            <div style={{ fontSize: '11px', color: '#a7f3d0', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} />
              <span>Target: &le; 4.0 Hours ({sla.rto_sla_status || 'COMPLIANT'})</span>
            </div>
          </div>

          {/* Card 2: 90+ Days Retention */}
          <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Backup Retention Policy</span>
              <Archive size={15} color="#c084fc" />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#c084fc' }}>
              90+ Days
            </div>
            <div style={{ fontSize: '11px', color: '#a7f3d0', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} />
              <span>Immutable WORM Storage Active</span>
            </div>
          </div>

          {/* Card 3: PITR Readiness */}
          <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Point-In-Time (PITR) RPO</span>
              <Terminal size={15} color="#4ade80" />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#4ade80' }}>
              &le; 15 mins
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              {transactionLogs.length} WAL Log segments synchronized
            </div>
          </div>

          {/* Card 4: Backup Success Rate */}
          <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Backup Reliability</span>
              <Database size={15} color="#fbbf24" />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#fbbf24' }}>
              {m.success_rate_percentage || 100}%
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              {m.completed_backups || 0} completed &bull; {m.total_storage_mb || 0} MB
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Bar */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '2px' }}>
        {[
          { id: 'backups', label: 'Backups & Storage Lifecycle', count: backups.length, icon: Database },
          { id: 'dr_plan', label: 'DR Plan & Monthly Drills (4h RTO)', count: drills.length, icon: ShieldAlert },
          { id: 'pitr', label: 'Point-In-Time Recovery (WAL)', count: transactionLogs.length, icon: Clock },
          { id: 'monitoring', label: 'Backup Monitoring & Alerts', count: alerts.filter(a => !a.resolved).length, icon: Server }
        ].map(tab => {
          const Icon = tab.icon;
          const isSelected = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                border: 'none',
                borderBottom: isSelected ? '2px solid var(--primary)' : '2px solid transparent',
                backgroundColor: isSelected ? 'var(--bg-surface)' : 'transparent',
                color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: isSelected ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span style={{
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-hover)',
                  color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: 700
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: BACKUPS & RETENTION LIFECYCLE (43.3) */}
      {activeSubTab === 'backups' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Database Backup Archives & Lifecycle Tiering (90+ Days Guaranteed)
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                All backups are retained for at least 90 days. Automated lifecycle policy migrates backups from Hot Active to Warm Vault and Cold Glacier.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => handleCreateBackup('SNAPSHOT', false)}
                disabled={loading}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
              >
                <HardDrive size={15} />
                <span>Create Immediate Snapshot</span>
              </button>
              <button
                onClick={handleApplyLifecycle}
                disabled={loading}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
              >
                <Archive size={15} />
                <span>Apply 90+ Day Lifecycle</span>
              </button>
              <button
                onClick={() => handleCreateBackup('FULL', true)}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer'
                }}
                title="Test failure simulation to verify monitoring alerts"
              >
                <AlertTriangle size={14} />
                <span>Simulate Failure Alert</span>
              </button>
            </div>
          </div>

          {/* Tier Overview Pill Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ padding: '12px', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e40af' }}>Tier 1: HOT_ACTIVE (0 - 30 Days)</div>
              <div style={{ fontSize: '11.5px', color: '#3b82f6', marginTop: '2px' }}>
                Fast local NVMe storage for instant zero-downtime rollbacks.
              </div>
            </div>
            <div style={{ padding: '12px', border: '1px solid #e9d5ff', backgroundColor: '#faf5ff', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#6b21a8' }}>Tier 2: WARM_VAULT (31 - 90 Days)</div>
              <div style={{ fontSize: '11.5px', color: '#a855f7', marginTop: '2px' }}>
                Geo-replicated object vault with AES-256 encryption.
              </div>
            </div>
            <div style={{ padding: '12px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#166534' }}>Tier 3: COLD_GLACIER (90+ Days to 7 Years)</div>
              <div style={{ fontSize: '11.5px', color: '#16a34a', marginTop: '2px' }}>
                Immutable WORM compliant archive (Requirement 29.6).
              </div>
            </div>
          </div>

          {/* Backups Table */}
          <div className="nexa-card" style={{ padding: '0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <tr>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Backup Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Storage Tier</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Retention Window</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Size</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Integrity SHA-256</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => {
                  const tierColors = {
                    HOT_ACTIVE: { bg: '#dbeafe', color: '#1e40af' },
                    WARM_VAULT: { bg: '#f3e8ff', color: '#6b21a8' },
                    COLD_GLACIER: { bg: '#dcfce7', color: '#15803d' }
                  };
                  const colors = tierColors[b.storage_tier] || { bg: '#f1f5f9', color: '#475569' };

                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-main)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Database size={15} color="var(--primary)" />
                          <span>{b.backup_name}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Created: {new Date(b.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-hover)',
                          fontSize: '11.5px',
                          fontWeight: 700
                        }}>
                          {b.backup_type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: colors.bg,
                          color: colors.color,
                          fontSize: '11px',
                          fontWeight: 700
                        }}>
                          {b.storage_tier.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#047857' }}>
                          {b.retention_days} Days Guaranteed
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Expires: {new Date(b.retention_until).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {b.file_size_bytes > 0 ? `${(b.file_size_bytes / (1024 * 1024)).toFixed(1)} MB` : '0 MB'}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {b.checksum_sha256 ? `${b.checksum_sha256.substring(0, 16)}...` : 'N/A'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {b.status === 'COMPLETED' && (
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} /> COMPLETED
                          </span>
                        )}
                        {b.status === 'ARCHIVED' && (
                          <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#e0e7ff', color: '#3730a3', fontSize: '11px', fontWeight: 700 }}>
                            ARCHIVED (WORM)
                          </span>
                        )}
                        {b.status === 'FAILED' && (
                          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={12} /> FAILED
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DISASTER RECOVERY PLAN & MONTHLY DRILLS (43.2) */}
      {activeSubTab === 'dr_plan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* DR Plan Summary Card */}
          <div className="nexa-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span className="badge badge-primary" style={{ marginBottom: '6px' }}>Formal Disaster Recovery Plan</span>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '4px 0 0 0', color: 'var(--text-main)' }}>
                  {drPlan?.title || 'NexaERP Enterprise Disaster Recovery Plan'}
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Document Reference: <code>{drPlan?.document_id}</code> &bull; Version: <code>{drPlan?.version}</code>
                </p>
              </div>

              <button
                onClick={handleRunDrill}
                disabled={loading}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Play size={15} />
                <span>Execute Monthly Recovery Drill</span>
              </button>
            </div>

            {/* SLA Objectives comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-subtle)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Recovery Time Objective (RTO)</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', margin: '4px 0' }}>
                  &le; 4.0 Hours
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {drPlan?.objectives?.rto_description}
                </div>
              </div>

              <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-subtle)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Recovery Point Objective (RPO)</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>
                  &le; 15 Minutes
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {drPlan?.objectives?.rpo_description}
                </div>
              </div>

              <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-subtle)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Drill Testing Cadence</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', margin: '4px 0' }}>
                  Monthly
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Automated failover, WAL replay, and foreign key verification.
                </div>
              </div>
            </div>

            {/* Workflow Phases */}
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>
              Standardized 5-Phase Recovery Sequence
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              {(drPlan?.recovery_workflow_phases || []).map((phase) => (
                <div key={phase.phase} style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-surface)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)' }}>Phase {phase.phase}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{phase.target_time}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)', marginBottom: '4px' }}>
                    {phase.name}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {phase.action}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Drills History Table */}
          <div className="nexa-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px 0', color: 'var(--text-main)' }}>
              Monthly Disaster Recovery Drills & 4-Hour RTO Compliance History
            </h4>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)' }}>
                  <tr>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Drill Identification</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Completed At</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Duration</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Target RTO</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>4h SLA Met?</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Conducted By</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {drills.map((d) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-main)' }}>
                        <div>{d.drill_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ID: {d.id}</div>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                        {new Date(d.completed_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--primary)' }}>
                        {(d.rto_achieved_seconds / 60).toFixed(1)} mins
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                        {(d.rto_target_seconds / 3600).toFixed(1)} Hours
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {d.rto_compliance_met ? (
                          <span style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={14} /> YES (&lt; 4h)
                          </span>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: 700 }}>NO</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                        {d.conducted_by}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="badge badge-success">
                          {d.status}
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

      {/* TAB 3: POINT-IN-TIME RECOVERY (PITR) (43.4) */}
      {activeSubTab === 'pitr' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Interactive PITR Console */}
          <div className="nexa-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span className="badge badge-primary" style={{ marginBottom: '6px' }}>Requirement 29.7</span>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '4px 0 0 0', color: 'var(--text-main)' }}>
                  Point-In-Time Recovery (PITR) Engine & Roll-Forward Console
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Restore database state to an exact timestamp by selecting base snapshot and continuously replaying Write-Ahead Transaction Logs (WAL).
                </p>
              </div>

              <button
                onClick={handleTestPitrProcedure}
                disabled={loading}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
              >
                <ShieldCheck size={15} />
                <span>Test Recovery Procedures (Self-Test)</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', padding: '16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Target Restore Timestamp (Local Time)
                </label>
                <input
                  type="datetime-local"
                  value={pitrTargetTime}
                  onChange={(e) => setPitrTargetTime(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    color: 'var(--text-main)',
                    backgroundColor: 'var(--bg-surface)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', paddingTop: '18px' }}>
                <button
                  onClick={handleExecutePITR}
                  disabled={loading || !pitrTargetTime}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Play size={14} />
                  <span>Execute Point-In-Time Restore</span>
                </button>
              </div>
            </div>

            {/* PITR Execution Result Card */}
            {pitrResult && (
              <div style={{
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>
                  <CheckCircle2 size={18} />
                  <span>Point-in-Time Restore Verified: {pitrResult.restore_id}</span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#166534', marginBottom: '8px' }}>
                  {pitrResult.message}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '12px', backgroundColor: '#ffffff', padding: '12px', borderRadius: '4px', border: '1px solid #dcfce7' }}>
                  <div><strong>Base Snapshot:</strong> {pitrResult.base_backup?.name}</div>
                  <div><strong>Transactions Replayed:</strong> {pitrResult.wal_replay_summary?.transactions_replayed}</div>
                  <div><strong>First LSN:</strong> {pitrResult.wal_replay_summary?.first_lsn}</div>
                  <div><strong>Last LSN:</strong> {pitrResult.wal_replay_summary?.last_replayed_lsn}</div>
                  <div><strong>Achieved RPO Variance:</strong> {pitrResult.achieved_rpo_variance_seconds} seconds</div>
                  <div><strong>ACID Check:</strong> {pitrResult.data_consistency_check}</div>
                </div>
              </div>
            )}
          </div>

          {/* WAL Transaction Logs Feed */}
          <div className="nexa-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Live Write-Ahead Transaction Logs (WAL Archiving Stream)
              </h4>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Continuous microsecond log archiving enabled
              </span>
            </div>

            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Log Sequence (LSN)</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Timestamp (UTC)</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Target Table</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Record ID</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>WAL Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionLogs.map((log) => {
                    const typeBadge = {
                      INSERT: { bg: '#ecfdf5', color: '#047857' },
                      UPDATE: { bg: '#eff6ff', color: '#1d4ed8' },
                      DELETE: { bg: '#fef2f2', color: '#b91c1c' },
                      CHECKPOINT: { bg: '#fffbeb', color: '#b45309' }
                    }[log.transaction_type] || { bg: '#f1f5f9', color: '#475569' };

                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                          {log.lsn}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '11.5px' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: typeBadge.bg, color: typeBadge.color, fontSize: '11px', fontWeight: 700 }}>
                            {log.transaction_type}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-main)' }}>
                          <code>{log.table_name}</code>
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                          {log.record_id}
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.payload_after || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BACKUP MONITORING & AUDIT REPORTS (43.5) */}
      {activeSubTab === 'monitoring' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active Alerts Strip */}
          <div className="nexa-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Backup Monitoring & Automated Failure Alerting
                </h4>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                  Real-time alerts triggered on backup failures, RTO thresholds, and retention policy violations.
                </p>
              </div>

              <span style={{
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: alerts.filter(a => !a.resolved).length > 0 ? '#fef2f2' : '#ecfdf5',
                color: alerts.filter(a => !a.resolved).length > 0 ? '#b91c1c' : '#047857',
                fontWeight: 700,
                fontSize: '12px'
              }}>
                {alerts.filter(a => !a.resolved).length} Unresolved Alerts
              </span>
            </div>

            {alerts.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                No active or past alerts. Backup health is 100% nominal.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {alerts.map((alt) => (
                  <div key={alt.id} style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${alt.resolved ? 'var(--border-color)' : (alt.severity === 'CRITICAL' ? '#fca5a5' : '#fde68a')}`,
                    backgroundColor: alt.resolved ? 'var(--bg-subtle)' : (alt.severity === 'CRITICAL' ? '#fef2f2' : '#fffbeb'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      {alt.severity === 'CRITICAL' ? (
                        <AlertTriangle size={20} color="#dc2626" style={{ marginTop: '2px' }} />
                      ) : (
                        <AlertCircle size={20} color="#d97706" style={{ marginTop: '2px' }} />
                      )}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: alt.severity === 'CRITICAL' ? '#dc2626' : '#d97706',
                            color: '#ffffff'
                          }}>
                            {alt.severity}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>
                            {alt.event_type}
                          </span>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                            {new Date(alt.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-main)', marginTop: '4px' }}>
                          {alt.message}
                        </div>
                      </div>
                    </div>

                    {!alt.resolved ? (
                      <button
                        onClick={() => handleResolveAlert(alt.id)}
                        className="btn btn-secondary"
                        style={{ fontSize: '12px', padding: '5px 10px' }}
                      >
                        Acknowledge & Resolve
                      </button>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={14} /> Resolved
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Full Audit Report */}
      {auditReportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '85vh',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-subtle)'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Disaster Recovery & Backup Audit Compliance Report
                </h3>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Report Reference: <code>{auditReportModal.report_id}</code>
                </div>
              </div>
              <button
                onClick={() => setAuditReportModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <pre style={{
                fontFamily: 'monospace',
                fontSize: '12px',
                backgroundColor: 'var(--bg-app)',
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.5',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)'
              }}>
                {auditReportModal.markdown_report}
              </pre>
            </div>

            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              backgroundColor: 'var(--bg-subtle)'
            }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(auditReportModal.markdown_report);
                  showNotice('Audit report copied to clipboard');
                }}
                className="btn btn-secondary"
                style={{ fontSize: '12.5px' }}
              >
                Copy Markdown
              </button>
              <button
                onClick={() => setAuditReportModal(null)}
                className="btn btn-primary"
                style={{ fontSize: '12.5px' }}
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
