import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, KeyRound, Clock, CheckCircle2, XCircle,
  FileText, Plus, ShieldCheck, AlertTriangle, RefreshCw, X,
  Users, UserPlus, UserX, UserCheck, Trash2, Edit
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function SecurityElevationPage({ initialTab = 'users' }) {
  const { user, hasPermission, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState(
    ['users', 'elevation', 'audit'].includes(initialTab) ? initialTab : 'users'
  ); // 'users', 'elevation', or 'audit'
  const [usersList, setUsersList] = useState([]);
  const [requests, setRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (['users', 'elevation', 'audit'].includes(initialTab)) {
      setActiveTab(initialTab);
    } else {
      setActiveTab('users');
    }
  }, [initialTab]);

  // Request Elevation Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqType, setReqType] = useState('perm');
  const [selectedPerm, setSelectedPerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [reason, setReason] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [reqError, setReqError] = useState('');

  // Create User Modal
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRoleIds, setNewRoleIds] = useState([]);
  const [userError, setUserError] = useState('');

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

      if (hasPermission('users.view') || user?.is_superuser) {
        const uList = await apiRequest('/api/admin/users').catch(() => []);
        setUsersList(uList);
      }

      if (hasPermission('audit_logs.view') || user?.is_superuser) {
        const logs = await apiRequest('/api/admin/audit-logs').catch(() => []);
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
          action: decision,
          review_notes: note
        })
      });
      setStatusMsg(`Request #${requestId} was ${decision}ed successfully.`);
      loadSecurityData();
    } catch (err) {
      alert(`Review failed: ${err.message}`);
    }
  };

  const handleCreateElevation = async (e) => {
    e.preventDefault();
    setReqError('');

    try {
      await apiRequest('/api/elevation/request', {
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
      setStatusMsg('Elevation request submitted for managerial review.');
      loadSecurityData();
    } catch (err) {
      setReqError(err.message);
    }
  };

  // User Management Actions (Add, Toggle Status, Remove)
  const handleToggleUserStatus = async (targetUser) => {
    const newStatus = !targetUser.is_active;
    const confirmMsg = `Are you sure you want to ${newStatus ? 'activate' : 'suspend / deactivate'} account for ${targetUser.email}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await apiRequest(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: newStatus })
      });
      setStatusMsg(`User ${targetUser.email} status changed to ${newStatus ? 'Active' : 'Deactivated'}.`);
      loadSecurityData();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (!window.confirm(`Permanently delete account for ${targetUser.email}? This action cannot be undone.`)) return;

    try {
      await apiRequest(`/api/admin/users/${targetUser.id}`, {
        method: 'DELETE'
      });
      setStatusMsg(`User ${targetUser.email} has been permanently deleted.`);
      loadSecurityData();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserError('');

    try {
      await apiRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: newEmail,
          full_name: newName,
          password: newPassword,
          role_ids: newRoleIds
        })
      });

      setShowCreateUserModal(false);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setNewRoleIds([]);
      setStatusMsg(`User ${newEmail} created successfully.`);
      loadSecurityData();
    } catch (err) {
      setUserError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-brand)' }}>
            User Governance, Roles & JIT Elevation
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Complete enterprise lifecycle control: User status modifications, role delegations, JIT temporary elevations, and audit logs.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => { refreshUser(); loadSecurityData(); }}
            className="btn btn-ghost"
            title="Refresh status"
          >
            <RefreshCw size={15} />
            <span>Sync System State</span>
          </button>

          {(hasPermission('users.manage') || user?.is_superuser) && (
            <button onClick={() => setShowCreateUserModal(true)} className="btn btn-ghost" style={{ backgroundColor: 'var(--bg-subtle)' }}>
              <UserPlus size={16} />
              <span>Add New User</span>
            </button>
          )}

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

      {/* Tabs: Users, Elevation Requests, Audit Trail */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        {(hasPermission('users.view') || user?.is_superuser) && (
          <button
            onClick={() => setActiveTab('users')}
            className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '7px 16px', fontSize: '13px' }}
          >
            <Users size={16} />
            <span>Users & Operators Directory ({usersList.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('elevation')}
          className={`btn ${activeTab === 'elevation' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <KeyRound size={16} />
          <span>JIT Elevation Requests ({requests.length})</span>
        </button>

        {(hasPermission('audit_logs.view') || user?.is_superuser) && (
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

      {/* Tab 1: Users Directory & Status Management */}
      {activeTab === 'users' && (
        <div className="nexa-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Enterprise User Accounts (Company HQ & Storefront Operators)</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Administrator permissions allow real-time status toggling (Active / Suspended) and account deletion.
            </span>
          </div>

          <div className="nexa-table-wrapper">
            <table className="nexa-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Full Name</th>
                  <th>Email Address</th>
                  <th>Assigned Roles</th>
                  <th>Branch Location</th>
                  <th>Account Status</th>
                  <th style={{ textAlign: 'right' }}>Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => {
                  const isCurrent = u.id === user?.id;
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>#{u.id}</td>
                      <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {u.roles?.map((r, i) => (
                            <span key={i} className="nexa-badge" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{u.branch_name || 'Main Store'}</td>
                      <td>
                        <span className={`nexa-badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {u.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            disabled={isCurrent}
                            className={`btn ${u.is_active ? 'btn-ghost' : 'btn-primary'}`}
                            style={{
                              padding: '4px 10px',
                              fontSize: '12px',
                              color: isCurrent ? 'var(--text-muted)' : (u.is_active ? 'var(--warning-text)' : 'white')
                            }}
                            title={isCurrent ? 'Cannot suspend own account' : (u.is_active ? 'Suspend account' : 'Activate account')}
                          >
                            {u.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                            <span>{u.is_active ? 'Suspend' : 'Activate'}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isCurrent}
                            className="btn btn-ghost"
                            style={{ padding: '4px 8px', color: isCurrent ? 'var(--text-muted)' : 'var(--danger-text)' }}
                            title={isCurrent ? 'Cannot delete own account' : 'Delete user'}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: JIT Elevation Requests */}
      {activeTab === 'elevation' && (
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
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>#{r.id}</td>
                    <td>{r.requester_name} ({r.requester_email})</td>
                    <td>
                      <span className="nexa-badge" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                        {r.requested_role_name || r.requested_permission_code}
                      </span>
                    </td>
                    <td>{r.duration_minutes} mins</td>
                    <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.reason}
                    </td>
                    <td>
                      <span className={`nexa-badge ${
                        r.status === 'APPROVED' ? 'badge-success' :
                        r.status === 'REJECTED' ? 'badge-danger' :
                        r.status === 'REVOKED' ? 'badge-danger' :
                        r.status === 'EXPIRED' ? 'badge-warning' : 'badge-primary'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td>{r.approver_name || '-'}</td>
                    <td>{r.expires_at ? new Date(r.expires_at).toLocaleTimeString() : '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {r.status === 'PENDING' && (
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => handleReview(r.id, 'approve')}
                            disabled={r.user_id === user?.id}
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            title={r.user_id === user?.id ? "Cannot approve your own request" : "Approve privilege"}
                          >
                            <CheckCircle2 size={13} />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleReview(r.id, 'reject')}
                            disabled={r.user_id === user?.id}
                            className="btn btn-ghost"
                            style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--danger-text)' }}
                          >
                            <XCircle size={13} />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}
                      {r.status === 'APPROVED' && (
                        <button
                          onClick={() => handleReview(r.id, 'revoke')}
                          className="btn btn-ghost"
                          style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--danger-text)' }}
                        >
                          Revoke Early
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Security Audit Trail */}
      {activeTab === 'audit' && (
        <div className="nexa-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Immutable Security Audit Trail</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Logs all authentication, access evaluations, and modifications</span>
          </div>

          <div className="nexa-table-wrapper">
            <table className="nexa-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>User / Initiator</th>
                  <th>Target Entity</th>
                  <th>Status</th>
                  <th>IP Address</th>
                  <th>Audit Context</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td>
                      <span className="nexa-badge" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.user_email || 'System'}</td>
                    <td>{log.entity_name} {log.entity_id ? `#${log.entity_id}` : ''}</td>
                    <td>
                      <span className={`nexa-badge ${
                        log.status === 'SUCCESS' ? 'badge-success' :
                        log.status === 'DENIED' ? 'badge-danger' :
                        log.status === 'FAILURE' ? 'badge-danger' : 'badge-primary'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>{log.ip_address}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add New User */}
      {showCreateUserModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="nexa-card" style={{ width: '100%', maxWidth: '480px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserPlus size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Provision New User Account</h3>
              </div>
              <button onClick={() => setShowCreateUserModal(false)} className="btn btn-ghost" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            {userError && (
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                {userError}
              </div>
            )}

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@nexaerp.internal"
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Initial Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Assign Role</label>
                <select
                  className="form-input"
                  value={newRoleIds[0] || ''}
                  onChange={(e) => setNewRoleIds([parseInt(e.target.value)])}
                  required
                >
                  <option value="" disabled>Select Role...</option>
                  {(roles.length > 0 ? roles : [
                    { id: 1, name: 'System Administrator' },
                    { id: 2, name: 'Branch Manager' },
                    { id: 3, name: 'Sales Representative / Cashier' },
                    { id: 4, name: 'Inventory Clerk' },
                    { id: 5, name: 'Accountant' },
                    { id: 6, name: 'HR Officer' },
                    { id: 7, name: 'Auditor' }
                  ]).map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowCreateUserModal(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Request Elevation */}
      {showRequestModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="nexa-card" style={{ width: '100%', maxWidth: '480px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <KeyRound size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Request Temporary Privilege Elevation</h3>
              </div>
              <button onClick={() => setShowRequestModal(false)} className="btn btn-ghost" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            {reqError && (
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                {reqError}
              </div>
            )}

            <form onSubmit={handleCreateElevation} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Elevation Target</label>
                <select className="form-input" value={reqType} onChange={(e) => setReqType(e.target.value)}>
                  <option value="perm">Specific Permission (Least Privilege)</option>
                  <option value="role">Complete Role Profile</option>
                </select>
              </div>

              {reqType === 'perm' ? (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Select Permission</label>
                  <select className="form-input" value={selectedPerm} onChange={(e) => setSelectedPerm(e.target.value)} required>
                    <option value="">Choose a permission...</option>
                    {permissions.map((p) => (
                      <option key={p.id} value={p.code}>{p.code} — {p.description}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Select Role</label>
                  <select className="form-input" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} required>
                    <option value="">Choose a role template...</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Requested Duration (Minutes)</label>
                <input
                  type="number"
                  min="15"
                  max="480"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Mandatory Justification Reason</label>
                <textarea
                  required
                  rows="3"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this temporary privilege is required for business purposes..."
                  className="form-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowRequestModal(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
