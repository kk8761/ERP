import React, { useState, useEffect } from 'react';
import {
  Truck, Plus, FileText, CheckCircle2, ArrowDownToLine,
  Eye, X, Building, ShieldCheck, AlertTriangle, Star, RefreshCw, Ban, Award
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function ProcurementPage({ initialTab = 'suppliers', initialAction = '' }) {
  const { hasPermission } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState(initialTab === 'orders' ? 'orders' : 'suppliers'); // 'suppliers' (SAP Vendor Master) or 'orders' (ME21N POs)
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (initialTab === 'orders') {
      setActiveTab('orders');
    } else {
      setActiveTab('suppliers');
    }
  }, [initialTab]);

  // SAP Create Vendor Modal (XK01)
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

  // SAP Create PO Modal (ME21N)
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
    if (!window.confirm("Perform Goods Receipt (MIGO 101 Movement) and stock in products to inventory?")) return;
    try {
      const res = await apiRequest(`/api/procurement/purchase-orders/${poId}/receive`, { method: 'POST' });
      setStatusMsg(res.message);
      loadData();
    } catch (err) {
      alert(err.message);
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
      setStatusMsg(`Vendor ${newVendor.name} registered in SAP Vendor Master.`);
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
            SAP Materials Management & Vendor Lifecycle (MM-PUR)
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Vendor Master Database (XK01/XK03), Purchase Orders (ME21N), Goods Receipts (MIGO), and Vendor Quality Scoring.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={loadData} className="btn btn-ghost" title="Refresh">
            <RefreshCw size={15} />
            <span>Sync Procurement</span>
          </button>

          <button onClick={() => setShowSupplierModal(true)} className="btn btn-ghost" style={{ backgroundColor: 'var(--bg-subtle)' }}>
            <Building size={16} />
            <span>Create Vendor (XK01)</span>
          </button>

          <button onClick={() => setShowPOModal(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>Create Purchase Order (ME21N)</span>
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
      </div>

      {/* Tab 1: SAP Vendor Master Database */}
      {activeTab === 'suppliers' && (
        <div className="nexa-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Approved Vendor Master Catalog (LFA1 / LFB1)</span>
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
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Purchase Orders Ledger (ME21N / ME22N)</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Two-Way &amp; Three-Way Matching: PO &rarr; Goods Receipt (MIGO 101) &rarr; Invoice Verification (MIRO)
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
                            onClick={() => handleReceiveGoods(po.id)}
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '12px', backgroundColor: '#10b981', borderColor: '#10b981' }}
                          >
                            <ArrowDownToLine size={13} />
                            <span>Post Goods Receipt (MIGO)</span>
                          </button>
                        )}
                        {po.status === 'RECEIVED' && (
                          <span style={{ fontSize: '12px', color: 'var(--success-text)', fontWeight: 600 }}>
                            Delivered & Stocked
                          </span>
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

      {/* Modal: Create SAP Vendor Master (XK01) */}
      {showSupplierModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="nexa-card" style={{ width: '100%', maxWidth: '540px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>SAP Vendor Master Onboarding (XK01)</h3>
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

      {/* Modal: Create Purchase Order (ME21N) */}
      {showPOModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="nexa-card" style={{ width: '100%', maxWidth: '580px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Issue Purchase Order (ME21N)</h3>
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
    </div>
  );
}
