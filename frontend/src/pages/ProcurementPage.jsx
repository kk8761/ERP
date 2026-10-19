import React, { useState, useEffect } from 'react';
import {
  Truck, Plus, FileText, CheckCircle2, ArrowDownToLine,
  Eye, X, Building, ShieldCheck, AlertTriangle, Star, RefreshCw, Ban, Award, Mail,
  Download, Printer
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function ProcurementPage({ initialTab = 'suppliers', initialAction = '' }) {
  const { hasPermission } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [outgoingEmails, setOutgoingEmails] = useState([]);
  const [selectedEmailPreview, setSelectedEmailPreview] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab === 'orders' ? 'orders' : 'suppliers'); // 'suppliers' (Vendor Master) or 'orders' (POs)
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');
  const [processingPoId, setProcessingPoId] = useState(null);
  const [receiptModal, setReceiptModal] = useState({
    isOpen: false,
    receipt: null,
    receiptHtml: '',
    poNumber: ''
  });

  useEffect(() => {
    if (initialTab === 'orders') {
      setActiveTab('orders');
    } else {
      setActiveTab('suppliers');
    }
  }, [initialTab]);

  // Create Vendor Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: '',
    vendor_code: '',
    vendor_account_group: 'Standard External Vendor',
    contact_person: '',
    phone: '',
    email: '',
    city: 'Hyderabad',
    country: 'IN',
    address: '',
    gst_tax_number: '',
    payment_terms: 'Net 30 Days',
    incoterms: 'FOB - Free on Board',
    reconciliation_account: '2000 - Accounts Payable',
    rating_score: 95.0
  });

  // Create PO Modal
  const [showPOModal, setShowPOModal] = useState(initialAction === 'create');

  useEffect(() => {
    if (initialAction === 'create') {
      setActiveTab('orders');
      setShowPOModal(true);
    }
  }, [initialAction]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [poItems, setPoItems] = useState([{ product_id: '', quantity: 10, unit_cost: 100 }]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pos, sups, prods, emails] = await Promise.all([
        apiRequest('/api/procurement/purchase-orders'),
        apiRequest('/api/procurement/suppliers'),
        apiRequest('/api/inventory/products'),
        apiRequest('/api/procurement/emails').catch(() => [])
      ]);
      setPurchaseOrders(pos);
      setSuppliers(sups);
      setProducts(prods);
      setOutgoingEmails(emails || []);
    } catch (e) {
      console.error('Failed to load procurement data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprovePO = async (poId) => {
    try {
      const res = await apiRequest(`/api/procurement/purchase-orders/${poId}/approve`, { method: 'POST' });
      setStatusMsg(res.message);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Client-side instant receipt file download helper
  const downloadHtmlReceipt = (receiptHtml, poNumber) => {
    if (!receiptHtml) return;
    try {
      const blob = new Blob([receiptHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Goods_Receipt_${poNumber || 'PO'}_${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  const handlePrintReceipt = (receiptHtml) => {
    if (!receiptHtml) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 350);
    }
  };

  const handleReceiveGoods = async (po) => {
    const poId = typeof po === 'object' ? po.id : po;
    const poObj = typeof po === 'object' ? po : purchaseOrders.find(p => p.id === poId);
    const poNum = poObj ? poObj.po_number : `PO-${poId}`;

    setProcessingPoId(poId);
    try {
      const res = await apiRequest(`/api/procurement/purchase-orders/${poId}/receive`, { method: 'POST' });
      setStatusMsg(`✓ Goods receipt posted for #${poNum}! Stocks replenished & official GRN downloaded.`);

      // 1. Automatically download the generated Goods Receipt Note file
      if (res.receipt_html) {
        downloadHtmlReceipt(res.receipt_html, poNum);
      }

      // 2. Open interactive receipt modal for print / preview
      setReceiptModal({
        isOpen: true,
        receipt: res.receipt,
        receiptHtml: res.receipt_html,
        poNumber: poNum
      });

      await loadData();
    } catch (err) {
      alert(`Goods receipt failed: ${err.message}`);
    } finally {
      setProcessingPoId(null);
    }
  };

  const handleDownloadReceipt = async (po) => {
    try {
      const res = await apiRequest(`/api/procurement/purchase-orders/${po.id}/receipt`);
      if (res && res.receipt_html) {
        downloadHtmlReceipt(res.receipt_html, po.po_number);
        setReceiptModal({
          isOpen: true,
          receipt: res.receipt,
          receiptHtml: res.receipt_html,
          poNumber: po.po_number
        });
      }
    } catch (err) {
      alert(`Could not fetch goods receipt: ${err.message}`);
    }
  };

  const handleToggleBlockVendor = async (sup) => {
    const newStatus = sup.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    if (!window.confirm(`Are you sure you want to ${newStatus === 'BLOCKED' ? 'BLOCK (Posting & Purchasing Lock)' : 'UNBLOCK'} vendor ${sup.name}?`)) return;

    try {
      await apiRequest(`/api/procurement/suppliers/${sup.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      setStatusMsg(`Vendor ${sup.name} status updated to ${newStatus}.`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/procurement/suppliers', {
        method: 'POST',
        body: JSON.stringify(newVendor)
      });
      setShowSupplierModal(false);
      setStatusMsg(`Vendor ${newVendor.name} registered in Vendor Master.`);
      loadData();
    } catch (err) {
      alert(`Vendor creation failed: ${err.message}`);
    }
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/procurement/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id: parseInt(selectedSupplier),
          items: poItems.map(i => ({
            product_id: parseInt(i.product_id),
            quantity: parseInt(i.quantity),
            unit_cost: parseFloat(i.unit_cost)
          }))
        })
      });
      setShowPOModal(false);
      setStatusMsg("Purchase Order created successfully.");
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-brand)' }}>
            Procurement & Vendor Lifecycle Management
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Vendor Master Database, Purchase Orders, Goods Receipts, and Vendor Performance Scoring.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={loadData} className="btn btn-ghost" title="Refresh">
            <RefreshCw size={15} />
            <span>Sync Procurement</span>
          </button>

          <button onClick={() => setShowSupplierModal(true)} className="btn btn-ghost" style={{ backgroundColor: 'var(--bg-subtle)' }}>
            <Building size={16} />
            <span>Add New Vendor</span>
          </button>

          <button onClick={() => setShowPOModal(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>Create Purchase Order</span>
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
          onClick={() => setActiveTab('suppliers')}
          className={`btn ${activeTab === 'suppliers' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <Building size={16} />
          <span>Vendor Master Database ({suppliers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <FileText size={16} />
          <span>Purchase Orders & Deliveries ({purchaseOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('emails')}
          className={`btn ${activeTab === 'emails' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <Mail size={16} />
          <span>B2B Mail Dispatch ({outgoingEmails.length})</span>
        </button>
      </div>

      {/* Tab 1: Vendor Master Database */}
      {activeTab === 'suppliers' && (
        <div className="nexa-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Approved Vendor Master Catalog</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Evaluated on delivery timeliness, quality assurance scores, and payment term compliance.
            </span>
          </div>

          <div className="nexa-table-wrapper">
            <table className="nexa-table">
              <thead>
                <tr>
                  <th>Vendor Code</th>
                  <th>Vendor Legal Name</th>
                  <th>Account Group</th>
                  <th>Payment Terms</th>
                  <th>Reconciliation GL</th>
                  <th>Evaluation Score</th>
                  <th>Purchasing Status</th>
                  <th style={{ textAlign: 'right' }}>Governance Action</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((sup) => (
                  <tr key={sup.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>
                      {sup.vendor_code || `VEND-100${sup.id}`}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{sup.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{sup.city || 'Hyderabad'}, {sup.country || 'IN'}</div>
                    </td>
                    <td>
                      <span className="nexa-badge" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        {sup.vendor_account_group || 'Standard External'}
                      </span>
                    </td>
                    <td style={{ fontSize: '12.5px' }}>{sup.payment_terms || 'Net 30 Days'}</td>
                    <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                      {sup.reconciliation_account || '2000 - AP'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Star size={14} color="#f59e0b" fill="#f59e0b" />
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>{sup.rating_score || 92.5}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`nexa-badge ${sup.status === 'BLOCKED' ? 'badge-danger' : 'badge-success'}`}>
                        {sup.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleToggleBlockVendor(sup)}
                        className={`btn ${sup.status === 'BLOCKED' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '4px 10px', fontSize: '12px', color: sup.status === 'BLOCKED' ? 'white' : 'var(--danger-text)' }}
                        title={sup.status === 'BLOCKED' ? 'Unblock Vendor' : 'Block Vendor from POs'}
                      >
                        {sup.status === 'BLOCKED' ? <CheckCircle2 size={13} /> : <Ban size={13} />}
                        <span>{sup.status === 'BLOCKED' ? 'Unblock' : 'Block'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Purchase Orders & Deliveries */}
      {activeTab === 'orders' && (
        <div className="nexa-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Purchase Orders & Deliveries Ledger</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Two-Way &amp; Three-Way Matching: Purchase Order &rarr; Goods Receipt &rarr; Invoice Verification
            </span>
          </div>

          <div className="nexa-table-wrapper">
            <table className="nexa-table">
              <thead>
                <tr>
                  <th>PO Document #</th>
                  <th>Vendor Partner</th>
                  <th>Purchasing Org</th>
                  <th>Order Date</th>
                  <th>Total Amount</th>
                  <th>Delivery Status</th>
                  <th style={{ textAlign: 'right' }}>Workflow Action</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po) => (
                  <tr key={po.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
                      #{po.po_number}
                    </td>
                    <td style={{ fontWeight: 600 }}>{po.supplier_name || 'Vendor Partner'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {po.purchasing_org || 'PORG-1000'}
                    </td>
                    <td style={{ fontSize: '12.5px' }}>
                      {new Date(po.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '14px' }}>
                      ₹ {parseFloat(po.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`nexa-badge ${
                        po.status === 'RECEIVED' ? 'badge-success' :
                        po.status === 'APPROVED' ? 'badge-primary' :
                        po.status === 'DRAFT' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {po.status === 'DRAFT' && (
                          <button
                            onClick={() => handleApprovePO(po.id)}
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                          >
                            <CheckCircle2 size={13} />
                            <span>Approve PO</span>
                          </button>
                        )}
                        {po.status === 'APPROVED' && (
                          <button
                            onClick={() => handleReceiveGoods(po)}
                            disabled={processingPoId === po.id}
                            className="btn btn-primary"
                            style={{
                              padding: '5px 12px',
                              fontSize: '12px',
                              backgroundColor: '#10b981',
                              borderColor: '#10b981',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
                            }}
                            title="Post Goods Receipt into inventory and automatically download official receipt note"
                          >
                            {processingPoId === po.id ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : (
                              <ArrowDownToLine size={13} />
                            )}
                            <span>{processingPoId === po.id ? 'Generating GRN...' : 'Post Goods Receipt'}</span>
                          </button>
                        )}
                        {po.status === 'RECEIVED' && (
                          <button
                            onClick={() => handleDownloadReceipt(po)}
                            className="btn btn-ghost"
                            style={{
                              padding: '5px 12px',
                              fontSize: '12px',
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              color: '#10b981',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            title="Download and print official Goods Receipt Note (GRN / PGI slip)"
                          >
                            <Download size={13} />
                            <span>Download GRN</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: B2B Outbound Communications & External Counterparty Mail Dispatch */}
      {activeTab === 'emails' && (
        <div className="nexa-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>Outbound B2B Communications & Supplier Dispatch</span>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Enterprise mail dispatch engine: Counterparties without this ERP receive automated RFC-compliant emails with PO confirmations and RFQ requisitions.
              </p>
            </div>
            <button onClick={loadData} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }}>
              <RefreshCw size={14} />
              <span>Refresh Logs</span>
            </button>
          </div>

          <div className="nexa-table-wrapper">
            <table className="nexa-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Doc Type</th>
                  <th>Reference ID</th>
                  <th>External Counterparty</th>
                  <th>Subject Line</th>
                  <th>Delivery Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {outgoingEmails.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                      No outbound B2B emails dispatched yet. Create a Purchase Order or instruct the AI Assistant to trigger vendor emails.
                    </td>
                  </tr>
                ) : (
                  outgoingEmails.map((mail) => (
                    <tr key={mail.id}>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {mail.created_at ? new Date(mail.created_at).toLocaleString() : 'Just now'}
                      </td>
                      <td>
                        <span className={`badge ${mail.document_type === 'PURCHASE_ORDER' ? 'badge-primary' : 'badge-warning'}`}>
                          {mail.document_type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>
                        {mail.document_reference}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{mail.recipient_name || 'Vendor Contact'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{mail.recipient_email}</div>
                      </td>
                      <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {mail.subject}
                      </td>
                      <td>
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} />
                          <span>{mail.status || 'SENT'}</span>
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedEmailPreview(mail)}
                          className="btn btn-ghost"
                          style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--primary)' }}
                        >
                          <Eye size={13} />
                          <span>Preview Email</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Vendor Master */}
      {showSupplierModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="nexa-card" style={{ width: '100%', maxWidth: '540px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Vendor Onboarding & Registration</h3>
              </div>
              <button onClick={() => setShowSupplierModal(false)} className="btn btn-ghost" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Vendor Legal Name</label>
                <input
                  type="text"
                  required
                  value={newVendor.name}
                  onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                  placeholder="e.g. Hindustan Agro Mills Ltd."
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Account Group</label>
                <select
                  className="form-input"
                  value={newVendor.vendor_account_group}
                  onChange={(e) => setNewVendor({ ...newVendor, vendor_account_group: e.target.value })}
                >
                  <option value="Standard External Vendor">Standard External Vendor</option>
                  <option value="One-Time Vendor">One-Time Vendor</option>
                  <option value="Intercompany Supplier">Intercompany Supplier</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Payment Terms</label>
                <select
                  className="form-input"
                  value={newVendor.payment_terms}
                  onChange={(e) => setNewVendor({ ...newVendor, payment_terms: e.target.value })}
                >
                  <option value="Net 30 Days">Net 30 Days</option>
                  <option value="Net 15 Days">Net 15 Days</option>
                  <option value="2/10 Net 30">2/10 Net 30 (2% Discount)</option>
                  <option value="Immediate Cash">Immediate Cash</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Contact Person</label>
                <input
                  type="text"
                  value={newVendor.contact_person}
                  onChange={(e) => setNewVendor({ ...newVendor, contact_person: e.target.value })}
                  placeholder="e.g. Suresh Kumar"
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Phone Number</label>
                <input
                  type="text"
                  value={newVendor.phone}
                  onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Email Address</label>
                <input
                  type="email"
                  value={newVendor.email}
                  onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                  placeholder="orders@vendor.com"
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>GSTIN / Tax ID</label>
                <input
                  type="text"
                  value={newVendor.gst_tax_number}
                  onChange={(e) => setNewVendor({ ...newVendor, gst_tax_number: e.target.value })}
                  placeholder="36AABCH8761R1ZX"
                  className="form-input"
                />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowSupplierModal(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Vendor Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Purchase Order */}
      {showPOModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="nexa-card" style={{ width: '100%', maxWidth: '580px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Issue Purchase Order</h3>
              </div>
              <button onClick={() => setShowPOModal(false)} className="btn btn-ghost" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePO} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Target Vendor</label>
                <select
                  required
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="form-input"
                >
                  <option value="">Select Vendor...</option>
                  {suppliers.filter(s => s.status !== 'BLOCKED').map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.vendor_code || 'Standard'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Order Line Item (Material)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
                  <select
                    required
                    value={poItems[0].product_id}
                    onChange={(e) => setPoItems([{ ...poItems[0], product_id: e.target.value }])}
                    className="form-input"
                  >
                    <option value="">Select Product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={poItems[0].quantity}
                    onChange={(e) => setPoItems([{ ...poItems[0], quantity: e.target.value }])}
                    className="form-input"
                  />

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Unit Cost"
                    value={poItems[0].unit_cost}
                    onChange={(e) => setPoItems([{ ...poItems[0], unit_cost: e.target.value }])}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowPOModal(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Email Preview */}
      {selectedEmailPreview && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="nexa-card" style={{ width: '100%', maxWidth: '640px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Outbound B2B Email Transmission Preview</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  To: {selectedEmailPreview.recipient_name} &lt;{selectedEmailPreview.recipient_email}&gt;
                </p>
              </div>
              <button onClick={() => setSelectedEmailPreview(null)} className="btn btn-ghost" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, backgroundColor: '#ffffff' }}>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', marginBottom: '16px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                <div><strong>Subject:</strong> {selectedEmailPreview.subject}</div>
                <div><strong>Reference:</strong> {selectedEmailPreview.document_reference}</div>
                <div><strong>Status:</strong> <span style={{ color: '#059669', fontWeight: 600 }}>{selectedEmailPreview.status}</span></div>
              </div>
              <div
                dangerouslySetInnerHTML={{ __html: selectedEmailPreview.body_html }}
                style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}
              />
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedEmailPreview(null)} className="btn btn-primary" style={{ padding: '6px 18px', fontSize: '13px' }}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Official Goods Receipt Note (GRN / PGI Slip) */}
      {receiptModal.isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div className="nexa-card" style={{
            width: '100%',
            maxWidth: '820px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#ffffff',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 22px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800
                }}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    Goods Receipt Note (GRN / PGI)
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Document Ref: <strong style={{ color: '#0284c7' }}>#{receiptModal.poNumber}</strong> • Stock Replenishment Confirmed
                  </div>
                </div>
              </div>

              <button
                onClick={() => setReceiptModal({ isOpen: false, receipt: null, receiptHtml: '', poNumber: '' })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Notification Banner */}
            <div style={{
              padding: '12px 22px',
              backgroundColor: '#ecfdf5',
              borderBottom: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#065f46', fontWeight: 600 }}>
                <CheckCircle2 size={16} color="#059669" />
                <span>Automated Goods Receipt generated & downloaded to your browser downloads folder!</span>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                backgroundColor: '#10b981',
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                100% QC PASSED
              </span>
            </div>

            {/* Preview Frame */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', backgroundColor: '#f1f5f9' }}>
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}
                dangerouslySetInnerHTML={{ __html: receiptModal.receiptHtml }}
              />
            </div>

            {/* Footer Buttons */}
            <div style={{
              padding: '14px 22px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <button
                onClick={() => setReceiptModal({ isOpen: false, receipt: null, receiptHtml: '', poNumber: '' })}
                className="btn btn-ghost"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Close Preview
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => downloadHtmlReceipt(receiptModal.receiptHtml, receiptModal.poNumber)}
                  className="btn btn-ghost"
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: '1px solid #cbd5e1',
                    fontWeight: 600
                  }}
                >
                  <Download size={15} />
                  <span>Download File Again</span>
                </button>

                <button
                  onClick={() => handlePrintReceipt(receiptModal.receiptHtml)}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 20px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#0284c7'
                  }}
                >
                  <Printer size={15} />
                  <span>Print / Save as PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
