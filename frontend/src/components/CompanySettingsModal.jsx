import React, { useState, useEffect } from 'react';
import {
  Building2, Settings, Globe, Shield, Calendar, DollarSign,
  CheckCircle, AlertTriangle, X, Database, Save, Lock, Layers
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function CompanySettingsModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editable fields
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxIdentifier, setTaxIdentifier] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [hqAddress, setHqAddress] = useState('');
  const [defaultTaxRate, setDefaultTaxRate] = useState(18.0);
  const [fiscalYear, setFiscalYear] = useState('April 1 - March 31');
  const [auditDays, setAuditDays] = useState(365);
  const [sessionTimeout, setSessionTimeout] = useState(480);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiRequest('/api/settings/company');
      setSettings(res);
      setName(res.name || 'Nexa Global Enterprises');
      setLegalName(res.legal_name || 'Nexa Global Enterprises Private Limited');
      setTaxIdentifier(res.tax_identifier || 'GSTIN27AABCU9603R1ZM');
      setCurrency(res.currency || 'INR');
      setHqAddress(res.hq_address || '');
      setDefaultTaxRate(res.default_tax_rate || 18.0);
      setFiscalYear(res.fiscal_year_start || 'April 1 - March 31');
      setAuditDays(res.audit_retention_days || 365);
      setSessionTimeout(res.session_timeout_minutes || 480);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load company settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await apiRequest('/api/settings/company', 'PUT', {
        name,
        legal_name: legalName,
        tax_identifier: taxIdentifier,
        currency,
        hq_address: hqAddress,
        default_tax_rate: Number(defaultTaxRate),
        fiscal_year_start: fiscalYear,
        audit_retention_days: Number(auditDays),
        session_timeout_minutes: Number(sessionTimeout)
      });
      setSuccessMsg('Enterprise company settings updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadSettings();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div 
        className="modal-content animate-fade-in"
        style={{
          maxWidth: '750px',
          width: '92vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          borderRadius: '16px',
          backgroundColor: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              padding: '10px',
              borderRadius: '10px',
              backgroundColor: 'rgba(0, 100, 210, 0.1)',
              color: '#0064d2'
            }}>
              <Building2 size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                Company Configuration & Enterprise Settings
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
                Corporate identity, tax compliance, base reporting currency, and global audit governance.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '6px', borderRadius: '8px', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: '10px',
            fontSize: '13px',
            marginBottom: '16px',
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
            border: '1px solid #bbf7d0',
            color: '#15803d',
            borderRadius: '10px',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* SECTION 1: CORPORATE IDENTITY */}
          <div style={{
            padding: '18px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-app, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0064d2', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              1. Corporate Legal Identity
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Enterprise Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Registered Legal Entity Name
                </label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  GSTIN / Corporate Tax ID
                </label>
                <input
                  type="text"
                  value={taxIdentifier}
                  onChange={(e) => setTaxIdentifier(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Company Identification Number (CIN)
                </label>
                <input
                  type="text"
                  value={settings?.cin || 'U72200TG2026PTC184920'}
                  disabled
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Corporate Headquarters Address
              </label>
              <input
                type="text"
                value={hqAddress}
                onChange={(e) => setHqAddress(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* SECTION 2: CURRENCY & FISCAL CYCLE */}
          <div style={{
            padding: '18px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-app, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0064d2', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              2. Fiscal Policy, Currency & Tax Slabs
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Base Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                >
                  <option value="INR">₹ INR (Indian Rupee)</option>
                  <option value="USD">$ USD (US Dollar)</option>
                  <option value="AED">AED (UAE Dirham)</option>
                  <option value="EUR">€ EUR (Euro)</option>
                  <option value="SGD">S$ SGD (Singapore Dollar)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Default Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={defaultTaxRate}
                  onChange={(e) => setDefaultTaxRate(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Financial Year Cycle
                </label>
                <select
                  value={fiscalYear}
                  onChange={(e) => setFiscalYear(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                >
                  <option value="April 1 - March 31">April 1 – March 31 (Indian Standard)</option>
                  <option value="January 1 - December 31">January 1 – December 31 (Calendar)</option>
                  <option value="July 1 - June 30">July 1 – June 30 (Mid-year)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: DATA RETENTION & SECURITY GOVERNANCE */}
          <div style={{
            padding: '18px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-app, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0064d2', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              3. Data Retention & Multi-Branch Governance
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Tamper-Evident Audit Log Retention (Days)
                </label>
                <input
                  type="number"
                  value={auditDays}
                  onChange={(e) => setAuditDays(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Max Idle Session Timeout (Minutes)
                </label>
                <input
                  type="number"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
              Connected Regional Operating Hubs: <strong>{settings?.total_operating_branches || 26} branches</strong> with independent inventory ledgers and consolidated rollups.
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '9px 22px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#0064d2',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Save size={15} />
              {saving ? 'Saving Settings...' : 'Save Enterprise Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
