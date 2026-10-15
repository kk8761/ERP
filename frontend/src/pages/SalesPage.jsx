import React, { useState, useEffect } from 'react';
import {
  FileText, Search, Download, RotateCcw, Eye,
  CheckCircle2, Clock, Users, X
} from 'lucide-react';
import { apiRequest, downloadCsv } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function SalesPage() {
  const { hasPermission } = useAuth();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'customers'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

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

  const handleRefund = async (orderId) => {
    if (!confirm('Are you sure you want to process a refund? Items will be replenished back into inventory.')) return;
    try {
      const res = await apiRequest(`/api/sales/orders/${orderId}/refund`, { method: 'POST' });
      setStatusMsg(res.message);
      loadSalesData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExportCsv = () => {
    downloadCsv('/api/reports/sales/csv', 'nexaerp_sales_orders.csv');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-brand)' }}>
            Sales & Orders Management
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Inspect customer sales transactions, order line items, invoices, and process returns.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('orders')}
          className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <FileText size={16} />
          <span>Sales Orders & Invoices ({orders.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`btn ${activeTab === 'customers' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <Users size={16} />
          <span>Customer Directory ({customers.length})</span>
        </button>
      </div>

      {activeTab === 'orders' ? (
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
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th>Date & Time</th>
                    <th>Payment Method</th>
                    <th>Subtotal</th>
                    <th>Discount</th>
                    <th>Total Paid</th>
                    <th>Order Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
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
                        <span className={`badge ${o.order_status === 'COMPLETED' ? 'badge-success' : 'badge-danger'}`}>
                          {o.order_status}
                        </span>
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
                            <span>View</span>
                          </button>
                          {hasPermission('sales.refund') && o.order_status === 'COMPLETED' && (
                            <button
                              onClick={() => handleRefund(o.id)}
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
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Customers Directory Table */
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
              </tbody>
            </table>
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
                  {selectedOrder.items.map((it) => (
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
    </div>
  );
}
