import React, { useState, useEffect } from 'react';
import {
  Users, Clock, Calendar, DollarSign, Plus, CheckCircle2,
  XCircle, UserPlus, X
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function HRPage() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('employees'); // 'employees', 'attendance', 'leaves', 'payroll'
  const [employees, setEmployees] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');

  // Modals
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);

  // New Employee form
  const [newEmp, setNewEmp] = useState({
    employee_code: '', first_name: '', last_name: '', email: '', phone: '',
    designation: '', basic_salary: '50000.00'
  });

  // Leave form
  const [newLeave, setNewLeave] = useState({
    employee_id: '', leave_type: 'ANNUAL',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    days_count: 1, reason: ''
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

  const handleApproveLeave = async (leaveId) => {
    try {
      await apiRequest(`/api/hr/leaves/${leaveId}/approve`, { method: 'POST' });
      setStatusMsg('Leave request approved.');
      loadHRData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/hr/employees', {
        method: 'POST',
        body: JSON.stringify({
          ...newEmp,
          basic_salary: parseFloat(newEmp.basic_salary)
        })
      });
      setShowEmpModal(false);
      setStatusMsg('Employee profile registered.');
      loadHRData();
    } catch (err) {
      alert(err.message);
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
          days_count: parseInt(newLeave.days_count)
        })
      });
      setShowLeaveModal(false);
      setStatusMsg('Leave request submitted.');
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
        <div className="nexa-card" style={{ overflow: 'hidden' }}>
          <div className="nexa-table-wrapper">
            <table className="nexa-table">
              <thead>
                <tr>
                  <th>Employee Code</th>
                  <th>Full Name</th>
                  <th>Designation</th>
                  <th>Department</th>
                  <th>Email Address</th>
                  <th>Phone</th>
                  {hasPermission('payroll.view') && <th>Basic Salary</th>}
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Attendance Action</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>
                      {emp.employee_code}
                    </td>
                    <td style={{ fontWeight: 600 }}>{emp.full_name}</td>
                    <td>{emp.designation}</td>
                    <td>{emp.department_name || 'Operations'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{emp.email}</td>
                    <td>{emp.phone || '—'}</td>
                    {hasPermission('payroll.view') && (
                      <td style={{ fontWeight: 700 }}>
                        {emp.basic_salary ? `₹ ${parseFloat(emp.basic_salary).toLocaleString('en-IN')}` : 'Hidden'}
                      </td>
                    )}
                    <td><span className="badge badge-success">ACTIVE</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleClockIn(emp.id)}
                        className="btn btn-ghost"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        title="Mark Present"
                      >
                        <Clock size={14} />
                        <span>Clock In</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Manager Review</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map(lv => (
                  <tr key={lv.id}>
                    <td style={{ fontWeight: 600 }}>{lv.employee_name || 'Employee'}</td>
                    <td><span className="badge badge-info">{lv.leave_type}</span></td>
                    <td>{lv.start_date} to {lv.end_date}</td>
                    <td>{lv.days_count} day(s)</td>
                    <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lv.reason}</td>
                    <td>
                      <span className={`badge ${lv.status === 'APPROVED' ? 'badge-success' : 'badge-warning'}`}>
                        {lv.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {lv.status === 'PENDING' && hasPermission('leaves.manage') && (
                        <button
                          onClick={() => handleApproveLeave(lv.id)}
                          className="btn btn-primary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                          <CheckCircle2 size={14} />
                          <span>Approve</span>
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

      {/* Add Employee Modal */}
      {showEmpModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Register New Employee</h3>
              <button onClick={() => setShowEmpModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Employee Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-1005"
                    value={newEmp.employee_code}
                    onChange={(e) => setNewEmp({ ...newEmp, employee_code: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Procurement Specialist"
                    value={newEmp.designation}
                    onChange={(e) => setNewEmp({ ...newEmp, designation: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>First Name *</label>
                  <input
                    type="text"
                    required
                    value={newEmp.first_name}
                    onChange={(e) => setNewEmp({ ...newEmp, first_name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Last Name *</label>
                  <input
                    type="text"
                    required
                    value={newEmp.last_name}
                    onChange={(e) => setNewEmp({ ...newEmp, last_name: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Email *</label>
                  <input
                    type="email"
                    required
                    value={newEmp.email}
                    onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Phone</label>
                  <input
                    type="text"
                    value={newEmp.phone}
                    onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Basic Salary (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newEmp.basic_salary}
                  onChange={(e) => setNewEmp({ ...newEmp, basic_salary: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowEmpModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {showLeaveModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Apply for Leave</h3>
              <button onClick={() => setShowLeaveModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmitLeave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Employee *</label>
                <select
                  required
                  value={newLeave.employee_id}
                  onChange={(e) => setNewLeave({ ...newLeave, employee_id: e.target.value })}
                  className="form-input"
                >
                  <option value="">Select Employee...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.designation})</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Leave Type</label>
                  <select
                    value={newLeave.leave_type}
                    onChange={(e) => setNewLeave({ ...newLeave, leave_type: e.target.value })}
                    className="form-input"
                  >
                    <option value="ANNUAL">Annual Leave</option>
                    <option value="SICK">Sick Leave</option>
                    <option value="CASUAL">Casual Leave</option>
                    <option value="UNPAID">Unpaid Leave</option>
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

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Reason *</label>
                <textarea
                  rows="2"
                  required
                  placeholder="Justification for leave request..."
                  value={newLeave.reason}
                  onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowLeaveModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Leave Request</button>
              </div>
            </form>
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
