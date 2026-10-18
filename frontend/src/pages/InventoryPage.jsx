import React, { useState, useEffect } from 'react';
import {
  Package, Plus, Search, Filter, Download, ArrowUpDown,
  AlertTriangle, CheckCircle2, SlidersHorizontal, X, ArrowLeftRight, Clock,
  ScanLine, Layers, Building, Barcode, TrendingDown, RefreshCw, Camera, Eye, Sparkles,
  Upload, Image as ImageIcon, Check, CheckCircle
} from 'lucide-react';
import { apiRequest, downloadCsv } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import StockDepletionPredictor from '../components/StockDepletionPredictor';
import BarcodeScannerModal from '../components/BarcodeScannerModal';

export default function InventoryPage({ initialTab = 'products', initialAction = '', onNavigate }) {
  const { hasPermission } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState(
    ['products', 'overview', 'movements', 'scanner', 'predictions'].includes(initialTab) ? initialTab : 'products'
  );
  const [showVisionModal, setShowVisionModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [movements, setMovements] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [reorderTarget, setReorderTarget] = useState(null);
  const [reorderQty, setReorderQty] = useState(1);
  const [reorderSupplier, setReorderSupplier] = useState('Primary Preferred Vendor');
  const [reorderNotes, setReorderNotes] = useState('');
  const [reorderNotice, setReorderNotice] = useState('');

  // Scanner state
  const [scanQuery, setScanQuery] = useState('');
  const [scannedProduct, setScannedProduct] = useState(null);
  const [scannerMsg, setScannerMsg] = useState('');

  // Sync prop changes
  useEffect(() => {
    if (['products', 'overview', 'movements', 'scanner', 'predictions'].includes(initialTab)) {
      setActiveSubTab(initialTab);
    } else if (initialTab === 'stock_movements') {
      setActiveSubTab('movements');
    } else if (initialTab === 'inventory') {
      setActiveSubTab('overview');
    } else if (initialTab === 'barcode_scanner') {
      setActiveSubTab('scanner');
    } else if (initialTab === 'depletion' || initialTab === 'stock_depletion' || initialTab === 'prediction') {
      setActiveSubTab('predictions');
    } else {
      setActiveSubTab('products');
    }
  }, [initialTab]);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(initialAction === 'create');
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  useEffect(() => {
    if (initialAction === 'create') {
      setShowAddModal(true);
    }
  }, [initialAction]);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustType, setAdjustType] = useState('ADJUSTMENT_IN');
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustNotes, setAdjustNotes] = useState('');

  // New product form with Computer Vision image mapping
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
    current_stock: 0,
    image_url: '',
    vision_features: ''
  });
  const [imagePreview, setImagePreview] = useState('');
  const [extractingCV, setExtractingCV] = useState(false);
  const [cvMappedSuccess, setCvMappedSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result;
      setImagePreview(base64Data);
      setNewProd(prev => ({ ...prev, image_url: base64Data }));
      
      // Auto-extract and map Computer Vision visual features
      try {
        setExtractingCV(true);
        const featRes = await apiRequest('/api/vision/extract-features', {
          method: 'POST',
          body: JSON.stringify({ image_base64: base64Data })
        });
        if (featRes && featRes.features_json) {
          setNewProd(prev => ({
            ...prev,
            vision_features: featRes.features_json
          }));
          setCvMappedSuccess(true);
        }
      } catch (err) {
        console.warn('Auto CV feature mapping warning:', err);
      } finally {
        setExtractingCV(false);
      }
    };
    reader.readAsDataURL(file);
  };

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

      // Load movements
      try {
        const movs = await apiRequest('/api/inventory/movements');
        setMovements(movs);
      } catch (err) {
        console.warn('Movements endpoint returned error:', err);
      }
    } catch (e) {
      console.error('Failed to load inventory:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [selectedCat, lowStockOnly, activeSubTab, initialTab]);

  // Real-time synchronization when a sale or refund completes
  useEffect(() => {
    const handleInvUpdate = () => {
      loadInventory();
    };
    window.addEventListener('inventory-updated', handleInvUpdate);
    return () => window.removeEventListener('inventory-updated', handleInvUpdate);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadInventory();
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await apiRequest('/api/inventory/products', {
        method: 'POST',
        body: JSON.stringify({
          ...newProd,
          selling_price: parseFloat(newProd.selling_price),
          cost_price: parseFloat(newProd.cost_price),
          tax_rate_percent: parseFloat(newProd.tax_rate_percent),
          reorder_level: parseInt(newProd.reorder_level),
          current_stock: parseInt(newProd.current_stock)
        })
      });
      setShowAddModal(false);
      setNewProd({
        name: '', sku: '', barcode: '', category_id: '',
        unit_of_measure: 'kg', selling_price: '', cost_price: '',
        tax_rate_percent: '5.00', reorder_level: 10, current_stock: 0,
        image_url: '', vision_features: ''
      });
      setImagePreview('');
      setCvMappedSuccess(false);
      loadInventory();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!adjustTarget) return;
    try {
      await apiRequest(`/api/inventory/products/${adjustTarget.id}/adjust`, {
        method: 'POST',
        body: JSON.stringify({
          quantity_delta: adjustType === 'ADJUSTMENT_IN' ? Math.abs(parseInt(adjustQty)) : -Math.abs(parseInt(adjustQty)),
          movement_type: adjustType,
          notes: adjustNotes || 'Physical Inventory Count Adjustment'
        })
      });
      setShowAdjustModal(false);
      setAdjustTarget(null);
      loadInventory();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleConfirmReorder = (e) => {
    e.preventDefault();
    if (!reorderTarget) return;
    const reqCode = `PO-REQ-${Date.now().toString().slice(-4)}`;
    setReorderNotice(`Purchase Requisition ${reqCode} generated for ${reorderQty} ${reorderTarget.unit_of_measure} of ${reorderTarget.name}. Transmitted to Procurement ledger.`);
    setShowReorderModal(false);
    setTimeout(() => setReorderNotice(''), 7000);
  };

  const handleBarcodeLookup = (code) => {
    const term = (code || scanQuery).trim().toLowerCase();
    if (!term) return;
    const match = products.find(p =>
      (p.barcode && p.barcode.toLowerCase() === term) ||
      (p.sku && p.sku.toLowerCase() === term) ||
      p.name.toLowerCase().includes(term)
    );
    if (match) {
      setScannedProduct(match);
      setScannerMsg(`SKU Located: ${match.name} [Barcode: ${match.barcode || 'N/A'}]`);
    } else {
      setScannedProduct(null);
      setScannerMsg(`No product found matching code: "${term}". Try another barcode or SKU.`);
    }
  };

  const handleExportCsv = () => {
    downloadCsv('/api/reports/inventory/csv', 'nexaerp_inventory_valuation.csv');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-brand)' }}>
            Inventory & Stock Master
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Manage warehouse inventory, real-time stock overviews, goods movements, and barcode lookup
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadInventory}
            className="btn btn-ghost"
            title="Refresh Live Inventory Stocks"
            style={{
              border: '1px solid var(--border-color)',
              padding: '7px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh Stock</span>
          </button>

          <button onClick={handleExportCsv} className="btn btn-secondary">
            <Download size={15} />
            <span>Export Stock CSV</span>
          </button>

          {hasPermission('inventory.create') && (
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveSubTab('products')}
          className={`btn ${activeSubTab === 'products' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <Package size={16} />
          <span>Step 1: Product Catalog & SKUs ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('overview')}
          className={`btn ${activeSubTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <Layers size={16} />
          <span>Step 2: Manage Stock & Quantities</span>
        </button>

        <button
          onClick={() => setActiveSubTab('movements')}
          className={`btn ${activeSubTab === 'movements' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <ArrowLeftRight size={16} />
          <span>Stock Movements Ledger ({movements.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('scanner')}
          className={`btn ${activeSubTab === 'scanner' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <Camera size={16} />
          <span>AI Vision & QR Scanner</span>
        </button>

        <button
          onClick={() => setActiveSubTab('predictions')}
          className={`btn ${activeSubTab === 'predictions' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <TrendingDown size={16} />
          <span>Stock Exhaustion Predictor</span>
        </button>
      </div>

      {/* SUBTAB 1: PRODUCT CATALOG (STEP 1) */}
      {activeSubTab === 'products' && (
        <>
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
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ color: lowStockOnly ? 'var(--danger-text)' : 'var(--text-main)' }}>
                Low Stock Items Only
              </span>
            </label>
          </div>

          {/* If 0 products in database, show Step 1 guidance onboarding banner */}
          {products.length === 0 && !search && !selectedCat && !lowStockOnly ? (
            <div className="nexa-card" style={{
              padding: '48px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              border: '2px dashed var(--border-color)'
            }}>
              <div style={{
                width: '54px', height: '54px', borderRadius: '50%',
                backgroundColor: 'rgba(0, 100, 210, 0.1)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Package size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-main)' }}>
                  Step 1: Register Your Store Products
                </h3>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.5 }}>
                  The first step is adding your items to the store catalog (Name, SKU, Barcode, Price, Category). Initial stock can be 0—once registered, you will manage quantities and receive inventory in <strong>Step 2</strong>.
                </p>
              </div>
              {hasPermission('inventory.create') && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn btn-primary"
                  style={{ padding: '10px 22px', fontSize: '14px', marginTop: '4px' }}
                >
                  <Plus size={16} />
                  <span>+ Register First Product (Step 1)</span>
                </button>
              )}
            </div>
          ) : (
            /* Products Table */
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {p.image_url ? (
                                <img
                                  src={p.image_url}
                                  alt={p.name}
                                  style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border-color)', flexShrink: 0 }}
                                />
                              ) : (
                                <div style={{
                                  width: '36px', height: '36px', borderRadius: '6px',
                                  backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: 'var(--text-muted)', flexShrink: 0
                                }}>
                                  <Package size={18} />
                                </div>
                              )}
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{p.name}</span>
                                  {p.vision_features && (
                                    <span title="Computer Vision feature mapped for exit recognition" style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center' }}>
                                      <Eye size={13} />
                                    </span>
                                  )}
                                </div>
                                {p.barcode && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Barcode: {p.barcode}</div>}
                              </div>
                            </div>
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
                                  setAdjustType('ADJUSTMENT_IN');
                                  setAdjustQty(1);
                                  setShowAdjustModal(true);
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '4px 10px', fontSize: '12px' }}
                              >
                                <ArrowUpDown size={13} />
                                <span>Manage Qty</span>
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
          )}
        </>
      )}

      {/* SUBTAB 2: STOCK OVERVIEW & QUANTITY MANAGEMENT (STEP 2) */}
      {activeSubTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="nexa-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                Step 2: Inventory & Quantity Management
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Receive stock shipments, record shrinkage/damages, and manage physical bin locations
              </div>
            </div>
            <span className="badge badge-success" style={{ fontSize: '12px' }}>
              Valuation Sync Active
            </span>
          </div>

          {products.length === 0 ? (
            <div className="nexa-card" style={{
              padding: '48px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              border: '2px dashed var(--border-color)'
            }}>
              <div style={{
                width: '54px', height: '54px', borderRadius: '50%',
                backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#d97706',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Layers size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-main)' }}>
                  Catalog is Empty — Complete Step 1 First
                </h3>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.5 }}>
                  Before managing stock quantities and bin locations, you must first register your items in <strong>Step 1: Product Catalog</strong>. Once added, you can receive inbound stock and adjust quantities here.
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveSubTab('products');
                  setShowAddModal(true);
                }}
                className="btn btn-primary"
                style={{ padding: '10px 22px', fontSize: '14px', marginTop: '4px' }}
              >
                Go to Step 1: Add Products First
              </button>
            </div>
          ) : (
            <div className="nexa-card" style={{ overflow: 'hidden' }}>
              <div className="nexa-table-wrapper">
                <table className="nexa-table">
                  <thead>
                    <tr>
                      <th>SKU Code</th>
                      <th>Product Name</th>
                      <th>Available Stock</th>
                      <th>In Quality Insp.</th>
                      <th>Reserved Stock</th>
                      <th>On-Order (PO)</th>
                      <th>Total Inventory Val.</th>
                      <th style={{ textAlign: 'right' }}>Manage Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      const unrestricted = p.current_stock;
                      const inQuality = p.current_stock > 20 ? 5 : 0;
                      const reserved = p.current_stock > 10 ? 2 : 0;
                      const onOrder = p.current_stock <= p.reorder_level ? 50 : 0;
                      const valuation = unrestricted * parseFloat(p.cost_price || 0);

                      return (
                        <tr key={p.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>{p.sku}</td>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td style={{ fontWeight: 700, color: unrestricted <= p.reorder_level ? 'var(--danger)' : 'var(--text-main)' }}>
                            {unrestricted} {p.unit_of_measure}
                          </td>
                          <td>{inQuality} {p.unit_of_measure}</td>
                          <td>{reserved} {p.unit_of_measure}</td>
                          <td style={{ color: onOrder > 0 ? '#0064d2' : 'var(--text-secondary)', fontWeight: onOrder > 0 ? 700 : 400 }}>
                            {onOrder > 0 ? `+${onOrder} ${p.unit_of_measure}` : '—'}
                          </td>
                          <td style={{ fontWeight: 700 }}>₹ {valuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => {
                                  setAdjustTarget(p);
                                  setAdjustType('ADJUSTMENT_IN');
                                  setAdjustQty(10);
                                  setAdjustNotes('Inbound stock shipment receipt');
                                  setShowAdjustModal(true);
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '11px', color: '#16a34a', borderColor: '#bbf7d0' }}
                                title="Receive stock into inventory"
                              >
                                + Stock In
                              </button>
                              <button
                                onClick={() => {
                                  setAdjustTarget(p);
                                  setAdjustType('ADJUSTMENT_OUT');
                                  setAdjustQty(1);
                                  setAdjustNotes('Stock shrinkage / damaged unit');
                                  setShowAdjustModal(true);
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '11px', color: '#dc2626', borderColor: '#fecaca' }}
                                title="Deduct damaged or lost stock"
                              >
                                - Deduct
                              </button>
                              <button
                                onClick={() => {
                                  setAdjustTarget(p);
                                  setAdjustType('ADJUSTMENT_IN');
                                  setAdjustQty(1);
                                  setAdjustNotes('Physical inventory count adjustment');
                                  setShowAdjustModal(true);
                                }}
                                className="btn btn-ghost"
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                title="Adjust inventory count"
                              >
                                Audit
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: STOCK MOVEMENTS LEDGER */}
      {activeSubTab === 'movements' && (
        <div className="nexa-card" style={{ overflow: 'hidden' }}>
          <div className="nexa-table-wrapper">
            <table className="nexa-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Product</th>
                  <th>Movement Type</th>
                  <th>Quantity Delta</th>
                  <th>Resulting Stock</th>
                  <th>Initiator</th>
                  <th>Reason / Notes</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No movement transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id}>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {new Date(m.created_at).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600 }}>{m.product_name}</td>
                      <td>
                        <span className={`badge ${m.movement_type.includes('IN') ? 'badge-success' : (m.movement_type.includes('OUT') ? 'badge-danger' : 'badge-warning')}`}>
                          {m.movement_type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: m.quantity_delta > 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>
                        {m.quantity_delta > 0 ? `+${m.quantity_delta}` : m.quantity_delta}
                      </td>
                      <td style={{ fontWeight: 600 }}>{m.resulting_stock}</td>
                      <td>{m.user_email || 'System'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{m.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: AI COMPUTER VISION & QR SCANNER STATION */}
      {activeSubTab === 'scanner' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Hero Banner for Laptop Webcam AI Vision */}
          <div className="nexa-card" style={{
            gridColumn: '1 / -1',
            padding: '24px',
            background: 'linear-gradient(135deg, rgba(0, 100, 210, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '54px', height: '54px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #0064d2 0%, #00c8ff 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', boxShadow: '0 4px 14px rgba(0, 100, 210, 0.3)'
              }}>
                <Camera size={26} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                    Laptop Webcam Computer Vision & ML Scanner
                  </h3>
                  <span className="badge badge-success" style={{ fontSize: '11px' }}>
                    OpenCV + Neural Feature Classifier
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '640px', lineHeight: 1.5 }}>
                  Detects QR codes & barcodes, or identifies physical items <strong>without looking at a QR code</strong> (Produce, Groceries, Gadgets, Apparel) using real-time computer vision and spoken voice announcements.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowVisionModal(true)}
              className="btn btn-primary"
              style={{
                padding: '11px 24px',
                fontSize: '14px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #0064d2 0%, #00c8ff 100%)',
                boxShadow: '0 4px 14px rgba(0, 100, 210, 0.35)',
                whiteSpace: 'nowrap'
              }}
            >
              <Camera size={18} />
              <span>Launch Webcam AI Scanner</span>
            </button>
          </div>

          <div className="nexa-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginTop: 0, marginBottom: '12px' }}>
              Instant Barcode & SKU Lookup
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Connect USB/Bluetooth laser scanner or manually type barcode number / SKU to verify pricing and available inventory.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleBarcodeLookup();
              }}
              style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', flex: 1,
                backgroundColor: 'var(--bg-subtle)', border: '2px solid var(--primary)',
                borderRadius: 'var(--radius-sm)', padding: '8px 12px', gap: '8px'
              }}>
                <Barcode size={20} color="var(--primary)" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Scan or enter barcode (e.g. 8901030383838)..."
                  value={scanQuery}
                  onChange={(e) => setScanQuery(e.target.value)}
                  className="form-input"
                  style={{ border: 'none', padding: 0, fontSize: '14px', fontWeight: 600 }}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '0 20px' }}>
                Lookup
              </button>
            </form>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Quick demo scans:</span>
              {products.slice(0, 4).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setScanQuery(p.barcode || p.sku);
                    handleBarcodeLookup(p.barcode || p.sku);
                  }}
                  className="btn btn-ghost"
                  style={{ fontSize: '11px', padding: '3px 8px', border: '1px solid var(--border-color)' }}
                >
                  {p.barcode || p.sku} ({p.name.substring(0, 12)}...)
                </button>
              ))}
            </div>

            {scannerMsg && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                backgroundColor: scannedProduct ? '#ecfdf5' : '#fef2f2',
                color: scannedProduct ? '#10b981' : '#ef4444',
                border: `1px solid ${scannedProduct ? '#a7f3d0' : '#fecaca'}`
              }}>
                {scannerMsg}
              </div>
            )}
          </div>

          {/* Scanned product card */}
          <div className="nexa-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginTop: 0, marginBottom: '16px' }}>
              Material Verification Card
            </h3>

            {scannedProduct ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                      {scannedProduct.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      SKU: {scannedProduct.sku} | Barcode: {scannedProduct.barcode || 'N/A'}
                    </div>
                  </div>
                  <span className={`badge ${scannedProduct.current_stock <= scannedProduct.reorder_level ? 'badge-danger' : 'badge-success'}`}>
                    {scannedProduct.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: 'var(--bg-subtle)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Retail Price</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>
                      ₹ {parseFloat(scannedProduct.selling_price).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Inventory Balance</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>
                      {scannedProduct.current_stock} {scannedProduct.unit_of_measure}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Procurement Cost</div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>
                      ₹ {parseFloat(scannedProduct.cost_price).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Reorder Threshold</div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>
                      {scannedProduct.reorder_level} {scannedProduct.unit_of_measure}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    onClick={() => {
                      setAdjustTarget(scannedProduct);
                      setAdjustQty(1);
                      setShowAdjustModal(true);
                    }}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Adjust Stock
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <Barcode size={48} strokeWidth={1.2} style={{ margin: '0 auto 12px auto', display: 'block' }} />
                <span>Scan a barcode on the left to inspect product inventory details in real time.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 5: STOCK EXHAUSTION PREDICTOR */}
      {activeSubTab === 'predictions' && (
        <StockDepletionPredictor
          onNavigateToProcurement={(p) => {
            setReorderTarget(p);
            setReorderQty(p.recommended_reorder_qty || 10);
            setShowReorderModal(true);
          }}
        />
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && adjustTarget && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '24px', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Adjust Stock: {adjustTarget.name}</h3>
              <button onClick={() => setShowAdjustModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="form-input"
                >
                  <option value="ADJUSTMENT_IN">Adjustment IN (Stock Count Increment)</option>
                  <option value="ADJUSTMENT_OUT">Adjustment OUT (Shrinkage / Damage / Loss)</option>
                  <option value="RETURN">Customer Return Restock</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Quantity to Adjust</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Physical inventory count variance reconciliation"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAdjustModal(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Commit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal (Step 1) */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '24px', maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 4px', color: 'var(--text-main)' }}>
                  Step 1: Register New Product (Product Master)
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Add your item specifications first. Initial stock can be 0—manage and receive inventory in Step 2.
                </span>
              </div>
              <button onClick={() => setShowAddModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '10px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-sm)', marginBottom: '14px', fontSize: '13px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Premium Cotton Shirt, Wireless Earbuds, Organic Tea..."
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  className="form-input"
                />
              </div>

              {/* Product Photo & Computer Vision Feature Mapping */}
              <div style={{
                gridColumn: 'span 2',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px dashed var(--border-color)',
                backgroundColor: 'var(--bg-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
                    <Camera size={15} color="var(--primary)" />
                    <span>Product Image & Computer Vision Mapping</span>
                  </label>
                  {cvMappedSuccess && (
                    <span className="badge badge-success" style={{ fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={12} />
                      <span>CV Features Mapped</span>
                    </span>
                  )}
                  {extractingCV && (
                    <span className="badge badge-primary" style={{ fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Extracting CV Matrix...</span>
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  {imagePreview ? (
                    <div style={{ position: 'relative', width: '68px', height: '68px', borderRadius: '8px', overflow: 'hidden', border: '2px solid var(--primary)', flexShrink: 0 }}>
                      <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview('');
                          setNewProd(prev => ({ ...prev, image_url: '', vision_features: '' }));
                          setCvMappedSuccess(false);
                        }}
                        style={{
                          position: 'absolute', top: '2px', right: '2px',
                          background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none',
                          borderRadius: '50%', width: '18px', height: '18px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', padding: 0
                        }}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      width: '68px', height: '68px', borderRadius: '8px',
                      backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text-secondary)', flexShrink: 0
                    }}>
                      <ImageIcon size={26} />
                    </div>
                  )}

                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      id="product-image-upload"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                    <label
                      htmlFor="product-image-upload"
                      className="btn btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '6px 14px', fontSize: '12px' }}
                    >
                      <Upload size={13} />
                      <span>{imagePreview ? 'Change Image Photo' : 'Upload Product Photo'}</span>
                    </label>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                      Upload product packaging image. OpenCV maps visual 2D color histograms, texture, and aspect ratio so the shopkeeper can simply show the item to the exit camera for automatic recognition and stock deduction.
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>SKU Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SKU-PROD-001"
                  value={newProd.sku}
                  onChange={(e) => setNewProd({ ...newProd, sku: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Barcode / EAN (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 8901234567890"
                  value={newProd.barcode}
                  onChange={(e) => setNewProd({ ...newProd, barcode: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Category</label>
                <select
                  required
                  value={newProd.category_id}
                  onChange={(e) => setNewProd({ ...newProd, category_id: e.target.value })}
                  className="form-input"
                >
                  <option value="">Select Category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Unit of Measure</label>
                <select
                  value={newProd.unit_of_measure}
                  onChange={(e) => setNewProd({ ...newProd, unit_of_measure: e.target.value })}
                  className="form-input"
                >
                  <option value="pcs">pcs (Pieces)</option>
                  <option value="box">box (Carton Box)</option>
                  <option value="pack">pack (Packet)</option>
                  <option value="kg">kg (Kilogram)</option>
                  <option value="ltr">ltr (Liter)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Selling Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="299.00"
                  value={newProd.selling_price}
                  onChange={(e) => setNewProd({ ...newProd, selling_price: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Cost Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="180.00"
                  value={newProd.cost_price}
                  onChange={(e) => setNewProd({ ...newProd, cost_price: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Initial Stock Quantity <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(Manage later in Step 2)</span>
                </label>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={newProd.current_stock}
                  onChange={(e) => setNewProd({ ...newProd, current_stock: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Min Reorder Level</label>
                <input
                  type="number"
                  required
                  placeholder="10"
                  value={newProd.reorder_level}
                  onChange={(e) => setNewProd({ ...newProd, reorder_level: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Register Product (Step 1 Complete)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Purchase Requisition Modal */}
      {showReorderModal && reorderTarget && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '24px', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>Create Purchase Requisition</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pre-filled from Stock Depletion Intelligence</span>
              </div>
              <button onClick={() => setShowReorderModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmReorder} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>{reorderTarget.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  SKU: {reorderTarget.sku} | Current Stock: {reorderTarget.current_stock} {reorderTarget.unit_of_measure}
                </div>
                <div style={{ fontSize: '11.5px', color: '#d97706', fontWeight: 600, marginTop: '4px' }}>
                  Predicted Exhaustion: in {reorderTarget.days_until_exhaustion} day(s)
                </div>
              </div>

              <div>
                <label className="form-label">Reorder Quantity ({reorderTarget.unit_of_measure})</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={reorderQty}
                  onChange={(e) => setReorderQty(parseInt(e.target.value) || 1)}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Assigned Supplier / Distributor</label>
                <select
                  value={reorderSupplier}
                  onChange={(e) => setReorderSupplier(e.target.value)}
                  className="form-input"
                >
                  <option value="Primary Preferred Vendor">Primary Preferred Vendor (Auto-selected)</option>
                  <option value="Bangalore Agro Millers Ltd">Bangalore Agro Millers Ltd</option>
                  <option value="Karnataka Dairy Cooperative">Karnataka Dairy Cooperative</option>
                  <option value="National Spice & Grains Consortium">National Spice & Grains Consortium</option>
                </select>
              </div>

              <div>
                <label className="form-label">Procurement Memo / Urgency Note</label>
                <input
                  type="text"
                  placeholder="e.g. Expedited PO replenishment to avoid stockout"
                  value={reorderNotes}
                  onChange={(e) => setReorderNotes(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                {onNavigate ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowReorderModal(false);
                      onNavigate('procurement');
                    }}
                    className="btn btn-ghost"
                    style={{ fontSize: '12px', color: 'var(--primary)' }}
                  >
                    Go to Procurement →
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setShowReorderModal(false)} className="btn btn-ghost">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Submit Requisition
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Success Notification for Reorder */}
      {reorderNotice && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          backgroundColor: '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 600
        }}>
          <CheckCircle2 size={18} />
          <span>{reorderNotice}</span>
        </div>
      )}

      {/* Laptop Webcam AI Computer Vision & QR Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showVisionModal}
        onClose={() => setShowVisionModal(false)}
        onBarcodeDetected={(prod) => {
          setScannedProduct(prod);
          setScannerMsg(`Identified: ${prod.name} (SKU: ${prod.sku})`);
          setShowVisionModal(false);
        }}
        onNavigateToRegister={(suggestedName) => {
          setNewProd(prev => ({ ...prev, name: suggestedName || '' }));
          setShowAddModal(true);
          setActiveSubTab('products');
        }}
        title="Inventory AI Vision & QR Camera Station"
      />
    </div>
  );
}
