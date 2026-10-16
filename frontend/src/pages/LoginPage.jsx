import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, UserCheck, Building2, Store, ShoppingBag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  
  // Profile type: 'company' (HQ / Executive / Admin / Finance) vs 'shopkeeper' (Store / Retail / POS / Cashier)
  const [profileType, setProfileType] = useState('company');
  const [email, setEmail] = useState('admin@nexaerp.internal');
  const [password, setPassword] = useState('Admin@NexaERP2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
        maxWidth: '460px',
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
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: profileType === 'company' 
              ? 'linear-gradient(135deg, #0064d2 0%, #0098ff 100%)' 
              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto',
            boxShadow: profileType === 'company' 
              ? '0 4px 12px rgba(0, 100, 210, 0.3)' 
              : '0 4px 12px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.2s ease'
          }}>
            {profileType === 'company' ? 'N' : <ShoppingBag size={24} />}
          </div>
          <h1 style={{
            fontFamily: 'var(--font-brand)',
            fontSize: '24px',
            fontWeight: 800,
            color: 'var(--text-main)',
            letterSpacing: '-0.3px'
          }}>
            Nexa<span style={{ color: profileType === 'company' ? 'var(--primary)' : '#10b981' }}>ERP</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {profileType === 'company' 
              ? 'Corporate Headquarters & Multi-Branch Enterprise Console' 
              : 'Storefront POS Terminal & Retail Counter Portal'}
          </p>
        </div>

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

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
              padding: '11px',
              fontSize: '14px',
              marginTop: '4px',
              backgroundColor: profileType === 'company' ? 'var(--primary)' : '#10b981',
              borderColor: profileType === 'company' ? 'var(--primary)' : '#10b981'
            }}
          >
            {loading ? 'Authenticating...' : (profileType === 'company' ? 'Enter Corporate Console' : 'Open Store Register')}
            {!loading && <ArrowRight size={16} />}
          </button>
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
      </div>
    </div>
  );
}
