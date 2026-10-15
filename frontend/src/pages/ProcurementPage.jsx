import React, { useState, useEffect } from 'react';
import {
  Truck, Plus, FileText, CheckCircle2, ArrowDownToLine,
  Eye, X, Building
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function ProcurementPage() {
  const { hasPermission } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'suppliers'
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');

  // New PO Modal
  const [showPOModal, setShowPOModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [poItems, setPoItems] = useState([{ product_id: '', quantity: 10, unit_cost: 100 }]);

  // New Supplier Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: '', contact_person: '', phone: '', email: '', address: '', gst_tax_number: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [pos, sups, prods] = await Promise.all([
        apiRequest('/api/procurement/purchase-orders'),
        apiRequest('/api/procurement/suppliers'),
        apiRequest('/api/inventory/products')
      ]);
      setPurchaseOrders(pos);
      setSuppliers(sups);
      setProducts(prods);
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

  const handleReceiveGoods = async (poId) => {
    try {
      const res = await apiRequest(`/api/procurement/purchase-orders/${poId}/receive`, { method: 'POST' });
      setStatusMsg(res.message);
      loadData();
    } catch (err) {
      alert(err.message);
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
      setStatusMsg('Purchase Order created successfully in DRAFT status.');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/procurement/suppliers', {
        method: 'POST',
        body: JSON.stringify(newSupplier)
      });
      setShowSupplierModal(false);
      setNewSupplier({ name: '', contact_person: '', phone: '', email: '', address: '', gst_tax_number: '' });
      loadData();
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
            Procurement & Purchase Orders
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Manage suppliers, draft purchase orders, approve workflows, and record inventory goods receipts.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {hasPermission('procurement.create') && (
            <>
              <button onClick={() => setShowSupplierModal(true)} className="btn btn-secondary">
                <Building size={15} />
                <span>Add Supplier</span>
              </button>
              <button onClick={() => setShowPOModal(true)} className="btn btn-primary">
                <Plus size={16} />
                <span>New Purchase Order</span>
              </button>
            </>
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
          onClick={() => setActiveTab('orders')}
          className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <FileText size={16} />
          <span>Purchase Orders ({purchaseOrders.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`btn ${activeTab === 'suppliers' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <Truck size={16} />
          <span>Suppliers Directory ({suppliers.length})</span>
        </button>
      </div>

      {activeTab === 'orders' ? (
        <div className="nexa-card" style={{ overflow: 'hidden' }}>
          <div className="nexa-table-wrapper">
            <table className="nexa-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Items Count</th>
                  <th>Total Amount</th>
                  <th>Order Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Workflow Action</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No purchase orders recorded yet.
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => {
                    const statusBadgeClass = {
                      DRAFT: 'badge-warning',
                      APPROVED: 'badge-info',
                      RECEIVED: 'badge-success',
                      CANCELLED: 'badge-danger'
                    }[po.status] || 'badge-info';

                    return (
                      <tr key={po.id}>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>
                          {po.po_number}
                        </td>
                        <td style={{ fontWeight: 600 }}>{po.supplier_name || 'Vendor'}</td>
                        <td>{po.items.length} items</td>
                        <td style={{ fontWeight: 700 }}>₹ {parseFloat(po.total_amount).toFixed(2)}</td>
                        <td>
                          <span className={`badge ${statusBadgeClass}`}>{po.status}</span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {new Date(po.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {po.status === 'DRAFT' && hasPermission('procurement.approve') && (
                              <button
                                onClick={() => handleApprovePO(po.id)}
                                className="btn btn-primary"
                                style={{ padding: '4px 10px', fontSize: '12px' }}
                              >
                                <CheckCircle2 size={14} />
                                <span>Approve</span>
                              </button>
                            )}
                            {po.status === 'APPROVED' && hasPermission('procurement.receive') && (
                              <button
                                onClick={() => handleReceiveGoods(po.id)}
                                className="btn btn-secondary"
                                style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--success-text)', borderColor: 'var(--success)' }}
                              >
                                <ArrowDownToLine size={14} />
                                <span>Receive Goods</span>
                              </button>
                            )}
                            {po.status === 'RECEIVED' && (
                              <span style={{ fontSize: '12px', color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={14} /> Received
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Suppliers Table */
        <div className="nexa-card" style={{ overflow: 'hidden' }}>
          <div className="nexa-table-wrapper">
            <table className="nexa-table">
              <thead>
                <tr>
                  <th>Supplier Name</th>
                  <th>Contact Person</th>
                  <th>Phone Number</th>
                  <th>Email</th>
                  <th>GST / Tax ID</th>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.contact_person || '—'}</td>
                    <td>{s.phone || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.email || '—'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{s.gst_tax_number || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Purchase Order Modal */}
      {showPOModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '24px', maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Draft New Purchase Order</h3>
              <button onClick={() => setShowPOModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreatePO} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Select Supplier *</label>
                <select
                  required
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="form-input"
                >
                  <option value="">Select a supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Order Line Items</label>
                {poItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 30px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <select
                      required
                      value={item.product_id}
                      onChange={(e) => {
                        const next = [...poItems];
                        next[idx].product_id = e.target.value;
                        setPoItems(next);
                      }}
                      className="form-input"
                    >
                      <option value="">Select Product...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.current_stock})</option>)}
                    </select>

                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const next = [...poItems];
                        next[idx].quantity = e.target.value;
                        setPoItems(next);
                      }}
                      className="form-input"
                    />

                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Cost"
                      value={item.unit_cost}
                      onChange={(e) => {
                        const next = [...poItems];
                        next[idx].unit_cost = e.target.value;
                        setPoItems(next);
                      }}
                      className="form-input"
                    />

                    {poItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}
                        style={{ border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setPoItems([...poItems, { product_id: '', quantity: 10, unit_cost: 100 }])}
                  className="btn btn-ghost"
                  style={{ fontSize: '12px', color: 'var(--primary)', padding: '4px 8px' }}
                >
                  + Add another item
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowPOModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Purchase Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Supplier Modal */}
      {showSupplierModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Add New Supplier</h3>
              <button onClick={() => setShowSupplierModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Company Name *</label>
                <input
                  type="text"
                  required
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Contact Person</label>
                  <input
                    type="text"
                    value={newSupplier.contact_person}
                    onChange={(e) => setNewSupplier({ ...newSupplier, contact_person: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Phone Number</label>
                  <input
                    type="text"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Email</label>
                  <input
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>GST / Tax ID</label>
                  <input
                    type="text"
                    value={newSupplier.gst_tax_number}
                    onChange={(e) => setNewSupplier({ ...newSupplier, gst_tax_number: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Address</label>
                <textarea
                  rows="2"
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowSupplierModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
