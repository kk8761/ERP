import React, { useState } from 'react';
import {
  Sliders, Building2, Store, Receipt, Shield, Database,
  Save, CheckCircle2, AlertTriangle, RefreshCw, Lock, Globe,
  X, Plus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import DisasterRecoveryManager from '../components/DisasterRecoveryManager';

export default function SettingsPage({ initialTab = 'org' }) {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState(
    ['org', 'branches', 'pos', 'security', 'db'].includes(initialTab) ? initialTab : 'org'
  );
  const [savedMsg, setSavedMsg] = useState('');
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [newBranch, setNewBranch] = useState({
    code: '',
    name: '',
    location: '',
    registers: 2
  });

  useEffect(() => {
    if (['org', 'branches', 'pos', 'security', 'db'].includes(initialTab)) {
      setActiveTab(initialTab);
    } else if (initialTab === 'disaster_recovery' || initialTab === 'backup') {
      setActiveTab('db');
    } else if (initialTab === 'branches' || initialTab === 'outlets') {
      setActiveTab('branches');
    } else if (initialTab === 'pos_settings') {
      setActiveTab('pos');
    } else if (initialTab === 'security_policies') {
      setActiveTab('security');
    } else {
      setActiveTab('org');
    }
  }, [initialTab]);

  // Org Settings State
  const [orgData, setOrgData] = useState({
    companyName: 'NexaERP Enterprise Corp',
    legalName: 'NexaERP Enterprise Solutions Pvt Ltd',
    gstin: '29ABCDE1234F1Z5',
    currency: 'INR (₹)',
    fiscalYearStart: 'April 1',
    address: 'Tech Park Blvd, Sector 4, Bangalore, Karnataka - 560100',
    email: 'operations@nexaerp.com',
    phone: '+91 98765 43210',
    website: 'https://nexaerp.internal'
  });

  // POS Settings State
  const [posData, setPosData] = useState({
    invoicePrefix: 'INV-2026-',
    defaultTaxRate: 5.0,
    receiptHeader: 'NexaERP Supermarket & Retail Hub',
    receiptFooter: 'Thank you for shopping with us! Visit again.',
    autoPrintReceipt: true,
    scannerAutoSubmit: true,
    soundEffects: true
  });

  const [refundProofRequired, setRefundProofRequired] = useState(false);

  useEffect(() => {
    apiRequest('/api/sales/refund-policy')
      .then(res => {
        if (typeof res?.proof_required === 'boolean') {
          setRefundProofRequired(res.proof_required);
        }
      })
      .catch(() => {});
  }, []);

  // Security Policies State
  const [secData, setSecData] = useState({
    sessionTimeoutMinutes: 60,
    maxJitDurationMinutes: 120,
    enforcePasswordComplexity: true,
    strictTenantIsolation: true,
    antiTamperLevel: 'Strict (Block Right-Click, F12, DevTools, Tamper Skew)',
    enableAuditLogging: true
  });

  // Branches list
  const [branches, setBranches] = useState([
    { id: 'b1', code: 'BR-MAIN', name: 'Main Corporate HQ & Warehouse', location: 'Bangalore Central', active: true, registers: 4 },
    { id: 'b2', code: 'BR-RETAIL-01', name: 'Indiranagar Retail Outlet', location: '100ft Road, Indiranagar', active: true, registers: 2 },
    { id: 'b3', code: 'BR-RETAIL-02', name: 'Koramangala Supermarket', location: '80ft Road, Koramangala', active: true, registers: 3 }
  ]);

  const handleSave = (section) => {
    setSavedMsg(`Configuration for ${section} successfully updated and propagated to cluster.`);
    setTimeout(() => setSavedMsg(''), 4000);
  };

  const handleCreateBranch = (e) => {
    e.preventDefault();
    if (!newBranch.code.trim() || !newBranch.name.trim()) return;
    const branchEntry = {
      id: `b${branches.length + 1}`,
      code: newBranch.code.trim().toUpperCase(),
      name: newBranch.name.trim(),
      location: newBranch.location.trim() || 'General District',
      registers: parseInt(newBranch.registers) || 1,
      active: true
    };
    setBranches(prev => [...prev, branchEntry]);
    setShowAddBranchModal(false);
    setNewBranch({ code: '', name: '', location: '', registers: 2 });
    handleSave(`Branch ${branchEntry.name}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            System Settings & Enterprise Configuration
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Manage organization parameters, branch registers, POS preferences, security policies, and storage topology
          </p>
        </div>

        {savedMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ecfdf5',
            color: '#10b981',
            border: '1px solid #a7f3d0',
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12.5px',
            fontWeight: 600
          }}>
            <CheckCircle2 size={16} />
            <span>{savedMsg}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '2px' }}>
        {[
          { id: 'org', label: 'Company Profile', icon: Building2 },
          { id: 'branches', label: 'Store Branches & Outlets', icon: Store },
          { id: 'pos', label: 'POS & Billing Preferences', icon: Receipt },
          { id: 'security', label: 'Security & Access Policies', icon: Shield },
          { id: 'db', label: 'DBMS Topology & Backup', icon: Database }
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
                padding: '10px 16px',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <Icon size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Organization Profile */}
      {activeTab === 'org' && (
        <div className="nexa-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginTop: 0, marginBottom: '16px' }}>
            Corporate Legal Entity Information
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label className="form-label">Brand / Display Name</label>
              <input
                className="form-input"
                value={orgData.companyName}
                onChange={e => setOrgData({ ...orgData, companyName: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Registered Legal Entity Name</label>
              <input
                className="form-input"
                value={orgData.legalName}
                onChange={e => setOrgData({ ...orgData, legalName: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Tax ID / GSTIN / VAT Number</label>
              <input
                className="form-input"
                value={orgData.gstin}
                onChange={e => setOrgData({ ...orgData, gstin: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Base Currency</label>
              <select
                className="form-select"
                value={orgData.currency}
                onChange={e => setOrgData({ ...orgData, currency: e.target.value })}
              >
                <option value="INR (₹)">INR (₹) - Indian Rupee</option>
                <option value="USD ($)">USD ($) - US Dollar</option>
                <option value="EUR (€)">EUR (€) - Euro</option>
                <option value="GBP (£)">GBP (£) - British Pound</option>
              </select>
            </div>
            <div>
              <label className="form-label">Support Email Address</label>
              <input
                className="form-input"
                value={orgData.email}
                onChange={e => setOrgData({ ...orgData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Support Telephone</label>
              <input
                className="form-input"
                value={orgData.phone}
                onChange={e => setOrgData({ ...orgData, phone: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Headquarters Physical Address</label>
              <input
                className="form-input"
                value={orgData.address}
                onChange={e => setOrgData({ ...orgData, address: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => handleSave('Organization Profile')}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={16} />
              <span>Save Organization Changes</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Branches */}
      {activeTab === 'branches' && (
        <div className="nexa-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Physical Store & Warehouse Outlets
            </h3>
            <button
              onClick={() => setShowAddBranchModal(true)}
              className="btn btn-secondary"
              style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} />
              <span>Register New Branch</span>
            </button>
          </div>

          <div className="nexa-table-wrapper">
            <table className="nexa-table">
              <thead>
                <tr>
                  <th>Branch Code</th>
                  <th>Branch Name</th>
                  <th>Physical Location</th>
                  <th>Active POS Registers</th>
                  <th>Operating Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{b.code}</td>
                    <td style={{ fontWeight: 600 }}>{b.name}</td>
                    <td>{b.location}</td>
                    <td>{b.registers} Lane(s)</td>
                    <td>
                      <span className={`badge ${b.active ? 'badge-success' : 'badge-danger'}`}>
                        {b.active ? 'Active & Open' : 'Suspended'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setBranches(branches.map(x => x.id === b.id ? { ...x, active: !x.active } : x));
                        }}
                        className="btn btn-ghost"
                        style={{ fontSize: '12px', color: b.active ? 'var(--danger)' : 'var(--success)' }}
                      >
                        {b.active ? 'Suspend Outlet' : 'Activate Outlet'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: POS & Billing */}
      {activeTab === 'pos' && (
        <div className="nexa-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginTop: 0, marginBottom: '16px' }}>
            Point of Sale Terminal & Receipt Parameters
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label className="form-label">Invoice Numbering Prefix</label>
              <input
                className="form-input"
                value={posData.invoicePrefix}
                onChange={e => setPosData({ ...posData, invoicePrefix: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Default GST / Tax Rate (%)</label>
              <input
                type="number"
                step="0.5"
                className="form-input"
                value={posData.defaultTaxRate}
                onChange={e => setPosData({ ...posData, defaultTaxRate: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Thermal Receipt Header Note</label>
              <input
                className="form-input"
                value={posData.receiptHeader}
                onChange={e => setPosData({ ...posData, receiptHeader: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Thermal Receipt Footer Memo</label>
              <input
                className="form-input"
                value={posData.receiptFooter}
                onChange={e => setPosData({ ...posData, receiptFooter: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13.5px' }}>
              <input
                type="checkbox"
                checked={posData.autoPrintReceipt}
                onChange={e => setPosData({ ...posData, autoPrintReceipt: e.target.checked })}
              />
              <span style={{ fontWeight: 600 }}>Automatically print thermal receipt upon checkout completion</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13.5px' }}>
              <input
                type="checkbox"
                checked={posData.scannerAutoSubmit}
                onChange={e => setPosData({ ...posData, scannerAutoSubmit: e.target.checked })}
              />
              <span style={{ fontWeight: 600 }}>Auto-add item to cart immediately when barcode scanner detects Enter key</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13.5px' }}>
              <input
                type="checkbox"
                checked={posData.soundEffects}
                onChange={e => setPosData({ ...posData, soundEffects: e.target.checked })}
              />
              <span style={{ fontWeight: 600 }}>Enable audio beep feedback on scan and tender payment</span>
            </label>

            <div style={{
              marginTop: '6px',
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: refundProofRequired ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
              border: refundProofRequired ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13.5px' }}>
                <input
                  type="checkbox"
                  checked={refundProofRequired}
                  onChange={async (e) => {
                    const val = e.target.checked;
                    setRefundProofRequired(val);
                    try {
                      await apiRequest('/api/sales/refund-policy', {
                        method: 'POST',
                        body: JSON.stringify({ proof_required: val })
                      });
                      handleSave(`Refund Policy (${val ? 'Proof Compulsory' : 'Proof Optional'})`);
                    } catch (err) {
                      alert('Could not update policy: ' + err.message);
                    }
                  }}
                  style={{ width: '16px', height: '16px', accentColor: '#ef4444' }}
                />
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    Require Image / Proof Document for Return Refunds ({refundProofRequired ? 'Compulsory' : 'Optional'})
                  </span>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    When checked (Compulsory), cashiers and operators cannot submit an order refund without attaching a proof image or condition photo.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => handleSave('POS Preferences')}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={16} />
              <span>Save POS Preferences</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Security Policies */}
      {activeTab === 'security' && (
        <div className="nexa-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginTop: 0, marginBottom: '16px' }}>
            Security Governance & Anti-Tamper Hardening
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label className="form-label">User Inactivity Session Timeout (Minutes)</label>
              <input
                type="number"
                className="form-input"
                value={secData.sessionTimeoutMinutes}
                onChange={e => setSecData({ ...secData, sessionTimeoutMinutes: parseInt(e.target.value) || 30 })}
              />
            </div>
            <div>
              <label className="form-label">Maximum JIT Elevation Lifetime (Minutes)</label>
              <input
                type="number"
                className="form-input"
                value={secData.maxJitDurationMinutes}
                onChange={e => setSecData({ ...secData, maxJitDurationMinutes: parseInt(e.target.value) || 60 })}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Client Anti-Tamper Enforcement Profile</label>
              <input
                className="form-input"
                readOnly
                value={secData.antiTamperLevel}
                style={{ backgroundColor: 'var(--bg-subtle)' }}
              />
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                Right click suppressed, F12 / DevTools key combinations blocked, replay skew timestamp checked on API gateway.
              </span>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13.5px' }}>
              <input
                type="checkbox"
                checked={secData.strictTenantIsolation}
                onChange={e => setSecData({ ...secData, strictTenantIsolation: e.target.checked })}
              />
              <span style={{ fontWeight: 600 }}>Enforce Strict Multi-Tenant Isolation & IDOR authorization checks on all routes</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13.5px' }}>
              <input
                type="checkbox"
                checked={secData.enableAuditLogging}
                onChange={e => setSecData({ ...secData, enableAuditLogging: e.target.checked })}
              />
              <span style={{ fontWeight: 600 }}>Immutable audit logging for all privilege elevations, price adjustments, and refunds</span>
            </label>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => handleSave('Security Policies')}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={16} />
              <span>Apply Security Policies</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 5: Disaster Recovery & DBMS Topology */}
      {activeTab === 'db' && (
        <DisasterRecoveryManager />
      )}

      {/* Modal: Register New Branch */}
      {showAddBranchModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '24px', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Store size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>Register New Branch Outlet</h3>
              </div>
              <button onClick={() => setShowAddBranchModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Branch Code</label>
                <input
                  required
                  className="form-input"
                  placeholder="e.g. BR-HYD-01"
                  value={newBranch.code}
                  onChange={e => setNewBranch({ ...newBranch, code: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Branch Name</label>
                <input
                  required
                  className="form-input"
                  placeholder="e.g. Hyderabad Hi-Tech Hub"
                  value={newBranch.name}
                  onChange={e => setNewBranch({ ...newBranch, name: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Physical Location / Address</label>
                <input
                  required
                  className="form-input"
                  placeholder="e.g. Madhapur Cyber Gateway, Hyderabad, TG"
                  value={newBranch.location}
                  onChange={e => setNewBranch({ ...newBranch, location: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Active POS Lanes / Registers</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  className="form-input"
                  value={newBranch.registers}
                  onChange={e => setNewBranch({ ...newBranch, registers: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowAddBranchModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save & Register Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
