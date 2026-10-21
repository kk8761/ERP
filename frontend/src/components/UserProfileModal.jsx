import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Building2, Shield, Key, CheckCircle,
  AlertTriangle, Lock, LogOut, X, Sparkles, Laptop, Clock
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function UserProfileModal({ isOpen, onClose, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Edit fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  // Password change fields
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwChanging, setPwChanging] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiRequest('/api/settings/profile');
      setProfile(res);
      setFullName(res.full_name || '');
      setEmail(res.email || '');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await apiRequest('/api/settings/profile', 'PUT', {
        full_name: fullName,
        email: email
      });
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadProfile();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match');
      return;
    }
    setPwChanging(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await apiRequest('/api/auth/change-password', 'POST', {
        current_password: currentPassword,
        new_password: newPassword
      });
      setSuccessMsg('Password changed successfully! Keep your new credentials secure.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordChange(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Password change failed');
    } finally {
      setPwChanging(false);
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
          overflowY: 'auto',
          padding: '28px',
          borderRadius: '16px',
          backgroundColor: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0064d2 0%, #1e40af 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 800,
              boxShadow: '0 4px 10px rgba(0, 100, 210, 0.3)'
            }}>
              {(fullName || 'SA').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                {fullName || 'System Administrator'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(0, 100, 210, 0.1)',
                  color: '#0064d2',
                  fontSize: '11px',
                  fontWeight: 700
                }}>
                  {profile?.roles?.[0] || 'Administrator'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                  {profile?.branch_name || 'Main Store (Hyderabad HQ)'}
                </span>
              </div>
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

        {/* Profile Information Form */}
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-app, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
              Personal Identity & Corporate Contacts
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Work Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '7px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#0064d2',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </div>
        </form>

        {/* Security & Authentication Panel */}
        <div style={{
          marginTop: '18px',
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-app, #f8fafc)',
          border: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={16} color="#16a34a" />
                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                  Two-Factor Authentication (2FA) & Security
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Protected with mandatory TOTP authenticator challenge on every session login.
              </p>
            </div>
            <span style={{
              padding: '3px 10px',
              borderRadius: '12px',
              backgroundColor: '#dcfce7',
              color: '#15803d',
              fontWeight: 700,
              fontSize: '11px',
              border: '1px solid #bbf7d0'
            }}>
              Active & Protected
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>Account Password</span>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Enforced with PBKDF2 cryptographic hashing and brute-force lockouts.
              </p>
            </div>
            <button
              onClick={() => setShowPasswordChange(!showPasswordChange)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #cbd5e1)',
                backgroundColor: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {showPasswordChange ? 'Cancel' : 'Change Password'}
            </button>
          </div>

          {showPasswordChange && (
            <form onSubmit={handleChangePassword} style={{
              marginTop: '6px',
              padding: '12px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  type="submit"
                  disabled={pwChanging}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {pwChanging ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Roles & Active Effective Permissions */}
        <div style={{
          marginTop: '18px',
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-app, #f8fafc)',
          border: '1px solid var(--border-color, #e2e8f0)'
        }}>
          <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
            Granted Roles & Effective Scopes
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {(profile?.roles || ['System Administrator']).map((role, idx) => (
              <span key={idx} style={{
                padding: '4px 10px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#0064d2',
                fontSize: '11.5px',
                fontWeight: 700,
                border: '1px solid #bfdbfe'
              }}>
                👑 {role}
              </span>
            ))}
            <span style={{
              padding: '4px 10px',
              borderRadius: '8px',
              backgroundColor: '#ecfdf5',
              color: '#065f46',
              fontSize: '11.5px',
              fontWeight: 700,
              border: '1px solid #a7f3d0'
            }}>
              ✓ {profile?.effective_permissions?.length || 24} Enterprise Privileges
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          marginTop: '22px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={() => {
              onClose();
              if (onLogout) onLogout();
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={14} /> Sign Out of NexaERP
          </button>

          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              backgroundColor: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
