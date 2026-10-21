import React, { useState, useEffect } from 'react';
import {
  Palette, Sliders, Volume2, Globe, Calendar, DollarSign,
  CheckCircle, AlertTriangle, X, Save, RefreshCw, Sparkles,
  Sun, Moon, Layout, Bell, Shield
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function UserPreferencesModal({ isOpen, onClose, currentTheme, onThemeChange }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Preference fields
  const [theme, setTheme] = useState(currentTheme || 'light');
  const [currency, setCurrency] = useState('INR');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [numberFormat, setNumberFormat] = useState('IN_LAKHS');
  const [alexaVoiceEnabled, setAlexaVoiceEnabled] = useState(true);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [defaultTab, setDefaultTab] = useState('dashboard');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [securityChimes, setSecurityChimes] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen]);

  const loadPreferences = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiRequest('/api/settings/preferences');
      if (res) {
        setTheme(res.theme || currentTheme || 'light');
        setCurrency(res.currency || 'INR');
        setDateFormat(res.date_format || 'DD/MM/YYYY');
        setNumberFormat(res.number_format || 'IN_LAKHS');
        setAlexaVoiceEnabled(res.alexa_voice_enabled !== false);
        setVoiceSpeed(res.voice_speed || 1.0);
        setDefaultTab(res.default_tab || 'dashboard');
        setEmailAlerts(res.email_alerts !== false);
        setSecurityChimes(res.security_chimes !== false);
      }
    } catch (err) {
      // Fallback to local storage if API is momentarily offline
      const savedTheme = localStorage.getItem('theme') || 'light';
      setTheme(savedTheme);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const payload = {
      theme,
      currency,
      date_format: dateFormat,
      number_format: numberFormat,
      alexa_voice_enabled: alexaVoiceEnabled,
      voice_speed: parseFloat(voiceSpeed),
      default_tab: defaultTab,
      email_alerts: emailAlerts,
      security_chimes: securityChimes
    };

    try {
      await apiRequest('/api/settings/preferences', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      // Update localStorage & notify application
      localStorage.setItem('theme', theme);
      localStorage.setItem('currency', currency);
      localStorage.setItem('date_format', dateFormat);
      localStorage.setItem('number_format', numberFormat);

      if (onThemeChange) {
        onThemeChange(theme);
      }
      document.documentElement.setAttribute('data-theme', theme);

      // Dispatch global event for live reactive update
      window.dispatchEvent(new CustomEvent('nexaerp:preferences_updated', { detail: payload }));

      setSuccessMsg('Preferences saved and applied immediately across NexaERP!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save preferences');
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
          maxWidth: '680px',
          width: '92vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              color: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sliders size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                User & Interface Preferences
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Personalize your workspace theme, currency representation, date standards, and Alexa audio.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '6px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback Banners */}
        {errorMsg && (
          <div style={{
            marginTop: '14px',
            padding: '10px 14px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#b91c1c',
            fontSize: '12.5px',
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
            marginTop: '14px',
            padding: '10px 14px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            color: '#15803d',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 10px' }} />
            <div>Loading preferences...</div>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ flex: 1, overflowY: 'auto', padding: '16px 4px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Visual Theme Selection */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                <Palette size={15} color="#6366f1" />
                <span>Visual Theme & Appearance</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                {[
                  { id: 'light', label: 'Crisp Light', desc: 'High readability daylight mode', icon: Sun, bg: '#ffffff', border: '#e2e8f0', color: '#1e293b' },
                  { id: 'dark', label: 'Obsidian Dark', desc: 'Low-light high-contrast dark', icon: Moon, bg: '#0f172a', border: '#334155', color: '#f8fafc' },
                  { id: 'slate', label: 'Enterprise Slate', desc: 'Balanced cool slate tone', icon: Layout, bg: '#1e293b', border: '#475569', color: '#f1f5f9' },
                  { id: 'indigo', label: 'Deep Indigo', desc: 'Rich midnight royal theme', icon: Sparkles, bg: '#1e1b4b', border: '#4338ca', color: '#e0e7ff' }
                ].map(opt => {
                  const Icon = opt.icon;
                  const isSelected = theme === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setTheme(opt.id)}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid #6366f1' : '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-subtle)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          backgroundColor: opt.bg,
                          border: `1px solid ${opt.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: opt.color
                        }}>
                          <Icon size={13} />
                        </div>
                        {isSelected && <CheckCircle size={14} color="#6366f1" />}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>{opt.label}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>{opt.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Currency & Financial Formatting */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '14px',
              padding: '14px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: '8px'
            }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  <DollarSign size={14} color="#16a34a" />
                  <span>Display Currency</span>
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-main)',
                    fontSize: '12.5px',
                    fontWeight: 600
                  }}
                >
                  <option value="INR">₹ INR (Indian Rupee - Official HQ)</option>
                  <option value="USD">$ USD (US Dollar - Global Forex)</option>
                  <option value="AED">AED (UAE Dirham - Middle East)</option>
                  <option value="EUR">€ EUR (Euro - European Operations)</option>
                  <option value="SGD">S$ SGD (Singapore Dollar - APAC Hub)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  <Globe size={14} color="#0284c7" />
                  <span>Number Grouping Standard</span>
                </label>
                <select
                  value={numberFormat}
                  onChange={(e) => setNumberFormat(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-main)',
                    fontSize: '12.5px',
                    fontWeight: 600
                  }}
                >
                  <option value="IN_LAKHS">Indian Lakhs / Crores (e.g. ₹ 12,50,000.00)</option>
                  <option value="INTERNATIONAL">International Millions (e.g. ₹ 1,250,000.00)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  <Calendar size={14} color="#d97706" />
                  <span>Date Representation</span>
                </label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-main)',
                    fontSize: '12.5px',
                    fontWeight: 600
                  }}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 21/10/2026)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 10/21/2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601 Database standard)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  <Layout size={14} color="#8b5cf6" />
                  <span>Default Landing Module</span>
                </label>
                <select
                  value={defaultTab}
                  onChange={(e) => setDefaultTab(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-main)',
                    fontSize: '12.5px',
                    fontWeight: 600
                  }}
                >
                  <option value="dashboard">Executive Dashboard</option>
                  <option value="inventory">Inventory & Stock Status</option>
                  <option value="pos">Point of Sale (POS Terminal)</option>
                  <option value="spreadsheet">Universal Journal (ACDOCA)</option>
                  <option value="employees">Human Resources & Staff</option>
                  <option value="grc">GRC 5x5 Heatmap & Risk</option>
                </select>
              </div>
            </div>

            {/* Alexa Voice & Audio Experience */}
            <div style={{
              padding: '14px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Volume2 size={16} color="#0284c7" />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                      Alexa Voice Interactive Assistance
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Enables natural wake-word detection, vocal query synthesis, and spoken insights.
                    </div>
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
                  <input
                    type="checkbox"
                    checked={alexaVoiceEnabled}
                    onChange={(e) => setAlexaVoiceEnabled(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: alexaVoiceEnabled ? '#0284c7' : 'var(--border-color)',
                    borderRadius: '22px',
                    transition: '0.2s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: '16px',
                      width: '16px',
                      left: alexaVoiceEnabled ? '20px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.2s'
                    }} />
                  </span>
                </label>
              </div>

              {alexaVoiceEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingLeft: '24px' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', minWidth: '100px' }}>
                    Speech Rate: <strong>{voiceSpeed}x</strong>
                  </span>
                  <input
                    type="range"
                    min="0.75"
                    max="1.5"
                    step="0.05"
                    value={voiceSpeed}
                    onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                    style={{ flex: 1 }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={15} color="#ef4444" />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                      Security Incident Audio Chimes
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                      Play subtle warning tone when DLP screen capture or SQL injection is blocked.
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={securityChimes}
                  onChange={(e) => setSecurityChimes(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-color)'
            }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                style={{ fontSize: '12.5px', padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{
                  fontSize: '12.5px',
                  padding: '8px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {saving ? (
                  <>
                    <RefreshCw className="animate-spin" size={14} />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Save & Apply Preferences</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
