import React, { useState, useEffect } from 'react';
import {
  Building2, Globe, MapPin, Check, Plus, RefreshCw, X, Shield,
  ArrowRight, DollarSign, Layers, TrendingUp, Users, Box, AlertCircle
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function MNCBranchSwitcherModal({
  isOpen,
  onClose,
  currentBranchId,
  onSelectBranch
}) {
  const [branches, setBranches] = useState([]);
  const [consolidation, setConsolidation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranch, setNewBranch] = useState({
    name: '',
    code: '',
    city: '',
    country: 'IN',
    currency: 'INR',
    address: ''
  });
  const [statusMsg, setStatusMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadBranchData();
    }
  }, [isOpen]);

  const loadBranchData = async () => {
    setLoading(true);
    try {
      const [bList, cSummary] = await Promise.all([
        apiRequest('/api/branches'),
        apiRequest('/api/branches/consolidation-summary')
      ]);
      setBranches(bList || []);
      setConsolidation(cSummary);
    } catch (err) {
      console.warn("Could not load branches:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!newBranch.name.trim() || !newBranch.code.trim()) return;
    setSubmitting(true);
    setStatusMsg('');
    try {
      const res = await apiRequest('/api/branches', {
        method: 'POST',
        body: JSON.stringify(newBranch)
      });
      setStatusMsg(res.message || 'Branch provisioned successfully.');
      setShowAddBranch(false);
      setNewBranch({ name: '', code: '', city: '', country: 'IN', currency: 'INR', address: '' });
      loadBranchData();
    } catch (err) {
      alert(`Error provisioning branch: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div 
        className="modal-content animate-fade-in" 
        style={{ 
          maxWidth: '820px', 
          width: '92vw', 
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={22} color="var(--primary)" />
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                MNC Multi-Branch Controller & Subsidiary Hub
              </h3>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Manage global enterprise subsidiaries, switch operational branch contexts, or view IFRS-compliant consolidated rollups.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Global MNC Consolidation Card */}
        {consolidation && (
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            color: '#ffffff',
            marginBottom: '16px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.5px' }}>
                  PARENT CORPORATION • MULTINATIONAL CONGLOMERATE
                </div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                  {consolidation.organization_name}
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                  Standard: <strong>{consolidation.reporting_standard}</strong> • Elimination: <strong>{consolidation.intercompany_elimination}</strong>
                </div>
              </div>

              {/* Consolidated Mode Switch Button */}
              <button
                onClick={() => {
                  onSelectBranch(null, "MNC Consolidated (All Branches)");
                  onClose();
                }}
                className="btn"
                style={{
                  backgroundColor: !currentBranchId ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
                  color: !currentBranchId ? '#0f172a' : '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  fontWeight: 700,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '6px'
                }}
              >
                <Globe size={15} />
                <span>{!currentBranchId ? '✓ Viewing All Branches Consolidated' : 'Switch to Consolidated MNC View'}</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Active Branches</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#38bdf8' }}>{consolidation.total_active_branches} Global Hubs</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Consolidated Turnover</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#4ade80' }}>
                  ₹ {consolidation.consolidated_financials?.gross_turnover_inr?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Operating Margin</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#facc15' }}>{consolidation.consolidated_financials?.operating_margin_pct}%</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Inter-Branch Transfers</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#c084fc' }}>{consolidation.consolidated_financials?.inter_branch_transfers_mtd} Transit Vouchers</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
            Operating Branches & Regional Subsidiaries ({branches.length})
          </div>
          <button
            onClick={() => setShowAddBranch(prev => !prev)}
            className="btn btn-primary"
            style={{ fontSize: '12px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} />
            <span>+ Provision Regional Branch</span>
          </button>
        </div>

        {/* Provision Branch Subform */}
        {showAddBranch && (
          <form 
            onSubmit={handleCreateBranch} 
            style={{ 
              backgroundColor: 'var(--bg-subtle)', 
              padding: '16px', 
              borderRadius: 'var(--radius-sm)', 
              border: '1px solid var(--border-color)',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
              Provision New Regional Branch / MNC Subsidiary
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Branch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. London UK Hub"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                  style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Branch Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BR-LON-UK"
                  value={newBranch.code}
                  onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value })}
                  style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>City *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. London"
                  value={newBranch.city}
                  onChange={(e) => setNewBranch({ ...newBranch, city: e.target.value })}
                  style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Local Currency</label>
                <select
                  value={newBranch.currency}
                  onChange={(e) => setNewBranch({ ...newBranch, currency: e.target.value })}
                  style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="AED">AED (د.إ) - UAE Dirham</option>
                  <option value="SGD">SGD ($) - Singapore Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button 
                type="button" 
                onClick={() => setShowAddBranch(false)} 
                className="btn btn-secondary" 
                style={{ fontSize: '12px', padding: '5px 10px' }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={submitting} 
                className="btn btn-primary" 
                style={{ fontSize: '12px', padding: '5px 12px' }}
              >
                {submitting ? 'Provisioning...' : 'Provision Branch & Storage'}
              </button>
            </div>
          </form>
        )}

        {/* Branch Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
          gap: '12px',
          overflowY: 'auto',
          maxHeight: '340px',
          paddingRight: '4px'
        }}>
          {branches.map((b) => {
            const isSelected = currentBranchId === b.id;
            return (
              <div
                key={b.id}
                onClick={() => {
                  onSelectBranch(b.id, b.name);
                  onClose();
                }}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                  backgroundColor: isSelected ? 'rgba(0, 100, 210, 0.04)' : 'var(--bg-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
                className="hover-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={16} color={b.is_hq ? 'var(--primary)' : '#64748b'} />
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {b.name}
                    </span>
                  </div>
                  {isSelected && (
                    <span style={{ 
                      backgroundColor: 'var(--primary)', 
                      color: '#ffffff', 
                      borderRadius: '50%', 
                      width: '18px', 
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Check size={11} />
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', backgroundColor: 'rgba(0, 100, 210, 0.1)', padding: '1px 5px', borderRadius: '4px' }}>
                    {b.code}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>• {b.city} ({b.country})</span>
                  {b.is_hq && (
                    <span style={{ fontSize: '9px', fontWeight: 800, backgroundColor: '#fef3c7', color: '#b45309', padding: '1px 4px', borderRadius: '4px' }}>
                      HQ
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span>{b.departments_count} Depts • {b.warehouses_count} WH</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    Currency: {b.currency}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
