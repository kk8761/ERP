import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, Search, ScanLine, Trash2, Plus, Minus,
  CreditCard, Banknote, QrCode, CheckCircle2, Printer, X, User
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function POSTerminalPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [discount, setDiscount] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      const [prods, cats, custs] = await Promise.all([
        apiRequest('/api/inventory/products'),
        apiRequest('/api/inventory/categories'),
        apiRequest('/api/sales/customers')
      ]);
      setProducts(prods);
      setCategories(cats);
      setCustomers(custs);
    } catch (e) {
      console.error('Failed to load POS data:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBarcodeScan = async (e) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      try {
        const prod = await apiRequest(`/api/pos/barcode/${encodeURIComponent(barcodeInput.trim())}`);
        addToCart(prod);
        setBarcodeInput('');
        setErrorMsg('');
      } catch (err) {
        setErrorMsg(err.message);
      }
    }
  };

  const addToCart = (product) => {
    setErrorMsg('');
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.current_stock) {
          setErrorMsg(`Cannot add more than available stock (${product.current_stock}) for ${product.name}`);
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        if (product.current_stock <= 0) {
          setErrorMsg(`'${product.name}' is currently out of stock`);
          return prev;
        }
        return [...prev, { product, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (productId, delta) => {
    setErrorMsg('');
    setCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty > item.product.current_stock) {
            setErrorMsg(`Available stock is ${item.product.current_stock}`);
            return item;
          }
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = !selectedCategory || p.category_id === selectedCategory;
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const subtotal = cart.reduce((acc, item) => acc + (parseFloat(item.product.selling_price) * item.quantity), 0);
  const tax = cart.reduce((acc, item) => {
    const rate = parseFloat(item.product.tax_rate_percent || 0);
    return acc + ((parseFloat(item.product.selling_price) * item.quantity * rate) / 100);
  }, 0);
  const finalDiscount = Math.min(discount, subtotal);
  const total = Math.max(0, subtotal + tax - finalDiscount);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckoutLoading(true);
    setErrorMsg('');

    try {
      const orderPayload = {
        customer_id: selectedCustomer ? parseInt(selectedCustomer) : null,
        branch_id: user?.branch_id || null,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        })),
        discount_amount: finalDiscount.toString(),
        payment_method: paymentMethod,
        notes: "POS Terminal Sale"
      };

      const orderResult = await apiRequest('/api/sales/orders', {
        method: 'POST',
        body: JSON.stringify(orderPayload)
      });

      setCompletedOrder(orderResult);
      setCart([]);
      setDiscount(0);
      loadData(); // reload inventory stocks
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - var(--header-height) - 48px)' }}>
      {/* Left: Product Catalog & Search (65% width) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
        {/* Search & Barcode Scan Bar */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            gap: '8px'
          }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ border: 'none', padding: 0 }}
            />
          </div>

          <div style={{
            width: '280px',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--primary-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            gap: '8px'
          }}>
            <ScanLine size={18} color="var(--primary)" />
            <input
              type="text"
              placeholder="Scan Barcode / Press Enter"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeScan}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '100%' }}
            />
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => setSelectedCategory(null)}
            className={`btn ${selectedCategory === null ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '12px', borderRadius: 'var(--radius-full)' }}
          >
            All Products
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`btn ${selectedCategory === cat.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '12px', borderRadius: 'var(--radius-full)' }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'var(--danger-bg)',
            color: 'var(--danger-text)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--danger-border)',
            fontSize: '13px'
          }}>
            {errorMsg}
          </div>
        )}

        {/* Product Cards Grid */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '14px',
          alignContent: 'start'
        }}>
          {filteredProducts.map(p => {
            const isOutOfStock = p.current_stock <= 0;
            return (
              <div
                key={p.id}
                onClick={() => !isOutOfStock && addToCart(p)}
                className="nexa-card"
                style={{
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                  opacity: isOutOfStock ? 0.6 : 1,
                  transition: 'transform 0.15s ease',
                  border: isOutOfStock ? '1px dashed var(--danger-border)' : '1px solid var(--border-color)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{p.sku}</span>
                    <span className={`badge ${isOutOfStock ? 'badge-danger' : (p.current_stock <= p.reorder_level ? 'badge-warning' : 'badge-success')}`}>
                      {p.current_stock} {p.unit_of_measure}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', marginBottom: '4px' }}>
                    {p.name}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
                    ₹ {parseFloat(p.selling_price).toLocaleString('en-IN')}
                  </span>
                  <button
                    disabled={isOutOfStock}
                    className="btn btn-primary"
                    style={{ padding: '4px 10px', fontSize: '11.5px' }}
                  >
                    + Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: POS Order Cart & Checkout (35% width) */}
      <div className="nexa-card" style={{
        width: '400px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-surface)'
      }}>
        {/* Cart Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={18} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Current Order Cart</span>
          </div>
          <span className="badge badge-info">{cart.length} items</span>
        </div>

        {/* Customer Selector */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
          <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
            Customer (Optional)
          </label>
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="form-input"
            style={{ fontSize: '12.5px' }}
          >
            <option value="">Walk-in Customer</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.phone || 'No phone'})</option>
            ))}
          </select>
        </div>

        {/* Cart Line Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {cart.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '8px' }}>
              <ShoppingCart size={32} />
              <span style={{ fontSize: '13px' }}>Cart is empty</span>
              <span style={{ fontSize: '11.5px' }}>Click items or scan barcodes to begin sale</span>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.product.name}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    ₹ {parseFloat(item.product.selling_price).toFixed(2)} × {item.quantity} = <strong>₹ {(parseFloat(item.product.selling_price) * item.quantity).toFixed(2)}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Minus size={12} />
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '18px', textAlign: 'center' }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', marginLeft: '4px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment & Totals Section */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)' }}>
          {/* Payment Method Selector */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Payment Method
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {['UPI', 'CASH', 'CARD', 'BANK'].map(m => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m === 'BANK' ? 'BANK_TRANSFER' : m)}
                  className="btn"
                  style={{
                    padding: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: (paymentMethod === m || (m === 'BANK' && paymentMethod === 'BANK_TRANSFER')) ? 'var(--primary)' : 'var(--bg-surface)',
                    color: (paymentMethod === m || (m === 'BANK' && paymentMethod === 'BANK_TRANSFER')) ? '#ffffff' : 'var(--text-main)',
                    borderColor: 'var(--border-color)'
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Price Totals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12.5px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Subtotal:</span>
              <span>₹ {subtotal.toFixed(2)}</span>
            </div>
            {tax > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Tax:</span>
                <span>₹ {tax.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Discount (₹):</span>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                style={{ width: '80px', padding: '2px 6px', fontSize: '12px', textAlign: 'right' }}
                className="form-input"
              />
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '18px',
              fontWeight: 800,
              color: 'var(--text-main)',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '6px',
              marginTop: '4px'
            }}>
              <span>Total Payable:</span>
              <span style={{ color: 'var(--primary)' }}>₹ {total.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || checkoutLoading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 700 }}
          >
            {checkoutLoading ? 'Processing Transaction...' : `Complete Checkout (₹ ${total.toFixed(2)})`}
          </button>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {completedOrder && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)' }}>
                <CheckCircle2 size={24} />
                <span style={{ fontSize: '18px', fontWeight: 800 }}>Sale Completed!</span>
              </div>
              <button onClick={() => setCompletedOrder(null)} className="btn btn-ghost" style={{ padding: '6px' }}>
                <X size={18} />
              </button>
            </div>

            {/* Receipt format */}
            <div id="receipt-print-area" style={{
              border: '1px dashed var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              backgroundColor: 'var(--bg-subtle)',
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: 1.6
            }}>
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800 }}>NexaERP Store</h3>
                <p>Tax Invoice: {completedOrder.invoice_number}</p>
                <p>Date: {new Date(completedOrder.created_at).toLocaleString()}</p>
                <p>Customer: {completedOrder.customer_name}</p>
                <p>Payment: {completedOrder.payment_method}</p>
              </div>
              <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px dashed #ccc' }} />
              <div>
                {completedOrder.items.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{it.product_name} × {it.quantity}</span>
                    <span>₹ {parseFloat(it.line_total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px dashed #ccc' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>₹ {parseFloat(completedOrder.subtotal).toFixed(2)}</span>
              </div>
              {parseFloat(completedOrder.discount_amount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Discount:</span>
                  <span>-₹ {parseFloat(completedOrder.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '14px', marginTop: '4px' }}>
                <span>TOTAL PAID:</span>
                <span>₹ {parseFloat(completedOrder.total_amount).toFixed(2)}</span>
              </div>
              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#666' }}>
                Thank you for your business with NexaERP!
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button onClick={() => window.print()} className="btn btn-secondary">
                <Printer size={15} />
                <span>Print Receipt</span>
              </button>
              <button onClick={() => setCompletedOrder(null)} className="btn btn-primary">
                Done & Next Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
