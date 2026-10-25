import React from 'react';
import { ShoppingBag, Factory, ArrowRight, ShieldCheck, Zap, Store, Cpu, Layers, TrendingUp, BarChart2 } from 'lucide-react';

export default function GatewayLandingPage({ onSelectPortal }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.12) 0%, rgba(15, 23, 42, 0.98) 70%)',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)'
    }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '48px', maxWidth: '780px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '9999px',
          background: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          color: '#60a5fa',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '16px'
        }}>
          <Zap size={14} /> Dual-Engine Business Operating Suite
        </div>
        <h1 style={{
          fontSize: '2.75rem',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          margin: '0 0 16px',
          lineHeight: 1.15
        }}>
          Select Your Industry Workspace
        </h1>
        <p style={{
          fontSize: '1.05rem',
          color: '#94a3b8',
          margin: 0,
          lineHeight: 1.6
        }}>
          NexaERP provides two completely isolated, specialized portals designed for either retail storefront merchants or industrial corporate manufacturing enterprises.
        </p>
      </div>

      {/* Two Dedicated Portal Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '28px',
        width: '100%',
        maxWidth: '1080px'
      }}>
        {/* Portal 1: Retail Shopkeeper & Storefront */}
        <div 
          onClick={() => onSelectPortal('retail')}
          style={{
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '16px',
            padding: '36px',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.borderColor = '#10b981';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(16, 185, 129, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.35)';
            e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
          }}
        >
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <Store size={28} color="#10b981" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              NexaRetail Storefront
            </h2>
            <span style={{
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 700
            }}>
              RETAIL & POS
            </span>
          </div>

          <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '24px' }}>
            Tailored specifically for <strong>Shopkeepers, Cloth & Apparel Stores, Sports Shops, Footwear, Supermarkets</strong>, and retail merchants.
          </p>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
            {[
              '⚡ Fast Counter POS & Touch Barcode Billing',
              '👔 Apparel Matrix (Sizes, Colors, Fabric Styles)',
              '⚽ Sports Goods & Footwear Stock Categorization',
              '👥 Customer Loyalty Points & VIP Discount Tiers',
              '💵 Daily Cash Drawer Opening Float & Settlement',
              '↩️ Easy In-Store Returns, Exchanges & Credit Notes'
            ].map((feature, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: '#cbd5e1' }}>
                <span style={{ color: '#10b981' }}>✓</span> {feature}
              </div>
            ))}
          </div>

          <button style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: '10px',
            background: '#10b981',
            color: '#ffffff',
            border: 'none',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
          }}>
            <span>Launch Retail Portal</span>
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Portal 2: Enterprise & Heavy Industry */}
        <div 
          onClick={() => onSelectPortal('enterprise')}
          style={{
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            borderRadius: '16px',
            padding: '36px',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.borderColor = '#3b82f6';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(59, 130, 246, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.35)';
            e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
          }}
        >
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <Factory size={28} color="#3b82f6" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              NexaEnterprise Industrial
            </h2>
            <span style={{
              background: 'rgba(59, 130, 246, 0.2)',
              color: '#60a5fa',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 700
            }}>
              HEAVY INDUSTRY
            </span>
          </div>

          <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '24px' }}>
            Engineered for <strong>Manufacturing Plants, Assembly Lines, Corporate Supply Chain, Multi-Branch MNCs</strong>, and Governance.
          </p>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
            {[
              '🏭 Industrial Bill of Materials (BOM) & Work Orders',
              '⭐ 6-Dimension Intelligent Vendor Scorecard & Ratings',
              '🌐 Global MNC Multi-Branch Switcher & Consolidation',
              '📊 General Ledger, ACDOCA Double-Entry & Spreadsheets',
              '🛡️ GRC Frameworks, Risk Heatmaps & Disaster Recovery',
              '🤖 AI Command Center, Alexa Voice & AWS Bedrock'
            ].map((feature, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: '#cbd5e1' }}>
                <span style={{ color: '#3b82f6' }}>✓</span> {feature}
              </div>
            ))}
          </div>

          <button style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: '10px',
            background: '#2563eb',
            color: '#ffffff',
            border: 'none',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
          }}>
            <span>Launch Enterprise Console</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <div style={{ marginTop: '40px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
        You can bookmark direct links: <code style={{ color: '#38bdf8', padding: '2px 6px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>/retail</code> for Storefront POS or <code style={{ color: '#60a5fa', padding: '2px 6px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>/enterprise</code> for Industrial ERP.
      </div>
    </div>
  );
}
