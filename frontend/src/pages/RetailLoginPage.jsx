import React, { useState } from 'react';
import { 
  Store, ShoppingCart, UserCheck, Lock, ArrowRight, ShieldCheck, 
  KeyRound, AlertCircle, Sparkles, Building2, Smartphone, Tag,
  PlusCircle, UserPlus, CheckCircle2, MapPin, Phone
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function RetailLoginPage({ onLoginSuccess }) {
  const { login, verify2FA, registerStore } = useAuth();
  
  // Mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState('login');

  // Login credentials
  const [email, setEmail] = useState('shopadmin@nexaerp.internal');
  const [password, setPassword] = useState('ShopAdmin@12345');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 2FA state
  const [mfaData, setMfaData] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  // Store Registration state
  const [regData, setRegData] = useState({
    store_name: '',
    owner_name: '',
    email: '',
    password: '',
    phone: '',
    business_type: 'apparel',
    city: 'Hyderabad',
    address: ''
  });

  const handleDemoFill = (eMail, pwd) => {
    setEmail(eMail);
    setPassword(pwd);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your store operator email and password');
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
      setError(err.message || 'Store login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regData.store_name || !regData.owner_name || !regData.email || !regData.password) {
      setError('Please fill in all required fields to register your store');
      return;
    }
    if (regData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await registerStore(regData);
      setSuccessMsg(res.message || 'Store created successfully! Entering as Default Admin...');
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess();
      }, 700);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try a different email or check values.');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    if (!twoFactorCode) {
      setError('Please enter 6-digit store verification code');
      return;
    }
    setMfaLoading(true);
    setError('');

    try {
      await verify2FA(mfaData.temp_token, twoFactorCode);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Verification failed. Enter any 6 digits for demo.');
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
      background: 'radial-gradient(circle at 50% 10%, rgba(16, 185, 129, 0.18) 0%, rgba(15, 23, 42, 0.98) 75%)',
      padding: '24px',
      fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: authMode === 'register' ? '540px' : '440px',
        backgroundColor: 'rgba(30, 41, 59, 0.92)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        borderRadius: '18px',
        padding: '34px 30px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 25px rgba(16, 185, 129, 0.12)',
        color: '#f8fafc',
        transition: 'all 0.25s ease'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '15px',
            backgroundColor: 'rgba(16, 185, 129, 0.16)',
            border: '1px solid rgba(16, 185, 129, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <Store size={28} color="#10b981" />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 5px', letterSpacing: '-0.02em', color: '#ffffff' }}>
            NexaRetail Merchant Terminal
          </h1>
          <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: 0 }}>
            Dedicated Portal for Shopkeepers, Cloth Stores, Sports Hubs & Supermarkets
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Create Store Account */}
        <div style={{
          display: 'flex',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '10px',
          padding: '4px',
          marginBottom: '20px',
          border: '1px solid rgba(51, 65, 85, 0.7)'
        }}>
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: '7px',
              border: 'none',
              backgroundColor: authMode === 'login' ? '#10b981' : 'transparent',
              color: authMode === 'login' ? '#ffffff' : '#94a3b8',
              fontWeight: authMode === 'login' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <KeyRound size={14} />
            <span>Sign In to Store</span>
          </button>

          <button
            type="button"
            onClick={() => { setAuthMode('register'); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: '7px',
              border: 'none',
              backgroundColor: authMode === 'register' ? '#10b981' : 'transparent',
              color: authMode === 'register' ? '#ffffff' : '#94a3b8',
              fontWeight: authMode === 'register' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <UserPlus size={14} />
            <span>Create Store Account</span>
          </button>
        </div>

        {/* Alerts */}
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
            marginBottom: '16px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '8px',
            color: '#34d399',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* VIEW 1: CREATE STORE ACCOUNT (DEFAULT ADMIN) */}
        {authMode === 'register' ? (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Admin Badge Notice */}
            <div style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#a7f3d0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShieldCheck size={18} color="#10b981" />
              <div>
                <strong>Default Administrator Account:</strong> You will have 100% full authority to add employees, cashiers, manage stock, and issue POS credentials.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                  Store / Shop Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Royal Fashion Mart"
                  value={regData.store_name}
                  onChange={(e) => setRegData({ ...regData, store_name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 11px',
                    borderRadius: '7px',
                    border: '1px solid #334155',
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    color: '#ffffff',
                    fontSize: '13.5px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                  Business Type / Category *
                </label>
                <select
                  value={regData.business_type}
                  onChange={(e) => setRegData({ ...regData, business_type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 11px',
                    borderRadius: '7px',
                    border: '1px solid #334155',
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    color: '#ffffff',
                    fontSize: '13px'
                  }}
                >
                  <option value="apparel" style={{ background: '#1e293b' }}>👗 Clothing & Apparel Shop</option>
                  <option value="sports" style={{ background: '#1e293b' }}>🏏 Sports & Fitness Store</option>
                  <option value="grocery" style={{ background: '#1e293b' }}>🛒 Supermarket & Grocery</option>
                  <option value="footwear" style={{ background: '#1e293b' }}>👟 Footwear & Accessories</option>
                  <option value="general" style={{ background: '#1e293b' }}>📦 General Retail Store</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                  Store Owner / Admin Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vikram Sharma"
                  value={regData.owner_name}
                  onChange={(e) => setRegData({ ...regData, owner_name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 11px',
                    borderRadius: '7px',
                    border: '1px solid #334155',
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    color: '#ffffff',
                    fontSize: '13.5px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                  Phone / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={regData.phone}
                  onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 11px',
                    borderRadius: '7px',
                    border: '1px solid #334155',
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    color: '#ffffff',
                    fontSize: '13.5px'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                  Owner Email (Admin Login) *
                </label>
                <input
                  type="email"
                  placeholder="owner@yourstore.com"
                  value={regData.email}
                  onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 11px',
                    borderRadius: '7px',
                    border: '1px solid #334155',
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    color: '#ffffff',
                    fontSize: '13.5px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                  Admin Password *
                </label>
                <input
                  type="password"
                  placeholder="Min. 6 characters"
                  value={regData.password}
                  onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 11px',
                    borderRadius: '7px',
                    border: '1px solid #334155',
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    color: '#ffffff',
                    fontSize: '13.5px'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                Store Location / Street Address
              </label>
              <input
                type="text"
                placeholder="Market Road, Shop #12"
                value={regData.address}
                onChange={(e) => setRegData({ ...regData, address: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 11px',
                  borderRadius: '7px',
                  border: '1px solid #334155',
                  backgroundColor: 'rgba(15, 23, 42, 0.65)',
                  color: '#ffffff',
                  fontSize: '13.5px'
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
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
              }}
            >
              <span>{loading ? 'Creating Store & Admin Account...' : 'Open Store & Enter as Admin'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          /* VIEW 2: SIGN IN FORM */
          mfaData ? (
            <form onSubmit={handle2FASubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                padding: '12px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                fontSize: '12.5px',
                color: '#a7f3d0'
              }}>
                🔒 Security Verification: Enter your 6-digit register code (or <code>123456</code> for sandbox).
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  6-Digit Register Code
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
                    border: '1px solid rgba(16, 185, 129, 0.5)',
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
                  backgroundColor: '#10b981',
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
                <span>{mfaLoading ? 'Opening Counter...' : 'Open Store Counter'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Store Operator / Admin Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="shopadmin@nexaerp.internal"
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
                  Password
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
                  backgroundColor: '#10b981',
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
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
                }}
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Store Counter'}</span>
                <ArrowRight size={16} />
              </button>

              {/* Quick Retail Demo Roles */}
              <div style={{ borderTop: '1px solid #334155', paddingTop: '16px', marginTop: '4px' }}>
                <div style={{ fontSize: '11.5px', color: '#94a3b8', textAlign: 'center', marginBottom: '8px', fontWeight: 600 }}>
                  Demo Accounts (Click to Autofill):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleDemoFill('shopadmin@nexaerp.internal', 'ShopAdmin@12345')}
                    style={{
                      gridColumn: 'span 2',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: '#a7f3d0',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <UserCheck size={13} color="#10b981" />
                    <span>👑 Store Admin: shopadmin@nexaerp.internal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoFill('cashier@nexaerp.internal', 'Cashier@12345')}
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
                    <ShoppingCart size={13} color="#10b981" />
                    <span>Cashier / POS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoFill('assistant@nexaerp.internal', 'Assistant@12345')}
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
                    <Tag size={13} color="#3b82f6" />
                    <span>Shop Assistant</span>
                  </button>
                </div>
              </div>
            </form>
          )
        )}

      </div>
    </div>
  );
}
