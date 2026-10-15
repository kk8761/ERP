import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, KeyRound, Clock, CheckCircle2, XCircle,
  FileText, Plus, ShieldCheck, AlertTriangle, RefreshCw, X
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function SecurityElevationPage() {
  const { user, hasPermission, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('elevation'); // 'elevation' or 'audit'
  const [requests, setRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');

  // Request Elevation Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqType, setReqType] = useState('perm'); // 'perm' or 'role'
  const [selectedPerm, setSelectedPerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [reason, setReason] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [reqError, setReqError] = useState('');

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      const [reqs, perms, rls] = await Promise.all([
        apiRequest('/api/elevation/requests'),
        apiRequest('/api/admin/permissions').catch(() => []),
        apiRequest('/api/admin/roles').catch(() => [])
      ]);
      setRequests(reqs);
      setPermissions(perms);
      setRoles(rls);

      if (hasPermission('audit_logs.view')) {
        const logs = await apiRequest('/api/admin/audit-logs');
        setAuditLogs(logs);
      }
    } catch (e) {
      console.error('Failed to load security data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecurityData();
  }, []);

  const handleReview = async (requestId, decision) => {
    const note = prompt(`Enter review note for ${decision}:`) || '';
    try {
      await apiRequest(`/api/elevation/requests/${requestId}/review`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          approval_note: note
        })
      });
      setStatusMsg(`Access request #${requestId} ${decision.toLowerCase()} successfully.`);
      await refreshUser();
      loadSecurityData();
    } catch (err) {
      alert(`Review action rejected: ${err.message}`);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setReqError('');
    try {
      await apiRequest('/api/elevation/requests', {
        method: 'POST',
        body: JSON.stringify({
          requested_permission_code: reqType === 'perm' ? selectedPerm : null,
          requested_role_id: reqType === 'role' ? parseInt(selectedRole) : null,
          reason,
          duration_minutes: parseInt(durationMinutes)
        })
      });
      setShowRequestModal(false);
      setReason('');
      setStatusMsg('Temporary elevation request submitted for manager review.');
      loadSecurityData();
    } catch (err) {
      setReqError(err.message);
    }
  };

  const canApprove = hasPermission('access_requests.approve');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-brand)' }}>
            Security & Role Elevation (JIT Access)
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Just-in-Time temporary access elevation, independent review, automatic expiration, and security audit logs.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => { refreshUser(); loadSecurityData(); }}
            className="btn btn-ghost"
            title="Refresh elevation status"
          >
            <RefreshCw size={15} />
            <span>Sync Permissions</span>
          </button>

          <button onClick={() => setShowRequestModal(true)} className="btn btn-primary">
            <KeyRound size={16} />
            <span>Request Elevated Access</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div style={{ padding: '10px 14px', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--success-border)', fontSize: '13px' }}>
          {statusMsg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('elevation')}
          className={`btn ${activeTab === 'elevation' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <KeyRound size={16} />
          <span>Elevation Requests ({requests.length})</span>
        </button>

        {hasPermission('audit_logs.view') && (
          <button
            onClick={() => setActiveTab('audit')}
            className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '7px 16px', fontSize: '13px' }}
          >
            <ShieldAlert size={16} />
            <span>Security Audit Trail ({auditLogs.length})</span>
          </button>
        )}
      </div>

      {activeTab === 'elevation' ? (
        <div className="nexa-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Access Elevation Requests Queue</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Note: Self-approval is strictly prevented by server-side policy.
            </span>
          </div>

          <div className="nexa-table-wrapper">
            <table className="nexa-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Requester</th>
                  <th>Requested Privilege</th>
                  <th>Duration</th>
                  <th>Justification Reason</th>
                  <th>Status</th>
                  <th>Approved By</th>
                  <th>Valid Until</th>
                  <th style={{ textAlign: 'right' }}>Review Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No role elevation requests in the queue.
                    </td>
                  </tr>
                ) : (
                  requests.map(req => {
                    const statusClass = {
                      PENDING: 'badge-warning',
                      APPROVED: 'badge-success',
                      REJECTED: 'badge-danger',
                      EXPIRED: 'badge-info'
                    }[req.status] || 'badge-info';

                    const isSelf = req.user_id === user?.id;

                    return (
                      <tr key={req.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>#{req.id}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{req.user_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{req.user_email}</div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>
                            {req.requested_permission_code || req.requested_role_name}
                          </span>
                        </td>
                        <td>{req.duration_minutes} mins</td>
                        <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {req.reason}
                        </td>
                        <td><span className={`badge ${statusClass}`}>{req.status}</span></td>
                        <td>{req.approved_by_name || '—'}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          {req.valid_until ? new Date(req.valid_until).toLocaleTimeString() : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {req.status === 'PENDING' && canApprove && (
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              {isSelf ? (
                                <span style={{ fontSize: '11px', color: 'var(--danger-text)', fontWeight: 600 }}>
                                  Cannot self-approve
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleReview(req.id, 'APPROVED')}
                                    className="btn btn-primary"
                                    style={{ padding: '4px 8px', fontSize: '11.5px' }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleReview(req.id, 'REJECTED')}
                                    className="btn btn-danger"
                                    style={{ padding: '4px 8px', fontSize: '11.5px' }}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                          {req.status === 'APPROVED' && (
                            <span style={{ color: 'var(--success-text)', fontSize: '12px', fontWeight: 600 }}>
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Audit Trail Table */
        <div className="nexa-card" style={{ overflow: 'hidden' }}>
          <div className="nexa-table-wrapper">
            <table className="nexa-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>User Email</th>
                  <th>IP Address</th>
                  <th>Status</th>
                  <th>Event Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: '12px' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>
                      {log.action}
                    </td>
                    <td>{log.entity_name}</td>
                    <td style={{ fontWeight: 500 }}>{log.user_email || 'System'}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{log.ip_address || '—'}</td>
                    <td>
                      <span className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Request Elevation Modal */}
      {showRequestModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Request Temporary Role Elevation</h3>
              <button onClick={() => setShowRequestModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}><X size={16} /></button>
            </div>

            {reqError && (
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-sm)', marginBottom: '12px', fontSize: '13px' }}>
                {reqError}
              </div>
            )}

            <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Elevation Target</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setReqType('perm')}
                    className="btn"
                    style={{
                      backgroundColor: reqType === 'perm' ? 'var(--primary-light)' : 'var(--bg-surface)',
                      color: reqType === 'perm' ? 'var(--primary)' : 'var(--text-main)',
                      borderColor: reqType === 'perm' ? 'var(--primary)' : 'var(--border-color)',
                      fontWeight: 600
                    }}
                  >
                    Specific Permission
                  </button>
                  <button
                    type="button"
                    onClick={() => setReqType('role')}
                    className="btn"
                    style={{
                      backgroundColor: reqType === 'role' ? 'var(--primary-light)' : 'var(--bg-surface)',
                      color: reqType === 'role' ? 'var(--primary)' : 'var(--text-main)',
                      borderColor: reqType === 'role' ? 'var(--primary)' : 'var(--border-color)',
                      fontWeight: 600
                    }}
                  >
                    Role Template
                  </button>
                </div>

                {reqType === 'perm' ? (
                  <select
                    required
                    value={selectedPerm}
                    onChange={(e) => setSelectedPerm(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select target permission...</option>
                    {permissions.map(p => (
                      <option key={p.id} value={p.code}>{p.code} — {p.description}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    required
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select target role...</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.description})</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Requested Duration</label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="form-input"
                >
                  <option value="15">15 Minutes (Quick task)</option>
                  <option value="30">30 Minutes</option>
                  <option value="60">1 Hour (Standard)</option>
                  <option value="120">2 Hours</option>
                  <option value="240">4 Hours (Extended audit)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Mandatory Business Justification * (Min. 10 characters)
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="Explain why elevated privileges are required for this session..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowRequestModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Elevation Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
