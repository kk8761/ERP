import React, { useState, useRef } from 'react';
import {
  Upload, FileText, CheckCircle2, AlertTriangle, X, Download,
  RefreshCw, Check, ArrowRight, Table, Layers, FileSpreadsheet,
  FileCode, Database, Eye, Trash2
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function UniversalDataImportModal({
  isOpen,
  onClose,
  initialEntityType = 'auto', // 'auto', 'customers', 'vendors', 'products'
  onSuccess
}) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [entityType, setEntityType] = useState(initialEntityType || 'auto');
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [records, setRecords] = useState([]);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (selectedFile) => {
    setFile(selectedFile);
    setErrorMsg('');
    setSuccessMsg('');
    setParseResult(null);
    setRecords([]);
    setParsing(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (entityType !== 'auto') {
        formData.append('entity_type_hint', entityType);
      }

      const res = await apiRequest('/api/data-import/extract', {
        method: 'POST',
        body: formData
      });

      setParseResult(res);
      setRecords(res.records || []);
      if (entityType === 'auto' && res.detected_entity_type) {
        setEntityType(res.detected_entity_type);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to extract document. Please check the file structure.');
    } finally {
      setParsing(false);
    }
  };

  const handleCellEdit = (index, field, value) => {
    setRecords(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleDeleteRow = (index) => {
    setRecords(prev => prev.filter((_, i) => i !== index));
  };

  const handleCommit = async () => {
    if (!records.length) return;
    setCommitting(true);
    setErrorMsg('');
    try {
      const targetEntity = entityType === 'auto' ? (parseResult?.detected_entity_type || 'customers') : entityType;
      const res = await apiRequest('/api/data-import/commit', {
        method: 'POST',
        body: JSON.stringify({
          entity_type: targetEntity,
          records: records
        })
      });

      setSuccessMsg(res.message || `Successfully imported ${records.length} records!`);
      if (onSuccess) {
        onSuccess(targetEntity, res);
      }
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to import records into database.');
    } finally {
      setCommitting(false);
    }
  };

  const handleDownloadTemplate = (type) => {
    window.open(`/api/data-import/templates/${type}`, '_blank');
  };

  const targetEntityLabel = {
    customers: 'Customers (CRM)',
    vendors: 'Vendors / Suppliers (Procurement)',
    products: 'Products (Catalog / Inventory)',
    employees: 'Employees & Staff (HR / Payroll)',
    chart_of_accounts: 'Chart of Accounts (General Ledger)',
    expenses: 'Operating Expenses (Finance)',
    warehouses: 'Warehouses & Locations (Logistics)',
    auto: 'Auto-Detect'
  }[entityType] || 'Entities';

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div 
        className="modal-content animate-fade-in" 
        style={{ 
          maxWidth: parseResult ? '1060px' : '680px', 
          width: '95vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          transition: 'all 0.25s ease'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={22} color="var(--primary)" />
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Universal Enterprise Data Onboarding
              </h3>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Ingest multi-format enterprise data (Vendors, Products, Customers, Employees, GL Accounts, Expenses, Warehouses) from PDF, Excel, CSV, or JSON.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="btn btn-ghost" 
            style={{ padding: '6px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Entity Type Selection & Sample Templates */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '10px',
          padding: '12px 14px',
          backgroundColor: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>Target Entity Variety:</span>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                style={{
                  fontSize: '12px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  fontWeight: 600
                }}
              >
                <option value="auto">✨ Auto-Detect Entity from Document</option>
                <option value="vendors">🏢 Vendors & Suppliers (Procurement)</option>
                <option value="products">📦 Products & Inventory (Catalog)</option>
                <option value="customers">👥 Customers & Clients (CRM)</option>
                <option value="employees">🧑‍💼 Employees & Staff (HR / Payroll)</option>
                <option value="chart_of_accounts">📑 Chart of Accounts (General Ledger)</option>
                <option value="expenses">💸 Operating Expenses (Vouchers / OPEX)</option>
                <option value="warehouses">🏬 Warehouses & Hubs (Storage)</option>
              </select>
            </div>

            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Supports .pdf, .xlsx, .xls, .csv, .json
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Download Sample Templates:</span>
            {[
              { id: 'vendors', label: 'Vendors' },
              { id: 'products', label: 'Products' },
              { id: 'customers', label: 'Customers' },
              { id: 'employees', label: 'Employees' },
              { id: 'chart_of_accounts', label: 'Chart of Accounts' },
              { id: 'expenses', label: 'Expenses' },
              { id: 'warehouses', label: 'Warehouses' }
            ].map(t => (
              <button 
                key={t.id}
                onClick={() => handleDownloadTemplate(t.id)}
                className="btn btn-ghost"
                style={{ fontSize: '11px', padding: '3px 7px', color: 'var(--primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                title={`Download sample template for ${t.label}`}
              >
                <Download size={11} style={{ marginRight: '3px' }} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Banners */}
        {errorMsg && (
          <div style={{ 
            padding: '10px 14px', 
            backgroundColor: 'var(--danger-bg)', 
            color: 'var(--danger-text)', 
            borderRadius: 'var(--radius-sm)', 
            border: '1px solid var(--danger-border)', 
            fontSize: '13px', 
            marginBottom: '14px',
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
            padding: '10px 14px', 
            backgroundColor: '#dcfce7', 
            color: '#166534', 
            borderRadius: 'var(--radius-sm)', 
            border: '1px solid #bbf7d0', 
            fontSize: '13px', 
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} color="#16a34a" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Upload Dropzone (shown if no records extracted or user wants to re-upload) */}
        {!parseResult && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border-color)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '36px 20px',
              textAlign: 'center',
              backgroundColor: dragActive ? 'rgba(0, 100, 210, 0.05)' : 'var(--bg-subtle)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginBottom: '16px'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.xlsx,.xls,.csv,.tsv,.json,.txt"
              style={{ display: 'none' }}
            />

            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 100, 210, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto'
            }}>
              {parsing ? (
                <RefreshCw size={24} className="animate-spin" color="var(--primary)" />
              ) : (
                <Upload size={24} color="var(--primary)" />
              )}
            </div>

            <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
              {parsing ? 'Parsing and extracting document records...' : 'Drop your document here, or click to browse'}
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Universal Parser supports <strong>PDF vendor lists</strong>, <strong>Excel catalogs (.xlsx)</strong>, <strong>CSVs</strong>, and <strong>JSON data</strong>.
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                📄 PDF
              </span>
              <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                📊 Excel (.xlsx)
              </span>
              <span className="badge" style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
                📋 CSV / TSV
              </span>
              <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                🔣 JSON
              </span>
            </div>
          </div>
        )}

        {/* Parsed Results Live Grid & Editor */}
        {parseResult && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Extraction Summary Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              backgroundColor: '#eff6ff',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #bfdbfe',
              marginBottom: '12px',
              fontSize: '12.5px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#2563eb" />
                <span style={{ color: '#1e40af', fontWeight: 600 }}>
                  {parseResult.summary}
                </span>
                <span style={{ 
                  backgroundColor: '#dbeafe', 
                  color: '#1d4ed8', 
                  padding: '2px 6px', 
                  borderRadius: '4px', 
                  fontSize: '11px',
                  fontWeight: 700 
                }}>
                  {parseResult.format}
                </span>
              </div>
              <button
                onClick={() => {
                  setParseResult(null);
                  setRecords([]);
                }}
                className="btn btn-ghost"
                style={{ fontSize: '11.5px', padding: '2px 6px', color: '#1e40af' }}
              >
                Upload Different File
              </button>
            </div>

            {/* Editable Preview Table */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
              maxHeight: '400px'
            }}>
              <table className="nexa-table" style={{ fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Name / Title / Description *</th>
                    {entityType === 'vendors' && <th>Vendor Code</th>}
                    {entityType === 'vendors' && <th>GSTIN / Tax ID</th>}
                    {entityType === 'vendors' && <th>Payment Terms</th>}
                    
                    {entityType === 'products' && <th>SKU</th>}
                    {entityType === 'products' && <th>Selling Price</th>}
                    {entityType === 'products' && <th>Cost Price</th>}
                    {entityType === 'products' && <th>Initial Stock</th>}
                    
                    {entityType === 'customers' && <th>Phone</th>}
                    {entityType === 'customers' && <th>Email</th>}
                    {entityType === 'customers' && <th>Address</th>}

                    {entityType === 'employees' && <th>Employee Code</th>}
                    {entityType === 'employees' && <th>Designation</th>}
                    {entityType === 'employees' && <th>Department</th>}
                    {entityType === 'employees' && <th>Base Salary</th>}

                    {entityType === 'chart_of_accounts' && <th>Account Code</th>}
                    {entityType === 'chart_of_accounts' && <th>Account Type</th>}
                    {entityType === 'chart_of_accounts' && <th>Normal Balance</th>}
                    {entityType === 'chart_of_accounts' && <th>Opening Balance</th>}

                    {entityType === 'expenses' && <th>Expense Category</th>}
                    {entityType === 'expenses' && <th>Amount</th>}
                    {entityType === 'expenses' && <th>Payment Method</th>}

                    {entityType === 'warehouses' && <th>Warehouse Code</th>}
                    {entityType === 'warehouses' && <th>Capacity (SQFT)</th>}
                    {entityType === 'warehouses' && <th>Location</th>}

                    <th>Status</th>
                    <th style={{ width: '40px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r._row_id || i}>
                      <td style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                      <td>
                        <input
                          type="text"
                          value={r.name || r.title || r.account_name || ''}
                          onChange={(e) => handleCellEdit(i, 'name', e.target.value)}
                          style={{
                            width: '100%',
                            minWidth: '130px',
                            padding: '4px 6px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            fontWeight: 600
                          }}
                        />
                      </td>

                      {entityType === 'vendors' && (
                        <>
                          <td>
                            <input
                              type="text"
                              value={r.vendor_code || ''}
                              onChange={(e) => handleCellEdit(i, 'vendor_code', e.target.value)}
                              style={{ width: '100px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={r.gst_tax_number || ''}
                              onChange={(e) => handleCellEdit(i, 'gst_tax_number', e.target.value)}
                              placeholder="24AAACA..."
                              style={{ width: '120px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={r.payment_terms || 'Net 30 Days'}
                              onChange={(e) => handleCellEdit(i, 'payment_terms', e.target.value)}
                              style={{ width: '100px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                        </>
                      )}

                      {entityType === 'products' && (
                        <>
                          <td>
                            <input
                              type="text"
                              value={r.sku || ''}
                              onChange={(e) => handleCellEdit(i, 'sku', e.target.value)}
                              style={{ width: '110px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={r.selling_price || 0}
                              onChange={(e) => handleCellEdit(i, 'selling_price', parseFloat(e.target.value) || 0)}
                              style={{ width: '80px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={r.cost_price || 0}
                              onChange={(e) => handleCellEdit(i, 'cost_price', parseFloat(e.target.value) || 0)}
                              style={{ width: '80px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={r.current_stock || 0}
                              onChange={(e) => handleCellEdit(i, 'current_stock', parseInt(e.target.value) || 0)}
                              style={{ width: '70px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                        </>
                      )}

                      {entityType === 'customers' && (
                        <>
                          <td>
                            <input
                              type="text"
                              value={r.phone || ''}
                              onChange={(e) => handleCellEdit(i, 'phone', e.target.value)}
                              style={{ width: '120px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={r.email || ''}
                              onChange={(e) => handleCellEdit(i, 'email', e.target.value)}
                              style={{ width: '150px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={r.address || ''}
                              onChange={(e) => handleCellEdit(i, 'address', e.target.value)}
                              style={{ width: '100%', minWidth: '140px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                        </>
                      )}

                      {entityType === 'employees' && (
                        <>
                          <td>
                            <input
                              type="text"
                              value={r.employee_code || ''}
                              onChange={(e) => handleCellEdit(i, 'employee_code', e.target.value)}
                              style={{ width: '100px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={r.designation || ''}
                              onChange={(e) => handleCellEdit(i, 'designation', e.target.value)}
                              style={{ width: '130px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={r.department || 'Operations'}
                              onChange={(e) => handleCellEdit(i, 'department', e.target.value)}
                              style={{ width: '110px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={r.salary || r.base_salary || 0}
                              onChange={(e) => handleCellEdit(i, 'salary', parseFloat(e.target.value) || 0)}
                              style={{ width: '90px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                        </>
                      )}

                      {entityType === 'chart_of_accounts' && (
                        <>
                          <td>
                            <input
                              type="text"
                              value={r.account_code || ''}
                              onChange={(e) => handleCellEdit(i, 'account_code', e.target.value)}
                              style={{ width: '100px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={r.account_type || 'ASSET'}
                              onChange={(e) => handleCellEdit(i, 'account_type', e.target.value)}
                              style={{ width: '110px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <select
                              value={r.normal_balance || 'DEBIT'}
                              onChange={(e) => handleCellEdit(i, 'normal_balance', e.target.value)}
                              style={{ width: '85px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            >
                              <option value="DEBIT">DEBIT</option>
                              <option value="CREDIT">CREDIT</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              value={r.opening_balance || 0}
                              onChange={(e) => handleCellEdit(i, 'opening_balance', parseFloat(e.target.value) || 0)}
                              style={{ width: '90px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                        </>
                      )}

                      {entityType === 'expenses' && (
                        <>
                          <td>
                            <input
                              type="text"
                              value={r.category || 'Office Supplies'}
                              onChange={(e) => handleCellEdit(i, 'category', e.target.value)}
                              style={{ width: '130px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={r.amount || 0}
                              onChange={(e) => handleCellEdit(i, 'amount', parseFloat(e.target.value) || 0)}
                              style={{ width: '90px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={r.payment_method || 'BANK_TRANSFER'}
                              onChange={(e) => handleCellEdit(i, 'payment_method', e.target.value)}
                              style={{ width: '120px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                        </>
                      )}

                      {entityType === 'warehouses' && (
                        <>
                          <td>
                            <input
                              type="text"
                              value={r.code || r.warehouse_code || ''}
                              onChange={(e) => handleCellEdit(i, 'code', e.target.value)}
                              style={{ width: '100px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={r.capacity || r.total_capacity_sqft || 5000}
                              onChange={(e) => handleCellEdit(i, 'capacity', parseFloat(e.target.value) || 0)}
                              style={{ width: '90px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={r.location || r.city || ''}
                              onChange={(e) => handleCellEdit(i, 'location', e.target.value)}
                              style={{ width: '140px', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                          </td>
                        </>
                      )}

                      <td>
                        <span 
                          className="badge" 
                          style={{ 
                            backgroundColor: r.status_badge === 'READY' ? '#dcfce7' : '#fef3c7',
                            color: r.status_badge === 'READY' ? '#166534' : '#b45309',
                            fontSize: '10px'
                          }}
                        >
                          {r.status_badge || 'READY'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteRow(i)}
                          className="btn btn-ghost"
                          style={{ padding: '3px', color: 'var(--danger)' }}
                          title="Remove Row"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                        No records to display.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {records.length > 0 && (
              <span><strong>{records.length}</strong> records ready to commit to database</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={onClose} 
              className="btn btn-secondary"
            >
              Cancel
            </button>

            {parseResult && (
              <button
                onClick={handleCommit}
                disabled={committing || records.length === 0}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {committing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Importing into ERP...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Import {records.length} Records</span>
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
