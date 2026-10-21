import React, { useState } from 'react';
import {
  X, User, Briefcase, DollarSign, CreditCard, FileText,
  Upload, Trash2, CheckCircle2, AlertCircle, Sparkles,
  ArrowRight, ArrowLeft, Shield, Building2, MapPin, Phone,
  Mail, Calendar, Award, Check, Eye, HelpCircle
} from 'lucide-react';

export default function EmployeeOnboardingModal({ isOpen, onClose, onEmployeeCreated, existingEmployeesCount = 0, branches = [] }) {
  if (!isOpen) return null;

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const defaultBranch = branches[0] || { id: 1, name: 'Hyderabad Global HQ' };

  // Initial Form State
  const initialFormState = {
    // 1. Personal & Contact
    employee_code: `EMP-${1001 + existingEmployeesCount}`,
    first_name: '',
    last_name: '',
    gender: 'Male',
    date_of_birth: '1995-06-15',
    marital_status: 'Single',
    blood_group: 'B+',
    email: '',
    phone: '',
    alternate_phone: '',
    current_address: '',
    permanent_address: '',
    same_as_current: true,
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: 'Spouse',

    // 2. Job & Placement
    designation: '',
    department_id: '',
    department_name: 'Engineering & Technology',
    employment_type: 'Full-Time',
    work_mode: 'Hybrid',
    date_of_joining: new Date().toISOString().split('T')[0],
    branch_id: defaultBranch.id,
    branch_location: defaultBranch.name,
    reporting_manager: 'VP of Operations',
    work_shift: 'General (9:00 AM - 6:00 PM)',
    probation_period: '3 Months',

    // 3. Compensation & CTC Structure
    annual_ctc: '720000',
    basic_salary: '30000',
    hra: '15000',
    special_allowance: '8000',
    conveyance_allowance: '2000',
    medical_allowance: '2000',
    variable_pay: '3000',
    pf_deduction: '1800',
    professional_tax: '200',
    tds_tax: '2500',
    net_salary: '55500',

    // 4. Banking & Statutory
    bank_name: 'HDFC Bank',
    account_holder_name: '',
    bank_account_number: '',
    confirm_account_number: '',
    bank_ifsc: '',
    account_type: 'Salary Account',
    pan_tax_id: '',
    aadhaar_id: '',
    uan_number: '',

    // 5. Document Vault
    documents: [],
    notes: '',

    // 6. Branch Access & App Role Governance (Stored in MongoDB Community / Free Document Store)
    hierarchy_role: 'MEMBER',
    reports_to_id: '',
    app_role: 'Staff / Associate',
    branch_access_policy: 'ASSIGNED_ONLY',
    accessible_branches: ['Main Store (Hyderabad HQ)'],
    module_permissions: {
      pos: true,
      inventory: true,
      sales: true,
      finance: false,
      hr: false,
      procurement: true,
      manufacturing: false,
      grc: false,
      settings: false,
      ai_copilot: true
    }
  };

  const [form, setForm] = useState(initialFormState);

  // Auto-calculate CTC breakdown
  const handleAutoCalculateCTC = (totalCTC) => {
    const ctc = parseFloat(totalCTC) || 0;
    if (ctc <= 0) return;

    const monthlyGross = ctc / 12;
    const basic = Math.round(monthlyGross * 0.50);
    const hra = Math.round(basic * 0.40);
    const conveyance = 1600;
    const medical = 1250;
    const special = Math.max(0, Math.round(monthlyGross - (basic + hra + conveyance + medical)));
    const variable = 0;

    // Deductions
    const pf = Math.min(1800, Math.round(basic * 0.12));
    const pt = 200;
    let tds = 0;
    if (ctc > 1000000) tds = Math.round((monthlyGross * 0.15));
    else if (ctc > 500000) tds = Math.round((monthlyGross * 0.05));

    const totalDeductions = pf + pt + tds;
    const net = Math.round(monthlyGross - totalDeductions);

    setForm(prev => ({
      ...prev,
      annual_ctc: ctc.toString(),
      basic_salary: basic.toString(),
      hra: hra.toString(),
      conveyance_allowance: conveyance.toString(),
      medical_allowance: medical.toString(),
      special_allowance: special.toString(),
      variable_pay: variable.toString(),
      pf_deduction: pf.toString(),
      professional_tax: pt.toString(),
      tds_tax: tds.toString(),
      net_salary: net.toString()
    }));
  };

  // Recalculate totals whenever earnings/deductions change
  const calcGross = () => {
    return (
      (parseFloat(form.basic_salary) || 0) +
      (parseFloat(form.hra) || 0) +
      (parseFloat(form.special_allowance) || 0) +
      (parseFloat(form.conveyance_allowance) || 0) +
      (parseFloat(form.medical_allowance) || 0) +
      (parseFloat(form.variable_pay) || 0)
    );
  };

  const calcDeductions = () => {
    return (
      (parseFloat(form.pf_deduction) || 0) +
      (parseFloat(form.professional_tax) || 0) +
      (parseFloat(form.tds_tax) || 0)
    );
  };

  const grossMonthly = calcGross();
  const deductionsMonthly = calcDeductions();
  const netInHand = Math.max(0, grossMonthly - deductionsMonthly);
  const calculatedAnnualCTC = Math.round(grossMonthly * 12);

  // File upload handler
  const handleFileUpload = (categoryKey, file) => {
    if (!file) return;

    // Format file size
    const sizeInMB = file.size / (1024 * 1024);
    const sizeFormatted = sizeInMB >= 1 ? `${sizeInMB.toFixed(2)} MB` : `${Math.round(file.size / 1024)} KB`;

    const newDoc = {
      id: `${categoryKey}-${Date.now()}`,
      category: categoryKey,
      name: file.name,
      size: sizeFormatted,
      type: file.type || 'application/octet-stream',
      upload_date: new Date().toISOString().split('T')[0],
      status: 'VERIFIED'
    };

    setForm(prev => {
      const existingFiltered = prev.documents.filter(d => d.category !== categoryKey);
      return {
        ...prev,
        documents: [...existingFiltered, newDoc]
      };
    });
  };

  const handleRemoveDoc = (categoryKey) => {
    setForm(prev => ({
      ...prev,
      documents: prev.documents.filter(d => d.category !== categoryKey)
    }));
  };

  // Prefill sample enterprise employee
  const handlePrefillSample = () => {
    const code = `EMP-${1000 + Math.floor(Math.random() * 8999)}`;
    setForm({
      employee_code: code,
      first_name: 'Ananya',
      last_name: 'Sharma',
      gender: 'Female',
      date_of_birth: '1993-04-18',
      marital_status: 'Married',
      blood_group: 'O+',
      email: `ananya.sharma@nexaerp.internal`,
      phone: '+91 98200 12345',
      alternate_phone: '+91 98200 99887',
      current_address: 'Flat 402, Prestige Lakeside Habitat, Varthur, Bengaluru, Karnataka - 560087',
      permanent_address: 'Flat 402, Prestige Lakeside Habitat, Varthur, Bengaluru, Karnataka - 560087',
      same_as_current: true,
      emergency_contact_name: 'Vikram Sharma',
      emergency_contact_phone: '+91 98200 54321',
      emergency_contact_relation: 'Spouse',

      designation: 'Senior Cloud Solutions Architect',
      department_id: '1',
      department_name: 'Engineering & Technology',
      employment_type: 'Full-Time',
      work_mode: 'Hybrid',
      date_of_joining: new Date().toISOString().split('T')[0],
      branch_location: 'Corporate HQ - Bengaluru',
      reporting_manager: 'Karthik Reddy (Head of Tech)',
      work_shift: 'General (9:00 AM - 6:00 PM)',
      probation_period: '3 Months',

      annual_ctc: '1440000',
      basic_salary: '60000',
      hra: '24000',
      special_allowance: '25150',
      conveyance_allowance: '1600',
      medical_allowance: '1250',
      variable_pay: '8000',
      pf_deduction: '1800',
      professional_tax: '200',
      tds_tax: '6500',
      net_salary: '111500',

      bank_name: 'HDFC Bank Ltd',
      account_holder_name: 'Ananya Sharma',
      bank_account_number: '50100492817264',
      confirm_account_number: '50100492817264',
      bank_ifsc: 'HDFC0001234',
      account_type: 'Salary Account',
      pan_tax_id: 'ABCPK1234F',
      aadhaar_id: '7845 9012 3456',
      uan_number: '100987654321',

      documents: [
        { id: '1', category: 'resume', name: 'Ananya_Sharma_Resume_2026.pdf', size: '1.42 MB', type: 'application/pdf', upload_date: '2026-10-19', status: 'VERIFIED' },
        { id: '2', category: 'government_id', name: 'Aadhaar_Card_Front_Back.pdf', size: '940 KB', type: 'application/pdf', upload_date: '2026-10-19', status: 'VERIFIED' },
        { id: '3', category: 'address_proof', name: 'Electricity_Bill_Utility.pdf', size: '610 KB', type: 'application/pdf', upload_date: '2026-10-19', status: 'VERIFIED' },
        { id: '4', category: 'offer_letter', name: 'Signed_Employment_Agreement.pdf', size: '2.10 MB', type: 'application/pdf', upload_date: '2026-10-19', status: 'VERIFIED' }
      ],
      notes: 'Background verification cleared. Relieving documents received from previous employer.'
    });
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    // Basic Validation
    if (!form.employee_code.trim()) {
      setErrorMsg('Employee Code is required.');
      setCurrentStep(1);
      return;
    }
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setErrorMsg('First Name and Last Name are required.');
      setCurrentStep(1);
      return;
    }
    if (!form.email.trim()) {
      setErrorMsg('Official Email address is required.');
      setCurrentStep(1);
      return;
    }
    if (!form.designation.trim()) {
      setErrorMsg('Designation is required.');
      setCurrentStep(2);
      return;
    }
    if (form.confirm_account_number && form.bank_account_number && form.bank_account_number !== form.confirm_account_number) {
      setErrorMsg('Bank Account Numbers do not match.');
      setCurrentStep(4);
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        employee_code: form.employee_code.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        designation: form.designation.trim(),
        department_id: form.department_id ? parseInt(form.department_id) : null,
        date_of_joining: form.date_of_joining,

        // Personal
        gender: form.gender,
        date_of_birth: form.date_of_birth || null,
        marital_status: form.marital_status,
        current_address: form.current_address || null,
        permanent_address: form.same_as_current ? form.current_address : form.permanent_address || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
        emergency_contact_relation: form.emergency_contact_relation || null,

        // Job
        employment_type: form.employment_type,
        work_mode: form.work_mode,
        branch_id: form.branch_id ? parseInt(form.branch_id) : 1,
        branch_location: form.branch_location,
        reporting_manager: form.reporting_manager,

        // Compensation Breakdown
        basic_salary: parseFloat(form.basic_salary) || 0,
        hra: parseFloat(form.hra) || 0,
        conveyance_allowance: parseFloat(form.conveyance_allowance) || 0,
        special_allowance: parseFloat(form.special_allowance) || 0,
        medical_allowance: parseFloat(form.medical_allowance) || 0,
        variable_pay: parseFloat(form.variable_pay) || 0,
        pf_deduction: parseFloat(form.pf_deduction) || 0,
        professional_tax: parseFloat(form.professional_tax) || 0,
        tds_tax: parseFloat(form.tds_tax) || 0,
        net_salary: parseFloat(netInHand) || 0,

        // Banking & Tax
        bank_name: form.bank_name || null,
        account_holder_name: form.account_holder_name || `${form.first_name} ${form.last_name}`,
        bank_account_number: form.bank_account_number || null,
        bank_ifsc: form.bank_ifsc || null,
        account_type: form.account_type,
        pan_tax_id: form.pan_tax_id ? form.pan_tax_id.toUpperCase() : null,
        aadhaar_id: form.aadhaar_id || null,
        uan_number: form.uan_number || null,

        // Documents
        documents_json: JSON.stringify(form.documents),
        notes: form.notes || null,

        // Branch Access & App Roles (Stored in MongoDB Community / Free Store)
        hierarchy_role: form.hierarchy_role || 'MEMBER',
        reports_to_id: form.reports_to_id ? parseInt(form.reports_to_id) : null,
        app_role: form.app_role || 'Staff',
        branch_access_policy: form.branch_access_policy || 'ASSIGNED_ONLY',
        accessible_branches: form.accessible_branches || ['Main Store (Hyderabad HQ)'],
        module_permissions: form.module_permissions || {}
      };

      await onEmployeeCreated(payload);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to register employee');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: 'Personal & Contact', icon: User, desc: 'Identity, demographics & address' },
    { num: 2, title: 'Job & Placement', icon: Briefcase, desc: 'Role, department & work mode' },
    { num: 3, title: 'Salary & Compensation', icon: DollarSign, desc: 'CTC, allowances & deductions' },
    { num: 4, title: 'Banking & Statutory', icon: CreditCard, desc: 'Bank account, PAN & Aadhaar' },
    { num: 5, title: 'Document Vault', icon: FileText, desc: 'Resume, ID proofs & contract' },
    { num: 6, title: 'Branch Access & Roles', icon: Shield, desc: 'Authorized branches & app permissions' }
  ];

  const documentSlots = [
    { key: 'resume', title: 'Curriculum Vitae / Resume *', desc: 'Latest updated resume (PDF or DOCX)', required: true },
    { key: 'government_id', title: 'Government Photo ID *', desc: 'Aadhaar Card, Passport, or PAN Card', required: true },
    { key: 'address_proof', title: 'Permanent / Current Address Proof', desc: 'Electricity bill, Rent Agreement, or Voter ID', required: false },
    { key: 'offer_letter', title: 'Signed Offer Letter / Employment Contract', desc: 'Signed acceptance letter with terms', required: false },
    { key: 'educational_certs', title: 'Highest Educational Degree / Certificate', desc: 'Graduation / Post-graduation transcript', required: false },
    { key: 'bank_proof', title: 'Bank Account Proof (Cancelled Cheque)', desc: 'Cancelled cheque or bank statement copy', required: false }
  ];

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content animate-fade-in"
        style={{
          maxWidth: '920px',
          width: '95vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-surface)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-subtle)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                Enterprise HRMS
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Step {currentStep} of 6
              </span>
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
              Register & Enlist New Employee
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Complete the corporate onboarding dossier including salary breakdown, statutory identifiers, and document vault.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePrefillSample}
              className="btn btn-ghost"
              style={{ fontSize: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '5px' }}
              title="Auto-fill with sample executive data for rapid testing"
            >
              <Sparkles size={14} />
              <span>Fill Sample Data</span>
            </button>
            <button
              onClick={onClose}
              className="btn btn-ghost"
              style={{ padding: '6px', borderRadius: '50%' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Step Indicator Pills */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-surface)',
          padding: '8px 16px',
          gap: '8px',
          overflowX: 'auto'
        }}>
          {steps.map(s => {
            const Icon = s.icon;
            const isActive = currentStep === s.num;
            const isCompleted = currentStep > s.num;

            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setCurrentStep(s.num)}
                style={{
                  flex: 1,
                  minWidth: '140px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: isActive ? '1px solid var(--primary)' : '1px solid transparent',
                  backgroundColor: isActive ? 'var(--primary-light)' : isCompleted ? 'var(--bg-subtle)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: isActive ? 'var(--primary)' : isCompleted ? 'var(--success)' : 'var(--border-color)',
                  color: (isActive || isCompleted) ? '#ffffff' : 'var(--text-secondary)'
                }}>
                  {isCompleted ? <Check size={14} /> : s.num}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? 'var(--primary)' : 'var(--text-main)',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis'
                  }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {s.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Error notification banner */}
        {errorMsg && (
          <div style={{
            margin: '12px 24px 0 24px',
            padding: '10px 14px',
            backgroundColor: 'var(--danger-bg)',
            color: 'var(--danger-text)',
            borderRadius: '8px',
            border: '1px solid var(--danger-border)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Body / Scrollable Form Container */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1
        }}>

          {/* ================= STEP 1: PERSONAL & CONTACT ================= */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <User size={18} color="var(--primary)" />
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Identity & Demographics</h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul"
                    value={form.first_name}
                    onChange={e => setForm({ ...form, first_name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Verma"
                    value={form.last_name}
                    onChange={e => setForm({ ...form, last_name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Gender</label>
                  <select
                    value={form.gender}
                    onChange={e => setForm({ ...form, gender: e.target.value })}
                    className="form-input"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-Binary">Non-Binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Date of Birth</label>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={e => setForm({ ...form, date_of_birth: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Marital Status</label>
                  <select
                    value={form.marital_status}
                    onChange={e => setForm({ ...form, marital_status: e.target.value })}
                    className="form-input"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Blood Group</label>
                  <select
                    value={form.blood_group}
                    onChange={e => setForm({ ...form, blood_group: e.target.value })}
                    className="form-input"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginTop: '8px' }}>
                <Mail size={18} color="var(--primary)" />
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Contact Information</h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Work Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@nexaerp.internal"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Primary Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginTop: '8px' }}>
                <MapPin size={18} color="var(--primary)" />
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Residential Address & Emergency Contact</h4>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Current Residential Address *</label>
                <textarea
                  rows="2"
                  required
                  placeholder="Flat / House No, Building, Street, Area, City, State, PIN Code"
                  value={form.current_address}
                  onChange={e => setForm({ ...form, current_address: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginBottom: '8px', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={form.same_as_current}
                    onChange={e => setForm({ ...form, same_as_current: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Permanent address is identical to current residential address</span>
                </label>

                {!form.same_as_current && (
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Permanent Address</label>
                    <textarea
                      rows="2"
                      placeholder="Permanent address (as listed on Passport / National ID)"
                      value={form.permanent_address}
                      onChange={e => setForm({ ...form, permanent_address: e.target.value })}
                      className="form-input"
                    />
                  </div>
                )}
              </div>

              <div style={{
                backgroundColor: 'var(--bg-subtle)',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px'
              }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Emergency Contact Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Priya Verma"
                    value={form.emergency_contact_name}
                    onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Relationship</label>
                  <select
                    value={form.emergency_contact_relation}
                    onChange={e => setForm({ ...form, emergency_contact_relation: e.target.value })}
                    className="form-input"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Child">Child</option>
                    <option value="Friend">Friend / Colleague</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Emergency Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 00000"
                    value={form.emergency_contact_phone}
                    onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: JOB & PLACEMENT ================= */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <Briefcase size={18} color="var(--primary)" />
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Role & Corporate Hierarchy</h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Employee Code *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      required
                      placeholder="e.g. EMP-1045"
                      value={form.employee_code}
                      onChange={e => setForm({ ...form, employee_code: e.target.value })}
                      className="form-input"
                      style={{ fontFamily: 'monospace', fontWeight: 700 }}
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, employee_code: `EMP-${Math.floor(1000 + Math.random() * 8999)}` })}
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', whiteSpace: 'nowrap' }}
                    >
                      Regenerate
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Official Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lead Full-Stack Architect"
                    value={form.designation}
                    onChange={e => setForm({ ...form, designation: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Department</label>
                  <select
                    value={form.department_name}
                    onChange={e => setForm({ ...form, department_name: e.target.value })}
                    className="form-input"
                  >
                    <option value="Engineering & Technology">Engineering & Technology</option>
                    <option value="Finance & Accounting">Finance & Accounting</option>
                    <option value="Procurement & SCM">Procurement & SCM</option>
                    <option value="Operations & Logistics">Operations & Logistics</option>
                    <option value="Sales & Business Development">Sales & Business Development</option>
                    <option value="Human Resources & People">Human Resources & People</option>
                    <option value="Legal & Corporate Compliance">Legal & Corporate Compliance</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Employment Type</label>
                  <select
                    value={form.employment_type}
                    onChange={e => setForm({ ...form, employment_type: e.target.value })}
                    className="form-input"
                  >
                    <option value="Full-Time">Full-Time Permanent</option>
                    <option value="Probationary">Probationary Period</option>
                    <option value="Contract">Fixed-Term Contract</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Intern">Intern / Trainee</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Work Arrangement</label>
                  <select
                    value={form.work_mode}
                    onChange={e => setForm({ ...form, work_mode: e.target.value })}
                    className="form-input"
                  >
                    <option value="In-Office">In-Office (Onsite)</option>
                    <option value="Hybrid">Hybrid (3 Days Office / 2 Remote)</option>
                    <option value="Remote">100% Remote / Work from Anywhere</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Date of Joining *</label>
                  <input
                    type="date"
                    required
                    value={form.date_of_joining}
                    onChange={e => setForm({ ...form, date_of_joining: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Office Branch / Work Location *</label>
                  <select
                    value={form.branch_id || ''}
                    onChange={e => {
                      const bId = parseInt(e.target.value);
                      const bObj = (branches || []).find(b => b.id === bId);
                      setForm({
                        ...form,
                        branch_id: bId,
                        branch_location: bObj ? bObj.name : form.branch_location,
                        accessible_branches: [bObj ? bObj.name : form.branch_location]
                      });
                    }}
                    className="form-input"
                  >
                    {branches.length > 0 ? (
                      branches.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.flag || '🏢'} {b.name} ({b.city}, {b.country})
                        </option>
                      ))
                    ) : (
                      <option value="1">Hyderabad Global HQ</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Reporting Supervisor / Manager</label>
                  <input
                    type="text"
                    placeholder="e.g. Karthik Reddy (Head of Tech)"
                    value={form.reporting_manager}
                    onChange={e => setForm({ ...form, reporting_manager: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Probation Duration</label>
                  <select
                    value={form.probation_period}
                    onChange={e => setForm({ ...form, probation_period: e.target.value })}
                    className="form-input"
                  >
                    <option value="3 Months">3 Months</option>
                    <option value="6 Months">6 Months</option>
                    <option value="Confirmed">Direct Confirmation (No Probation)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: SALARY & COMPENSATION ================= */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DollarSign size={18} color="var(--primary)" />
                  <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Enterprise Compensation & CTC Structuring</h4>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Annual CTC: ₹</span>
                    <input
                      type="number"
                      step="10000"
                      value={form.annual_ctc}
                      onChange={e => setForm({ ...form, annual_ctc: e.target.value })}
                      className="form-input"
                      style={{ width: '130px', padding: '4px 8px', fontWeight: 700 }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAutoCalculateCTC(form.annual_ctc)}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px' }}
                    title="Automatically computes Basic (50%), HRA (40%), Conveyance, Medical, and PF"
                  >
                    <Sparkles size={13} color="var(--primary)" />
                    <span>Auto-Compute (50/40)</span>
                  </button>
                </div>
              </div>

              {/* Real-time Visual Net Pay Card */}
              <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#ffffff',
                padding: '20px',
                borderRadius: '12px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
                boxShadow: 'var(--shadow-md)'
              }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', fontWeight: 700 }}>
                    Gross Monthly Earnings
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px', color: '#38bdf8' }}>
                    ₹ {grossMonthly.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    Sum of basic & all allowances
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', fontWeight: 700 }}>
                    Total Deductions (PF/PT/Tax)
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px', color: '#f87171' }}>
                    - ₹ {deductionsMonthly.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    Statutory & tax withholdings
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', fontWeight: 700 }}>
                    Net Monthly In-Hand (Take Home)
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 900, marginTop: '4px', color: '#4ade80' }}>
                    ₹ {netInHand.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '11px', color: '#86efac', marginTop: '2px' }}>
                    Credited to employee bank account
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', fontWeight: 700 }}>
                    Annual Cost to Company
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px', color: '#fbbf24' }}>
                    ₹ {calculatedAnnualCTC.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    12 months total CTC package
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Column A: Earnings */}
                <div style={{
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--success-text)' }}>
                      ➕ Earnings Components (Monthly)
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Taxable / Allowances</span>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                      Basic Salary (₹) * <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>(Standard 40-50% CTC)</span>
                    </label>
                    <input
                      type="number"
                      step="100"
                      required
                      value={form.basic_salary}
                      onChange={e => setForm({ ...form, basic_salary: e.target.value })}
                      className="form-input"
                      style={{ fontWeight: 600 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                      House Rent Allowance (HRA) (₹) <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>(40% Basic)</span>
                    </label>
                    <input
                      type="number"
                      step="100"
                      value={form.hra}
                      onChange={e => setForm({ ...form, hra: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                      Special / Flexibility Allowance (₹)
                    </label>
                    <input
                      type="number"
                      step="100"
                      value={form.special_allowance}
                      onChange={e => setForm({ ...form, special_allowance: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Conveyance (₹)</label>
                      <input
                        type="number"
                        value={form.conveyance_allowance}
                        onChange={e => setForm({ ...form, conveyance_allowance: e.target.value })}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Medical (₹)</label>
                      <input
                        type="number"
                        value={form.medical_allowance}
                        onChange={e => setForm({ ...form, medical_allowance: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                      Performance Bonus / Variable Pay (₹)
                    </label>
                    <input
                      type="number"
                      step="500"
                      value={form.variable_pay}
                      onChange={e => setForm({ ...form, variable_pay: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Column B: Deductions */}
                <div style={{
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--danger-text)' }}>
                      ➖ Statutory Deductions (Monthly)
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PF, PT & Tax</span>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                      Provident Fund (PF / 401k) (₹) <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>(12% of Basic, max ₹1,800)</span>
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={form.pf_deduction}
                      onChange={e => setForm({ ...form, pf_deduction: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                      Professional Tax (PT) (₹) <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>(State statutory slab, ₹200)</span>
                    </label>
                    <input
                      type="number"
                      value={form.professional_tax}
                      onChange={e => setForm({ ...form, professional_tax: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                      Income Tax / TDS Withholding (₹) <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>(Estimated monthly tax)</span>
                    </label>
                    <input
                      type="number"
                      step="500"
                      value={form.tds_tax}
                      onChange={e => setForm({ ...form, tds_tax: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div style={{
                    marginTop: 'auto',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 100, 210, 0.05)',
                    border: '1px solid var(--primary-border)',
                    fontSize: '12px',
                    color: 'var(--text-secondary)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
                      <HelpCircle size={14} />
                      <span>Payroll Compliance Standard</span>
                    </div>
                    Basic salary must adhere to state Minimum Wages Act. Provident Fund contributes equally from both employer and employee.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 4: BANKING & STATUTORY ================= */}
          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <CreditCard size={18} color="var(--primary)" />
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Direct Deposit Banking Setup</h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                    value={form.bank_name}
                    onChange={e => setForm({ ...form, bank_name: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Account Holder Legal Name</label>
                  <input
                    type="text"
                    placeholder="Exact name as in bank records"
                    value={form.account_holder_name}
                    onChange={e => setForm({ ...form, account_holder_name: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Account Type</label>
                  <select
                    value={form.account_type}
                    onChange={e => setForm({ ...form, account_type: e.target.value })}
                    className="form-input"
                  >
                    <option value="Salary Account">Corporate Salary Account</option>
                    <option value="Savings">Savings Account</option>
                    <option value="Current">Current / Checking Account</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Bank Account Number</label>
                  <input
                    type="password"
                    placeholder="e.g. 50100492817264"
                    value={form.bank_account_number}
                    onChange={e => setForm({ ...form, bank_account_number: e.target.value })}
                    className="form-input"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Confirm Bank Account Number</label>
                  <input
                    type="text"
                    placeholder="Re-enter to confirm"
                    value={form.confirm_account_number}
                    onChange={e => setForm({ ...form, confirm_account_number: e.target.value })}
                    className="form-input"
                    style={{
                      fontFamily: 'monospace',
                      borderColor: form.confirm_account_number && form.bank_account_number !== form.confirm_account_number ? 'var(--danger)' : undefined
                    }}
                  />
                  {form.confirm_account_number && form.bank_account_number !== form.confirm_account_number && (
                    <span style={{ fontSize: '11px', color: 'var(--danger-text)', marginTop: '2px', display: 'block' }}>
                      Account numbers do not match
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Bank IFSC / Branch Routing Code</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC0001234 / SBIN0004567"
                  value={form.bank_ifsc}
                  onChange={e => setForm({ ...form, bank_ifsc: e.target.value.toUpperCase() })}
                  className="form-input"
                  style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginTop: '10px' }}>
                <Shield size={18} color="var(--primary)" />
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Statutory Government Identifiers</h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    Income Tax PAN ID <span style={{ color: 'var(--text-muted)' }}>(10 characters)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. ABCDE1234F"
                    value={form.pan_tax_id}
                    onChange={e => setForm({ ...form, pan_tax_id: e.target.value.toUpperCase() })}
                    className="form-input"
                    style={{ fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    Aadhaar / National ID Number <span style={{ color: 'var(--text-muted)' }}>(12 digits)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    placeholder="e.g. 7845 9012 3456"
                    value={form.aadhaar_id}
                    onChange={e => setForm({ ...form, aadhaar_id: e.target.value })}
                    className="form-input"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    Universal Account Number (UAN / PF)
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="e.g. 100987654321"
                    value={form.uan_number}
                    onChange={e => setForm({ ...form, uan_number: e.target.value })}
                    className="form-input"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 5: DOCUMENT VAULT ================= */}
          {currentStep === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="var(--primary)" />
                  <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Corporate Document Vault & Compliance</h4>
                </div>
                <span className="badge badge-info" style={{ fontSize: '12px' }}>
                  {form.documents.length} / {documentSlots.length} Attached
                </span>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                Attach digital copies of mandatory verification credentials. Supported formats: <code>PDF, DOCX, PNG, JPG</code> (Max 10MB per file).
              </p>

              {/* Document Slots Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '14px' }}>
                {documentSlots.map(slot => {
                  const existingDoc = form.documents.find(d => d.category === slot.key);

                  return (
                    <div
                      key={slot.key}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: existingDoc ? '1px solid var(--success-border)' : '1px dashed var(--border-color)',
                        backgroundColor: existingDoc ? 'var(--success-bg)' : 'var(--bg-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                            {slot.title}
                          </span>
                          {existingDoc ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: 'var(--success-text)',
                              backgroundColor: '#d1fae5',
                              padding: '2px 8px',
                              borderRadius: '999px'
                            }}>
                              <CheckCircle2 size={12} />
                              Verified
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: slot.required ? 'var(--warning-text)' : 'var(--text-muted)' }}>
                              {slot.required ? 'Required' : 'Optional'}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                          {slot.desc}
                        </p>
                      </div>

                      {existingDoc ? (
                        <div style={{
                          backgroundColor: 'var(--bg-surface)',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {existingDoc.name}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              {existingDoc.size} • {existingDoc.upload_date}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(slot.key)}
                            className="btn btn-ghost"
                            style={{ padding: '4px', color: 'var(--danger-text)' }}
                            title="Remove attached file"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '10px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--primary)'
                        }}>
                          <Upload size={14} />
                          <span>Choose Document</span>
                          <input
                            type="file"
                            accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                            style={{ display: 'none' }}
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(slot.key, file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* HR Verification Notes */}
              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                  HR Compliance & Onboarding Notes
                </label>
                <textarea
                  rows="2"
                  placeholder="Record background verification status, clearance notes, hardware provisioning details..."
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>
          )}

          {/* STEP 6: BRANCH ACCESS & APPLICATION ROLE GOVERNANCE (MONGODB COMMUNITY / FREE STORE) */}
          {currentStep === 6 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Storage Info Badge */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(2, 132, 199, 0.08) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Shield size={24} color="#10b981" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                    🍃 Multi-Branch Access & App Role Governance • Free Document Store
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Access permissions and branch authorizations are determined upon employee joining and persisted into <strong>MongoDB Community Edition</strong> (or local free JSON document store) at zero cloud cost.
                  </div>
                </div>
              </div>

              {/* 1. Branch Access Policy */}
              <div style={{
                backgroundColor: 'var(--bg-subtle)',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)'
              }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={16} color="var(--primary)" />
                  <span>Authorized Subsidiary & Regional Branches</span>
                </label>
                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                  Select which operational branch contexts this employee is authorized to log into and operate.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <input
                    type="checkbox"
                    id="allBranchesCheck"
                    checked={form.branch_access_policy === 'ALL_BRANCHES'}
                    onChange={(e) => {
                      const isAll = e.target.checked;
                      setForm(prev => ({
                        ...prev,
                        branch_access_policy: isAll ? 'ALL_BRANCHES' : 'ASSIGNED_ONLY',
                        accessible_branches: isAll 
                          ? ['Main Store (Hyderabad HQ)', 'Mumbai Financial Hub', 'Dubai MENA Regional Hub', 'Singapore APAC Office', 'Bengaluru Tech Center'] 
                          : [prev.branch_location || 'Main Store (Hyderabad HQ)']
                      }));
                    }}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <label htmlFor="allBranchesCheck" style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)', cursor: 'pointer' }}>
                    🌐 Authorize Access to ALL Branches (Global MNC Access)
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
                  {(branches.length > 0 ? branches.map(b => b.name) : [
                    'Hyderabad Global HQ',
                    'Mumbai Financial Hub',
                    'Bengaluru Innovation Center',
                    'Dubai MENA Corporate Hub',
                    'Singapore APAC Headquarters',
                    'London European Operations'
                  ]).map(bName => {
                    const isChecked = form.branch_access_policy === 'ALL_BRANCHES' || (form.accessible_branches || []).includes(bName);
                    return (
                      <div
                        key={bName}
                        onClick={() => {
                          if (form.branch_access_policy === 'ALL_BRANCHES') {
                            setForm(prev => ({ ...prev, branch_access_policy: 'ASSIGNED_ONLY', accessible_branches: [bName] }));
                            return;
                          }
                          const cur = form.accessible_branches || [];
                          const updated = cur.includes(bName)
                            ? cur.filter(x => x !== bName)
                            : [...cur, bName];
                          setForm(prev => ({ ...prev, accessible_branches: updated.length ? updated : [bName] }));
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--border-color)'}`,
                          backgroundColor: isChecked ? 'rgba(0, 100, 210, 0.05)' : 'var(--bg-surface)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '12px', fontWeight: isChecked ? 700 : 500, color: 'var(--text-main)' }}>
                          {bName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Roles & Hierarchy Placement */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block' }}>
                    Company Hierarchy Tier *
                  </label>
                  <select
                    value={form.hierarchy_role}
                    onChange={(e) => {
                      const hRole = e.target.value;
                      setForm(prev => ({
                        ...prev,
                        hierarchy_role: hRole,
                        app_role: hRole === 'EXECUTIVE' ? 'Executive Director' : hRole === 'MANAGER' ? 'Branch Manager' : hRole === 'TEAM_LEAD' ? 'Team Lead' : 'Staff Associate',
                        module_permissions: {
                          ...prev.module_permissions,
                          finance: hRole === 'EXECUTIVE' || hRole === 'MANAGER',
                          hr: hRole === 'EXECUTIVE' || hRole === 'MANAGER',
                          grc: hRole === 'EXECUTIVE',
                          settings: hRole === 'EXECUTIVE'
                        }
                      }));
                    }}
                    className="form-input"
                    style={{ width: '100%' }}
                  >
                    <option value="EXECUTIVE">👑 Executive / C-Suite (Top of Chain)</option>
                    <option value="MANAGER">👔 Department / Branch Manager</option>
                    <option value="TEAM_LEAD">⚡ Team Lead / Shift Supervisor</option>
                    <option value="MEMBER">👤 Member / Staff Associate</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block' }}>
                    Application Security Role *
                  </label>
                  <select
                    value={form.app_role}
                    onChange={(e) => setForm({ ...form, app_role: e.target.value })}
                    className="form-input"
                    style={{ width: '100%' }}
                  >
                    <option value="System Administrator">System Administrator (Full Root Access)</option>
                    <option value="Branch Manager">Branch Manager (Branch Operations & Staff)</option>
                    <option value="Team Lead">Team Lead (Shift & Pod Oversight)</option>
                    <option value="Cashier / POS Operator">Cashier / POS Operator</option>
                    <option value="Accountant / Finance Officer">Accountant / Finance Officer</option>
                    <option value="HR Specialist">HR Specialist / Recruiter</option>
                    <option value="Inventory Officer">Inventory & Warehouse Specialist</option>
                    <option value="Staff Associate">Staff Associate (Standard Access)</option>
                  </select>
                </div>
              </div>

              {/* 3. Granular App Modules Access */}
              <div style={{
                backgroundColor: 'var(--bg-subtle)',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)'
              }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                  Granular App Module Authorizations
                </label>
                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                  Enable or disable application modules available to this employee in their dashboard and navigation menu.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                  {[
                    { key: 'pos', label: '🛒 Point of Sale (POS)' },
                    { key: 'inventory', label: '📦 Stock & Inventory' },
                    { key: 'sales', label: '📊 Sales & Orders' },
                    { key: 'finance', label: '💰 Accounting & Ledgers' },
                    { key: 'hr', label: '👥 HR & People' },
                    { key: 'procurement', label: '🚚 Purchase & Vendors' },
                    { key: 'manufacturing', label: '🏭 Manufacturing & BOM' },
                    { key: 'grc', label: '🛡️ GRC & Compliance' },
                    { key: 'settings', label: '⚙️ System & Branch Settings' },
                    { key: 'ai_copilot', label: '🤖 Alexa & AI Copilot' }
                  ].map(m => {
                    const isAllowed = !!(form.module_permissions && form.module_permissions[m.key]);
                    return (
                      <div
                        key={m.key}
                        onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            module_permissions: {
                              ...prev.module_permissions,
                              [m.key]: !isAllowed
                            }
                          }));
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: `1px solid ${isAllowed ? 'var(--primary)' : 'var(--border-color)'}`,
                          backgroundColor: isAllowed ? 'rgba(0, 100, 210, 0.06)' : 'var(--bg-surface)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isAllowed}
                          readOnly
                          style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '11.5px', fontWeight: isAllowed ? 700 : 500, color: 'var(--text-main)' }}>
                          {m.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation Controls */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-subtle)'
        }}>
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={15} />
                <span>Previous Step</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
            >
              Cancel
            </button>

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  if (currentStep === 1) {
                    if (!form.first_name || !form.last_name || !form.email || !form.phone) {
                      setErrorMsg('Please complete required personal details (Name, Email, Phone).');
                      return;
                    }
                  }
                  if (currentStep === 2) {
                    if (!form.designation) {
                      setErrorMsg('Please enter Designation.');
                      return;
                    }
                  }
                  setCurrentStep(prev => prev + 1);
                }}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>Continue to {steps[currentStep].title}</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                {submitting ? (
                  <span>Registering Employee...</span>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Save & Register Employee (MongoDB Synced)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
