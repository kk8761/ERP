import React, { useEffect } from 'react';
import { ShieldAlert, X, Lock, AlertOctagon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ActionNotAllowedModal({ isOpen, onClose }) {
  const { user } = useAuth();

  useEffect(() => {
    if (!isOpen) return;

    // Auto dismiss after 3.5 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 3500);

    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          color: 'var(--text-main, #0f172a)',
          borderRadius: '16px',
          maxWidth: '460px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.25), 0 0 0 1px rgba(239, 68, 68, 0.2)',
          border: '1px solid #fecaca',
          overflow: 'hidden'
        }}
      >
        {/* Header Strip with Red Gradient */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)',
          borderBottom: '1px solid #fca5a5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)'
            }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '16px', color: '#991b1b' }}>
                Action Not Allowed
              </div>
              <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 600 }}>
                Enterprise Security & Data Loss Prevention
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#991b1b',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', lineHeight: '1.5' }}>
            Right-click context menu and browser inspection are restricted under <strong>NexaERP Security Policy (DLP-2026)</strong> for safety and customer data confidentiality.
          </p>

          {/* Security Log Card */}
          <div style={{
            padding: '12px 14px',
            borderRadius: '10px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            fontSize: '11.5px',
            color: '#64748b',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Security Event:</span>
              <strong style={{ color: '#0f172a' }}>SEC-CTX-RESTRICTED</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>User Account:</span>
              <strong style={{ color: '#0f172a' }}>{user?.email || 'Authorized Operator'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Role Level:</span>
              <strong style={{ color: '#0064d2' }}>{user?.roles?.[0] || 'Authenticated User'}</strong>
            </div>
          </div>
        </div>

        {/* Footer Button */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: '#fafafa'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 18px',
              borderRadius: '8px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '12.5px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)'
            }}
          >
            Acknowledge & Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
