import React, { useState, useEffect } from 'react';
import {
  Truck, Plus, FileText, CheckCircle2, ArrowDownToLine,
  Eye, X, Building, ShieldCheck, AlertTriangle, Star, RefreshCw, Ban, Award, Mail,
  Download, Printer, Sliders, Scale, TrendingUp, Check, Edit3, Info, Calendar, DollarSign
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
    pdfBase64: '',
    pdfUrl: null,
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

  // Vendor Scorecard Modal State
  const [scorecardModal, setScorecardModal] = useState({
    isOpen: false,
    loading: false,
    scorecard: null,
    supplier: null
  });

  const openScorecardModal = async (sup) => {
    setScorecardModal({ isOpen: true, loading: true, scorecard: null, supplier: sup });
    try {
      const data = await apiRequest(`/api/procurement/suppliers/${sup.id}/scorecard`);
      setScorecardModal({ isOpen: true, loading: false, scorecard: data, supplier: sup });
    } catch (err) {
      alert(`Could not load vendor scorecard: ${err.message}`);
      setScorecardModal(prev => ({ ...prev, loading: false }));
    }
  };

  // PO Evaluation Modal State
  const [poEvaluationModal, setPoEvaluationModal] = useState({
    isOpen: false,
    loading: false,
    evaluation: null,
    po: null,
    overrideScore: '',
    overrideReason: '',
    isSubmittingOverride: false
  });

  const openPoEvaluationModal = async (po) => {
    setPoEvaluationModal({
      isOpen: true,
      loading: true,
      evaluation: null,
      po,
      overrideScore: '',
      overrideReason: '',
      isSubmittingOverride: false
    });
    try {
      const data = await apiRequest(`/api/procurement/purchase-orders/${po.id}/evaluation`);
      setPoEvaluationModal(prev => ({
        ...prev,
        loading: false,
        evaluation: data,
        overrideScore: data.override_score !== null ? data.override_score : data.overall_score
      }));
    } catch (err) {
      alert(`Could not load order evaluation: ${err.message}`);
      setPoEvaluationModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleScoreOverride = async (e) => {
    e.preventDefault();
    const { po, overrideScore, overrideReason } = poEvaluationModal;
    if (!po || overrideScore === '' || !overrideReason) {
      alert('Please provide an override score (0-100) and an audit explanation reason.');
      return;
    }
    setPoEvaluationModal(prev => ({ ...prev, isSubmittingOverride: true }));
    try {
      const updated = await apiRequest(`/api/procurement/purchase-orders/${po.id}/evaluation/override`, {
        method: 'POST',
        body: JSON.stringify({
          override_score: parseFloat(overrideScore),
          override_reason: overrideReason
        })
      });
      setPoEvaluationModal(prev => ({
        ...prev,
        isSubmittingOverride: false,
        evaluation: updated
      }));
      setStatusMsg(`✓ Score override recorded for PO #${po.po_number || po.id}! Auditor notes logged.`);
      loadData();
    } catch (err) {
      alert(`Failed to save override: ${err.message}`);
      setPoEvaluationModal(prev => ({ ...prev, isSubmittingOverride: false }));
    }
  };

  // Vendor Compare Modal State
  const [compareModal, setCompareModal] = useState({
    isOpen: false,
    loading: false,
    productId: '',
    quantity: 10,
    requiredDate: '',
    result: null
  });

  const handleRunComparison = async (e) => {
    e.preventDefault();
    if (!compareModal.productId) {
      alert('Please select a product to compare suppliers.');
      return;
    }
    setCompareModal(prev => ({ ...prev, loading: true, result: null }));
    try {
      const res = await apiRequest('/api/procurement/vendor-compare', {
        method: 'POST',
        body: JSON.stringify({
          product_id: parseInt(compareModal.productId),
          required_quantity: parseInt(compareModal.quantity) || 10,
          required_delivery_date: compareModal.requiredDate || undefined
        })
      });
      setCompareModal(prev => ({ ...prev, loading: false, result: res }));
    } catch (err) {
      alert(`Comparison failed: ${err.message}`);
      setCompareModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Rating Config Modal State
  const [ratingConfigModal, setRatingConfigModal] = useState({
    isOpen: false,
    loading: false,
    saving: false,
    config: null
  });

  const openRatingConfigModal = async () => {
    setRatingConfigModal({ isOpen: true, loading: true, saving: false, config: null });
    try {
      const cfg = await apiRequest('/api/procurement/rating-config');
      setRatingConfigModal({ isOpen: true, loading: false, saving: false, config: cfg });
    } catch (err) {
      alert(`Could not load rating formula configuration: ${err.message}`);
      setRatingConfigModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleSaveRatingConfig = async (e) => {
    e.preventDefault();
    const cfg = ratingConfigModal.config;
    if (!cfg) return;
    setRatingConfigModal(prev => ({ ...prev, saving: true }));
    try {
      const updated = await apiRequest('/api/procurement/rating-config', {
        method: 'PUT',
        body: JSON.stringify(cfg)
      });
      setStatusMsg('✓ Vendor Rating Formula weights updated and applied across all scoring dimensions!');
      setRatingConfigModal({ isOpen: false, loading: false, saving: false, config: null });
      loadData();
    } catch (err) {
      alert(`Failed to save configuration: ${err.message}`);
      setRatingConfigModal(prev => ({ ...prev, saving: false }));
    }
  };

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

  // Client-side pure PDF file download helper
  const downloadPdfReceipt = (pdfBase64, poNumber) => {
    if (!pdfBase64) return;
    try {
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Goods_Receipt_${poNumber || 'PO'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error('PDF download error:', e);
    }
  };

  const getPdfBlobUrl = (pdfBase64) => {
    if (!pdfBase64) return '';
    try {
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      return URL.createObjectURL(blob);
    } catch (e) {
      return '';
    }
  };

  const handleReceiveGoods = async (po) => {
    const poId = typeof po === 'object' ? po.id : po;
    const poObj = typeof po === 'object' ? po : purchaseOrders.find(p => p.id === poId);
    const poNum = poObj ? poObj.po_number : `PO-${poId}`;

    setProcessingPoId(poId);
    try {
      const res = await apiRequest(`/api/procurement/purchase-orders/${poId}/receive`, { method: 'POST' });
      setStatusMsg(`✓ Goods receipt posted for #${poNum}! Stocks replenished & official PDF receipt downloaded.`);

      const blobUrl = res.pdf_base64 ? getPdfBlobUrl(res.pdf_base64) : null;

      // 1. Automatically download the generated PDF file!
      if (res.pdf_base64) {
        downloadPdfReceipt(res.pdf_base64, poNum);
      }

      // 2. Open interactive PDF viewer modal
      setReceiptModal({
        isOpen: true,
        receipt: res.receipt,
        pdfBase64: res.pdf_base64,
        pdfUrl: blobUrl,
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
      if (res && res.pdf_base64) {
        const blobUrl = getPdfBlobUrl(res.pdf_base64);
        downloadPdfReceipt(res.pdf_base64, po.po_number);
        setReceiptModal({
          isOpen: true,
          receipt: res.receipt,
          pdfBase64: res.pdf_base64,
          pdfUrl: blobUrl,
          poNumber: po.po_number
        });
      }
    } catch (err) {
      alert(`Could not fetch goods receipt PDF: ${err.message}`);
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={loadData} className="btn btn-ghost" title="Refresh">
            <RefreshCw size={15} />
            <span>Sync</span>
          </button>

          <button onClick={() => setCompareModal({ isOpen: true, loading: false, productId: products[0]?.id || '', quantity: 10, requiredDate: '', result: null })} className="btn btn-ghost" style={{ backgroundColor: 'var(--bg-subtle)' }}>
            <Scale size={15} />
            <span>Compare Suppliers</span>
          </button>

          <button onClick={openRatingConfigModal} className="btn btn-ghost" style={{ backgroundColor: 'var(--bg-subtle)' }} title="Configure Administrator Scoring Weights">
            <Sliders size={15} />
            <span>Rating Formula</span>
          </button>

          <button onClick={() => setShowSupplierModal(true)} className="btn btn-ghost" style={{ backgroundColor: 'var(--bg-subtle)' }}>
            <Building size={16} />
            <span>Add Vendor</span>
          </button>

          <button onClick={() => setShowPOModal(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>Create PO</span>
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
                      <button
                        onClick={() => openScorecardModal(sup)}
                        className="btn btn-ghost"
                        style={{ padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}
                        title="Click to view detailed Vendor Performance Scorecard"
                      >
                        <Star size={14} color="#f59e0b" fill="#f59e0b" />
                        <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--primary)' }}>
                          {(sup.rating_score || 92.5).toFixed(1)}%
                        </span>
                        <Award size={12} color="var(--primary)" />
                      </button>
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
                  <th>Vendor Evaluation</th>
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
                    <td>
                      <button
                        onClick={() => openPoEvaluationModal(po)}
                        className="btn btn-ghost"
                        style={{ padding: '3px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="View Order-Specific Vendor Evaluation & Evidence"
                      >
                        <Award size={12} color="var(--primary)" />
                        <span style={{ fontWeight: 600 }}>
                          {po.status === 'RECEIVED' ? 'QC & Rating (Final)' : 'Provisional Score'}
                        </span>
                      </button>
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
                            title="Post Goods Receipt into inventory and automatically download official PDF receipt"
                          >
                            {processingPoId === po.id ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : (
                              <ArrowDownToLine size={13} />
                            )}
                            <span>{processingPoId === po.id ? 'Generating PDF...' : 'Post Goods Receipt'}</span>
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
                            title="Download official Goods Receipt PDF Note"
                          >
                            <Download size={13} />
                            <span>Download PDF</span>
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
      {/* Modal: Official Goods Receipt Note PDF Viewer */}
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
            maxWidth: '850px',
            maxHeight: '94vh',
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
              padding: '14px 22px',
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
                    Goods Receipt Note (PDF)
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Document Ref: <strong style={{ color: '#0284c7' }}>#{receiptModal.poNumber}</strong> • Vector PDF Document
                  </div>
                </div>
              </div>

              <button
                onClick={() => setReceiptModal({ isOpen: false, receipt: null, pdfBase64: '', pdfUrl: null, poNumber: '' })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Notification Banner */}
            <div style={{
              padding: '10px 22px',
              backgroundColor: '#ecfdf5',
              borderBottom: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#065f46', fontWeight: 600 }}>
                <CheckCircle2 size={16} color="#059669" />
                <span>Automated Goods Receipt PDF generated & downloaded to your browser downloads folder!</span>
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

            {/* Embedded Native PDF Viewer Frame */}
            <div style={{ flex: 1, padding: '12px 16px', backgroundColor: '#334155', minHeight: '520px', display: 'flex' }}>
              {receiptModal.pdfUrl ? (
                <iframe
                  src={receiptModal.pdfUrl}
                  title={`Goods Receipt PDF - ${receiptModal.poNumber}`}
                  style={{
                    width: '100%',
                    height: '520px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff'
                  }}
                />
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                  Loading PDF Document...
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div style={{
              padding: '12px 22px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <button
                onClick={() => setReceiptModal({ isOpen: false, receipt: null, pdfBase64: '', pdfUrl: null, poNumber: '' })}
                className="btn btn-ghost"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Close Preview
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                {receiptModal.pdfUrl && (
                  <button
                    onClick={() => window.open(receiptModal.pdfUrl, '_blank')}
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
                    <span>Open in New Tab</span>
                  </button>
                )}

                <button
                  onClick={() => downloadPdfReceipt(receiptModal.pdfBase64, receiptModal.poNumber)}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 20px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#10b981',
                    borderColor: '#10b981'
                  }}
                >
                  <Download size={15} />
                  <span>Download PDF Document</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Vendor Performance Scorecard Modal */}
      {scorecardModal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '640px', width: '92vw', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <Award size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                    {scorecardModal.supplier?.name} — Performance Scorecard
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Code: <code>{scorecardModal.supplier?.vendor_code || `VEND-${scorecardModal.supplier?.id}`}</code> • Multi-Criteria Aggregation
                  </span>
                </div>
              </div>
              <button onClick={() => setScorecardModal({ isOpen: false, loading: false, scorecard: null, supplier: null })} className="btn btn-ghost" style={{ padding: '6px' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {scorecardModal.loading ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                  <div>Computing deterministic vendor metrics across past orders...</div>
                </div>
              ) : scorecardModal.scorecard ? (
                <>
                  {/* Top Score Banner */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>OVERALL COMPOSITE RATING</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '32px', fontWeight: 900, color: '#16a34a' }}>
                          {(scorecardModal.scorecard.overall_score || 0).toFixed(1)}
                        </span>
                        <span style={{ fontSize: '14px', color: '#64748b' }}>/ 100</span>
                        <div style={{ display: 'flex', gap: '2px', marginLeft: '6px' }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={14}
                              fill={star <= Math.round((scorecardModal.scorecard.overall_score || 0) / 20) ? "#f59e0b" : "#e2e8f0"}
                              color={star <= Math.round((scorecardModal.scorecard.overall_score || 0) / 20) ? "#f59e0b" : "#cbd5e1"}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Evaluated Orders: <strong>{scorecardModal.scorecard.evaluated_orders_count || 0}</strong></div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Confidence: <strong style={{ color: '#2563eb' }}>{scorecardModal.scorecard.score_confidence || 'MEDIUM'}</strong></div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Trend: <strong style={{ color: '#16a34a' }}>{scorecardModal.scorecard.trend || 'STABLE'}</strong></div>
                    </div>
                  </div>

                  {/* Dimension Score Bars */}
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 10px 0', color: '#1e293b' }}>
                      10-Dimension Verifiable Performance Evaluation
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { name: 'Delivery Speed & On-Time Performance', score: scorecardModal.scorecard.delivery_score, weight: '25%' },
                        { name: 'Price Competitiveness & Total Landed Cost', score: scorecardModal.scorecard.price_competitiveness_score, weight: '25%' },
                        { name: 'Quality Conformance & Low Rejection Rate', score: scorecardModal.scorecard.quality_score, weight: '20%' },
                        { name: 'Service Responsiveness & Support', score: scorecardModal.scorecard.service_score, weight: '15%' },
                        { name: 'Order Reliability & Full Fulfillment', score: scorecardModal.scorecard.reliability_score, weight: '10%' },
                        { name: 'Tax, Sanctions & Certification Compliance', score: scorecardModal.scorecard.compliance_score, weight: '5%' }
                      ].map((dim, idx) => (
                        <div key={idx} style={{ fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ color: '#334155' }}>{dim.name} <span style={{ color: '#94a3b8', fontSize: '11px' }}>({dim.weight})</span></span>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>
                              {dim.score !== null ? `${dim.score.toFixed(1)}%` : 'No data'}
                            </span>
                          </div>
                          <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${dim.score || 0}%`,
                              height: '100%',
                              backgroundColor: (dim.score || 0) >= 85 ? '#16a34a' : (dim.score || 0) >= 70 ? '#f59e0b' : '#dc2626',
                              borderRadius: '3px'
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Operational KPI Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>On-Time Delivery Rate</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                        {(scorecardModal.scorecard.on_time_delivery_pct || 95).toFixed(1)}%
                      </div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Avg Delivery Delay</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                        {(scorecardModal.scorecard.avg_delivery_delay_days || 0).toFixed(1)} days
                      </div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Defect & Return Rate</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                        {(scorecardModal.scorecard.defect_rate_pct || 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {/* Recent Evaluated Orders */}
                  {scorecardModal.scorecard.recent_evaluations && scorecardModal.scorecard.recent_evaluations.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 8px 0', color: '#1e293b' }}>
                        Order-Level Rating Ledger
                      </h4>
                      <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>
                            <th style={{ padding: '6px' }}>PO #</th>
                            <th style={{ padding: '6px' }}>Order Date</th>
                            <th style={{ padding: '6px' }}>Landed Cost</th>
                            <th style={{ padding: '6px' }}>Status</th>
                            <th style={{ padding: '6px', textAlign: 'right' }}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scorecardModal.scorecard.recent_evaluations.map((ev, eIdx) => (
                            <tr key={eIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '6px', fontWeight: 700, color: 'var(--primary)' }}>
                                #{ev.po_number}
                              </td>
                              <td style={{ padding: '6px', color: '#64748b' }}>
                                {ev.order_date ? new Date(ev.order_date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td style={{ padding: '6px' }}>
                                ₹{parseFloat(ev.total_landed_cost || ev.ordered_amount || 0).toLocaleString()}
                              </td>
                              <td style={{ padding: '6px' }}>
                                <span style={{
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  backgroundColor: ev.is_provisional ? '#fef3c7' : '#dcfce7',
                                  color: ev.is_provisional ? '#92400e' : '#166534'
                                }}>
                                  {ev.is_provisional ? 'PROVISIONAL' : 'FINAL'}
                                </span>
                              </td>
                              <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                                {(ev.overall_score || 0).toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
              <button onClick={() => setScorecardModal({ isOpen: false, loading: false, scorecard: null, supplier: null })} className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '12px' }}>
                Close Scorecard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: PO Evaluation & Auditor Override Modal */}
      {poEvaluationModal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '600px', width: '92vw', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                  <Award size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                    Purchase Order #{poEvaluationModal.po?.po_number || poEvaluationModal.po?.id} Evaluation
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Supplier: <strong>{poEvaluationModal.evaluation?.supplier_name || poEvaluationModal.po?.supplier_name}</strong>
                  </span>
                </div>
              </div>
              <button onClick={() => setPoEvaluationModal({ isOpen: false, loading: false, evaluation: null, po: null, overrideScore: '', overrideReason: '', isSubmittingOverride: false })} className="btn btn-ghost" style={{ padding: '6px' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {poEvaluationModal.loading ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                  <div>Loading order-specific verifiable evaluation evidence...</div>
                </div>
              ) : poEvaluationModal.evaluation ? (
                <>
                  {/* Score & Status Banner */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>ORDER PERFORMANCE SCORE</div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#16a34a' }}>
                        {(poEvaluationModal.evaluation.overall_score || 0).toFixed(1)}%
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: poEvaluationModal.evaluation.is_provisional ? '#fef3c7' : '#dcfce7',
                        color: poEvaluationModal.evaluation.is_provisional ? '#92400e' : '#166534'
                      }}>
                        {poEvaluationModal.evaluation.is_provisional ? 'PROVISIONAL ASSESSMENT' : 'FINAL VERIFIED ASSESSMENT'}
                      </span>
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                        Confidence: {poEvaluationModal.evaluation.confidence_level || 'HIGH'}
                      </div>
                    </div>
                  </div>

                  {/* Landed Cost & Delivery Details */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                    <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Cost Breakdown:</span>
                      <div>Base Ordered: <strong>₹{parseFloat(poEvaluationModal.evaluation.ordered_amount || 0).toLocaleString()}</strong></div>
                      <div>Shipping & Freight: <strong>₹{parseFloat(poEvaluationModal.evaluation.shipping_cost || 0).toLocaleString()}</strong></div>
                      <div>Tax & Duties: <strong>₹{parseFloat(poEvaluationModal.evaluation.tax_duties_cost || 0).toLocaleString()}</strong></div>
                      <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #e2e8f0', color: '#0f172a' }}>
                        Total Landed: <strong>₹{parseFloat(poEvaluationModal.evaluation.total_landed_cost || 0).toLocaleString()}</strong>
                      </div>
                    </div>

                    <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Delivery Timeliness:</span>
                      <div>Expected: <strong>{poEvaluationModal.evaluation.expected_delivery_date || 'N/A'}</strong></div>
                      <div>Actual: <strong>{poEvaluationModal.evaluation.actual_delivery_date || 'Pending delivery'}</strong></div>
                      <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #e2e8f0' }}>
                        Inspection Status: <strong>{poEvaluationModal.evaluation.inspection_status || 'PASSED'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Scoring Dimensions */}
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Dimension Breakdown
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                      <div style={{ padding: '6px 8px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                        Delivery: <strong>{poEvaluationModal.evaluation.delivery_score !== null ? `${poEvaluationModal.evaluation.delivery_score}%` : 'Pending'}</strong>
                      </div>
                      <div style={{ padding: '6px 8px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                        Price: <strong>{poEvaluationModal.evaluation.price_score !== null ? `${poEvaluationModal.evaluation.price_score}%` : 'Pending'}</strong>
                      </div>
                      <div style={{ padding: '6px 8px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                        Quality: <strong>{poEvaluationModal.evaluation.quality_score !== null ? `${poEvaluationModal.evaluation.quality_score}%` : 'Pending'}</strong>
                      </div>
                      <div style={{ padding: '6px 8px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                        Service: <strong>{poEvaluationModal.evaluation.service_score !== null ? `${poEvaluationModal.evaluation.service_score}%` : 'Pending'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* AI Explanation */}
                  {poEvaluationModal.evaluation.ai_explanation && (
                    <div style={{ padding: '10px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe', fontSize: '12px', color: '#1e40af' }}>
                      <strong>AI Explanation:</strong> {poEvaluationModal.evaluation.ai_explanation}
                    </div>
                  )}

                  {/* Auditor Score Override Form */}
                  <form onSubmit={handleScoreOverride} style={{ padding: '12px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#92400e', fontWeight: 700, fontSize: '12px' }}>
                      <Edit3 size={14} />
                      <span>Authorized Reviewer Correction / Dispute Override</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: 600, color: '#78350f', display: 'block', marginBottom: '2px' }}>Adjusted Score</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          required
                          value={poEvaluationModal.overrideScore}
                          onChange={(e) => setPoEvaluationModal({ ...poEvaluationModal, overrideScore: e.target.value })}
                          className="form-input"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: 600, color: '#78350f', display: 'block', marginBottom: '2px' }}>Audit Reason</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Buyer-caused port customs delay excused"
                          value={poEvaluationModal.overrideReason}
                          onChange={(e) => setPoEvaluationModal({ ...poEvaluationModal, overrideReason: e.target.value })}
                          className="form-input"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={poEvaluationModal.isSubmittingOverride}
                      className="btn btn-primary"
                      style={{ alignSelf: 'flex-end', padding: '5px 12px', fontSize: '11px', backgroundColor: '#d97706', borderColor: '#d97706' }}
                    >
                      {poEvaluationModal.isSubmittingOverride ? 'Saving...' : 'Apply Auditor Override'}
                    </button>
                  </form>
                </>
              ) : null}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
              <button onClick={() => setPoEvaluationModal({ isOpen: false, loading: false, evaluation: null, po: null, overrideScore: '', overrideReason: '', isSubmittingOverride: false })} className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '12px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Supplier Comparison Matrix Modal */}
      {compareModal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '720px', width: '94vw', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <Scale size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                    Supplier Procurement Comparison Engine
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Total Landed Cost, Delivery Speed, Quality & Risk Evaluation
                  </span>
                </div>
              </div>
              <button onClick={() => setCompareModal({ isOpen: false, loading: false, productId: '', quantity: 10, requiredDate: '', result: null })} className="btn btn-ghost" style={{ padding: '6px' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <form onSubmit={handleRunComparison} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr auto', gap: '10px', alignItems: 'flex-end', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Product</label>
                  <select
                    value={compareModal.productId}
                    onChange={(e) => setCompareModal({ ...compareModal, productId: e.target.value })}
                    className="form-input"
                    style={{ padding: '6px 8px', fontSize: '12px' }}
                  >
                    <option value="">Select Item...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku || p.id})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={compareModal.quantity}
                    onChange={(e) => setCompareModal({ ...compareModal, quantity: e.target.value })}
                    className="form-input"
                    style={{ padding: '6px 8px', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Required Delivery Date</label>
                  <input
                    type="date"
                    value={compareModal.requiredDate}
                    onChange={(e) => setCompareModal({ ...compareModal, requiredDate: e.target.value })}
                    className="form-input"
                    style={{ padding: '6px 8px', fontSize: '12px' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={compareModal.loading}
                  className="btn btn-primary"
                  style={{ padding: '7px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {compareModal.loading ? <RefreshCw size={14} className="animate-spin" /> : <Scale size={14} />}
                  <span>Evaluate</span>
                </button>
              </form>

              {compareModal.result && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {compareModal.result.recommended_supplier_name && (
                    <div style={{ padding: '10px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '12.5px', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <strong>Recommended Partner:</strong> {compareModal.result.recommended_supplier_name}
                        <div style={{ fontSize: '11px', color: '#15803d', marginTop: '2px' }}>
                          {compareModal.result.recommendation_reason}
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#dcfce7', padding: '3px 8px', borderRadius: '4px' }}>
                        OPTIMAL TRADE-OFF
                      </span>
                    </div>
                  )}

                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '8px' }}>Supplier Legal Name</th>
                        <th style={{ padding: '8px' }}>Unit Quote</th>
                        <th style={{ padding: '8px' }}>Total Landed Cost</th>
                        <th style={{ padding: '8px' }}>Lead Time</th>
                        <th style={{ padding: '8px' }}>Rating</th>
                        <th style={{ padding: '8px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compareModal.result.suppliers?.map((sup, sIdx) => {
                        const isRec = sup.supplier_id === compareModal.result.recommended_supplier_id;
                        return (
                          <tr key={sIdx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isRec ? '#f0fdf4' : 'transparent' }}>
                            <td style={{ padding: '8px', fontWeight: 600 }}>
                              {sup.supplier_name}
                              {isRec && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#16a34a', fontWeight: 800 }}>★ BEST FIT</span>}
                            </td>
                            <td style={{ padding: '8px' }}>₹{parseFloat(sup.unit_price || 0).toLocaleString()}</td>
                            <td style={{ padding: '8px', fontWeight: 700, color: '#0f172a' }}>
                              ₹{parseFloat(sup.total_landed_cost || 0).toLocaleString()}
                            </td>
                            <td style={{ padding: '8px' }}>{sup.delivery_lead_time_days} days</td>
                            <td style={{ padding: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}>
                                <Star size={12} fill="#f59e0b" color="#f59e0b" />
                                <span>{(sup.overall_score || sup.rating_score || 90).toFixed(1)}</span>
                              </div>
                            </td>
                            <td style={{ padding: '8px' }}>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: sup.compliance_flag === 'FAILED' ? '#fee2e2' : '#dcfce7',
                                color: sup.compliance_flag === 'FAILED' ? '#991b1b' : '#166534'
                              }}>
                                {sup.compliance_flag === 'FAILED' ? 'NON-COMPLIANT' : 'ELIGIBLE'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
              <button onClick={() => setCompareModal({ isOpen: false, loading: false, productId: '', quantity: 10, requiredDate: '', result: null })} className="btn btn-ghost" style={{ padding: '6px 16px', fontSize: '12px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Rating Formula Weights Configuration Modal */}
      {ratingConfigModal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '540px', width: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                    Vendor Rating Formula Configuration
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Administrator-Configured Dimension Weights & Policies
                  </span>
                </div>
              </div>
              <button onClick={() => setRatingConfigModal({ isOpen: false, loading: false, saving: false, config: null })} className="btn btn-ghost" style={{ padding: '6px' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRatingConfig} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {ratingConfigModal.config && (
                <>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Weights are normalized to 100%. Dimensions with missing data are automatically renormalized without penalizing new vendors.
                  </div>

                  {[
                    { key: 'weight_delivery', label: 'Delivery Speed & Timeliness Weight' },
                    { key: 'weight_price', label: 'Price Competitiveness & Landed Cost Weight' },
                    { key: 'weight_quality', label: 'Product Quality & Low Defects Weight' },
                    { key: 'weight_service', label: 'Service & Responsiveness Weight' },
                    { key: 'weight_reliability', label: 'Order Reliability & Fulfillment Weight' },
                    { key: 'weight_compliance', label: 'Compliance & Regulatory Documentation Weight' }
                  ].map((f) => (
                    <div key={f.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{f.label}</span>
                        <strong style={{ color: 'var(--primary)' }}>
                          {(ratingConfigModal.config[f.key] * 100).toFixed(0)}%
                        </strong>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={ratingConfigModal.config[f.key]}
                        onChange={(e) => setRatingConfigModal({
                          ...ratingConfigModal,
                          config: { ...ratingConfigModal.config, [f.key]: parseFloat(e.target.value) }
                        })}
                        style={{ width: '100%' }}
                      />
                    </div>
                  ))}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Min Orders (High Confidence)</label>
                      <input
                        type="number"
                        min="1"
                        value={ratingConfigModal.config.min_orders_for_high_confidence || 5}
                        onChange={(e) => setRatingConfigModal({
                          ...ratingConfigModal,
                          config: { ...ratingConfigModal.config, min_orders_for_high_confidence: parseInt(e.target.value) || 5 }
                        })}
                        className="form-input"
                        style={{ padding: '6px 8px', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Lookback Window (Days)</label>
                      <input
                        type="number"
                        min="30"
                        value={ratingConfigModal.config.lookback_days || 365}
                        onChange={(e) => setRatingConfigModal({
                          ...ratingConfigModal,
                          config: { ...ratingConfigModal.config, lookback_days: parseInt(e.target.value) || 365 }
                        })}
                        className="form-input"
                        style={{ padding: '6px 8px', fontSize: '12px' }}
                      />
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRatingConfigModal({ isOpen: false, loading: false, saving: false, config: null })}
                  className="btn btn-ghost"
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ratingConfigModal.saving}
                  className="btn btn-primary"
                  style={{ padding: '6px 16px', fontSize: '12px' }}
                >
                  {ratingConfigModal.saving ? 'Saving...' : 'Save & Apply Formula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
