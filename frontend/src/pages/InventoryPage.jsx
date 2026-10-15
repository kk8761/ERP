import React, { useState, useEffect } from 'react';
import {
  Package, Plus, Search, Filter, Download, ArrowUpDown,
  AlertTriangle, CheckCircle2, SlidersHorizontal, X
} from 'lucide-react';
import { apiRequest, downloadCsv } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function InventoryPage() {
  const { hasPermission } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustType, setAdjustType] = useState('ADJUSTMENT_IN');
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustNotes, setAdjustNotes] = useState('');

  // New product form
  const [newProd, setNewProd] = useState({
    name: '',
    sku: '',
    barcode: '',
    category_id: '',
    unit_of_measure: 'kg',
    selling_price: '',
    cost_price: '',
    tax_rate_percent: '5.00',
    reorder_level: 10,
    current_stock: 0
  });
  const [formError, setFormError] = useState('');

  const loadInventory = async () => {
    try {
      setLoading(true);
      let query = `?low_stock_only=${lowStockOnly}`;
      if (selectedCat) query += `&category_id=${selectedCat}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;

      const [prods, cats] = await Promise.all([
        apiRequest(`/api/inventory/products${query}`),
        apiRequest('/api/inventory/categories')
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (e) {
      console.error('Failed to load inventory:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [selectedCat, lowStockOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadInventory();
  };

  const handleAdjustStock = async () => {
    if (!adjustTarget || adjustQty <= 0) return;
    try {
      await apiRequest('/api/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          product_id: adjustTarget.id,
          adjustment_type: adjustType,
          quantity: parseInt(adjustQty),
          notes: adjustNotes
        })
      });
      setShowAdjustModal(false);
      setAdjustTarget(null);
      setAdjustNotes('');
      loadInventory();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await apiRequest('/api/inventory/products', {
        method: 'POST',
        body: JSON.stringify({
          ...newProd,
          category_id: newProd.category_id ? parseInt(newProd.category_id) : null,
          selling_price: parseFloat(newProd.selling_price),
          cost_price: parseFloat(newProd.cost_price || 0),
          tax_rate_percent: parseFloat(newProd.tax_rate_percent || 0),
          reorder_level: parseInt(newProd.reorder_level || 10),
          current_stock: parseInt(newProd.current_stock || 0)
        })
      });
      setShowAddModal(false);
      setNewProd({
        name: '', sku: '', barcode: '', category_id: '',
        unit_of_measure: 'kg', selling_price: '', cost_price: '',
        tax_rate_percent: '5.00', reorder_level: 10, current_stock: 0
      });
      loadInventory();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleExportCsv = () => {
    downloadCsv('/api/reports/inventory/csv', 'nexaerp_inventory_catalog.csv');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-brand)' }}>
            Inventory & Stock Management
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Track product catalog, stock movements, and replenishment levels.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={handleExportCsv} className="btn btn-secondary">
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          {hasPermission('inventory.create') && (
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="nexa-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '240px', gap: '8px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', flex: 1,
            backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)', padding: '6px 10px', gap: '6px'
          }}>
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search by product name, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ border: 'none', padding: 0 }}
            />
          </div>
          <button type="submit" className="btn btn-secondary" style={{ padding: '7px 12px' }}>
            Search
          </button>
        </form>

        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          className="form-input"
          style={{ width: '180px', padding: '7px 10px' }}
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          <span style={{ fontWeight: 600, color: lowStockOnly ? 'var(--warning-text)' : 'var(--text-main)' }}>
            Low Stock Only
          </span>
        </label>
      </div>

      {/* Products Table */}
      <div className="nexa-card" style={{ overflow: 'hidden' }}>
        <div className="nexa-table-wrapper">
          <table className="nexa-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Reorder Level</th>
                <th>Selling Price</th>
                <th>Cost Price</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No products found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {p.sku}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.name}</div>
                      {p.barcode && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Barcode: {p.barcode}</div>}
                    </td>
                    <td>{p.category_name || 'General'}</td>
                    <td style={{ fontWeight: 700, fontSize: '14px' }}>
                      {p.current_stock} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-secondary)' }}>{p.unit_of_measure}</span>
                    </td>
                    <td>{p.reorder_level} {p.unit_of_measure}</td>
                    <td style={{ fontWeight: 600 }}>₹ {parseFloat(p.selling_price).toFixed(2)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>₹ {parseFloat(p.cost_price).toFixed(2)}</td>
                    <td>
                      <span className={`badge ${p.status === 'Out of Stock' ? 'badge-danger' : (p.status === 'Low Stock' ? 'badge-warning' : 'badge-success')}`}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {hasPermission('inventory.adjust') && (
                        <button
                          onClick={() => {
                            setAdjustTarget(p);
                            setAdjustQty(1);
                            setShowAdjustModal(true);
                          }}
                          className="btn btn-ghost"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          <ArrowUpDown size={14} />
                          <span>Adjust</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {showAdjustModal && adjustTarget && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Adjust Stock: {adjustTarget.name}</h3>
              <button onClick={() => setShowAdjustModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Adjustment Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setAdjustType('ADJUSTMENT_IN')}
                    className="btn"
                    style={{
                      backgroundColor: adjustType === 'ADJUSTMENT_IN' ? 'var(--success-bg)' : 'var(--bg-surface)',
                      color: adjustType === 'ADJUSTMENT_IN' ? 'var(--success-text)' : 'var(--text-main)',
                      borderColor: adjustType === 'ADJUSTMENT_IN' ? 'var(--success)' : 'var(--border-color)',
                      fontWeight: 600
                    }}
                  >
                    + Add Stock (IN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('ADJUSTMENT_OUT')}
                    className="btn"
                    style={{
                      backgroundColor: adjustType === 'ADJUSTMENT_OUT' ? 'var(--danger-bg)' : 'var(--bg-surface)',
                      color: adjustType === 'ADJUSTMENT_OUT' ? 'var(--danger-text)' : 'var(--text-main)',
                      borderColor: adjustType === 'ADJUSTMENT_OUT' ? 'var(--danger)' : 'var(--border-color)',
                      fontWeight: 600
                    }}
                  >
                    - Deduct Stock (OUT)
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Audit Reason / Notes</label>
                <textarea
                  rows="2"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Broken packaging write-off, manual inventory count adjustment..."
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAdjustModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="button" onClick={handleAdjustStock} className="btn btn-primary">Save Adjustment</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Add New Product</h3>
              <button onClick={() => setShowAddModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}><X size={16} /></button>
            </div>

            {formError && (
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-sm)', marginBottom: '12px', fontSize: '13px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Product Name *</label>
                <input
                  type="text"
                  required
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  placeholder="e.g. Premium Basmati Rice (10kg)"
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>SKU *</label>
                  <input
                    type="text"
                    required
                    value={newProd.sku}
                    onChange={(e) => setNewProd({ ...newProd, sku: e.target.value })}
                    placeholder="e.g. RIC-BAS-10K"
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Barcode (EAN/UPC)</label>
                  <input
                    type="text"
                    value={newProd.barcode}
                    onChange={(e) => setNewProd({ ...newProd, barcode: e.target.value })}
                    placeholder="e.g. 890123456789"
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Category</label>
                  <select
                    value={newProd.category_id}
                    onChange={(e) => setNewProd({ ...newProd, category_id: e.target.value })}
                    className="form-input"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Unit of Measure</label>
                  <select
                    value={newProd.unit_of_measure}
                    onChange={(e) => setNewProd({ ...newProd, unit_of_measure: e.target.value })}
                    className="form-input"
                  >
                    <option value="kg">Kilogram (kg)</option>
                    <option value="ltr">Liter (ltr)</option>
                    <option value="unit">Unit / Piece</option>
                    <option value="packet">Packet</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProd.selling_price}
                    onChange={(e) => setNewProd({ ...newProd, selling_price: e.target.value })}
                    placeholder="0.00"
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProd.cost_price}
                    onChange={(e) => setNewProd({ ...newProd, cost_price: e.target.value })}
                    placeholder="0.00"
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Opening Stock</label>
                  <input
                    type="number"
                    value={newProd.current_stock}
                    onChange={(e) => setNewProd({ ...newProd, current_stock: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Reorder Level</label>
                  <input
                    type="number"
                    value={newProd.reorder_level}
                    onChange={(e) => setNewProd({ ...newProd, reorder_level: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
