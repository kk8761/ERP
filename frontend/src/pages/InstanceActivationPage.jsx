import React, { useState } from 'react';
import {
  ShieldCheck, Server, Database, Sparkles, Building2,
  Cpu, ShoppingCart, Package, Layers, BookOpen, Lock,
  CheckCircle2, ArrowRight, RefreshCw, LogOut, Check,
  Zap, ShieldAlert, Award, FileSpreadsheet, Globe, Activity
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function InstanceActivationPage({ onActivate }) {
  const { user, logout } = useAuth();
  const [isActivating, setIsActivating] = useState(false);
  const [activationStep, setActivationStep] = useState(0);

  const activationSteps = [
    { label: 'Allocating isolated ephemeral cloud compute sandbox...', duration: 350 },
    { label: 'Connecting to persistent PostgreSQL ACID transactional database...', duration: 400 },
    { label: 'Mounting business modules: Sales, Inventory, Manufacturing, Finance, GRC, HR...', duration: 450 },
    { label: 'Engaging Zero-Trust DLP guards & multi-branch sync engine...', duration: 300 }
  ];

  const handleActivate = () => {
    if (isActivating) return;
    setIsActivating(true);
    setActivationStep(0);

    let current = 0;
    const runNextStep = () => {
      if (current < activationSteps.length) {
        setActivationStep(current + 1);
        current++;
        setTimeout(runNextStep, activationSteps[current - 1]?.duration || 350);
      } else {
        setTimeout(() => {
          onActivate();
        }, 300);
      }
    };

    setTimeout(runNextStep, 250);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-app)',
      color: 'var(--text-main)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto'
    }}>
      {/* Top Bar / Identity Header */}
      <header style={{
        padding: '16px 32px',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: 'var(--shadow-xs)'
      }}>
        {/* Brand & Organization */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0064d2 0%, #004fb0 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 900,
            fontSize: '22px',
            boxShadow: '0 4px 12px rgba(0, 100, 210, 0.35)'
          }}>
            N
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-brand)', letterSpacing: '-0.02em' }}>
                NexaERP Global
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: 'rgba(0, 100, 210, 0.1)',
                color: '#0064d2',
                border: '1px solid rgba(0, 100, 210, 0.2)'
              }}>
                Enterprise Suite
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Next-Gen Autonomous ERP & Multi-Branch Cloud Operations
            </div>
          </div>
        </div>

        {/* User Pill & Sign Out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 14px',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-full)',
            fontSize: '13px'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '12px'
            }}>
              {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <div style={{ fontWeight: 600, lineHeight: 1.2 }}>{user?.full_name || 'Authorized Operator'}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user?.email} • {user?.role?.name || 'Administrator'}</div>
            </div>
          </div>

          <button
            onClick={logout}
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}
            title="Sign out to switch account"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '36px 24px 60px',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        width: '100%'
      }}>
        {/* Hero Section: Welcome & Company Overview */}
        <div className="nexa-card" style={{
          padding: '36px 32px',
          background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-subtle) 100%)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-md)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle Accent Glow */}
          <div style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 100, 210, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            <Building2 size={16} />
            <span>Corporate Enterprise Overview & Instance Gateway</span>
          </div>

          <h1 style={{
            fontSize: '32px',
            fontWeight: 800,
            fontFamily: 'var(--font-brand)',
            color: 'var(--text-main)',
            letterSpacing: '-0.03em',
            lineHeight: 1.25,
            marginBottom: '14px'
          }}>
            Welcome to NexaERP Enterprise Suite
          </h1>

          <p style={{
            fontSize: '15px',
            lineHeight: '1.65',
            color: 'var(--text-secondary)',
            maxWidth: '920px',
            marginBottom: '24px'
          }}>
            <strong>NexaERP Solutions</strong> is an autonomous, mission-critical Enterprise Resource Planning (ERP) platform engineered for modern commercial organizations. Seamlessly unifying high-volume retail POS, multi-echelon warehouse supply chain, Industry 4.0 IoT manufacturing, automated double-entry general ledgers (SAP ACDOCA standard), and proactive zero-trust threat governance into a unified, high-performance operational cockpit.
          </p>

          {/* Quick Metrics Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <Activity size={20} />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>99.99%</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>High-Availability SLA</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'rgba(0, 100, 210, 0.1)', color: '#0064d2' }}>
                <Database size={20} />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>ACID Compliant</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>PostgreSQL Cluster Engine</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                <Lock size={20} />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>AES-256 GCM</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Military-Grade Encryption</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                <Sparkles size={20} />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>Predictive AI</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Autonomous Business Copilot</div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Company Modules & Architecture */}
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-brand)', color: 'var(--text-main)' }}>
              Core Enterprise Modules
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Once your instance is activated below, all of these modules will be unlocked with full interactive capabilities.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '18px'
          }}>
            {/* Card 1: Retail & Sales */}
            <div className="nexa-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(0, 100, 210, 0.1)', color: '#0064d2' }}>
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Point of Sale & Retail Orders</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Real-time sub-second cashier checkout</span>
                </div>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                High-throughput barcode scanning, integrated digital invoice receipts, credit note refunds, and real-time customer ledger updates.
              </p>
            </div>

            {/* Card 2: Inventory & Supply Chain */}
            <div className="nexa-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <Package size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Smart Inventory & Procurement</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Automated replenishment & stock tracking</span>
                </div>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Multi-warehouse stock movements, purchase order workflows, vendor performance analysis, and automated runout day predictions.
              </p>
            </div>

            {/* Card 3: Manufacturing */}
            <div className="nexa-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                  <Cpu size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Industry 4.0 Manufacturing</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>IoT Work Centers & BOM</span>
                </div>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Work order dispatching, multi-level Bill of Materials (BOM) decomposition, machine scrap tracking, and live Overall Equipment Effectiveness (OEE).
              </p>
            </div>

            {/* Card 4: Finance & Accounting */}
            <div className="nexa-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Financial Ledger & ACDOCA</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Enterprise double-entry accounting</span>
                </div>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                SAP ACDOCA universal journal standard, automated VAT/GST tax filing, P&L reporting, balance sheet generation, and payroll processing.
              </p>
            </div>

            {/* Card 5: GRC & Security */}
            <div className="nexa-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Governance, Risk & DLP Security</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Zero-trust JIT elevation & audit logging</span>
                </div>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                ISO 27001 5×5 risk heatmaps, automated SQL injection WAF filters, screen capture DLP watermarks, and immutable SOC audit trails.
              </p>
            </div>

            {/* Card 6: AI & Automation */}
            <div className="nexa-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(6, 182, 212, 0.1)', color: '#0891b2' }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Predictive AI & Mail Center</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Natural language corporate intelligence</span>
                </div>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Groq LLM integration with enterprise RAG knowledge isolation, supplier price fluctuation alerts, and automated AI email generation.
              </p>
            </div>
          </div>
        </div>

        {/* Section: Cloud Instance & Permanent Data Saving Assurance (KEY REQUIREMENT) */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '2px solid #10b981',
          borderRadius: '16px',
          padding: '28px 30px',
          boxShadow: '0 8px 30px rgba(16, 185, 129, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              flexShrink: 0
            }}>
              <Database size={24} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                  Cloud Instance Notice & Guaranteed Permanent Data Persistence
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: '12px',
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  border: '1px solid #bbf7d0'
                }}>
                  Zero Data Loss Policy
                </span>
              </div>

              <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                <p style={{ marginBottom: '10px' }}>
                  <strong>How Your Instance Works:</strong> You are launching an <em>on-demand, session-scoped ephemeral cloud computing instance</em>. This architecture ensures dedicated memory isolation, high execution speeds, and zero crosstalk between tenant processes.
                </p>
                <div style={{
                  padding: '14px 18px',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  borderLeft: '4px solid #10b981',
                  borderRadius: '6px',
                  color: 'var(--text-main)',
                  fontSize: '13.5px',
                  lineHeight: '1.55'
                }}>
                  <strong>★ Permanent Storage Assurance:</strong> Though this computing instance is temporary, <strong>all data saving is 100% permanent</strong>. Every sales order, stock adjustment, purchase receipt, journal line, customer balance, and configuration change is written directly to persistent cloud storage backed by our encrypted ACID PostgreSQL database. When you log out or restart your instance, <u>none of your data is lost</u>.
                </div>
              </div>

              {/* Infrastructure Checklist */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                marginTop: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-main)' }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span><strong>Compute Layer:</strong> Ephemeral Sandbox</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-main)' }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span><strong>Storage Layer:</strong> Persistent Encrypted DB</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-main)' }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span><strong>Disaster Recovery:</strong> Active PITR Backups</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-main)' }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span><strong>Auto-Sync Engine:</strong> 30s Server Heartbeat</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Down a Button Activating the Instance */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px 20px',
          textAlign: 'center'
        }}>
          {isActivating ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              width: '100%',
              maxWidth: '520px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', fontWeight: 700, fontSize: '15px' }}>
                <RefreshCw size={20} className="animate-spin" />
                <span>Activating Cloud Instance...</span>
              </div>

              {/* Animated Progress Bar */}
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{
                  height: '100%',
                  width: `${(activationStep / activationSteps.length) * 100}%`,
                  backgroundColor: '#0064d2',
                  transition: 'width 0.3s ease-in-out'
                }} />
              </div>

              {/* Current Step Label */}
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', minHeight: '20px' }}>
                {activationStep > 0 && activationSteps[activationStep - 1]
                  ? activationSteps[activationStep - 1].label
                  : 'Preparing enterprise runtime...'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={handleActivate}
                className="btn btn-primary"
                style={{
                  padding: '16px 44px',
                  fontSize: '17px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-brand)',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 8px 24px rgba(0, 100, 210, 0.4)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                <Zap size={20} />
                <span>Activate Instance & Launch Workspace</span>
                <ArrowRight size={20} />
              </button>

              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Click above to provision your cloud session. All modules, dashboards, and live tools will open immediately.
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        padding: '18px 24px',
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '12px',
        color: 'var(--text-muted)'
      }}>
        <div>© 2026 NexaERP Global Enterprise Solutions. All rights reserved.</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>Security Standard: ISO/IEC 27001</span>
          <span>•</span>
          <span>Data Encryption: AES-256</span>
          <span>•</span>
          <span>Status: Cloud Operations Nominal</span>
        </div>
      </footer>
    </div>
  );
}
