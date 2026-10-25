import React, { useState } from 'react';
import { 
  Factory, Shield, UserCheck, Lock, ArrowRight, ShieldCheck, 
  KeyRound, AlertCircle, Building2, Cpu, Database, Award
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function EnterpriseLoginPage({ onLoginSuccess }) {
  const { login, verify2FA } = useAuth();
  
  const [email, setEmail] = useState('admin@nexaerp.internal');
  const [password, setPassword] = useState('Admin@NexaERP2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 2FA state
  const [mfaData, setMfaData] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  const handleDemoFill = (eMail, pwd) => {
    setEmail(eMail);
    setPassword(pwd);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your enterprise email and credentials');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await login(email, password);
      if (res && res.mfa_required) {
        setMfaData(res);
        setTwoFactorCode('123456'); // Default demo OTP code
      } else {
        if (onLoginSuccess) onLoginSuccess();
      }
    } catch (err) {
      setError(err.message || 'Enterprise authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    if (!twoFactorCode) {
      setError('Please enter your 6-digit corporate verification code');
      return;
    }
    setMfaLoading(true);
    setError('');

    try {
      await verify2FA(mfaData.temp_token, twoFactorCode);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Authentication code invalid. (Use 123456 for sandbox)');
    } finally {
      setMfaLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 10%, rgba(37, 99, 235, 0.18) 0%, rgba(15, 23, 42, 0.98) 75%)',
      padding: '24px',
      fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: 'rgba(30, 41, 59, 0.88)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(59, 130, 246, 0.35)',
        borderRadius: '16px',
        padding: '38px 34px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.45)',
        color: '#f8fafc'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            backgroundColor: 'rgba(37, 99, 235, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px'
          }}>
            <Factory size={28} color="#3b82f6" />
          </div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            NexaEnterprise Industrial Console
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
            Industrial Manufacturing, Supply Chain, Multi-Branch MNCs & Corporate GRC
          </p>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#ef4444',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '18px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* 2FA Step */}
        {mfaData ? (
          <form onSubmit={handle2FASubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              padding: '12px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              fontSize: '12.5px',
              color: '#bfdbfe'
            }}>
              🛡️ Corporate Multi-Factor Verification: Enter your authenticator code (or <code>123456</code> for sandbox).
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                6-Digit Security Token
              </label>
              <input
                type="text"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '22px',
                  fontWeight: 700,
                  textAlign: 'center',
                  letterSpacing: '8px',
                  borderRadius: '8px',
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  color: '#ffffff'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={mfaLoading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>{mfaLoading ? 'Authorizing Access...' : 'Enter Corporate Console'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          /* Credentials Form */
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Corporate Domain Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@nexaerp.internal"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  color: '#ffffff',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Access Credentials
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  color: '#ffffff',
                  fontSize: '14px'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
              }}
            >
              <span>{loading ? 'Validating Privileges...' : 'Sign In to Industrial Suite'}</span>
              <ArrowRight size={16} />
            </button>

            {/* Quick Corporate Demo Roles */}
            <div style={{ borderTop: '1px solid #334155', paddingTop: '16px', marginTop: '4px' }}>
              <div style={{ fontSize: '11.5px', color: '#94a3b8', textAlign: 'center', marginBottom: '8px', fontWeight: 600 }}>
                Corporate Executive Profiles (Click to Autofill):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleDemoFill('admin@nexaerp.internal', 'Admin@NexaERP2026!')}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    background: 'rgba(15, 23, 42, 0.5)',
                    color: '#e2e8f0',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Shield size={13} color="#3b82f6" />
                  <span>System Admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoFill('accountant@nexaerp.internal', 'Account@12345')}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    background: 'rgba(15, 23, 42, 0.5)',
                    color: '#e2e8f0',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Database size={13} color="#10b981" />
                  <span>Finance Lead</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoFill('inventory@nexaerp.internal', 'Inventory@12345')}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    background: 'rgba(15, 23, 42, 0.5)',
                    color: '#e2e8f0',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Cpu size={13} color="#f59e0b" />
                  <span>Plant / SCM Mgr</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoFill('hr@nexaerp.internal', 'Hr@12345')}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    background: 'rgba(15, 23, 42, 0.5)',
                    color: '#e2e8f0',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <UserCheck size={13} color="#ec4899" />
                  <span>HR & GRC Officer</span>
                </button>
              </div>
            </div>
          </form>
        )}


      </div>
    </div>
  );
}
