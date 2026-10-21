import React, { useState, useEffect } from 'react';
import {
  X, TrendingUp, DollarSign, Building2, UserX, History,
  ShieldCheck, AlertTriangle, CheckCircle2, ArrowRight,
  Calendar, Award, Briefcase, UserCheck, Layers, GitFork
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function EmployeeLifecycleModal({
  isOpen,
  onClose,
  employee,
  onSuccess,
  branches = []
}) {
  if (!isOpen || !employee) return null;

  const [activeTab, setActiveTab] = useState('PROMOTION'); // 'PROMOTION', 'INCREMENT', 'TRANSFER', 'TERMINATION', 'HISTORY'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [careerHistory, setCareerHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form states
  const currentBasic = parseFloat(employee.basic_salary) || 50000;
  const currentNet = parseFloat(employee.net_salary) || Math.round(currentBasic * 1.15);

  // Promotion state
  const [promoDesignation, setPromoDesignation] = useState(employee.designation || '');
  const [promoRole, setPromoRole] = useState(employee.hierarchy_role || 'MEMBER');
  const [promoReportsTo, setPromoReportsTo] = useState(employee.reports_to_name || employee.reporting_manager || '');
  const [promoReason, setPromoReason] = useState('Merit-based promotion for stellar performance and leadership.');
  const [promoDate, setPromoDate] = useState(new Date().toISOString().split('T')[0]);

  // Increment state
  const [hikePct, setHikePct] = useState(15);
  const [newBasic, setNewBasic] = useState(Math.round(currentBasic * 1.15));
  const [incrementReason, setIncrementReason] = useState('Annual compensation review & performance appraisal');
  const [incrementDate, setIncrementDate] = useState(new Date().toISOString().split('T')[0]);

  // Transfer state
  const [destBranchId, setDestBranchId] = useState(employee.branch_id || (branches[0]?.id || 1));
  const [transferReason, setTransferReason] = useState('Relocation to support regional operational expansion');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);

  // Termination state
  const [termReason, setTermReason] = useState('Voluntary Resignation');
  const [termDate, setTermDate] = useState(new Date().toISOString().split('T')[0]);
  const [termNotes, setTermNotes] = useState('Handover completed satisfactorily. Relieving clearance processed.');
  const [termRevokeAccess, setTermRevokeAccess] = useState(true);

  // Computed increment values
  const computedHra = Math.round(newBasic * 0.40);
  const computedSpecial = Math.round(newBasic * 0.20);
  const computedPf = Math.round(newBasic * 0.12);
  const computedGross = newBasic + computedHra + computedSpecial;
  const computedNet = Math.round(computedGross - computedPf - 200 - 1500);
  const netDelta = computedNet - currentNet;

  const handleHikePctChange = (pct) => {
    const val = parseFloat(pct) || 0;
    setHikePct(val);
    const updated = Math.round(currentBasic * (1 + val / 100));
    setNewBasic(updated);
  };

  const handleNewBasicChange = (amount) => {
    const val = parseFloat(amount) || 0;
    setNewBasic(val);
    if (currentBasic > 0) {
      const pct = Math.round(((val - currentBasic) / currentBasic) * 1000) / 10;
      setHikePct(pct);
    }
  };

  const loadCareerHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await apiRequest(`/api/hr/employees/${employee.id}/career-history`);
      setCareerHistory(data || []);
    } catch (err) {
      console.warn("Could not load career history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      loadCareerHistory();
    }
  }, [activeTab, employee?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    let payload = {
      action_type: activeTab,
      effective_date: new Date().toISOString().split('T')[0]
    };

    if (activeTab === 'PROMOTION') {
      if (!promoDesignation.trim()) {
        setErrorMsg('Please enter the new designation.');
        setLoading(false);
        return;
      }
      payload = {
        ...payload,
        action_type: 'PROMOTION',
        new_designation: promoDesignation.trim(),
        new_hierarchy_role: promoRole,
        new_reports_to: promoReportsTo.trim() || undefined,
        reason: promoReason.trim() || 'Role promotion',
        effective_date: promoDate
      };
    } else if (activeTab === 'INCREMENT') {
      payload = {
        ...payload,
        action_type: 'INCREMENT',
        hike_percentage: hikePct,
        new_basic_salary: newBasic,
        new_hra: computedHra,
        new_net_salary: computedNet,
        reason: incrementReason.trim() || 'Salary Increment',
        effective_date: incrementDate
      };
    } else if (activeTab === 'TRANSFER') {
      payload = {
        ...payload,
        action_type: 'TRANSFER',
        new_branch_id: Number(destBranchId),
        reason: transferReason.trim() || 'Branch Transfer',
        effective_date: transferDate
      };
    } else if (activeTab === 'TERMINATION') {
      payload = {
        ...payload,
        action_type: 'TERMINATION',
        termination_reason: termReason,
        notes: termNotes.trim(),
        effective_date: termDate,
        revoke_system_access: termRevokeAccess
      };
    }

    try {
      const res = await apiRequest(`/api/hr/employees/${employee.id}/lifecycle`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      setSuccessMsg(res.message || 'Employee lifecycle record updated successfully.');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update employee lifecycle status.');
    } finally {
      setLoading(false);
    }
  };

  const currentBranchObj = branches.find(b => b.id === employee.branch_id);

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="modal-content animate-fade-in"
        style={{
          maxWidth: '780px',
          width: '95vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          padding: '0',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#38bdf8',
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '18px'
            }}>
              {employee.first_name?.[0]}{employee.last_name?.[0]}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                  {employee.full_name}
                </h3>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '4px',
                  backgroundColor: employee.is_active !== false ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: employee.is_active !== false ? '#4ade80' : '#f87171',
                  border: `1px solid ${employee.is_active !== false ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                }}>
                  {employee.is_active !== false ? 'ACTIVE' : 'TERMINATED'}
                </span>
              </div>
              <div style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>Code: <strong style={{ color: '#e2e8f0' }}>{employee.employee_code}</strong></span>
                <span>•</span>
                <span>Designation: <strong style={{ color: '#e2e8f0' }}>{employee.designation}</strong></span>
                <span>•</span>
                <span>Branch: <strong style={{ color: '#38bdf8' }}>{employee.branch_name || currentBranchObj?.name || 'Hyderabad Global HQ'}</strong></span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ color: '#94a3b8', padding: '6px', borderRadius: '50%' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--bg-subtle)',
          borderBottom: '1px solid var(--border-color)',
          padding: '8px 16px 0 16px',
          gap: '8px',
          overflowX: 'auto'
        }}>
          <button
            onClick={() => setActiveTab('PROMOTION')}
            className="btn btn-ghost"
            style={{
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              borderRadius: '8px 8px 0 0',
              borderBottom: activeTab === 'PROMOTION' ? '3px solid #3b82f6' : '3px solid transparent',
              color: activeTab === 'PROMOTION' ? '#1d4ed8' : 'var(--text-secondary)',
              backgroundColor: activeTab === 'PROMOTION' ? 'var(--bg-surface)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Award size={15} />
            <span>Promotion & Role</span>
          </button>

          <button
            onClick={() => setActiveTab('INCREMENT')}
            className="btn btn-ghost"
            style={{
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              borderRadius: '8px 8px 0 0',
              borderBottom: activeTab === 'INCREMENT' ? '3px solid #10b981' : '3px solid transparent',
              color: activeTab === 'INCREMENT' ? '#047857' : 'var(--text-secondary)',
              backgroundColor: activeTab === 'INCREMENT' ? 'var(--bg-surface)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <DollarSign size={15} />
            <span>Salary Increment</span>
          </button>

          <button
            onClick={() => setActiveTab('TRANSFER')}
            className="btn btn-ghost"
            style={{
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              borderRadius: '8px 8px 0 0',
              borderBottom: activeTab === 'TRANSFER' ? '3px solid #8b5cf6' : '3px solid transparent',
              color: activeTab === 'TRANSFER' ? '#6d28d9' : 'var(--text-secondary)',
              backgroundColor: activeTab === 'TRANSFER' ? 'var(--bg-surface)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Building2 size={15} />
            <span>Branch Transfer</span>
          </button>

          <button
            onClick={() => setActiveTab('TERMINATION')}
            className="btn btn-ghost"
            style={{
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              borderRadius: '8px 8px 0 0',
              borderBottom: activeTab === 'TERMINATION' ? '3px solid #ef4444' : '3px solid transparent',
              color: activeTab === 'TERMINATION' ? '#b91c1c' : 'var(--text-secondary)',
              backgroundColor: activeTab === 'TERMINATION' ? 'var(--bg-surface)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <UserX size={15} />
            <span>Termination & Exit</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className="btn btn-ghost"
            style={{
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              borderRadius: '8px 8px 0 0',
              borderBottom: activeTab === 'HISTORY' ? '3px solid #0284c7' : '3px solid transparent',
              color: activeTab === 'HISTORY' ? '#0369a1' : 'var(--text-secondary)',
              backgroundColor: activeTab === 'HISTORY' ? 'var(--bg-surface)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <History size={15} />
            <span>Career History Log</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {errorMsg && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#dcfce7',
              color: '#166534',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: PROMOTION */}
          {activeTab === 'PROMOTION' && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '10px',
                padding: '14px 18px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1d4ed8', marginBottom: '4px' }}>
                  Promote Employee to New Designation & Hierarchy Tier
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Promotions update job level, organizational hierarchy authority, and record an indelible career progression record in the audit repository.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Current Designation</label>
                  <input
                    type="text"
                    disabled
                    value={employee.designation || 'Staff'}
                    className="form-input"
                    style={{ backgroundColor: 'var(--bg-subtle)', opacity: 0.8 }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>New Promoted Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lead Architect, Director of Sales"
                    value={promoDesignation}
                    onChange={(e) => setPromoDesignation(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Hierarchy Authority Tier *</label>
                  <select
                    value={promoRole}
                    onChange={(e) => setPromoRole(e.target.value)}
                    className="form-input"
                  >
                    <option value="MEMBER">💼 Member (Individual Contributor)</option>
                    <option value="TEAM_LEAD">⚡ Team Lead (Supervises Squad)</option>
                    <option value="MANAGER">👔 Manager (Department Authority)</option>
                    <option value="EXECUTIVE">👑 Executive (C-Suite / Director)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>New Reporting Manager (Boss)</label>
                  <input
                    type="text"
                    placeholder="e.g. Elena Rostova (VP Eng)"
                    value={promoReportsTo}
                    onChange={(e) => setPromoReportsTo(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Effective Date</label>
                  <input
                    type="date"
                    required
                    value={promoDate}
                    onChange={(e) => setPromoDate(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Promotion Justification</label>
                  <input
                    type="text"
                    value={promoReason}
                    onChange={(e) => setPromoReason(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={onClose} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px' }}
                >
                  <Award size={16} />
                  <span>{loading ? 'Processing...' : 'Confirm Promotion'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SALARY INCREMENT */}
          {activeTab === 'INCREMENT' && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '10px',
                padding: '14px 18px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#047857', marginBottom: '4px' }}>
                  Salary Increment & Compensation Appraisal
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Enter percentage hike or new basic pay. Statutory allowances and net take-home salary are recalculated automatically.
                </div>
              </div>

              {/* Current vs New Comparison Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{
                  padding: '14px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>CURRENT COMPENSATION</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                    ₹ {currentBasic.toLocaleString('en-IN')} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>/mo Basic</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Net Take-Home: <strong>₹ {currentNet.toLocaleString('en-IN')}</strong> / mo
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Annual CTC: ₹ {(currentBasic * 12 * 1.5).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                </div>

                <div style={{
                  padding: '14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#047857' }}>REVISED COMPENSATION (+{hikePct}%)</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#047857', marginTop: '4px' }}>
                    ₹ {newBasic.toLocaleString('en-IN')} <span style={{ fontSize: '12px', fontWeight: 500, color: '#047857' }}>/mo Basic</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#065f46', marginTop: '4px' }}>
                    Revised Net: <strong>₹ {computedNet.toLocaleString('en-IN')}</strong> / mo
                  </div>
                  <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px', fontWeight: 700 }}>
                    Monthly Gain: +₹ {netDelta.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Hike Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Increment Percentage (%)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="200"
                      value={hikePct}
                      onChange={(e) => handleHikePctChange(e.target.value)}
                      className="form-input"
                    />
                    <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>%</span>
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Revised Basic Salary (INR ₹) *</label>
                  <input
                    type="number"
                    step="500"
                    min="1000"
                    value={newBasic}
                    onChange={(e) => handleNewBasicChange(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Effective Date</label>
                  <input
                    type="date"
                    required
                    value={incrementDate}
                    onChange={(e) => setIncrementDate(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Appraisal Reason / Note</label>
                  <input
                    type="text"
                    value={incrementReason}
                    onChange={(e) => setIncrementReason(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={onClose} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{
                    backgroundColor: '#10b981',
                    borderColor: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px'
                  }}
                >
                  <DollarSign size={16} />
                  <span>{loading ? 'Processing...' : 'Apply Salary Increment'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: BRANCH TRANSFER */}
          {activeTab === 'TRANSFER' && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{
                backgroundColor: 'rgba(139, 92, 246, 0.05)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '10px',
                padding: '14px 18px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#6d28d9', marginBottom: '4px' }}>
                  Inter-Branch Transfer & Regional Assignment
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Each operational MNC branch maintains its segregated staff roster. Transferring this employee reassigns their operational context and document vault to the destination hub.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Current Branch</label>
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    fontWeight: 700
                  }}>
                    🏢 {employee.branch_name || currentBranchObj?.name || 'Hyderabad Global HQ'}
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Destination Operational Branch *</label>
                  <select
                    value={destBranchId}
                    onChange={(e) => setDestBranchId(e.target.value)}
                    className="form-input"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.flag || '🏢'} {b.name} ({b.city}, {b.country})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Transfer Effective Date</label>
                  <input
                    type="date"
                    required
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Transfer Business Reason</label>
                  <input
                    type="text"
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={onClose} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{
                    backgroundColor: '#8b5cf6',
                    borderColor: '#8b5cf6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px'
                  }}
                >
                  <Building2 size={16} />
                  <span>{loading ? 'Processing...' : 'Execute Branch Transfer'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: COMPANY TERMINATION */}
          {activeTab === 'TERMINATION' && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                padding: '14px 18px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <AlertTriangle size={16} />
                  <span>Company Termination & Employee Offboarding Workflow</span>
                </div>
                <div style={{ fontSize: '12px', color: '#7f1d1d' }}>
                  Executing termination marks the employee profile as inactive, disables system login credentials, and immediately revokes their MongoDB Community Edition authorization tokens across all branches.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Termination Reason *</label>
                  <select
                    value={termReason}
                    onChange={(e) => setTermReason(e.target.value)}
                    className="form-input"
                  >
                    <option value="Voluntary Resignation">Voluntary Resignation</option>
                    <option value="Performance-based Offboarding">Performance-based Offboarding</option>
                    <option value="Contract Completion / Expiry">Contract Completion / Expiry</option>
                    <option value="Corporate Restructuring">Corporate Restructuring</option>
                    <option value="Disciplinary Termination">Disciplinary Termination</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Last Working Day / Effective Date *</label>
                  <input
                    type="date"
                    required
                    value={termDate}
                    onChange={(e) => setTermDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>Exit Notes & Handover Clearance</label>
                <textarea
                  rows={3}
                  value={termNotes}
                  onChange={(e) => setTermNotes(e.target.value)}
                  className="form-input"
                  placeholder="Asset handover status, NDA confirmation, final settlement terms..."
                />
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)'
              }}>
                <input
                  type="checkbox"
                  id="revokeAccessCheck"
                  checked={termRevokeAccess}
                  onChange={(e) => setTermRevokeAccess(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <label htmlFor="revokeAccessCheck" style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                  Immediately revoke system login & MongoDB Community multi-branch authorizations
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={onClose} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{
                    backgroundColor: '#ef4444',
                    borderColor: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px'
                  }}
                >
                  <UserX size={16} />
                  <span>{loading ? 'Processing...' : 'Confirm Termination'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: CAREER HISTORY LOG */}
          {activeTab === 'HISTORY' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Chronological Career & Audit Milestones
                </div>
                <button onClick={loadCareerHistory} className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 8px' }}>
                  Refresh Timeline
                </button>
              </div>

              {historyLoading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading timeline records...
                </div>
              ) : careerHistory.length === 0 ? (
                <div style={{
                  padding: '32px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: '10px',
                  border: '1px dashed var(--border-color)',
                  color: 'var(--text-muted)'
                }}>
                  No career lifecycle events recorded yet for this employee.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {careerHistory.map((evt, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-surface)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                      }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: evt.event_type === 'PROMOTION' ? 'rgba(59, 130, 246, 0.12)' :
                                         evt.event_type === 'INCREMENT' ? 'rgba(16, 185, 129, 0.12)' :
                                         evt.event_type === 'TRANSFER' ? 'rgba(139, 92, 246, 0.12)' :
                                         evt.event_type === 'TERMINATION' ? 'rgba(239, 68, 68, 0.12)' :
                                         'rgba(100, 116, 139, 0.1)',
                        color: evt.event_type === 'PROMOTION' ? '#1d4ed8' :
                               evt.event_type === 'INCREMENT' ? '#047857' :
                               evt.event_type === 'TRANSFER' ? '#6d28d9' :
                               evt.event_type === 'TERMINATION' ? '#b91c1c' :
                               '#475569'
                      }}>
                        {evt.event_type === 'PROMOTION' ? <Award size={16} /> :
                         evt.event_type === 'INCREMENT' ? <DollarSign size={16} /> :
                         evt.event_type === 'TRANSFER' ? <Building2 size={16} /> :
                         evt.event_type === 'TERMINATION' ? <UserX size={16} /> :
                         <History size={16} />}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                            {evt.event_type === 'PROMOTION' ? `Promoted to ${evt.new_value?.designation || 'New Role'}` :
                             evt.event_type === 'INCREMENT' ? `Salary Increment (+${evt.new_value?.hike_percentage || 0}%)` :
                             evt.event_type === 'TRANSFER' ? `Transferred to Branch #${evt.new_value?.branch_id}` :
                             evt.event_type === 'TERMINATION' ? `Company Termination: ${evt.new_value?.termination_reason}` :
                             evt.event_type}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {evt.created_at ? new Date(evt.created_at).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Reason: {evt.reason || 'Lifecycle update'}
                        </div>

                        {evt.event_type === 'INCREMENT' && evt.new_value && (
                          <div style={{ fontSize: '11.5px', color: '#047857', marginTop: '4px', fontWeight: 600 }}>
                            New Basic: ₹ {parseFloat(evt.new_value.basic_salary || 0).toLocaleString('en-IN')} • New Net: ₹ {parseFloat(evt.new_value.net_salary || 0).toLocaleString('en-IN')}
                          </div>
                        )}

                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                          Executed by: <strong>{evt.created_by_user}</strong> • Effective: {evt.effective_date}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
