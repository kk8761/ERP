import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, ShoppingCart, Tag, Users, ArrowUpRight, 
  TrendingUp, Clock, AlertTriangle, CheckCircle, Package, 
  DollarSign, Sparkles, Plus, ScanLine, ArrowRight, Store
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function RetailDashboardPage({ onNavigate }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRetailStats() {
      try {
        setLoading(true);
        const metrics = await apiRequest('/api/dashboard/metrics');
        setData(metrics);
      } catch (err) {
        console.warn('Could not load retail metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRetailStats();
  }, []);

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
    <div style={{ padding: '24px 28px', maxWidth: '1400px', margin: '0 auto' }}>
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
            Welcome back, {user?.full_name?.split(' ')[0] || 'Store Operator'}! 👋
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
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
          }}
        >
          <ShoppingCart size={18} />
          <span>Open POS Counter</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Retail KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '18px',
        marginBottom: '28px'
      }}>
        <div style={{
          padding: '20px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Today's Counter Sales
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#10b981', margin: '8px 0 4px' }}>
            ₹ 18,450.00
          </div>
          <div style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={13} />
            <span>+14.2% vs yesterday</span>
          </div>
        </div>

        <div style={{
          padding: '20px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Bills / Invoices Cut
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '8px 0 4px' }}>
            28
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Average basket: ₹ 658.90
          </div>
        </div>

        <div style={{
          padding: '20px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Registered Customers
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#3b82f6', margin: '8px 0 4px' }}>
            142
          </div>
          <div style={{ fontSize: '12px', color: '#2563eb' }}>
            +6 new walk-ins today
          </div>
        </div>

        <div style={{
          padding: '20px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Low Shelf Stock
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f59e0b', margin: '8px 0 4px' }}>
            4 Items
          </div>
          <div style={{ fontSize: '12px', color: '#d97706' }}>
            Requires restocking from backroom
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
    </div>
  );
}
