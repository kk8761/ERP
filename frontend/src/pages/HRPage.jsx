import React, { useState, useEffect } from 'react';
import {
  Users, Clock, Calendar, DollarSign, Plus, CheckCircle2,
  XCircle, UserPlus, X, Search, Filter, Eye, FileText,
  Briefcase, ShieldCheck, Download, Paperclip, MessageSquare,
  AlertCircle, HelpCircle, ChevronRight, ChevronDown, Check,
  Sparkles, BookOpen, Upload, Trash2
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import EmployeeOnboardingModal from '../components/EmployeeOnboardingModal';
import EmployeeDossierModal from '../components/EmployeeDossierModal';
import OrgHierarchyViewer from '../components/OrgHierarchyViewer';
import { GitFork, Crown } from 'lucide-react';

export default function HRPage({ initialTab = 'employees', initialAction = '' }) {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState(
    ['employees', 'hierarchy', 'attendance', 'leaves', 'payroll'].includes(initialTab) ? initialTab : 'employees'
  ); // 'employees', 'hierarchy', 'attendance', 'leaves', 'payroll'
  const [employees, setEmployees] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');

  // Step-by-step implementation guide for new users
  const [showImplementationGuide, setShowImplementationGuide] = useState(false);

  // Search & Filter
  const [empSearch, setEmpSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Modals
  const [showEmpModal, setShowEmpModal] = useState(initialAction === 'create');
  const [selectedEmployeeForDossier, setSelectedEmployeeForDossier] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);

  // Leave Review (Approve / Reject with Reason)
  const [reviewLeaveModal, setReviewLeaveModal] = useState({
    isOpen: false,
    leave: null,
    actionType: 'APPROVE', // 'APPROVE' | 'REJECT'
    comment: ''
  });

  useEffect(() => {
    if (['employees', 'hierarchy', 'attendance', 'leaves', 'payroll'].includes(initialTab)) {
      setActiveTab(initialTab);
    } else {
      setActiveTab('employees');
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialAction === 'create') {
      setActiveTab('employees');
      setShowEmpModal(true);
    }
  }, [initialAction]);

  // Leave form with document attachment support
  const [newLeave, setNewLeave] = useState({
    employee_id: '',
    leave_type: 'ANNUAL',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    days_count: 1,
    reason: '',
    document_name: '',
    document_url: '',
    document_size: ''
  });

  // Payroll form
  const [newPayroll, setNewPayroll] = useState({
    employee_id: '', month_year: 'October 2026', basic_pay: '', allowances: '5000', deductions: '2500'
  });

  const loadHRData = async () => {
    try {
      setLoading(true);
      const [emps, atts, lvs, prs] = await Promise.all([
        apiRequest('/api/hr/employees'),
        apiRequest('/api/hr/attendance'),
        apiRequest('/api/hr/leaves'),
        hasPermission('payroll.view') ? apiRequest('/api/hr/payroll') : Promise.resolve([])
      ]);
      setEmployees(emps);
      setAttendances(atts);
      setLeaves(lvs);
      setPayrolls(prs);
    } catch (e) {
      console.error('Failed to load HR data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHRData();
  }, []);

  const handleClockIn = async (employeeId) => {
    try {
      await apiRequest('/api/hr/attendance', {
        method: 'POST',
        body: JSON.stringify({ employee_id: employeeId, status: 'PRESENT' })
      });
      setStatusMsg('Attendance marked successfully.');
      loadHRData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenReviewModal = (leave, actionType = 'APPROVE') => {
    setReviewLeaveModal({
      isOpen: true,
      leave,
      actionType,
      comment: ''
    });
  };

  const handleConfirmReview = async () => {
    if (!reviewLeaveModal.leave) return;
    const { leave, actionType, comment } = reviewLeaveModal;
    if (actionType === 'REJECT' && !comment.trim()) {
      alert('A reason is required when rejecting a leave request.');
      return;
    }

    try {
      const endpoint = actionType === 'APPROVE'
        ? `/api/hr/leaves/${leave.id}/approve`
        : `/api/hr/leaves/${leave.id}/reject`;

      await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ comment: comment.trim() || undefined })
      });

      setReviewLeaveModal({ isOpen: false, leave: null, actionType: 'APPROVE', comment: '' });
      setStatusMsg(`Leave request #${leave.id} was successfully ${actionType === 'APPROVE' ? 'approved' : 'rejected'}.`);
      loadHRData();
    } catch (err) {
      alert(err.message || `Failed to ${actionType.toLowerCase()} leave request`);
    }
  };

  const handleLeaveDocUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeInMB = file.size / (1024 * 1024);
    const sizeFormatted = sizeInMB >= 1 ? `${sizeInMB.toFixed(2)} MB` : `${Math.round(file.size / 1024)} KB`;
    setNewLeave(prev => ({
      ...prev,
      document_name: file.name,
      document_size: sizeFormatted,
      document_url: `doc://${encodeURIComponent(file.name)}`
    }));
  };

  const handleRemoveLeaveDoc = () => {
    setNewLeave(prev => ({
      ...prev,
      document_name: '',
      document_size: '',
      document_url: ''
    }));
  };

  const handleCreateEmployee = async (employeePayload) => {
    try {
      await apiRequest('/api/hr/employees', {
        method: 'POST',
        body: JSON.stringify(employeePayload)
      });
      setShowEmpModal(false);
      setStatusMsg(`Employee ${employeePayload.first_name} ${employeePayload.last_name} (${employeePayload.employee_code}) successfully enlisted.`);
      loadHRData();
    } catch (err) {
      throw err;
    }
  };

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/hr/leaves', {
        method: 'POST',
        body: JSON.stringify({
          ...newLeave,
          employee_id: parseInt(newLeave.employee_id),
          days_count: parseInt(newLeave.days_count),
          document_name: newLeave.document_name || undefined,
          document_url: newLeave.document_url || undefined,
          document_size: newLeave.document_size || undefined
        })
      });
      setShowLeaveModal(false);
      setNewLeave({
        employee_id: '',
        leave_type: 'ANNUAL',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        days_count: 1,
        reason: '',
        document_name: '',
        document_url: '',
        document_size: ''
      });
      setStatusMsg('Leave request submitted with supporting documents.');
      loadHRData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleProcessPayroll = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/hr/payroll', {
        method: 'POST',
        body: JSON.stringify({
          employee_id: parseInt(newPayroll.employee_id),
          month_year: newPayroll.month_year,
          basic_pay: parseFloat(newPayroll.basic_pay),
          allowances: parseFloat(newPayroll.allowances || 0),
          deductions: parseFloat(newPayroll.deductions || 0)
        })
      });
      setShowPayrollModal(false);
      setStatusMsg('Payroll record calculated and processed.');
      loadHRData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-brand)' }}>
            Human Resources & Payroll
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Employee records, daily attendance tracking, leave workflows, and salary processing.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowImplementationGuide(!showImplementationGuide)}
            className={`btn ${showImplementationGuide ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Step-by-Step Implementation Guide for New Users"
          >
            <BookOpen size={15} />
            <span>{showImplementationGuide ? 'Hide Implementation Guide' : 'Implementation Guide'}</span>
          </button>

          {hasPermission('hr.manage') && (
            <button onClick={() => setShowEmpModal(true)} className="btn btn-secondary">
              <UserPlus size={15} />
              <span>Add Employee</span>
            </button>
          )}

          <button onClick={() => setShowLeaveModal(true)} className="btn btn-secondary">
            <Calendar size={15} />
            <span>Apply Leave</span>
          </button>

          {hasPermission('payroll.process') && (
            <button onClick={() => setShowPayrollModal(true)} className="btn btn-primary">
              <DollarSign size={16} />
              <span>Process Payroll</span>
            </button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div style={{ padding: '10px 14px', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--success-border)', fontSize: '13px' }}>
          {statusMsg}
        </div>
      )}

      {/* 🚀 STEP-BY-STEP IMPLEMENTATION GUIDE FOR NEW USERS */}
      {showImplementationGuide && (
        <div className="nexa-card animate-fade-in" style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)',
          border: '1px solid var(--primary-light)',
          borderRadius: '14px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--primary)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.05em'
                }}>
                  NEW USER ONBOARDING
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                  Enterprise HRMS Workflow & Lifecycle
                </span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
                Step-by-Step Implementation Guide
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, maxWidth: '780px' }}>
                Follow these 5 core phases to roll out and operate employee enlistment, attendance registers, leave approval/rejection governance, and monthly payroll calculation.
              </p>
            </div>
            <button
              onClick={() => setShowImplementationGuide(false)}
              className="btn btn-ghost"
              style={{ padding: '6px', borderRadius: '50%' }}
              title="Close Guide"
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {/* Step 1 */}
            <div style={{
              background: 'var(--bg-surface)',
              borderRadius: '10px',
              padding: '16px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)' }}>PHASE 1</span>
                  <span className="badge badge-success" style={{ fontSize: '10px' }}>RBAC ACTIVE</span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-main)' }}>
                  1. Org Structure & Access Roles
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Ensure departments (Tech, Sales, HR) are configured. Permissions (<code style={{ fontSize: '11px' }}>hr.manage</code>, <code style={{ fontSize: '11px' }}>leaves.manage</code>, <code style={{ fontSize: '11px' }}>payroll.process</code>) govern who can enlist staff and review leaves.
                </p>
              </div>
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Foundational</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={12} /> Configured
                </span>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{
              background: 'var(--bg-surface)',
              borderRadius: '10px',
              padding: '16px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)' }}>PHASE 2</span>
                  <span className="badge badge-info" style={{ fontSize: '10px' }}>{employees.length} ENLISTED</span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-main)' }}>
                  2. Register Employee Dossier
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Use the 5-step Corporate Wizard to capture personal info, job placement, automated salary breakdown (Basic, HRA, PF, TDS), statutory IDs (PAN, Aadhaar), and document vault (Resume, Offer Letter).
                </p>
              </div>
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => setShowEmpModal(true)}
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '12px', padding: '6px 10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                >
                  <UserPlus size={13} />
                  <span>Open Registration Wizard</span>
                </button>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{
              background: 'var(--bg-surface)',
              borderRadius: '10px',
              padding: '16px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)' }}>PHASE 3</span>
                  <span className="badge badge-warning" style={{ fontSize: '10px' }}>{attendances.length} LOGS</span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-main)' }}>
                  3. Daily Attendance Register
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Employees clock in/out daily via terminal or web interface. Records capture exact timestamps, working hours, and presence state for downstream payroll deduction accuracy.
                </p>
              </div>
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => setActiveTab('attendance')}
                  className="btn btn-ghost"
                  style={{ width: '100%', fontSize: '12px', padding: '6px 10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                >
                  <Clock size={13} />
                  <span>Go to Attendance Register</span>
                </button>
              </div>
            </div>

            {/* Step 4 */}
            <div style={{
              background: 'var(--bg-surface)',
              borderRadius: '10px',
              padding: '16px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)' }}>PHASE 4</span>
                  <span className="badge badge-info" style={{ fontSize: '10px' }}>{leaves.filter(l => l.status === 'PENDING').length} PENDING</span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-main)' }}>
                  4. Leave Requisition & Governance
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Employees apply for leaves with supporting proofs (medical certificates, travel tickets). Managers and HR review requests with 1-click Approve or Reject with mandatory reviewer justification.
                </p>
              </div>
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setShowLeaveModal(true)}
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '12px', padding: '6px 8px' }}
                >
                  Apply Leave
                </button>
                <button
                  onClick={() => setActiveTab('leaves')}
                  className="btn btn-ghost"
                  style={{ flex: 1, fontSize: '12px', padding: '6px 8px' }}
                >
                  Review
                </button>
              </div>
            </div>

            {/* Step 5 */}
            <div style={{
              background: 'var(--bg-surface)',
              borderRadius: '10px',
              padding: '16px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)' }}>PHASE 5</span>
                  <span className="badge badge-success" style={{ fontSize: '10px' }}>{payrolls.length} PAYROLLS</span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-main)' }}>
                  5. Automated Monthly Payroll Run
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Execute monthly salary runs factoring in Basic Pay, Allowances (HRA, Special), Statutory Deductions (PF, PT, TDS), and automated Net Pay calculations with immutable audit logging.
                </p>
              </div>
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => setShowPayrollModal(true)}
                  className="btn btn-primary"
                  style={{ width: '100%', fontSize: '12px', padding: '6px 10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                >
                  <DollarSign size={13} />
                  <span>Process Payroll</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('employees')}
          className={`btn ${activeTab === 'employees' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <Users size={16} />
          <span>Employees ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('hierarchy')}
          className={`btn ${activeTab === 'hierarchy' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <GitFork size={16} />
          <span>Org Hierarchy & Chains</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`btn ${activeTab === 'attendance' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <Clock size={16} />
          <span>Attendance Register</span>
        </button>

        <button
          onClick={() => setActiveTab('leaves')}
          className={`btn ${activeTab === 'leaves' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <Calendar size={16} />
          <span>Leave Requests ({leaves.length})</span>
        </button>

        {hasPermission('payroll.view') && (
          <button
            onClick={() => setActiveTab('payroll')}
            className={`btn ${activeTab === 'payroll' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '7px 16px', fontSize: '13px' }}
          >
            <DollarSign size={16} />
            <span>Payroll Records ({payrolls.length})</span>
          </button>
        )}
      </div>

      {/* Tab 1: Employees Directory */}
      {activeTab === 'employees' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Search, Filter & Quick Action Bar */}
          <div className="nexa-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search by name, code, designation, email..."
                  value={empSearch}
                  onChange={e => setEmpSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '34px', fontSize: '13px' }}
                />
                {empSearch && (
                  <button
                    onClick={() => setEmpSearch('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={15} color="var(--text-muted)" />
                <select
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '13px', padding: '6px 10px', minWidth: '180px' }}
                >
                  <option value="ALL">All Departments</option>
                  <option value="Engineering & Technology">Engineering & Technology</option>
                  <option value="Finance & Accounting">Finance & Accounting</option>
                  <option value="Procurement & SCM">Procurement & SCM</option>
                  <option value="Operations & Logistics">Operations & Logistics</option>
                  <option value="Sales & Marketing">Sales & Marketing</option>
                  <option value="Human Resources">Human Resources</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Showing <strong>{employees.filter(emp => {
                  const matchesSearch = !empSearch || (
                    emp.full_name?.toLowerCase().includes(empSearch.toLowerCase()) ||
                    emp.employee_code?.toLowerCase().includes(empSearch.toLowerCase()) ||
                    emp.designation?.toLowerCase().includes(empSearch.toLowerCase()) ||
                    emp.email?.toLowerCase().includes(empSearch.toLowerCase())
                  );
                  const matchesDept = deptFilter === 'ALL' || (emp.department_name === deptFilter);
                  return matchesSearch && matchesDept;
                }).length}</strong> of {employees.length} employees
              </span>
              {hasPermission('hr.manage') && (
                <button
                  onClick={() => setShowEmpModal(true)}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '12px' }}
                >
                  <UserPlus size={14} />
                  <span>Register Employee</span>
                </button>
              )}
            </div>
          </div>

          <div className="nexa-card" style={{ overflow: 'hidden' }}>
            <div className="nexa-table-wrapper">
              <table className="nexa-table">
                <thead>
                  <tr>
                    <th>Employee Code</th>
                    <th>Full Name & Role</th>
                    <th>Hierarchy Tier & Boss</th>
                    <th>Department</th>
                    <th>Contact & Location</th>
                    <th>Compensation</th>
                    <th>Documents Vault</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees
                    .filter(emp => {
                      const matchesSearch = !empSearch || (
                        emp.full_name?.toLowerCase().includes(empSearch.toLowerCase()) ||
                        emp.employee_code?.toLowerCase().includes(empSearch.toLowerCase()) ||
                        emp.designation?.toLowerCase().includes(empSearch.toLowerCase()) ||
                        emp.email?.toLowerCase().includes(empSearch.toLowerCase())
                      );
                      const matchesDept = deptFilter === 'ALL' || (emp.department_name === deptFilter);
                      return matchesSearch && matchesDept;
                    })
                    .map(emp => {
                      let docsCount = 0;
                      if (emp.documents_json) {
                        try {
                          const parsed = typeof emp.documents_json === 'string' ? JSON.parse(emp.documents_json) : emp.documents_json;
                          docsCount = Array.isArray(parsed) ? parsed.length : 0;
                        } catch {
                          docsCount = 0;
                        }
                      }

                      return (
                        <tr
                          key={emp.id}
                          style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                          onClick={() => setSelectedEmployeeForDossier(emp)}
                          title="Click to view full employee dossier"
                        >
                          <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>
                            {emp.employee_code}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                backgroundColor: 'var(--primary-light)',
                                color: 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 800
                              }}>
                                {emp.first_name?.[0]}{emp.last_name?.[0]}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px' }}>
                                  {emp.full_name}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  {emp.designation}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                alignSelf: 'flex-start',
                                backgroundColor: emp.hierarchy_role === 'EXECUTIVE' ? 'rgba(234, 179, 8, 0.15)' :
                                                 emp.hierarchy_role === 'MANAGER' ? 'rgba(59, 130, 246, 0.12)' :
                                                 emp.hierarchy_role === 'TEAM_LEAD' ? 'rgba(168, 85, 247, 0.12)' :
                                                 'rgba(100, 116, 139, 0.1)',
                                color: emp.hierarchy_role === 'EXECUTIVE' ? '#b45309' :
                                       emp.hierarchy_role === 'MANAGER' ? '#1d4ed8' :
                                       emp.hierarchy_role === 'TEAM_LEAD' ? '#7e22ce' :
                                       '#475569'
                              }}>
                                {emp.hierarchy_role === 'EXECUTIVE' ? '👑 Executive' :
                                 emp.hierarchy_role === 'MANAGER' ? '👔 Manager' :
                                 emp.hierarchy_role === 'TEAM_LEAD' ? '⚡ Team Lead' : '💼 Member'}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                Boss: <strong>{emp.reports_to_name || emp.reporting_manager || 'Top Authority'}</strong>
                              </span>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{emp.department_name || 'Operations'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {emp.employment_type || 'Full-Time'}
                            </div>
                          </td>
                          <td>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{emp.email}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {emp.phone || '—'} {emp.work_mode ? `• ${emp.work_mode}` : ''}
                            </div>
                          </td>
                          <td>
                            {hasPermission('payroll.view') ? (
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>
                                  {emp.net_salary ? `₹ ${parseFloat(emp.net_salary).toLocaleString('en-IN')}/mo (Net)` : (emp.basic_salary ? `₹ ${parseFloat(emp.basic_salary).toLocaleString('en-IN')} (Basic)` : '—')}
                                </div>
                                {emp.hra ? (
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    HRA: ₹{parseFloat(emp.hra).toLocaleString('en-IN')}
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Confidential</span>
                            )}
                          </td>
                          <td>
                            {docsCount > 0 ? (
                              <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                                <FileText size={12} />
                                <span>{docsCount} Verified Docs</span>
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No docs</span>
                            )}
                          </td>
                          <td>
                            <span className="badge badge-success" style={{ fontSize: '11px' }}>ACTIVE</span>
                          </td>
                          <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                onClick={() => setSelectedEmployeeForDossier(emp)}
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                title="Open Complete Employee Profile & Documents"
                              >
                                <Eye size={13} />
                                <span>Dossier</span>
                              </button>

                              <button
                                onClick={() => handleClockIn(emp.id)}
                                className="btn btn-ghost"
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                title="Record Attendance Check-in"
                              >
                                <Clock size={13} />
                                <span>Clock In</span>
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
        </div>
      )}

      {/* Tab: Centralized Company Org Hierarchy & Who is the Boss of Who */}
      {activeTab === 'hierarchy' && (
        <OrgHierarchyViewer onSelectEmployee={(emp) => setSelectedEmployeeForDossier(emp)} />
      )}

      {/* Tab 2: Attendance */}
      {activeTab === 'attendance' && (
        <div className="nexa-card" style={{ overflow: 'hidden' }}>
          <div className="nexa-table-wrapper">
            <table className="nexa-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Date</th>
                  <th>Check In Time</th>
                  <th>Check Out Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendances.map(att => (
                  <tr key={att.id}>
                    <td style={{ fontWeight: 600 }}>{att.employee_name || 'Staff Member'}</td>
                    <td>{att.date}</td>
                    <td>{att.check_in ? new Date(att.check_in).toLocaleTimeString() : '—'}</td>
                    <td>{att.check_out ? new Date(att.check_out).toLocaleTimeString() : '—'}</td>
                    <td>
                      <span className={`badge ${att.status === 'PRESENT' ? 'badge-success' : 'badge-warning'}`}>
                        {att.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Leaves */}
      {activeTab === 'leaves' && (
        <div className="nexa-card" style={{ overflow: 'hidden' }}>
          <div className="nexa-table-wrapper">
            <table className="nexa-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Period</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Supporting Document</th>
                  <th>Status & Remarks</th>
                  <th style={{ textAlign: 'right' }}>Manager Action</th>
                </tr>
              </thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No leave requests submitted yet. Click "Apply Leave" above to create one.
                    </td>
                  </tr>
                ) : (
                  leaves.map(lv => (
                    <tr key={lv.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{lv.employee_name || 'Staff Member'}</div>
                        {lv.employee_code && (
                          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--primary)' }}>
                            {lv.employee_code}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-info">{lv.leave_type}</span>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px' }}>{lv.start_date} to {lv.end_date}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700 }}>{lv.days_count}</span> day(s)
                      </td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px' }}>
                        {lv.reason}
                      </td>
                      <td>
                        {lv.document_name ? (
                          <span
                            className="badge badge-info"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                            title={`Supporting Proof: ${lv.document_name} (${lv.document_size || 'Attached'})`}
                          >
                            <Paperclip size={12} />
                            <span>{lv.document_name.length > 16 ? lv.document_name.substring(0, 14) + '...' : lv.document_name}</span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>None</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span className={`badge ${lv.status === 'APPROVED' ? 'badge-success' : lv.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`} style={{ alignSelf: 'flex-start' }}>
                            {lv.status}
                          </span>
                          {lv.reviewed_by_name && (
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              Reviewed by {lv.reviewed_by_name}
                            </div>
                          )}
                          {lv.manager_comment && (
                            <div style={{
                              fontSize: '11px',
                              color: lv.status === 'REJECTED' ? 'var(--danger-text)' : 'var(--text-muted)',
                              fontStyle: 'italic',
                              backgroundColor: lv.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-subtle)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              maxWidth: '180px'
                            }}>
                              "{lv.manager_comment}"
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {lv.status === 'PENDING' && hasPermission('leaves.manage') ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              onClick={() => handleOpenReviewModal(lv, 'APPROVE')}
                              className="btn btn-primary"
                              style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Approve Leave Request"
                            >
                              <CheckCircle2 size={13} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleOpenReviewModal(lv, 'REJECT')}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger-text)' }}
                              title="Reject Leave Request with Reason"
                            >
                              <XCircle size={13} />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {lv.status === 'PENDING' ? 'Awaiting Review' : 'Closed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Payroll */}
      {activeTab === 'payroll' && (
        <div className="nexa-card" style={{ overflow: 'hidden' }}>
          <div className="nexa-table-wrapper">
            <table className="nexa-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Month</th>
                  <th>Basic Salary</th>
                  <th>Allowances</th>
                  <th>Deductions</th>
                  <th>Net Take-Home Pay</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map(pr => (
                  <tr key={pr.id}>
                    <td style={{ fontWeight: 600 }}>{pr.employee_name} ({pr.employee_code})</td>
                    <td>{pr.month_year}</td>
                    <td>₹ {parseFloat(pr.basic_pay).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ color: 'var(--success-text)' }}>+₹ {parseFloat(pr.allowances).toFixed(2)}</td>
                    <td style={{ color: 'var(--danger-text)' }}>-₹ {parseFloat(pr.deductions).toFixed(2)}</td>
                    <td style={{ fontWeight: 800, fontSize: '14px', color: 'var(--primary)' }}>
                      ₹ {parseFloat(pr.net_pay).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td><span className="badge badge-success">{pr.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comprehensive Enterprise Employee Onboarding Modal */}
      <EmployeeOnboardingModal
        isOpen={showEmpModal}
        onClose={() => setShowEmpModal(false)}
        onEmployeeCreated={handleCreateEmployee}
        existingEmployeesCount={employees.length}
      />

      {/* Corporate Employee Profile Dossier Modal */}
      <EmployeeDossierModal
        employee={selectedEmployeeForDossier}
        isOpen={!!selectedEmployeeForDossier}
        onClose={() => setSelectedEmployeeForDossier(null)}
      />

      {/* Apply Leave Modal */}
      {showLeaveModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content animate-fade-in" style={{ padding: '24px', maxWidth: '580px', width: '92vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Apply for Leave</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Submit request with supporting justification and document proofs for HR/Manager review.
                </p>
              </div>
              <button onClick={() => setShowLeaveModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmitLeave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Employee *</label>
                <select
                  required
                  value={newLeave.employee_id}
                  onChange={(e) => setNewLeave({ ...newLeave, employee_id: e.target.value })}
                  className="form-input"
                >
                  <option value="">Select Employee...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code} • {e.designation})</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Leave Category *</label>
                  <select
                    value={newLeave.leave_type}
                    onChange={(e) => setNewLeave({ ...newLeave, leave_type: e.target.value })}
                    className="form-input"
                  >
                    <option value="ANNUAL">Annual / Earned Leave (Paid)</option>
                    <option value="SICK">Sick / Medical Leave</option>
                    <option value="CASUAL">Casual Leave</option>
                    <option value="MATERNITY">Maternity Leave</option>
                    <option value="PATERNITY">Paternity Leave</option>
                    <option value="COMPENSATORY">Compensatory Off</option>
                    <option value="UNPAID">Leave Without Pay (LWP)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Number of Days</label>
                  <input
                    type="number"
                    min="1"
                    value={newLeave.days_count}
                    onChange={(e) => setNewLeave({ ...newLeave, days_count: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Start Date *</label>
                  <input
                    type="date"
                    required
                    value={newLeave.start_date}
                    onChange={(e) => {
                      const val = e.target.value;
                      const s = new Date(val);
                      const end = new Date(newLeave.end_date);
                      const diff = Math.max(1, Math.ceil((end - s) / (1000 * 60 * 60 * 24)) + 1);
                      setNewLeave(prev => ({
                        ...prev,
                        start_date: val,
                        days_count: isNaN(diff) || diff <= 0 ? 1 : diff
                      }));
                    }}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>End Date *</label>
                  <input
                    type="date"
                    required
                    value={newLeave.end_date}
                    onChange={(e) => {
                      const val = e.target.value;
                      const s = new Date(newLeave.start_date);
                      const end = new Date(val);
                      const diff = Math.max(1, Math.ceil((end - s) / (1000 * 60 * 60 * 24)) + 1);
                      setNewLeave(prev => ({
                        ...prev,
                        end_date: val,
                        days_count: isNaN(diff) || diff <= 0 ? 1 : diff
                      }));
                    }}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Reason / Purpose *</label>
                <textarea
                  rows="2"
                  required
                  placeholder="Justification for leave (e.g. Viral fever recovery / Family emergency)..."
                  value={newLeave.reason}
                  onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                  className="form-input"
                />
              </div>

              {/* Supporting Document Upload */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Supporting Document (Doctor's Note, Medical Prescription, Travel Tickets)
                </label>
                {newLeave.document_name ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Paperclip size={16} style={{ color: 'var(--primary)' }} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>{newLeave.document_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{newLeave.document_size} • Ready for upload</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveLeaveDoc}
                      className="btn btn-ghost"
                      style={{ padding: '4px', color: 'var(--danger-text)' }}
                      title="Remove Document"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px dashed var(--border-color)',
                    backgroundColor: 'var(--bg-subtle)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: 'var(--text-secondary)'
                  }}>
                    <Upload size={16} />
                    <span>Upload Medical Certificate / Ticket Proof (PDF, JPG, PNG)</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.docx"
                      onChange={handleLeaveDocUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowLeaveModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Leave Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Review & Approval/Rejection Modal */}
      {reviewLeaveModal.isOpen && reviewLeaveModal.leave && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '520px', width: '90vw', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {reviewLeaveModal.actionType === 'APPROVE' ? (
                  <CheckCircle2 size={20} style={{ color: 'var(--success-text)' }} />
                ) : (
                  <XCircle size={20} style={{ color: 'var(--danger-text)' }} />
                )}
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>
                  {reviewLeaveModal.actionType === 'APPROVE' ? 'Approve Leave Request' : 'Reject Leave Request'}
                </h3>
              </div>
              <button
                onClick={() => setReviewLeaveModal({ isOpen: false, leave: null, actionType: 'APPROVE', comment: '' })}
                className="btn btn-ghost"
                style={{ padding: '6px' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Leave Summary Card */}
            <div style={{
              padding: '14px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {reviewLeaveModal.leave.employee_name || 'Staff Member'}
                </span>
                <span className="badge badge-info">{reviewLeaveModal.leave.leave_type}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                {reviewLeaveModal.leave.start_date} to {reviewLeaveModal.leave.end_date} ({reviewLeaveModal.leave.days_count} day{reviewLeaveModal.leave.days_count > 1 ? 's' : ''})
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--border-color)' }}>
                <strong>Employee Reason:</strong> "{reviewLeaveModal.leave.reason}"
              </div>
              {reviewLeaveModal.leave.document_name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: 'var(--primary)' }}>
                  <Paperclip size={13} />
                  <span>Attached Proof: {reviewLeaveModal.leave.document_name} ({reviewLeaveModal.leave.document_size || 'Document'})</span>
                </div>
              )}
            </div>

            {/* Manager Comment Input */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                {reviewLeaveModal.actionType === 'REJECT'
                  ? 'Reason for Rejection * (Mandatory for compliance)'
                  : 'Approval Remarks / Supervisor Note (Optional)'}
              </label>
              <textarea
                rows="3"
                className="form-input"
                placeholder={reviewLeaveModal.actionType === 'REJECT'
                  ? 'e.g., Critical sprint release scheduled for these dates; please reschedule or coordinate with tech lead.'
                  : 'e.g., Medical documentation verified. Approved.'}
                value={reviewLeaveModal.comment}
                onChange={(e) => setReviewLeaveModal(prev => ({ ...prev, comment: e.target.value }))}
                style={{ width: '100%', resize: 'vertical' }}
              />
              {reviewLeaveModal.actionType === 'REJECT' && (
                <div style={{ fontSize: '11px', color: 'var(--danger-text)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} />
                  <span>The employee will see this reason in their leave register.</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setReviewLeaveModal({ isOpen: false, leave: null, actionType: 'APPROVE', comment: '' })}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReview}
                className={reviewLeaveModal.actionType === 'APPROVE' ? 'btn btn-primary' : 'btn btn-secondary'}
                style={reviewLeaveModal.actionType === 'REJECT' ? {
                  backgroundColor: 'var(--danger-bg)',
                  color: 'var(--danger-text)',
                  borderColor: 'var(--danger-border)'
                } : {}}
              >
                {reviewLeaveModal.actionType === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Payroll Modal */}
      {showPayrollModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Process Monthly Payroll</h3>
              <button onClick={() => setShowPayrollModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}><X size={16} /></button>
            </div>

            <form onSubmit={handleProcessPayroll} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Employee *</label>
                <select
                  required
                  value={newPayroll.employee_id}
                  onChange={(e) => {
                    const emp = employees.find(emp => emp.id === parseInt(e.target.value));
                    setNewPayroll({
                      ...newPayroll,
                      employee_id: e.target.value,
                      basic_pay: emp?.basic_salary ? emp.basic_salary.toString() : '40000'
                    });
                  }}
                  className="form-input"
                >
                  <option value="">Select Employee...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Salary Month</label>
                  <input
                    type="text"
                    value={newPayroll.month_year}
                    onChange={(e) => setNewPayroll({ ...newPayroll, month_year: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Basic Pay (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newPayroll.basic_pay}
                    onChange={(e) => setNewPayroll({ ...newPayroll, basic_pay: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Allowances (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPayroll.allowances}
                    onChange={(e) => setNewPayroll({ ...newPayroll, allowances: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Deductions (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPayroll.deductions}
                    onChange={(e) => setNewPayroll({ ...newPayroll, deductions: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowPayrollModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Calculate & Process</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
