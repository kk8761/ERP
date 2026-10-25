import React, { useState, useEffect } from 'react';
import {
  FileText, Search, Download, RotateCcw, Eye,
  CheckCircle2, Clock, Users, X, Receipt, Printer, AlertTriangle, ShieldCheck,
  ShoppingCart, UserPlus, Plus, UploadCloud
} from 'lucide-react';
import { apiRequest, downloadCsv } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import UniversalDataImportModal from '../components/UniversalDataImportModal';
import RefundModal from '../components/RefundModal';

export default function SalesPage({ initialTab = 'orders', initialAction = '', onNavigate }) {
  const { user, hasPermission } = useAuth();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activeTab, setActiveTab] = useState(
    ['orders', 'invoices', 'customers', 'returns'].includes(initialTab) ? initialTab : 'orders'
  );
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [refundTargetOrder, setRefundTargetOrder] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  // Customer registration modal state
  const [showCustomerModal, setShowCustomerModal] = useState(initialAction === 'create');
  const [showImportModal, setShowImportModal] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', email: '', address: '' });
  const [custError, setCustError] = useState('');

  // Sync prop changes whenever user clicks on sidebar or topnav
  useEffect(() => {
    if (['orders', 'invoices', 'customers', 'returns'].includes(initialTab)) {
      setActiveTab(initialTab);
    } else {
      setActiveTab('orders');
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialAction === 'create') {
      setActiveTab('customers');
      setShowCustomerModal(true);
    }
  }, [initialAction]);

  const loadSalesData = async () => {
    try {
      setLoading(true);
      const [ords, custs] = await Promise.all([
        apiRequest(`/api/sales/orders${search ? `?search=${encodeURIComponent(search)}` : ''}`),
        apiRequest('/api/sales/customers')
      ]);
      setOrders(ords);
      setCustomers(custs);
    } catch (e) {
      console.error('Failed to load sales data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesData();
  }, [search]);

  const handleRefund = (order) => {
    setRefundTargetOrder(order);
  };

  const handleExportCsv = () => {
    downloadCsv('/api/reports/sales/csv', 'nexaerp_sales_orders.csv');
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setCustError('');
    if (!newCust.name.trim()) {
      setCustError('Customer name is required');
      return;
    }
    try {
      const created = await apiRequest('/api/sales/customers', {
        method: 'POST',
        body: JSON.stringify(newCust)
      });
      setCustomers(prev => [...prev, created]);
      setShowCustomerModal(false);
      setNewCust({ name: '', phone: '', email: '', address: '' });
      setStatusMsg(`Customer "${created.name}" successfully registered into CRM.`);
      setTimeout(() => setStatusMsg(''), 5000);
    } catch (err) {
      setCustError(err.message || 'Failed to create customer');
    }
  };

  // Filtered lists
  const refundedOrders = orders.filter(o => o.order_status === 'REFUNDED');
  const activeOrders = orders.filter(o => o.order_status !== 'REFUNDED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-brand)' }}>
            Sales & Orders Management
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Process customer orders, formal tax invoices, client CRM records, and return/refund authorizations
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onNavigate && (
            <button
              onClick={() => onNavigate('pos')}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ShoppingCart size={15} />
              <span>+ New Sale (POS)</span>
            </button>
          )}

          <button onClick={handleExportCsv} className="btn btn-secondary">
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div style={{ padding: '10px 14px', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--success-border)', fontSize: '13px' }}>
          {statusMsg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('orders')}
          className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <FileText size={16} />
          <span>Sales Orders ({activeOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`btn ${activeTab === 'invoices' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <Receipt size={16} />
          <span>Tax Invoices & Billing ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`btn ${activeTab === 'customers' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <Users size={16} />
          <span>Customer Directory ({customers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('returns')}
          className={`btn ${activeTab === 'returns' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <RotateCcw size={16} />
          <span>Returns & RMA Refunds ({refundedOrders.length})</span>
        </button>
      </div>

      {/* TAB 1: SALES ORDERS */}
      {activeTab === 'orders' && (
        <>
          {/* Search Bar */}
          <div className="nexa-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search by invoice number (e.g. #INV-001245)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ border: 'none', padding: 0 }}
            />
          </div>

          {/* Orders Table */}
          <div className="nexa-card" style={{ overflow: 'hidden' }}>
            <div className="nexa-table-wrapper">
              <table className="nexa-table">
                <thead>
                  <tr>
                    <th>Order / Inv #</th>
                    <th>Customer</th>
                    <th>Date & Time</th>
                    <th>Payment Method</th>
                    <th>Subtotal</th>
                    <th>Discount</th>
                    <th>Total Paid</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
                        {o.invoice_number}
                      </td>
                      <td style={{ fontWeight: 500 }}>{o.customer_name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {new Date(o.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span className="badge badge-info">{o.payment_method}</span>
                      </td>
                      <td>₹ {parseFloat(o.subtotal).toFixed(2)}</td>
                      <td style={{ color: parseFloat(o.discount_amount) > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {parseFloat(o.discount_amount) > 0 ? `-₹ ${parseFloat(o.discount_amount).toFixed(2)}` : '₹ 0.00'}
                      </td>
                      <td style={{ fontWeight: 700, fontSize: '14px' }}>
                        ₹ {parseFloat(o.total_amount).toFixed(2)}
                      </td>
                      <td>
                        <span className="badge badge-success">{o.order_status}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="btn btn-ghost"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            title="View Items"
                          >
                            <Eye size={14} />
                            <span>Items</span>
                          </button>
                          {hasPermission('sales.refund') && (
                            <button
                              onClick={() => handleRefund(o)}
                              className="btn btn-ghost"
                              style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--danger)' }}
                              title="Process Refund & Return"
                            >
                              <RotateCcw size={14} />
                              <span>Refund</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeOrders.length === 0 && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                        No active orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: TAX INVOICES & BILLING */}
      {activeTab === 'invoices' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="nexa-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                GST & VAT Tax Invoice Register
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Compliant with Section 31 of CGST Act. Invoices contain HSN codes, SAC, and CGST/SGST breakdown.
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              <Printer size={15} />
              <span>Print Invoice Log</span>
            </button>
          </div>

          <div className="nexa-card" style={{ overflow: 'hidden' }}>
            <div className="nexa-table-wrapper">
              <table className="nexa-table">
                <thead>
                  <tr>
                    <th>Tax Invoice #</th>
                    <th>Billed Party</th>
                    <th>Issue Date</th>
                    <th>Taxable Amount</th>
                    <th>CGST (2.5%)</th>
                    <th>SGST (2.5%)</th>
                    <th>Grand Total</th>
                    <th>Payment</th>
                    <th style={{ textAlign: 'right' }}>Document</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const subtotal = parseFloat(o.subtotal || 0);
                    const cgst = subtotal * 0.025;
                    const sgst = subtotal * 0.025;
                    return (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>
                          {o.invoice_number}
                        </td>
                        <td style={{ fontWeight: 600 }}>{o.customer_name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {new Date(o.created_at).toLocaleDateString()}
                        </td>
                        <td>₹ {subtotal.toFixed(2)}</td>
                        <td>₹ {cgst.toFixed(2)}</td>
                        <td>₹ {sgst.toFixed(2)}</td>
                        <td style={{ fontWeight: 700 }}>₹ {parseFloat(o.total_amount).toFixed(2)}</td>
                        <td>
                          <span className={`badge ${o.order_status === 'COMPLETED' ? 'badge-success' : 'badge-danger'}`}>
                            {o.order_status === 'COMPLETED' ? 'PAID IN FULL' : 'REVERSED'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => setSelectedInvoice(o)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Receipt size={14} />
                            <span>Tax Bill</span>
                          </button>
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

      {/* TAB 3: CUSTOMER DIRECTORY */}
      {activeTab === 'customers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="nexa-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                Customer Accounts & CRM Directory
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Track retail and wholesale customer profiles, contact channels, and cumulative transaction volume
              </div>
            </div>
            {hasPermission('customers.manage') && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Upload Customer lists in PDF, Excel, CSV, or JSON"
                >
                  <UploadCloud size={16} color="var(--primary)" />
                  <span>Upload Data (PDF/Excel/CSV)</span>
                </button>
                <button
                  onClick={() => setShowCustomerModal(true)}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <UserPlus size={16} />
                  <span>+ Register Customer</span>
                </button>
              </div>
            )}
          </div>

          <div className="nexa-card" style={{ overflow: 'hidden' }}>
            <div className="nexa-table-wrapper">
              <table className="nexa-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Phone Number</th>
                    <th>Email Address</th>
                    <th>Address</th>
                    <th style={{ textAlign: 'right' }}>Total Lifetime Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>{c.phone || '—'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{c.email || '—'}</td>
                      <td>{c.address || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                        ₹ {parseFloat(c.total_spend || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                        <Users size={28} color="var(--text-muted)" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                        No customer accounts found. Click "+ Register Customer" to add your first customer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Customer Registration Modal Dialog */}
      {showCustomerModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '24px', maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Register New Customer</h3>
              </div>
              <button onClick={() => setShowCustomerModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            {custError && (
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger-border)', fontSize: '13px', marginBottom: '14px' }}>
                {custError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '12.5px', marginBottom: '4px', display: 'block' }}>Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  value={newCust.name}
                  onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12.5px', marginBottom: '4px', display: 'block' }}>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={newCust.phone}
                    onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12.5px', marginBottom: '4px', display: 'block' }}>Email Address</label>
                  <input
                    type="email"
                    placeholder="rajesh@example.com"
                    value={newCust.email}
                    onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '12.5px', marginBottom: '4px', display: 'block' }}>Billing / Delivery Address</label>
                <input
                  type="text"
                  placeholder="Street, City, Postal Code"
                  value={newCust.address}
                  onChange={(e) => setNewCust({ ...newCust, address: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowCustomerModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserPlus size={15} />
                  <span>Save Customer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: RETURNS & RMA REFUNDS */}
      {activeTab === 'returns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="nexa-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                Sales Returns & Credit Memos (RMA)
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Tracking returned goods, restock conditions, and customer refund disbursements with audit logs
              </div>
            </div>
            <span className="badge badge-warning" style={{ fontSize: '12px' }}>
              Restocked Inventory Auto-Updated
            </span>
          </div>

          <div className="nexa-card" style={{ overflow: 'hidden' }}>
            <div className="nexa-table-wrapper">
              <table className="nexa-table">
                <thead>
                  <tr>
                    <th>RMA Reference #</th>
                    <th>Original Invoice</th>
                    <th>Customer</th>
                    <th>Refunded Amount</th>
                    <th>Restock Status</th>
                    <th>Date Processed</th>
                    <th>Approval Status</th>
                  </tr>
                </thead>
                <tbody>
                  {refundedOrders.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700, color: 'var(--danger)', fontFamily: 'monospace' }}>
                        RMA-{String(r.id).padStart(4, '0')}
                      </td>
                      <td style={{ fontWeight: 600 }}>{r.invoice_number}</td>
                      <td>{r.customer_name}</td>
                      <td style={{ fontWeight: 700, color: 'var(--danger)' }}>
                        -₹ {parseFloat(r.total_amount).toFixed(2)}
                      </td>
                      <td>
                        <span className="badge badge-success">
                          Restocked into Storage
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <span className="badge badge-danger">
                          REFUND ISSUED
                        </span>
                      </td>
                    </tr>
                  ))}
                  {refundedOrders.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                        <RotateCcw size={28} color="var(--text-muted)" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                        No refunded transactions on record. To process a return, open Sales Orders and click "Refund".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Line Items Modal */}
      {selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '24px', maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Invoice Details: {selectedOrder.invoice_number}</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Customer: {selectedOrder.customer_name} | Cashier: {selectedOrder.cashier_name || 'Staff'}
                </p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="btn btn-ghost" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <div className="nexa-table-wrapper" style={{ marginBottom: '16px' }}>
              <table className="nexa-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th style={{ textAlign: 'right' }}>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((it) => (
                    <tr key={it.id}>
                      <td style={{ fontWeight: 600 }}>{it.product_name}</td>
                      <td>{it.quantity}</td>
                      <td>₹ {parseFloat(it.unit_price).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>₹ {parseFloat(it.line_total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '12px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>₹ {parseFloat(selectedOrder.subtotal).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Discount:</span>
                <span>-₹ {parseFloat(selectedOrder.discount_amount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '15px', color: 'var(--primary)', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                <span>Total Amount:</span>
                <span>₹ {parseFloat(selectedOrder.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setSelectedOrder(null)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Formal Tax Invoice Modal */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '28px', maxWidth: '680px', backgroundColor: '#ffffff', color: '#111827' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0064d2', paddingBottom: '14px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0064d2' }}>TAX INVOICE</h2>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Original for Recipient</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', fontWeight: 800 }}>NexaERP Enterprise Ltd</div>
                <div style={{ fontSize: '11.5px', color: '#6b7280' }}>GSTIN: 29ABCDE1234F1Z5</div>
                <div style={{ fontSize: '11.5px', color: '#6b7280' }}>Bangalore, Karnataka - 560100</div>
              </div>
            </div>

            {/* Bill To & Invoice Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', fontSize: '12.5px' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Billed To:</div>
                <div style={{ fontWeight: 800, fontSize: '14px', marginTop: '2px' }}>{selectedInvoice.customer_name}</div>
                <div style={{ color: '#6b7280' }}>Walk-in Customer / Registered</div>
                <div style={{ color: '#6b7280' }}>Payment Mode: {selectedInvoice.payment_method}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div><strong>Invoice No:</strong> {selectedInvoice.invoice_number}</div>
                <div><strong>Invoice Date:</strong> {new Date(selectedInvoice.created_at).toLocaleDateString()}</div>
                <div><strong>Place of Supply:</strong> Karnataka (State Code 29)</div>
              </div>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '16px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #d1d5db' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Item Description</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Unit Rate</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items?.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '8px', fontWeight: 600 }}>{it.product_name}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{it.quantity}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>₹ {parseFloat(it.unit_price).toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>₹ {parseFloat(it.line_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '13px', marginBottom: '20px' }}>
              <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>₹ {parseFloat(selectedInvoice.subtotal).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
                  <span>CGST (2.5%):</span>
                  <span>₹ {(parseFloat(selectedInvoice.subtotal) * 0.025).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
                  <span>SGST (2.5%):</span>
                  <span>₹ {(parseFloat(selectedInvoice.subtotal) * 0.025).toFixed(2)}</span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '15px',
                  color: '#0064d2', borderTop: '2px solid #e5e7eb', paddingTop: '6px'
                }}>
                  <span>Total Payable:</span>
                  <span>₹ {parseFloat(selectedInvoice.total_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '14px' }}>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                This is a computer generated invoice and requires no physical signature.
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => window.print()}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                >
                  <Printer size={14} />
                  <span>Print</span>
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="btn btn-primary" style={{ fontSize: '12px' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Universal Multi-Format Data Onboarding Modal */}
      <UniversalDataImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        initialEntityType="customers"
        onSuccess={() => {
          loadSalesData();
        }}
      />

      {/* Interactive Refund & Inventory Restock Dialogue Box */}
      <RefundModal
        isOpen={Boolean(refundTargetOrder)}
        onClose={() => setRefundTargetOrder(null)}
        order={refundTargetOrder}
        user={user}
        onSuccess={(msg) => {
          setStatusMsg(msg);
          loadSalesData();
          setTimeout(() => setStatusMsg(''), 6000);
        }}
      />
    </div>
  );
}
