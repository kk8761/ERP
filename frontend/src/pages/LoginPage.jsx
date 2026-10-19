import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Mail, 
  ArrowRight, 
  UserCheck, 
  Building2, 
  Store, 
  ShoppingBag,
  KeyRound,
  QrCode,
  Copy,
  Check,
  RotateCcw,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login, verify2FA } = useAuth();
  
  // Profile type: 'company' (HQ / Executive / Admin / Finance) vs 'shopkeeper' (Store / Retail / POS / Cashier)
  const [profileType, setProfileType] = useState('company');
  const [email, setEmail] = useState('admin@nexaerp.internal');
  const [password, setPassword] = useState('Admin@NexaERP2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 2FA Authentication Challenge State
  const [step, setStep] = useState('credentials'); // 'credentials' | '2fa'
  const [mfaData, setMfaData] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [showQrCode, setShowQrCode] = useState(true);
  const [refreshingQr, setRefreshingQr] = useState(false);

  const handleProfileSwitch = (type) => {
    setProfileType(type);
    setError('');
    if (type === 'company') {
      setEmail('admin@nexaerp.internal');
      setPassword('Admin@NexaERP2026!');
    } else {
      setEmail('cashier@nexaerp.internal');
      setPassword('Cashier@12345');
    }
  };

  const handleCredentialsSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await login(email, password);
      if (res && res.mfa_required) {
        setMfaData(res);
        setStep('2fa');
        setShowQrCode(true);
        setTwoFactorCode('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeVerification = async (tempToken, codeToVerify) => {
    const cleanCode = (codeToVerify || twoFactorCode).trim().replace(/[^0-9]/g, '');
    if (!cleanCode || cleanCode.length !== 6) {
      setError('Please enter the full 6-digit code from your Authenticator app.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await verify2FA(tempToken || mfaData?.temp_token, cleanCode);
    } catch (err) {
      setError(err.message || 'Invalid 6-digit verification code. Please check your Authenticator app.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FASubmit = async (e) => {
    e?.preventDefault();
    await executeVerification(mfaData?.temp_token, twoFactorCode);
  };

  const handleCodeChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
    setTwoFactorCode(val);
    if (val.length === 6 && mfaData?.temp_token && !loading) {
      executeVerification(mfaData.temp_token, val);
    }
  };

  const handleCopySecret = () => {
    if (mfaData?.secret) {
      navigator.clipboard.writeText(mfaData.secret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleRefreshQr = async () => {
    if (!mfaData?.temp_token) return;
    setRefreshingQr(true);
    setError('');
    try {
      const res = await fetch(`/api/auth/mfa/refresh-qr/${mfaData.temp_token}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setMfaData(prev => ({
          ...prev,
          secret: data.secret,
          qr_code_base64: data.qr_code_base64,
          provisioning_uri: data.provisioning_uri
        }));
        setShowQrCode(true);
      } else {
        setError('Could not generate fresh QR code.');
      }
    } catch (err) {
      setError('Failed to refresh QR code: ' + err.message);
    } finally {
      setRefreshingQr(false);
    }
  };

  const handleQuickAutofill = async () => {
    if (!mfaData?.temp_token) return;
    setAutofilling(true);
    setError('');
    try {
      const res = await fetch(`/api/auth/mfa/demo-code/${mfaData.temp_token}`);
      if (res.ok) {
        const data = await res.json();
        setTwoFactorCode(data.current_code);
        await executeVerification(mfaData.temp_token, data.current_code);
      } else {
        setError('Demo code generator not available for this session.');
      }
    } catch (err) {
      setError('Could not fetch demo code: ' + err.message);
    } finally {
      setAutofilling(false);
    }
  };

  const handleDemoLogin = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-app)',
      padding: '24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xl)',
        padding: '36px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: step === '2fa'
              ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
              : (profileType === 'company' 
                ? '#010c22' 
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'),
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto',
            boxShadow: step === '2fa'
              ? '0 6px 20px rgba(2, 132, 199, 0.45)'
              : (profileType === 'company' 
                ? '0 6px 20px rgba(0, 100, 210, 0.45)' 
                : '0 4px 12px rgba(16, 185, 129, 0.3)'),
            border: profileType === 'company' && step !== '2fa' ? '1px solid rgba(0, 152, 255, 0.35)' : 'none',
            overflow: 'hidden',
            padding: profileType === 'company' && step !== '2fa' ? '4px' : '0',
            transition: 'all 0.2s ease'
          }}>
            {step === '2fa' ? (
              <ShieldCheck size={32} />
            ) : (
              profileType === 'company' ? (
                <img
                  src="/assets/nexa_icon_transparent.png"
                  alt="Nexa ERP"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <ShoppingBag size={28} />
              )
            )}
          </div>
          <h1 style={{
            fontFamily: 'var(--font-brand)',
            fontSize: '24px',
            fontWeight: 800,
            color: 'var(--text-main)',
            letterSpacing: '-0.3px',
            marginBottom: '2px'
          }}>
            Nexa<span style={{ color: step === '2fa' ? '#0284c7' : (profileType === 'company' ? 'var(--primary)' : '#10b981') }}>ERP</span>
          </h1>
          <div style={{
            fontSize: '11px',
            color: step === '2fa' ? '#0284c7' : '#0098ff',
            fontWeight: 700,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '4px'
          }}>
            {step === '2fa' ? 'Two-Factor Authentication' : 'An ERP Tool For Everyone'}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {step === '2fa'
              ? 'Enter the temporary 6-digit code from Google/Microsoft Authenticator'
              : (profileType === 'company' 
                ? 'Corporate Headquarters & Multi-Branch Enterprise Console' 
                : 'Storefront POS Terminal & Retail Counter Portal')}
          </p>
        </div>

        {/* STEP 1: CREDENTIALS (Email & Password) */}
        {step === 'credentials' && (
          <>
            {/* Profile Switcher Tabs: Company vs Shopkeeper */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              padding: '4px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <button
                type="button"
                onClick={() => handleProfileSwitch('company')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: profileType === 'company' ? 'var(--bg-surface)' : 'transparent',
                  color: profileType === 'company' ? 'var(--primary)' : 'var(--text-secondary)',
                  boxShadow: profileType === 'company' ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Building2 size={16} />
                <span>Company HQ</span>
              </button>

              <button
                type="button"
                onClick={() => handleProfileSwitch('shopkeeper')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: profileType === 'shopkeeper' ? 'var(--bg-surface)' : 'transparent',
                  color: profileType === 'shopkeeper' ? '#10b981' : 'var(--text-secondary)',
                  boxShadow: profileType === 'shopkeeper' ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Store size={16} />
                <span>Shopkeeper / POS</span>
              </button>
            </div>

            {error && (
              error.toLowerCase().includes('sql injection') || error.toLowerCase().includes('security alert') ? (
                <div style={{
                  padding: '14px 16px',
                  backgroundColor: '#fef2f2',
                  color: '#991b1b',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #f87171',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px' }}>
                    <ShieldAlert size={18} color="#dc2626" />
                    <span>NexaShield: Intrusion Intercepted</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.5, color: '#7f1d1d' }}>
                    {error}
                  </p>
                </div>
              ) : (
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--danger-bg)',
                  color: 'var(--danger-text)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--danger-border)',
                  fontSize: '13px',
                  textAlign: 'center'
                }}>
                  {error}
                </div>
              )
            )}

            {/* Login Form */}
            <form onSubmit={handleCredentialsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                  {profileType === 'company' ? 'Enterprise Email' : 'Store Operator Email'}
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  gap: '10px'
                }}>
                  <Mail size={16} color="var(--text-muted)" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={profileType === 'company' ? 'admin@nexaerp.internal' : 'cashier@nexaerp.internal'}
                    className="form-input"
                    style={{ border: 'none', padding: 0, width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  gap: '10px'
                }}>
                  <Lock size={16} color="var(--text-muted)" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="form-input"
                    style={{ border: 'none', padding: 0, width: '100%' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  marginTop: '4px',
                  backgroundColor: profileType === 'company' ? 'var(--primary)' : '#10b981',
                  borderColor: profileType === 'company' ? 'var(--primary)' : '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {loading ? 'Validating Password...' : (profileType === 'company' ? 'Enter Corporate Console' : 'Open Store Register')}
                {!loading && <ArrowRight size={16} />}
              </button>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '-4px' }}>
                Protected with 6-digit Authenticator Code (2FA)
              </div>
            </form>

            {/* Dynamic Demo Credentials based on selected Profile */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textAlign: 'center' }}>
                {profileType === 'company' ? 'Company HQ Roles (Click to fill):' : 'Store Operator Accounts (Click to fill):'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {(profileType === 'company' ? [
                  { role: 'System Admin', email: 'admin@nexaerp.internal', pass: 'Admin@NexaERP2026!' },
                  { role: 'Accountant', email: 'accountant@nexaerp.internal', pass: 'Account@12345' },
                  { role: 'Inventory Mgr', email: 'inventory@nexaerp.internal', pass: 'Inventory@12345' },
                  { role: 'HR Manager', email: 'hr@nexaerp.internal', pass: 'Hr@12345' }
                ] : [
                  { role: 'Cashier / POS', email: 'cashier@nexaerp.internal', pass: 'Cashier@12345' },
                  { role: 'Shop Assistant', email: 'cashier@nexaerp.internal', pass: 'Cashier@12345' }
                ]).map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDemoLogin(p.email, p.pass)}
                    className="btn btn-ghost"
                    style={{
                      fontSize: '11.5px',
                      padding: '6px 8px',
                      justifyContent: 'flex-start',
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <UserCheck size={13} color={profileType === 'company' ? 'var(--primary)' : '#10b981'} />
                    <span>{p.role}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* STEP 2: TEMPORARY 6-DIGIT AUTHENTICATOR CODE */}
        {step === '2fa' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Account Info Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              backgroundColor: '#f0f9ff',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #bae6fd',
              fontSize: '12px'
            }}>
              <span style={{ color: '#0369a1', fontWeight: 600 }}>Employee Account:</span>
              <span style={{ color: '#0c4a6e', fontWeight: 700, fontFamily: 'monospace' }}>{email}</span>
            </div>

            {/* Authenticator QR Code & Key Box */}
            {mfaData?.qr_code_base64 && (
              <div style={{
                padding: '16px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                  <Smartphone size={17} color="#0284c7" />
                  <span>Scan in Google or Microsoft Authenticator</span>
                </div>

                <div style={{
                  backgroundColor: '#ffffff',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '2px solid #0284c7',
                  boxShadow: '0 4px 16px rgba(2, 132, 199, 0.18)'
                }}>
                  <img 
                    src={`data:image/png;base64,${mfaData.qr_code_base64}`} 
                    alt="Authenticator QR Code"
                    style={{ width: '180px', height: '180px', display: 'block' }}
                  />
                </div>

                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  Open your Authenticator app, tap <strong>"+"</strong>, and point camera at this QR code.
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  maxWidth: '100%'
                }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Key:</span>
                  <code style={{ fontSize: '12.5px', fontWeight: 800, color: '#0369a1', letterSpacing: '1.2px' }}>
                    {mfaData?.secret}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    title="Copy Secret Key"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748b' }}
                  >
                    {copiedKey ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRefreshQr}
                  disabled={refreshingQr}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RotateCcw size={12} className={refreshingQr ? 'animate-spin' : ''} />
                  <span>{refreshingQr ? 'Generating fresh QR...' : 'Need a fresh QR code? Click to regenerate'}</span>
                </button>
              </div>
            )}

            {/* Verified Step Pill */}
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#f0fdf4',
              color: '#166534',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #bbf7d0',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Check size={16} color="#16a34a" />
              <span>Step 2 of 2: Password confirmed. Enter 6-digit Authenticator code to proceed.</span>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px',
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger-text)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--danger-border)',
                fontSize: '13px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            {/* 6-Digit Code Input Form */}
            <form onSubmit={handleVerify2FASubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  display: 'block',
                  marginBottom: '8px',
                  textAlign: 'center'
                }}>
                  Temporary 6-Digit Authenticator Code
                </label>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoFocus
                    required
                    value={twoFactorCode}
                    onChange={handleCodeChange}
                    placeholder="• • • • • •"
                    style={{
                      width: '260px',
                      fontSize: '26px',
                      fontWeight: 800,
                      textAlign: 'center',
                      letterSpacing: '10px',
                      fontFamily: 'monospace',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '2px solid #0284c7',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-main)',
                      outline: 'none',
                      boxShadow: '0 0 0 3px rgba(2, 132, 199, 0.15)'
                    }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '6px' }}>
                  Code refreshes every 30 seconds on your Authenticator app (Google/MS Authenticator)
                </div>
              </div>

              {/* Enter Corporate Console / Open Register Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  marginTop: '4px',
                  backgroundColor: profileType === 'company' ? 'var(--primary)' : '#10b981',
                  borderColor: profileType === 'company' ? 'var(--primary)' : '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading
                  ? 'Entering Console...'
                  : (profileType === 'company' ? 'Enter Corporate Console' : 'Open Store Register')}
                {!loading && <ArrowRight size={16} />}
              </button>

              {/* Developer / Demo Quick-fill button */}
              <button
                type="button"
                onClick={handleQuickAutofill}
                disabled={autofilling || loading}
                className="btn btn-ghost"
                style={{
                  fontSize: '12px',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px',
                  backgroundColor: '#f0f9ff',
                  border: '1px dashed #bae6fd',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <RotateCcw size={13} className={autofilling ? 'animate-spin' : ''} />
                <span>{autofilling ? 'Retrieving code & logging in...' : '1-Click Autofill Code & Enter Console (Demo Testing)'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setTwoFactorCode('');
                  setError('');
                }}
                className="btn btn-ghost"
                style={{
                  fontSize: '12.5px',
                  color: 'var(--text-secondary)',
                  padding: '6px'
                }}
              >
                ← Back to Username & Password
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
