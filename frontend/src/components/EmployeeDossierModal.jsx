import React, { useState } from 'react';
import {
  X, User, Briefcase, DollarSign, CreditCard, FileText,
  MapPin, Phone, Mail, Calendar, Shield, Building2,
  CheckCircle2, Download, FileCheck, Eye, Award
} from 'lucide-react';

export default function EmployeeDossierModal({ employee, isOpen, onClose }) {
  if (!isOpen || !employee) return null;

  const [activeTab, setActiveTab] = useState('overview');

  // Parse documents from JSON
  let docs = [];
  if (employee.documents_json) {
    try {
      docs = typeof employee.documents_json === 'string'
        ? JSON.parse(employee.documents_json)
        : employee.documents_json;
    } catch {
      docs = [];
    }
  }

  // Calculate gross and net pay if components exist
  const basic = parseFloat(employee.basic_salary) || 0;
  const hra = parseFloat(employee.hra) || 0;
  const special = parseFloat(employee.special_allowance) || 0;
  const conveyance = parseFloat(employee.conveyance_allowance) || 0;
  const medical = parseFloat(employee.medical_allowance) || 0;
  const variable = parseFloat(employee.variable_pay) || 0;

  const grossMonthly = basic + hra + special + conveyance + medical + variable;

  const pf = parseFloat(employee.pf_deduction) || 0;
  const pt = parseFloat(employee.professional_tax) || 0;
  const tds = parseFloat(employee.tds_tax) || 0;
  const totalDeductions = pf + pt + tds;

  const netSalary = parseFloat(employee.net_salary) || Math.max(0, grossMonthly - totalDeductions);
  const annualCTC = Math.round(grossMonthly * 12);

  // Mask bank account for privacy
  const maskAccount = (num) => {
    if (!num) return '—';
    if (num.length <= 4) return num;
    return '••••••••' + num.slice(-4);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1150 }}>
      <div
        className="modal-content animate-fade-in"
        style={{
          maxWidth: '840px',
          width: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-surface)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Hero Header */}
        <div style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              color: '#ffffff',
              padding: '6px'
            }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--primary) 0%, #6366f1 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 800,
              boxShadow: '0 8px 16px rgba(0, 100, 210, 0.3)'
            }}>
              {employee.first_name?.[0]}{employee.last_name?.[0]}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  {employee.full_name || `${employee.first_name} ${employee.last_name}`}
                </h3>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  fontWeight: 700
                }}>
                  {employee.employee_code}
                </span>
                <span className="badge badge-success" style={{ fontSize: '11px' }}>
                  {employee.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', fontSize: '13px', color: '#94a3b8', flexWrap: 'wrap' }}>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{employee.designation}</span>
                <span>•</span>
                <span>{employee.department_name || 'Operations'}</span>
                <span>•</span>
                <span>Joined {employee.date_of_joining}</span>
                {employee.work_mode && (
                  <>
                    <span>•</span>
                    <span style={{ color: '#38bdf8' }}>{employee.work_mode}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-subtle)',
          padding: '0 24px',
          gap: '8px'
        }}>
          {[
            { id: 'overview', label: 'Personal & Contact', icon: User },
            { id: 'job', label: 'Job Placement', icon: Briefcase },
            { id: 'salary', label: 'Salary Structure', icon: DollarSign },
            { id: 'banking', label: 'Bank & Statutory', icon: CreditCard },
            { id: 'documents', label: `Documents (${docs.length})`, icon: FileText }
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px 14px',
                  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '13px',
                  backgroundColor: 'transparent',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer'
                }}
              >
                <Icon size={15} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Area */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>

          {/* TAB 1: PERSONAL & CONTACT */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px'
              }}>
                <div className="nexa-card" style={{ padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Official Email</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)', marginTop: '4px' }}>{employee.email}</div>
                </div>

                <div className="nexa-card" style={{ padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Phone Number</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>{employee.phone || '—'}</div>
                </div>

                <div className="nexa-card" style={{ padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Gender & DOB</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>
                    {employee.gender || 'Not specified'} • {employee.date_of_birth || '—'}
                  </div>
                </div>

                <div className="nexa-card" style={{ padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Marital Status</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>{employee.marital_status || 'Single'}</div>
                </div>
              </div>

              {/* Address Section */}
              <div style={{
                backgroundColor: 'var(--bg-subtle)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px'
              }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} color="var(--primary)" />
                    <span>Current Residential Address</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {employee.current_address || 'No current address recorded on file.'}
                  </p>
                </div>

                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} color="var(--text-muted)" />
                    <span>Permanent Address</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {employee.permanent_address || employee.current_address || 'Same as current address'}
                  </p>
                </div>
              </div>

              {/* Emergency Contact */}
              <div style={{
                backgroundColor: 'rgba(2, 132, 199, 0.05)',
                padding: '14px 18px',
                borderRadius: '10px',
                border: '1px solid var(--info-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--info-text)', fontWeight: 700 }}>
                    Emergency Contact Person
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                    {employee.emergency_contact_name || 'Not provided'} {employee.emergency_contact_relation ? `(${employee.emergency_contact_relation})` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--info-text)' }}>
                  <Phone size={14} />
                  <span>{employee.emergency_contact_phone || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: JOB PLACEMENT */}
          {activeTab === 'job' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className="nexa-card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Department</div>
                <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--text-main)' }}>
                  {employee.department_name || 'Engineering & Technology'}
                </div>
              </div>

              <div className="nexa-card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Employment Type</div>
                <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--text-main)' }}>
                  {employee.employment_type || 'Full-Time Permanent'}
                </div>
              </div>

              <div className="nexa-card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Work Arrangement</div>
                <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--primary)' }}>
                  {employee.work_mode || 'In-Office'}
                </div>
              </div>

              <div className="nexa-card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Reporting Manager</div>
                <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--text-main)' }}>
                  {employee.reporting_manager || 'Executive Management'}
                </div>
              </div>

              <div className="nexa-card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Office Branch Location</div>
                <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--text-main)' }}>
                  {employee.branch_location || 'Corporate HQ'}
                </div>
              </div>

              <div className="nexa-card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Date of Joining</div>
                <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--text-main)' }}>
                  {employee.date_of_joining}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SALARY STRUCTURE */}
          {activeTab === 'salary' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Summary Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#ffffff',
                padding: '20px',
                borderRadius: '12px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
                    Monthly Gross Pay
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px', color: '#38bdf8' }}>
                    ₹ {grossMonthly.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
                    Monthly Statutory Deductions
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px', color: '#f87171' }}>
                    - ₹ {totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
                    Net In-Hand Take Home
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 900, marginTop: '4px', color: '#4ade80' }}>
                    ₹ {netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
                    Annualized Cost to Company (CTC)
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px', color: '#fbbf24' }}>
                    ₹ {annualCTC.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Breakdown Table */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="nexa-card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--success-text)', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                    Earnings Components
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Basic Pay</span>
                      <span style={{ fontWeight: 700 }}>₹ {basic.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>House Rent Allowance (HRA)</span>
                      <span style={{ fontWeight: 600 }}>₹ {hra.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Special Allowance</span>
                      <span style={{ fontWeight: 600 }}>₹ {special.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Conveyance Allowance</span>
                      <span style={{ fontWeight: 600 }}>₹ {conveyance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Medical Allowance</span>
                      <span style={{ fontWeight: 600 }}>₹ {medical.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Performance Bonus / Variable</span>
                      <span style={{ fontWeight: 600 }}>₹ {variable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <div className="nexa-card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--danger-text)', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                    Statutory Deductions
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Provident Fund (PF / 401k)</span>
                      <span style={{ fontWeight: 700, color: 'var(--danger-text)' }}>-₹ {pf.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Professional Tax (PT)</span>
                      <span style={{ fontWeight: 600, color: 'var(--danger-text)' }}>-₹ {pt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Tax Withholding / TDS</span>
                      <span style={{ fontWeight: 600, color: 'var(--danger-text)' }}>-₹ {tds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BANK & STATUTORY */}
          {activeTab === 'banking' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className="nexa-card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Bank Name</div>
                <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--text-main)' }}>
                  {employee.bank_name || 'HDFC Bank Ltd'}
                </div>
              </div>

              <div className="nexa-card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Account Holder</div>
                <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--text-main)' }}>
                  {employee.account_holder_name || employee.full_name}
                </div>
              </div>

              <div className="nexa-card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Bank Account No.</div>
                <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', fontFamily: 'monospace' }}>
                  {maskAccount(employee.bank_account_number)}
                </div>
              </div>

              <div className="nexa-card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Bank IFSC / Routing Code</div>
                <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', fontFamily: 'monospace', color: 'var(--primary)' }}>
                  {employee.bank_ifsc || '—'}
                </div>
              </div>

              <div className="nexa-card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Income Tax PAN</div>
                <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', fontFamily: 'monospace' }}>
                  {employee.pan_tax_id || '—'}
                </div>
              </div>

              <div className="nexa-card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Aadhaar / National ID</div>
                <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', fontFamily: 'monospace' }}>
                  {employee.aadhaar_id || '—'}
                </div>
              </div>

              <div className="nexa-card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>EPFO UAN Number</div>
                <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', fontFamily: 'monospace' }}>
                  {employee.uan_number || '—'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DOCUMENTS VAULT */}
          {activeTab === 'documents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {docs.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: '12px',
                  border: '1px dashed var(--border-color)',
                  color: 'var(--text-secondary)'
                }}>
                  <FileText size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>No digital documents attached</div>
                  <p style={{ fontSize: '12px', margin: '4px 0 0' }}>
                    This employee does not currently have digital credentials uploaded to the vault.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                  {docs.map((doc, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '16px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--primary-light)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <FileCheck size={18} />
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {doc.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {doc.category || 'Document'} • {doc.size || 'PDF'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => alert(`Simulated Download for: ${doc.name}`)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Download size={13} />
                        <span>View</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: 'var(--bg-subtle)'
        }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
