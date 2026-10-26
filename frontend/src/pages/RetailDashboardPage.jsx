import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, ShoppingCart, Tag, Users, ArrowUpRight, 
  TrendingUp, Clock, AlertTriangle, CheckCircle, Package, 
  DollarSign, Sparkles, Plus, ScanLine, ArrowRight, Store,
  X, Search, Printer, ChevronRight, Eye, RefreshCw, CreditCard,
  QrCode, Banknote, ShieldAlert, CheckCircle2, UserCheck, ArrowDownLeft
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function RetailDashboardPage({ onNavigate }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active details modal: 'sales' | 'bills' | 'customers' | 'low_stock' | null
  const [activeModal, setActiveModal] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [notification, setNotification] = useState(null);

  // Search & filter states inside modals
  const [billFilter, setBillFilter] = useState('ALL');
  const [billSearch, setBillSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Dynamic Low Stock Items state (can be interactively restocked)
  const [lowStockItems, setLowStockItems] = useState([
    {
      id: 101,
      name: 'Classic Oxford Cotton Shirt - Medium',
      category: 'Clothing & Apparel',
      sku: 'CLOTH-SHIRT-M',
      barcode: '890103001201',
      shelfStock: 2,
      minThreshold: 10,
      backroomReserve: 48,
      price: 1299.00,
      restocked: false
    },
    {
      id: 102,
      name: 'Pro Cricket Leather Tournament Ball',
      category: 'Sports & Athletics',
      sku: 'SPORT-BALL-01',
      barcode: '890103001202',
      shelfStock: 1,
      minThreshold: 8,
      backroomReserve: 24,
      price: 499.00,
      restocked: false
    },
    {
      id: 103,
      name: 'Moisture-Wicking Athletic Gym Tee - Large',
      category: 'Clothing & Apparel',
      sku: 'CLOTH-TEE-L',
      barcode: '890103001203',
      shelfStock: 3,
      minThreshold: 12,
      backroomReserve: 35,
      price: 799.00,
      restocked: false
    },
    {
      id: 104,
      name: 'Royal Aged Basmati Rice 5kg Bag',
      category: 'Grocery & Essentials',
      sku: 'GROC-RICE-5K',
      barcode: '890103001204',
      shelfStock: 2,
      minThreshold: 10,
      backroomReserve: 20,
      price: 650.00,
      restocked: false
    }
  ]);

  // Customers data
  const [customersList, setCustomersList] = useState([
    { id: 1, name: 'Priya Sharma', phone: '+91 98201 44521', tier: 'Gold', points: 480, visits: 14, totalSpent: 16850, lastVisit: 'Today (10:14 AM)' },
    { id: 2, name: 'Vikram Malhotra', phone: '+91 98765 12340', tier: 'Gold', points: 390, visits: 9, totalSpent: 12400, lastVisit: 'Today (09:32 AM)' },
    { id: 3, name: 'Sneha Patel', phone: '+91 99112 88410', tier: 'Silver', points: 210, visits: 6, totalSpent: 6750, lastVisit: 'Today (09:15 AM)' },
    { id: 4, name: 'Rohit Verma', phone: '+91 97654 32109', tier: 'Silver', points: 180, visits: 5, totalSpent: 5200, lastVisit: 'Today (08:50 AM)' },
    { id: 5, name: 'Ananya Roy', phone: '+91 98300 77123', tier: 'Regular', points: 90, visits: 3, totalSpent: 2850, lastVisit: 'Yesterday' },
    { id: 6, name: 'Amit Kumar', phone: '+91 98199 44321', tier: 'Regular', points: 60, visits: 2, totalSpent: 1800, lastVisit: '2 days ago' },
    { id: 7, name: 'Rajesh Gupta (New Walk-in)', phone: '+91 98450 66210', tier: 'Regular', points: 30, visits: 1, totalSpent: 950, lastVisit: 'Today (10:02 AM)' },
    { id: 8, name: 'Meera Nair (New Walk-in)', phone: '+91 97123 55890', tier: 'Regular', points: 25, visits: 1, totalSpent: 820, lastVisit: 'Today (09:44 AM)' }
  ]);

  // Invoices & Bills data
  const billsList = [
    { invoice: 'RET-INV-1028', time: '10:14 AM', customer: 'Priya Sharma', itemsCount: 3, method: 'UPI', amount: 850.00, cashier: 'Ramesh Verma', items: [
      { name: 'Moisture-Wicking Athletic Gym Tee', qty: 1, price: 799.00 },
      { name: 'Sports Grip Socks (Pair)', qty: 1, price: 51.00 }
    ]},
    { invoice: 'RET-INV-1027', time: '10:02 AM', customer: 'Rajesh Gupta (Walk-in)', itemsCount: 2, method: 'Cash', amount: 950.00, cashier: 'Ramesh Verma', items: [
      { name: 'Cotton Round-Neck T-Shirt', qty: 1, price: 499.00 },
      { name: 'Training Badminton Shuttlecock Tube', qty: 1, price: 451.00 }
    ]},
    { invoice: 'RET-INV-1026', time: '09:55 AM', customer: 'Meera Nair (Walk-in)', itemsCount: 1, method: 'Cash', amount: 820.00, cashier: 'Counter #1 Staff', items: [
      { name: 'Aged Basmati Rice 5kg', qty: 1, price: 650.00 },
      { name: 'Cold Pressed Sunflower Oil 1L', qty: 1, price: 170.00 }
    ]},
    { invoice: 'RET-INV-1025', time: '09:44 AM', customer: 'Vikram Malhotra', itemsCount: 4, method: 'Card', amount: 2450.00, cashier: 'Counter #1 Staff', items: [
      { name: 'Classic Oxford Cotton Shirt', qty: 1, price: 1299.00 },
      { name: 'Slim Fit Denim Jeans 32', qty: 1, price: 1151.00 }
    ]},
    { invoice: 'RET-INV-1024', time: '09:32 AM', customer: 'Sneha Patel', itemsCount: 2, method: 'UPI', amount: 640.00, cashier: 'Counter #1 Staff', items: [
      { name: 'Gym Yoga Resistance Bands 3-Pack', qty: 1, price: 640.00 }
    ]},
    { invoice: 'RET-INV-1023', time: '09:15 AM', customer: 'Rohit Verma', itemsCount: 1, method: 'UPI', amount: 499.00, cashier: 'Counter #1 Staff', items: [
      { name: 'Pro Cricket Leather Tournament Ball', qty: 1, price: 499.00 }
    ]},
    { invoice: 'RET-INV-1022', time: '08:58 AM', customer: 'Walk-in Shopper', itemsCount: 2, method: 'Cash', amount: 340.00, cashier: 'Counter #1 Staff', items: [
      { name: 'Assam Premium CTC Tea 500g', qty: 1, price: 220.00 },
      { name: 'Farm Fresh Organic Ghee 200ml', qty: 1, price: 120.00 }
    ]},
    { invoice: 'RET-INV-1021', time: '08:42 AM', customer: 'Walk-in Shopper', itemsCount: 1, method: 'Cash', amount: 120.00, cashier: 'Counter #1 Staff', items: [
      { name: 'Sports Electrolyte Drink 750ml', qty: 2, price: 60.00 }
    ]}
  ];

  // Load backend metrics if available
  useEffect(() => {
    async function loadRetailStats() {
      try {
        setLoading(true);
        const metrics = await apiRequest('/api/dashboard/metrics');
        setData(metrics);
      } catch (err) {
        console.warn('Using seeded retail storefront metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRetailStats();
  }, []);

  const triggerToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Restock specific low stock item from backroom to shelf
  const handleRestock = (itemId, qty = 10) => {
    setLowStockItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const transferred = Math.min(qty, item.backroomReserve);
        return {
          ...item,
          shelfStock: item.shelfStock + transferred,
          backroomReserve: Math.max(0, item.backroomReserve - transferred),
          restocked: true
        };
      }
      return item;
    }));
    const restockedItem = lowStockItems.find(i => i.id === itemId);
    triggerToast(`✓ Successfully restocked ${qty} units of "${restockedItem?.name}" to storefront shelf!`);
  };

  // Restock all low items
  const handleRestockAll = () => {
    setLowStockItems(prev => prev.map(item => ({
      ...item,
      shelfStock: item.shelfStock + Math.min(10, item.backroomReserve),
      backroomReserve: Math.max(0, item.backroomReserve - Math.min(10, item.backroomReserve)),
      restocked: true
    })));
    triggerToast('✓ Restocked all low-shelf items from backroom reserve!');
  };

  // Quick add customer
  const handleAddCustomerSubmit = (e) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;
    const newCust = {
      id: Date.now(),
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      tier: 'Regular',
      points: 50,
      visits: 1,
      totalSpent: 0,
      lastVisit: 'Just now (Walk-in enrolled)'
    };
    setCustomersList([newCust, ...customersList]);
    setNewCustName('');
    setNewCustPhone('');
    setShowAddCustomer(false);
    triggerToast(`✓ New customer ${newCust.name} enrolled with 50 Welcome Loyalty Points!`);
  };

  // Filtered lists
  const filteredBills = billsList.filter(b => {
    const matchesFilter = billFilter === 'ALL' || b.method.toUpperCase().includes(billFilter);
    const matchesSearch = b.invoice.toLowerCase().includes(billSearch.toLowerCase()) || 
                          b.customer.toLowerCase().includes(billSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredCustomers = customersList.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  const activeLowCount = lowStockItems.filter(i => i.shelfStock <= i.minThreshold && !i.restocked).length;

  const featuredRetailCategories = [
    {
      name: 'Clothing & Apparel',
      description: 'Shirts, denim jeans, t-shirts, kurtis & trousers',
      icon: '👔',
      itemCount: '4 Sizes • 5 Colors',
      color: '#3b82f6',
      badge: 'High Velocity'
    },
    {
      name: 'Sports & Athletics',
      description: 'Cricket bats, footballs, running shoes, gym bands',
      icon: '⚽',
      itemCount: 'Grade 1 Gear',
      color: '#10b981',
      badge: 'Trending'
    },
    {
      name: 'Grocery & Essentials',
      description: 'Basmati rice, milk, cooking oil, tea & staples',
      icon: '🍞',
      itemCount: 'Daily Staples',
      color: '#f59e0b',
      badge: 'Essentials'
    }
  ];

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
      
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          backgroundColor: '#065f46',
          color: '#ffffff',
          padding: '14px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px',
          fontWeight: 600,
          animation: 'slideIn 0.3s ease'
        }}>
          <CheckCircle2 size={18} />
          <span>{notification}</span>
        </div>
      )}

      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.05) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '14px',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '28px'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '999px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#059669', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
            <Store size={13} /> Retail Storefront Mode Active
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)' }}>
            Welcome back, {user?.full_name?.split(' ')[0] || 'Ramesh'}! 👋
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
            Ready for billing: Counter #1 is active. Barcode scanning and instant checkout are ready.
          </p>
        </div>

        <button
          onClick={() => onNavigate('pos')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
            transition: 'transform 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <ShoppingCart size={18} />
          <span>Open POS Counter</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* 4 Interactive KPI Cards with Click for Details */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '18px',
        marginBottom: '28px'
      }}>
        {/* Card 1: Today's Counter Sales */}
        <div 
          onClick={() => setActiveModal('sales')}
          style={{
            padding: '20px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#10b981';
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Today's Counter Sales
            </div>
            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
              View Details <ChevronRight size={13} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#10b981', margin: '8px 0 4px' }}>
            ₹ 18,450.00
          </div>
          <div style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={13} />
            <span>+14.2% vs yesterday</span>
          </div>
        </div>

        {/* Card 2: Bills / Invoices Cut */}
        <div 
          onClick={() => setActiveModal('bills')}
          style={{
            padding: '20px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#6366f1';
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Bills / Invoices Cut
            </div>
            <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
              View Details <ChevronRight size={13} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '8px 0 4px' }}>
            28
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Average basket: ₹ 658.90
          </div>
        </div>

        {/* Card 3: Registered Customers */}
        <div 
          onClick={() => setActiveModal('customers')}
          style={{
            padding: '20px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#3b82f6';
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Registered Customers
            </div>
            <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
              View Details <ChevronRight size={13} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#3b82f6', margin: '8px 0 4px' }}>
            {customersList.length > 8 ? customersList.length + 134 : 142}
          </div>
          <div style={{ fontSize: '12px', color: '#2563eb' }}>
            +6 new walk-ins today
          </div>
        </div>

        {/* Card 4: Low Shelf Stock */}
        <div 
          onClick={() => setActiveModal('low_stock')}
          style={{
            padding: '20px',
            borderRadius: '12px',
            backgroundColor: activeLowCount > 0 ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg-surface)',
            border: `1px solid ${activeLowCount > 0 ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-color)'}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#f59e0b';
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(245, 158, 11, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = activeLowCount > 0 ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-color)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Low Shelf Stock
            </div>
            <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
              Restock Items <ChevronRight size={13} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: activeLowCount > 0 ? '#f59e0b' : '#10b981', margin: '8px 0 4px' }}>
            {activeLowCount > 0 ? `${activeLowCount} Items` : 'Fully Stocked'}
          </div>
          <div style={{ fontSize: '12px', color: activeLowCount > 0 ? '#d97706' : '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {activeLowCount > 0 ? (
              <>
                <AlertTriangle size={13} />
                <span>Requires restocking from backroom</span>
              </>
            ) : (
              <>
                <CheckCircle size={13} />
                <span>All storefront shelves replenished</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Featured Retail Departments */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
              Store Departments & Catalogs
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Click any department to instantly filter the Point of Sale terminal
            </p>
          </div>
          <button
            onClick={() => onNavigate('inventory')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Manage All Products →
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '18px'
        }}>
          {featuredRetailCategories.map((cat, idx) => (
            <div
              key={idx}
              onClick={() => onNavigate('pos')}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = cat.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                fontSize: '28px',
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {cat.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    {cat.name}
                  </h3>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-subtle)', color: cat.color }}>
                    {cat.badge}
                  </span>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  {cat.description}
                </p>
                <div style={{ fontSize: '12px', fontWeight: 600, color: cat.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Open in POS</span>
                  <ArrowRight size={12} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick POS & Cash Drawer Action Bar */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <DollarSign size={22} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Cash Drawer Status: Active & Reconciled
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Opening float: ₹ 5,000.00 • In-drawer cash: ₹ 14,200.00
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => onNavigate('pos')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Start Billing Now
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* MODAL 1: TODAY'S COUNTER SALES DETAILS */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeModal === 'sales' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface, #ffffff)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={22} color="#10b981" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Today's Counter Sales & Revenue Analytics
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Register collections, tender breakdowns, and sales velocity for Counter #1
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              {/* Summary KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL REVENUE</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>₹ 18,450.00</div>
                  <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>+14.2% growth</div>
                </div>
                <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>COMPLETED BILLS</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>28</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Counter #1 & #2</div>
                </div>
                <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>DISCOUNTS GIVEN</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>₹ 890.00</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Loyalty & Coupons</div>
                </div>
                <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>NET TAX (GST)</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>₹ 1,660.50</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>CGST 9% + SGST 9%</div>
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Collection Breakdown by Payment Tender
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  <div style={{ padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                        <Banknote size={16} color="#10b981" /> Cash In-Drawer
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
                        61.0%
                      </span>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>₹ 11,250.00</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>18 transactions</div>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                        <QrCode size={16} color="#3b82f6" /> UPI / QR Pay
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
                        29.3%
                      </span>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>₹ 5,400.00</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>8 transactions</div>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                        <CreditCard size={16} color="#8b5cf6" /> Card Swipes
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#7c3aed' }}>
                        9.7%
                      </span>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>₹ 1,800.00</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>2 transactions</div>
                  </div>
                </div>
              </div>

              {/* Department Contributions */}
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Department Revenue Contribution
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span>👔 Clothing & Apparel (46%)</span>
                      <span style={{ fontWeight: 700 }}>₹ 8,487.00</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'var(--bg-subtle)', overflow: 'hidden' }}>
                      <div style={{ width: '46%', height: '100%', backgroundColor: '#3b82f6', borderRadius: '4px' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span>⚽ Sports & Athletics (34%)</span>
                      <span style={{ fontWeight: 700 }}>₹ 6,273.00</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'var(--bg-subtle)', overflow: 'hidden' }}>
                      <div style={{ width: '34%', height: '100%', backgroundColor: '#10b981', borderRadius: '4px' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span>🍞 Grocery & Daily Essentials (20%)</span>
                      <span style={{ fontWeight: 700 }}>₹ 3,690.00</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'var(--bg-subtle)', overflow: 'hidden' }}>
                      <div style={{ width: '20%', height: '100%', backgroundColor: '#f59e0b', borderRadius: '4px' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-subtle)' }}>
              <button
                onClick={() => { setActiveModal(null); onNavigate('cash_register'); }}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Open Daily Cash Register
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => { setActiveModal(null); onNavigate('orders'); }}
                  style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#10b981', color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  View All Orders & Invoices →
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* MODAL 2: BILLS / INVOICES CUT DETAILS */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeModal === 'bills' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface, #ffffff)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingCart size={22} color="#6366f1" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Today's Bills & Invoices Register
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                    28 bills generated today • Average basket value: ₹ 658.90
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Filter Bar */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', backgroundColor: 'var(--bg-subtle)' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text"
                  placeholder="Search by Bill # or customer name..."
                  value={billSearch}
                  onChange={(e) => setBillSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {['ALL', 'UPI', 'CASH', 'CARD'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setBillFilter(mode)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                      backgroundColor: billFilter === mode ? '#6366f1' : 'var(--bg-surface)',
                      color: billFilter === mode ? '#fff' : 'var(--text-secondary)'
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Invoices List Table */}
            <div style={{ padding: '16px 24px', flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left', height: '36px' }}>
                    <th>INVOICE #</th>
                    <th>TIME</th>
                    <th>CUSTOMER</th>
                    <th>ITEMS</th>
                    <th>PAYMENT</th>
                    <th>AMOUNT</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.map((b, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', height: '48px' }}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{b.invoice}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{b.time}</td>
                      <td>{b.customer}</td>
                      <td><span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-subtle)', fontSize: '11.5px' }}>{b.itemsCount} items</span></td>
                      <td>
                        <span style={{ 
                          padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                          backgroundColor: b.method === 'UPI' ? 'rgba(59, 130, 246, 0.1)' : b.method === 'Cash' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                          color: b.method === 'UPI' ? '#2563eb' : b.method === 'Cash' ? '#059669' : '#7c3aed'
                        }}>
                          {b.method}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>₹ {b.amount.toFixed(2)}</td>
                      <td>
                        <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <CheckCircle size={12} /> Settled
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedReceipt(b)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-surface)',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Printer size={12} /> Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-subtle)' }}>
              <button
                onClick={() => { setActiveModal(null); onNavigate('orders'); }}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                View Complete Orders Ledger
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => { setActiveModal(null); onNavigate('pos'); }}
                  style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#10b981', color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  New Bill in POS Counter →
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* MODAL 3: REGISTERED CUSTOMERS & WALK-INS */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeModal === 'customers' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface, #ffffff)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={22} color="#3b82f6" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Registered Customers & Walk-in Directory
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                    142 store loyalty members • +6 new walk-ins enrolled today
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Actions & Search */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: 'var(--bg-subtle)' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text"
                  placeholder="Search customer by name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                />
              </div>

              <button
                onClick={() => setShowAddCustomer(!showAddCustomer)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={15} />
                <span>Quick Add Walk-in</span>
              </button>
            </div>

            {/* Inline Quick Add Form */}
            {showAddCustomer && (
              <form onSubmit={handleAddCustomerSubmit} style={{ padding: '16px 24px', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>CUSTOMER FULL NAME</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>MOBILE NUMBER</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 00000"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  />
                </div>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#10b981', color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', height: '36px' }}
                >
                  Save & Issue 50 Pts
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(false)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', fontSize: '13px', cursor: 'pointer', height: '36px' }}
                >
                  Cancel
                </button>
              </form>
            )}

            {/* Customers Table */}
            <div style={{ padding: '16px 24px', flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left', height: '36px' }}>
                    <th>CUSTOMER</th>
                    <th>PHONE NUMBER</th>
                    <th>TIER</th>
                    <th>VISITS</th>
                    <th>LIFETIME SPEND</th>
                    <th>POINTS</th>
                    <th>LAST VISIT</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', height: '48px' }}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
                            {c.name.charAt(0)}
                          </div>
                          <span>{c.name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{c.phone}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                          backgroundColor: c.tier === 'Gold' ? 'rgba(245, 158, 11, 0.1)' : c.tier === 'Silver' ? 'rgba(100, 116, 139, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: c.tier === 'Gold' ? '#d97706' : c.tier === 'Silver' ? '#475569' : '#059669'
                        }}>
                          {c.tier}
                        </span>
                      </td>
                      <td>{c.visits} orders</td>
                      <td style={{ fontWeight: 700 }}>₹ {c.totalSpent.toLocaleString()}</td>
                      <td style={{ color: '#3b82f6', fontWeight: 700 }}>{c.points} pts</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{c.lastVisit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-subtle)' }}>
              <button
                onClick={() => { setActiveModal(null); onNavigate('customers'); }}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Open Full Customers & Loyalty Directory
              </button>
              <button
                onClick={() => setActiveModal(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* MODAL 4: LOW SHELF STOCK & RESTOCKING */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeModal === 'low_stock' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface, #ffffff)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={22} color="#f59e0b" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Low Shelf Stock & Backroom Restocking
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Storefront shelf stock is critically low. Restock directly from backroom inventory reserve.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Alert Banner */}
            <div style={{ padding: '14px 24px', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderBottom: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#b45309', fontWeight: 500 }}>
                <AlertTriangle size={16} />
                <span>4 items need immediate shelf replenishment to avoid missed sales during peak footfall.</span>
              </div>
              <button
                onClick={handleRestockAll}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#f59e0b',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={13} />
                <span>Restock All (+10 each)</span>
              </button>
            </div>

            {/* Low Stock Items Table */}
            <div style={{ padding: '16px 24px', flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left', height: '36px' }}>
                    <th>PRODUCT & CATEGORY</th>
                    <th>SKU / BARCODE</th>
                    <th>SHELF STOCK</th>
                    <th>MIN THRESHOLD</th>
                    <th>BACKROOM RESERVE</th>
                    <th>PRICE</th>
                    <th style={{ textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', height: '54px' }}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.category}</div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        <div>{item.sku}</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{item.barcode}</div>
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 800,
                          backgroundColor: item.restocked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: item.restocked ? '#059669' : '#dc2626'
                        }}>
                          {item.shelfStock} units {item.restocked && '✓'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>Min {item.minThreshold} pcs</td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#3b82f6' }}>
                          {item.backroomReserve} units ready
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>₹ {item.price.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleRestock(item.id, 10)}
                          disabled={item.backroomReserve <= 0}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            backgroundColor: item.restocked ? '#10b981' : '#f59e0b',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: item.backroomReserve > 0 ? 'pointer' : 'not-allowed',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Plus size={13} />
                          <span>{item.restocked ? 'Restock More (+10)' : 'Restock Shelf (+10)'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-subtle)' }}>
              <button
                onClick={() => { setActiveModal(null); onNavigate('inventory'); }}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Manage Full Inventory & Stock Movements
              </button>
              <button
                onClick={() => setActiveModal(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* INSTANT THERMAL RECEIPT POPUP */}
      {/* ─────────────────────────────────────────────────────────── */}
      {selectedReceipt && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            color: '#1e293b',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            padding: '24px',
            fontFamily: 'monospace'
          }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '1px' }}>NEXARETAIL STORE</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Cloth, Sports & Retail Supermarket</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>GSTIN: 27AABCS1429B1Z8</div>
              <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '6px' }}>INVOICE: {selectedReceipt.invoice}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Date: Today • Time: {selectedReceipt.time}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Customer: {selectedReceipt.customer}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Cashier: {selectedReceipt.cashier}</div>
            </div>

            <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>
                <span>ITEM</span>
                <span>QTY x RATE</span>
                <span>TOTAL</span>
              </div>
              {selectedReceipt.items?.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
                  <span>{it.qty} x {it.price.toFixed(2)}</span>
                  <span style={{ fontWeight: 700 }}>₹ {(it.qty * it.price).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '12px', marginBottom: '12px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span>Subtotal:</span>
                <span>₹ {(selectedReceipt.amount / 1.18).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', color: '#64748b' }}>
                <span>CGST (9%):</span>
                <span>₹ {((selectedReceipt.amount / 1.18) * 0.09).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#64748b' }}>
                <span>SGST (9%):</span>
                <span>₹ {((selectedReceipt.amount / 1.18) * 0.09).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 900, borderTop: '1px solid #000', paddingTop: '4px' }}>
                <span>GRAND TOTAL:</span>
                <span>₹ {selectedReceipt.amount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px', color: '#059669', fontWeight: 700 }}>
                <span>Payment Mode:</span>
                <span>PAID VIA {selectedReceipt.method.toUpperCase()}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '11px', color: '#64748b', marginBottom: '16px' }}>
              <div>*** Thank you for shopping with us! ***</div>
              <div>Keep this receipt for returns & exchanges within 7 days.</div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '6px',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Printer size={14} /> Print Receipt
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: 'transparent',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
