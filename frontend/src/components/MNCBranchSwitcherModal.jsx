import React, { useState, useEffect } from 'react';
import {
  Building2, Globe, MapPin, Check, Plus, RefreshCw, X, Shield,
  ArrowRight, DollarSign, Layers, TrendingUp, Users, Box, AlertCircle,
  Search, CheckCircle2, Lock, Clock, CheckCheck, XCircle, PauseCircle,
  FileText, Send, AlertTriangle, KeyRound
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function MNCBranchSwitcherModal({
  isOpen,
  onClose,
  currentBranchId,
  onSelectBranch
}) {
  const [activeTab, setActiveTab] = useState('BRANCHES'); // 'BRANCHES' | 'REQUESTS'
  const [branches, setBranches] = useState([]);
  const [consolidation, setConsolidation] = useState(null);
  const [myAccess, setMyAccess] = useState(null);
  const [accessRequests, setAccessRequests] = useState([]);
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

  // Request Access Dialog State (Employee Side)
  const [requestModalBranch, setRequestModalBranch] = useState(null);
  const [requestForm, setRequestForm] = useState({
    request_type: 'BRANCH_ACCESS',
    requested_role: 'Branch Operations Specialist',
    duration: 'TEMPORARY_7D',
    reason: ''
  });
  const [requestSending, setRequestSending] = useState(false);

  // Review Dialog State (Admin Side)
  const [reviewDialog, setReviewDialog] = useState({
    isOpen: false,
    request: null,
    action: 'APPROVE', // 'APPROVE' | 'DISAPPROVE' | 'ON_HOLD'
    admin_reason: ''
  });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadBranchData();
    }
  }, [isOpen]);

  const loadBranchData = async () => {
    setLoading(true);
    try {
      const [bList, cSummary, access, reqs] = await Promise.all([
        apiRequest('/api/branches'),
        apiRequest('/api/branches/consolidation-summary'),
        apiRequest('/api/branches/my-access').catch(() => null),
        apiRequest('/api/branches/access-requests').catch(() => [])
      ]);
      setBranches(bList || []);
      setConsolidation(cSummary);
      setMyAccess(access);
      setAccessRequests(reqs || []);
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

  const handleSendAccessRequest = async (e) => {
    e.preventDefault();
    if (!requestForm.reason.trim()) {
      alert('Please provide a mandatory business justification reason for requesting access.');
      return;
    }
    setRequestSending(true);
    try {
      const res = await apiRequest('/api/branches/access-requests', {
        method: 'POST',
        body: JSON.stringify({
          target_branch_id: requestModalBranch.id,
          target_branch_name: requestModalBranch.name,
          request_type: requestForm.request_type,
          requested_role: requestForm.requested_role,
          duration: requestForm.duration,
          reason: requestForm.reason.trim()
        })
      });
      alert(res.message || 'Access request dispatched to System Administration.');
      setRequestModalBranch(null);
      setRequestForm({
        request_type: 'BRANCH_ACCESS',
        requested_role: 'Branch Operations Specialist',
        duration: 'TEMPORARY_7D',
        reason: ''
      });
      loadBranchData();
      setActiveTab('REQUESTS');
    } catch (err) {
      alert(err.message || 'Failed to submit cross-branch request.');
    } finally {
      setRequestSending(false);
    }
  };

  const handleExecuteReview = async (e) => {
    e.preventDefault();
    if (!reviewDialog.admin_reason.trim()) {
      alert('A review justification/reason is required from the administrator.');
      return;
    }
    setReviewSubmitting(true);
    try {
      const res = await apiRequest(`/api/branches/access-requests/${reviewDialog.request.request_id}/review`, {
        method: 'PUT',
        body: JSON.stringify({
          action: reviewDialog.action,
          admin_reason: reviewDialog.admin_reason.trim()
        })
      });
      alert(res.message || 'Decision recorded successfully.');
      setReviewDialog({ isOpen: false, request: null, action: 'APPROVE', admin_reason: '' });
      loadBranchData();
    } catch (err) {
      alert(err.message || 'Failed to process request decision.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isAdmin = myAccess?.can_access_all || myAccess?.is_superuser;
  const pendingRequests = accessRequests.filter(r => r.status === 'PENDING');

  // Filter branches
  const filteredBranches = branches.filter(b => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (
      b.name?.toLowerCase().includes(q) ||
      b.city?.toLowerCase().includes(q) ||
      b.country_name?.toLowerCase().includes(q) ||
      b.code?.toLowerCase().includes(q) ||
      b.address?.toLowerCase().includes(q)
    );

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
          maxWidth: '960px', 
          width: '96vw', 
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
              Manage global enterprise subsidiaries, switch operational contexts, or submit and review cross-branch access authorizations.
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
            marginBottom: '14px',
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

        {/* Navigation Tabs between Operating Hubs and Access Requests */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '14px' }}>
          <button
            onClick={() => setActiveTab('BRANCHES')}
            className={`btn ${activeTab === 'BRANCHES' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '7px 16px', fontSize: '12.5px', borderRadius: '8px 8px 0 0' }}
          >
            <Building2 size={15} />
            <span>Operating Hubs ({branches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('REQUESTS')}
            className={`btn ${activeTab === 'REQUESTS' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '7px 16px', fontSize: '12.5px', borderRadius: '8px 8px 0 0', position: 'relative' }}
          >
            <KeyRound size={15} />
            <span>Cross-Branch Access Requests ({accessRequests.length})</span>
            {pendingRequests.length > 0 && (
              <span style={{
                backgroundColor: '#ef4444',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: '10px',
                marginLeft: '4px'
              }}>
                {pendingRequests.length} PENDING
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: OPERATING HUBS */}
        {activeTab === 'BRANCHES' && (
          <>
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
                marginBottom: '12px',
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
                        // Open request authorization dialog
                        setRequestModalBranch(b);
                        return;
                      }
                      onSelectBranch(b.id, b.name);
                      onClose();
                    }}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: `2px solid ${isSelected ? 'var(--primary)' : canAccess ? 'var(--border-color)' : 'rgba(239, 68, 68, 0.3)'}`,
                      backgroundColor: isSelected ? 'rgba(0, 100, 210, 0.05)' : canAccess ? 'var(--bg-surface)' : 'rgba(239, 68, 68, 0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: isSelected ? '0 4px 12px rgba(0, 100, 210, 0.12)' : 'none'
                    }}
                    className="hover-card"
                    title={canAccess ? `Click to switch to ${b.name}` : `Restricted: Click to request access`}
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRequestModalBranch(b);
                            }}
                            className="btn btn-ghost"
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 800,
                              color: '#dc2626',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              padding: '3px 7px',
                              borderRadius: '6px',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Submit access authorization request"
                          >
                            <Lock size={11} />
                            <span>Request Access</span>
                          </button>
                        ) : null}
                      </div>

                      {/* Street Location Address */}
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
                        <span style={{ color: isSelected ? 'var(--primary)' : canAccess ? '#0284c7' : '#dc2626', fontWeight: 700 }}>
                          {isSelected ? '✓ Current Context' : canAccess ? 'Switch Hub →' : '🔒 Request Authorization'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* TAB 2: CROSS-BRANCH ACCESS REQUESTS (BOTH EMPLOYEE & ADMIN SIDES) */}
        {activeTab === 'REQUESTS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: '520px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: '10px',
              border: '1px solid var(--border-color)'
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                  {isAdmin ? 'System Administrator Governance Panel' : 'My Cross-Branch Access Requests'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {isAdmin 
                    ? 'Review employee requests to access other branches or elevated roles. Decisions immediately update MongoDB Community authorizations.'
                    : 'Track your pending, approved, disapproved, or on-hold cross-branch access requests with reasons recorded on both sides.'}
                </div>
              </div>
              <button onClick={loadBranchData} className="btn btn-ghost" style={{ fontSize: '12px', padding: '5px 10px' }}>
                <RefreshCw size={14} style={{ marginRight: '4px' }} />
                <span>Refresh</span>
              </button>
            </div>

            {accessRequests.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: '12px',
                border: '1px dashed var(--border-color)',
                color: 'var(--text-muted)'
              }}>
                <KeyRound size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>No Cross-Branch Access Requests</div>
                <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>
                  When staff request authority or access to another operational hub, their submissions appear here with complete audit trail.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {accessRequests.map((req) => {
                  const statusColors = {
                    PENDING: { bg: 'rgba(234, 179, 8, 0.1)', text: '#b45309', border: 'rgba(234, 179, 8, 0.3)', icon: Clock, label: 'PENDING ADMIN REVIEW' },
                    APPROVED: { bg: 'rgba(34, 197, 94, 0.1)', text: '#15803d', border: 'rgba(34, 197, 94, 0.3)', icon: CheckCircle2, label: 'APPROVED & GRANTED' },
                    DISAPPROVED: { bg: 'rgba(239, 68, 68, 0.1)', text: '#b91c1c', border: 'rgba(239, 68, 68, 0.3)', icon: XCircle, label: 'DISAPPROVED / REJECTED' },
                    ON_HOLD: { bg: 'rgba(59, 130, 246, 0.1)', text: '#1d4ed8', border: 'rgba(59, 130, 246, 0.3)', icon: PauseCircle, label: 'ON HOLD PENDING CLARIFICATION' }
                  }[req.status] || { bg: 'var(--bg-subtle)', text: 'var(--text-main)', border: 'var(--border-color)', icon: FileText, label: req.status };

                  const StatusIcon = statusColors.icon;

                  return (
                    <div
                      key={req.request_id || req._id}
                      style={{
                        padding: '16px 18px',
                        borderRadius: '12px',
                        border: `1.5px solid ${statusColors.border}`,
                        backgroundColor: 'var(--bg-surface)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      {/* Top Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--primary)' }}>
                              #{req.request_id}
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
                              {req.employee_name} ({req.user_email})
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Current Hub: <strong>{req.current_branch_name}</strong> ➔ Requested Target: <strong style={{ color: 'var(--primary)' }}>{req.target_branch_name}</strong>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 10px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 800,
                          backgroundColor: statusColors.bg,
                          color: statusColors.text,
                          border: `1px solid ${statusColors.border}`
                        }}>
                          <StatusIcon size={13} />
                          <span>{statusColors.label}</span>
                        </span>
                      </div>

                      {/* Request Specifications */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-subtle)',
                        fontSize: '12px'
                      }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Authority Type:</span>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>{req.request_type}</div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Requested Role:</span>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>{req.requested_role}</div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Duration:</span>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>{req.duration}</div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Submitted:</span>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                            {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'Recent'}
                          </div>
                        </div>
                      </div>

                      {/* Reasons on Both Sides */}
                      <div style={{ display: 'grid', gridTemplateColumns: req.admin_reason ? '1fr 1fr' : '1fr', gap: '12px' }}>
                        {/* 1. Employee's Request Reason */}
                        <div style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(0, 100, 210, 0.04)',
                          border: '1px solid rgba(0, 100, 210, 0.15)'
                        }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', marginBottom: '3px' }}>
                            👤 EMPLOYEE'S BUSINESS REASON:
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-main)', fontStyle: 'italic' }}>
                            "{req.reason}"
                          </div>
                        </div>

                        {/* 2. Administrator's Decision Reason (Both Sides Transparency) */}
                        {req.admin_reason && (
                          <div style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            backgroundColor: req.status === 'APPROVED' ? 'rgba(34, 197, 94, 0.06)' :
                                             req.status === 'DISAPPROVED' ? 'rgba(239, 68, 68, 0.06)' :
                                             'rgba(59, 130, 246, 0.06)',
                            border: `1px solid ${statusColors.border}`
                          }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: statusColors.text, marginBottom: '3px' }}>
                              🛡️ ADMINISTRATOR'S DECISION REASON:
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-main)' }}>
                              "{req.admin_reason}"
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              Reviewed by <strong>{req.reviewed_by}</strong> on {new Date(req.reviewed_at).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Admin Decision Actions (Approve / Disapprove / Put on Hold) */}
                      {isAdmin && (req.status === 'PENDING' || req.status === 'ON_HOLD') && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '8px',
                          marginTop: '4px',
                          paddingTop: '10px',
                          borderTop: '1px solid var(--border-color)'
                        }}>
                          <button
                            onClick={() => setReviewDialog({ isOpen: true, request: req, action: 'APPROVE', admin_reason: 'Approved based on operational review and regional mandate.' })}
                            className="btn btn-primary"
                            style={{
                              backgroundColor: '#15803d',
                              borderColor: '#15803d',
                              fontSize: '11.5px',
                              padding: '5px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <CheckCheck size={14} />
                            <span>Approve Access</span>
                          </button>

                          <button
                            onClick={() => setReviewDialog({ isOpen: true, request: req, action: 'ON_HOLD', admin_reason: 'Pending verification of role requirement with regional supervisor.' })}
                            className="btn btn-secondary"
                            style={{
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              color: '#1d4ed8',
                              borderColor: 'rgba(59, 130, 246, 0.3)',
                              fontSize: '11.5px',
                              padding: '5px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <PauseCircle size={14} />
                            <span>Put On Hold</span>
                          </button>

                          <button
                            onClick={() => setReviewDialog({ isOpen: true, request: req, action: 'DISAPPROVE', admin_reason: 'Cross-branch access policy restricted for this designation.' })}
                            className="btn btn-secondary"
                            style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              color: '#b91c1c',
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                              fontSize: '11.5px',
                              padding: '5px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <XCircle size={14} />
                            <span>Disapprove</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Operating Hubs: <strong>{branches.length}</strong> • Access Requests: <strong>{accessRequests.length}</strong>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '7px 18px' }}>
            Close
          </button>
        </div>
      </div>

      {/* ================= MODAL: EMPLOYEE ACCESS REQUEST ================= */}
      {requestModalBranch && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '540px', width: '92vw', padding: '24px', borderRadius: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>
                  Request Cross-Branch Access
                </h3>
              </div>
              <button onClick={() => setRequestModalBranch(null)} className="btn btn-ghost" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0, 100, 210, 0.05)',
              border: '1px solid rgba(0, 100, 210, 0.2)',
              marginBottom: '16px',
              fontSize: '12.5px'
            }}>
              <div>Target Subsidiary: <strong>{requestModalBranch.flag} {requestModalBranch.name}</strong></div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                📍 {requestModalBranch.address || `${requestModalBranch.city}, ${requestModalBranch.country}`}
              </div>
            </div>

            <form onSubmit={handleSendAccessRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Requested Authorization Type *
                </label>
                <select
                  value={requestForm.request_type}
                  onChange={e => setRequestForm({ ...requestForm, request_type: e.target.value })}
                  className="form-input"
                >
                  <option value="BRANCH_ACCESS">Operational Branch Context Access (Pos & Sales)</option>
                  <option value="CROSS_BRANCH_INVENTORY">Cross-Branch Inventory Audit & Stock Movement</option>
                  <option value="CONSOLIDATED_VIEW">MNC Consolidated Financial Reporting Access</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Requested Role Authority
                  </label>
                  <input
                    type="text"
                    required
                    value={requestForm.requested_role}
                    onChange={e => setRequestForm({ ...requestForm, requested_role: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Access Duration
                  </label>
                  <select
                    value={requestForm.duration}
                    onChange={e => setRequestForm({ ...requestForm, duration: e.target.value })}
                    className="form-input"
                  >
                    <option value="TEMPORARY_24H">24 Hours (Urgent Task)</option>
                    <option value="TEMPORARY_7D">7 Days (Project / Audit)</option>
                    <option value="TEMPORARY_30D">30 Days (Temporary Relocation)</option>
                    <option value="PERMANENT">Permanent Regional Access</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Business Justification / Reason * (Visible to Administrators)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why you require operational access to this branch (e.g. quarterly stock verification, intercompany transfer reconciliation, executive review)..."
                  value={requestForm.reason}
                  onChange={e => setRequestForm({ ...requestForm, reason: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setRequestModalBranch(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestSending}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Send size={14} />
                  <span>{requestSending ? 'Submitting...' : 'Dispatch Request to Admin'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADMIN REVIEW DECISION ================= */}
      {reviewDialog.isOpen && reviewDialog.request && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '520px', width: '92vw', padding: '24px', borderRadius: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {reviewDialog.action === 'APPROVE' ? <CheckCircle2 size={20} color="#15803d" /> :
                 reviewDialog.action === 'ON_HOLD' ? <PauseCircle size={20} color="#1d4ed8" /> :
                 <XCircle size={20} color="#b91c1c" />}
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>
                  {reviewDialog.action === 'APPROVE' ? 'Approve Access Request' :
                   reviewDialog.action === 'ON_HOLD' ? 'Put Access Request On Hold' :
                   'Disapprove Access Request'}
                </h3>
              </div>
              <button onClick={() => setReviewDialog({ isOpen: false, request: null, action: 'APPROVE', admin_reason: '' })} className="btn btn-ghost" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              marginBottom: '14px',
              fontSize: '12px'
            }}>
              <div>Employee: <strong>{reviewDialog.request.employee_name}</strong> ({reviewDialog.request.user_email})</div>
              <div style={{ marginTop: '2px' }}>Target Branch: <strong>{reviewDialog.request.target_branch_name}</strong></div>
              <div style={{ marginTop: '4px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                Employee's Reason: "{reviewDialog.request.reason}"
              </div>
            </div>

            <form onSubmit={handleExecuteReview} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Administrator Reason / Feedback Note * (Saved on both sides)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter administrator rationale (e.g. Approved for 7-day audit; Disapproved due to policy restriction; On hold pending GM confirmation)..."
                  value={reviewDialog.admin_reason}
                  onChange={e => setReviewDialog({ ...reviewDialog, admin_reason: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setReviewDialog({ isOpen: false, request: null, action: 'APPROVE', admin_reason: '' })}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="btn btn-primary"
                  style={{
                    backgroundColor: reviewDialog.action === 'APPROVE' ? '#15803d' :
                                     reviewDialog.action === 'ON_HOLD' ? '#1d4ed8' : '#b91c1c',
                    borderColor: reviewDialog.action === 'APPROVE' ? '#15803d' :
                                 reviewDialog.action === 'ON_HOLD' ? '#1d4ed8' : '#b91c1c'
                  }}
                >
                  {reviewSubmitting ? 'Recording...' : `Confirm ${reviewDialog.action === 'APPROVE' ? 'Approval' : reviewDialog.action === 'ON_HOLD' ? 'Hold' : 'Disapproval'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
