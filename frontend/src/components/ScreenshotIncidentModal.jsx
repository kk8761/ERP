import React, { useState } from 'react';
import { 
  ShieldAlert, X, CheckCircle2, Clock, User, Globe, 
  ExternalLink, Maximize2, AlertTriangle, Monitor, Download
} from 'lucide-react';

export default function ScreenshotIncidentModal({ incident, onClose, onReviewed }) {
  const [isReviewing, setIsReviewing] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  if (!incident) return null;

  const handleReview = async () => {
    try {
      setIsReviewing(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/security/screenshot-incidents/${incident.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_reviewed: true })
      });
      if (res.ok) {
        const updated = await res.json();
        if (onReviewed) onReviewed(updated);
        onClose();
      }
    } catch (err) {
      console.error('Failed to review screenshot incident:', err);
    } finally {
      setIsReviewing(false);
    }
  };

  const formattedDate = new Date(incident.captured_at).toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div 
        className="nexa-card animate-scale-up"
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden'
        }}
      >
        {/* Header Banner */}
        <div style={{
          padding: '18px 24px',
          background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldAlert size={24} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em' }}>
                DLP Security Incident #INC-{incident.id}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                Unauthorized Screen Capture Trigger Detected & Logged
              </div>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              opacity: 0.8
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Metadata Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px'
          }}>
            {/* Who Did It */}
            <div style={{
              padding: '14px',
              backgroundColor: 'var(--bg-app)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <User size={14} color="var(--primary)" />
                <span style={{ fontWeight: 600 }}>Offending User (Who)</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                {incident.user_name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--primary)', fontFamily: 'monospace', marginTop: '2px' }}>
                {incident.user_email}
              </div>
            </div>

            {/* Date & Time */}
            <div style={{
              padding: '14px',
              backgroundColor: 'var(--bg-app)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <Clock size={14} color="#e11d48" />
                <span style={{ fontWeight: 600 }}>Date & Time</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                {formattedDate}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Logged to SOC Audit Trail
              </div>
            </div>

            {/* Page & Trigger */}
            <div style={{
              padding: '14px',
              backgroundColor: 'var(--bg-app)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <Globe size={14} color="#16a34a" />
                <span style={{ fontWeight: 600 }}>Location & Action</span>
              </div>
              <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-main)', wordBreak: 'break-all' }}>
                {incident.page_url}
              </div>
              <div style={{ marginTop: '4px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {incident.action_type}
                </span>
              </div>
            </div>
          </div>

          {/* Captured Image Evidence Section */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                <Monitor size={16} color="var(--primary)" />
                <span>Captured Screen Image (Evidence Preview):</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={incident.image_data}
                  download={`DLP_Incident_${incident.id}_${incident.user_name.replace(/\s+/g, '_')}.jpg`}
                  className="btn btn-ghost"
                  style={{ fontSize: '12px', padding: '4px 8px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Download size={13} />
                  <span>Download Snapshot</span>
                </a>
                <button
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="btn btn-ghost"
                  style={{ fontSize: '12px', padding: '4px 8px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Maximize2 size={13} />
                  <span>{isZoomed ? 'Shrink' : 'Zoom'}</span>
                </button>
              </div>
            </div>

            <div style={{
              backgroundColor: '#090d16',
              borderRadius: '8px',
              border: '2px solid #ef4444',
              padding: '8px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <img
                src={incident.image_data}
                alt={`Screen capture by ${incident.user_name}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: isZoomed ? '700px' : '360px',
                  width: 'auto',
                  borderRadius: '4px',
                  display: 'inline-block',
                  transition: 'max-height var(--transition-normal)'
                }}
              />
            </div>
          </div>

          {/* Security Notice Note */}
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderLeft: '4px solid #ef4444',
            padding: '12px 16px',
            borderRadius: '0 6px 6px 0',
            fontSize: '12px',
            color: 'var(--text-main)'
          }}>
            <strong>Compliance Policy Notice:</strong> All screen capture actions on confidential financial, employee, or procurement records are restricted under NexaERP Enterprise DLP Policy. This capture has been archived and an email notification has been dispatched to security administrators.
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-app)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Status:</span>
            {incident.is_reviewed ? (
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <CheckCircle2 size={14} /> Reviewed & Resolved
              </span>
            ) : (
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <AlertTriangle size={14} /> Pending Administrator Review
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ fontSize: '13px' }}
            >
              Close
            </button>

            {!incident.is_reviewed && (
              <button
                onClick={handleReview}
                disabled={isReviewing}
                className="btn btn-primary"
                style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <CheckCircle2 size={15} />
                <span>{isReviewing ? 'Saving...' : 'Acknowledge & Mark Reviewed'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
