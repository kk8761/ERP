import React, { useState, useEffect } from 'react';
import {
  Building2, Globe, MapPin, Check, Plus, RefreshCw, X, Shield,
  ArrowRight, DollarSign, Layers, TrendingUp, Users, Box, AlertCircle,
  Search, CheckCircle2, Lock
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
  const [myAccess, setMyAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('ALL'); // 'ALL', 'IN', 'ME', 'APAC', 'WEST'
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
      const [bList, cSummary, access] = await Promise.all([
        apiRequest('/api/branches'),
        apiRequest('/api/branches/consolidation-summary'),
        apiRequest('/api/branches/my-access').catch(() => null)
      ]);
      setBranches(bList || []);
      setConsolidation(cSummary);
      setMyAccess(access);
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

  // Filter branches
  const filteredBranches = branches.filter(b => {
    // Search query
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (
      b.name?.toLowerCase().includes(q) ||
      b.city?.toLowerCase().includes(q) ||
      b.country_name?.toLowerCase().includes(q) ||
      b.code?.toLowerCase().includes(q) ||
      b.address?.toLowerCase().includes(q)
    );

    // Region filter
    let matchesRegion = true;
    if (selectedRegion === 'IN') {
      matchesRegion = b.country === 'IN';
    } else if (selectedRegion === 'ME') {
      matchesRegion = b.country === 'AE';
    } else if (selectedRegion === 'APAC') {
      matchesRegion = ['SG', 'JP'].includes(b.country);
    } else if (selectedRegion === 'WEST') {
      matchesRegion = ['GB', 'US'].includes(b.country);
    }

    return matchesSearch && matchesRegion;
  });

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div 
        className="modal-content animate-fade-in" 
        style={{ 
          maxWidth: '920px', 
          width: '95vw', 
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          borderRadius: '16px'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={22} color="var(--primary)" />
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                MNC Multi-Branch Controller & Regional Hubs
              </h3>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Select an operating branch context with segregated employees and warehouse operations, or view consolidated rollups.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        {/* Global MNC Consolidation Card */}
        {consolidation && (
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: '12px',
            padding: '16px 20px',
            color: '#ffffff',
            marginBottom: '16px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.6px' }}>
                  PARENT CORPORATION • MULTINATIONAL CONGLOMERATE
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                  {consolidation.organization_name}
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '3px' }}>
                  Standard: <strong>{consolidation.reporting_standard}</strong> • Inter-Branch Elimination: <strong>{consolidation.intercompany_elimination}</strong>
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
                  backgroundColor: !currentBranchId ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)',
                  color: !currentBranchId ? '#0f172a' : '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  fontWeight: 700,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <Globe size={15} />
                <span>{!currentBranchId ? '✓ Viewing All Branches Consolidated' : 'Switch to Consolidated MNC View'}</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Operating Hubs</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#38bdf8' }}>{consolidation.total_active_branches} Global Hubs</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Consolidated Turnover</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#4ade80' }}>
                  ₹ {consolidation.consolidated_financials?.gross_turnover_inr?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Operating Margin</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#facc15' }}>{consolidation.consolidated_financials?.operating_margin_pct}%</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Inter-Branch Transfers</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#c084fc' }}>{consolidation.consolidated_financials?.inter_branch_transfers_mtd} Transit Vouchers</div>
              </div>
            </div>
          </div>
        )}

        {/* My Role & MongoDB Authorization Banner */}
        {myAccess && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 14px',
            backgroundColor: 'rgba(2, 132, 199, 0.08)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            borderRadius: '8px',
            marginBottom: '14px',
            fontSize: '12px',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <Shield size={16} color="#0284c7" />
              <span>
                Your Role: <strong>{myAccess.app_role || 'Staff'}</strong> • Scope: <strong>{myAccess.can_access_all ? 'Global MNC Access (All Branches)' : 'Assigned Branches Only'}</strong>
              </span>
            </div>
            <div style={{ color: '#0284c7', fontWeight: 700, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>🍃</span>
              <span>{myAccess.storage_engine || 'MongoDB Community Store'}</span>
            </div>
          </div>
        )}

        {/* Search & Region Filter Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search branch name, city, street address, or country..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '34px', fontSize: '12.5px', height: '36px' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowAddBranch(prev => !prev)}
              className="btn btn-primary"
              style={{ fontSize: '12px', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} />
              <span>+ Provision Regional Branch</span>
            </button>
          </div>

          {/* Region Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: `All Hubs (${branches.length})` },
              { id: 'IN', label: `🇮🇳 India (${branches.filter(b => b.country === 'IN').length})` },
              { id: 'ME', label: `🇦🇪 Middle East (${branches.filter(b => b.country === 'AE').length})` },
              { id: 'APAC', label: `🌏 APAC (${branches.filter(b => ['SG', 'JP'].includes(b.country)).length})` },
              { id: 'WEST', label: `🌍 Europe & Americas (${branches.filter(b => ['GB', 'US'].includes(b.country)).length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedRegion(tab.id)}
                className="btn btn-ghost"
                style={{
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  fontWeight: selectedRegion === tab.id ? 700 : 500,
                  backgroundColor: selectedRegion === tab.id ? 'var(--primary)' : 'var(--bg-subtle)',
                  color: selectedRegion === tab.id ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '20px'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Provision Branch Subform */}
        {showAddBranch && (
          <form 
            onSubmit={handleCreateBranch} 
            style={{ 
              backgroundColor: 'var(--bg-subtle)', 
              padding: '16px', 
              borderRadius: '10px', 
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
                  placeholder="e.g. Frankfurt European Hub"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '12px', padding: '6px' }}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Branch Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BR-FRA-EU"
                  value={newBranch.code}
                  onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '12px', padding: '6px' }}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>City *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Frankfurt"
                  value={newBranch.city}
                  onChange={(e) => setNewBranch({ ...newBranch, city: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '12px', padding: '6px' }}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Full Street Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mainzer Landstrasse 46, Financial District"
                  value={newBranch.address}
                  onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '12px', padding: '6px' }}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Local Currency</label>
                <select
                  value={newBranch.currency}
                  onChange={(e) => setNewBranch({ ...newBranch, currency: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '12px', padding: '6px' }}
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="AED">AED (د.إ) - UAE Dirham</option>
                  <option value="SGD">SGD ($) - Singapore Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="JPY">JPY (¥) - Japanese Yen</option>
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

        {/* Branch Cards List */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', 
          gap: '14px',
          overflowY: 'auto',
          maxHeight: '380px',
          paddingRight: '6px'
        }}>
          {filteredBranches.map((b) => {
            const isSelected = currentBranchId === b.id;
            const canAccess = !myAccess || myAccess.can_access_all || (myAccess.accessible_branches || []).some(
              ab => ab.toLowerCase().includes(b.name.toLowerCase()) || b.name.toLowerCase().includes(ab.toLowerCase()) || ab === b.code
            );

            return (
              <div
                key={b.id}
                onClick={() => {
                  if (!canAccess) {
                    alert(`Access Denied: Your employee profile is restricted. Authorized branches: ${(myAccess.accessible_branches || []).join(', ')}.`);
                    return;
                  }
                  onSelectBranch(b.id, b.name);
                  onClose();
                }}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${isSelected ? 'var(--primary)' : canAccess ? 'var(--border-color)' : 'rgba(239, 68, 68, 0.25)'}`,
                  backgroundColor: isSelected ? 'rgba(0, 100, 210, 0.05)' : canAccess ? 'var(--bg-surface)' : 'var(--bg-subtle)',
                  cursor: canAccess ? 'pointer' : 'not-allowed',
                  opacity: canAccess ? 1 : 0.65,
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isSelected ? '0 4px 12px rgba(0, 100, 210, 0.12)' : 'none'
                }}
                className={canAccess ? "hover-card" : ""}
                title={canAccess ? `Click to switch to ${b.name}` : `Restricted branch`}
              >
                {/* Top Row: Flag + Name + Selection Indicator */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>{b.flag || '🏢'}</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.3 }}>
                          {b.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            color: 'var(--primary)',
                            backgroundColor: 'rgba(0, 100, 210, 0.1)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontFamily: 'monospace'
                          }}>
                            {b.code}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            • {b.city}, {b.country_name || b.country}
                          </span>
                          {b.is_hq && (
                            <span style={{ fontSize: '9px', fontWeight: 800, backgroundColor: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '4px' }}>
                              GLOBAL HQ
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected ? (
                      <span style={{ 
                        backgroundColor: 'var(--primary)', 
                        color: '#ffffff', 
                        borderRadius: '50%', 
                        width: '22px', 
                        height: '22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Check size={13} />
                      </span>
                    ) : !canAccess ? (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        color: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        padding: '2px 5px',
                        borderRadius: '4px',
                        flexShrink: 0
                      }}>
                        🔒 Restricted
                      </span>
                    ) : null}
                  </div>

                  {/* Street Location Address - Prominently Displayed */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px',
                    marginTop: '10px',
                    padding: '8px 10px',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    color: 'var(--text-secondary)'
                  }}>
                    <MapPin size={14} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ lineHeight: 1.4 }}>
                      {b.address || `${b.city}, ${b.country_name || b.country}`}
                    </span>
                  </div>
                </div>

                {/* Bottom Details & Employee Count */}
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 700,
                      color: '#0284c7',
                      backgroundColor: 'rgba(2, 132, 199, 0.08)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      <Users size={12} />
                      <span>{b.employees_count || 0} Staff Members</span>
                    </span>

                    <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '11.5px' }}>
                      Currency: {b.currency || 'INR'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>{b.departments_count || 0} Depts • {b.warehouses_count || 0} Warehouses</span>
                    <span style={{ color: isSelected ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: isSelected ? 700 : 500 }}>
                      {isSelected ? '✓ Current Context' : canAccess ? 'Switch Hub →' : 'No Access'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Showing <strong>{filteredBranches.length}</strong> of {branches.length} subsidiaries
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '7px 18px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
