import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import TopNav from './components/TopNav';
import Sidebar from './components/Sidebar';
import AIAssistantDrawer from './components/AIAssistantDrawer';

// Dedicated Retail Portal Components
import RetailTopNav from './components/RetailTopNav';
import RetailSidebar from './components/RetailSidebar';
import RetailLoginPage from './pages/RetailLoginPage';
import RetailDashboardPage from './pages/RetailDashboardPage';

// Dedicated Enterprise Portal Components
import EnterpriseLoginPage from './pages/EnterpriseLoginPage';
import GatewayLandingPage from './pages/GatewayLandingPage';

// Module Pages
import DashboardPage from './pages/DashboardPage';
import POSTerminalPage from './pages/POSTerminalPage';
import InventoryPage from './pages/InventoryPage';
import SalesPage from './pages/SalesPage';
import ProcurementPage from './pages/ProcurementPage';
import FinancePage from './pages/FinancePage';
import HRPage from './pages/HRPage';
import SecurityElevationPage from './pages/SecurityElevationPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import ManufacturingPage from './pages/ManufacturingPage';
import GRCPage from './pages/GRCPage';
import PredictiveAIPage from './pages/PredictiveAIPage';
import EmailHubPage from './pages/EmailHubPage';
import InstanceActivationPage from './pages/InstanceActivationPage';

// Modals & Utilities
import BarcodeScannerModal from './components/BarcodeScannerModal';
import SignatureCaptureModal from './components/SignatureCaptureModal';
import ActionNotAllowedModal from './components/ActionNotAllowedModal';
import { initScreenshotGuard } from './services/screenshotGuard';
import { startAutoSync, stopAutoSync } from './services/syncManager';
import { ShieldAlert, X, Lock } from 'lucide-react';

function MainApp() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [isRightClickBlocked, setIsRightClickBlocked] = useState(false);
  const [controlDisabledNotice, setControlDisabledNotice] = useState(null);
  const [cursorPill, setCursorPill] = useState(null);
  const [dlpAlert, setDlpAlert] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('nexaerp_theme') || 'light');

  // Default to Retail Portal on port 5174 or /retail, otherwise Pure Enterprise Suite
  const [portal, setPortal] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.location.port === '5174' || window.location.pathname.toLowerCase().startsWith('/retail')) {
        return 'retail';
      }
    }
    return 'enterprise';
  });

  const switchPortal = (mode) => {
    setPortal(mode);
    localStorage.setItem('nexaerp_portal', mode);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', mode === 'enterprise' ? '/' : `/${mode}`);
    }
    setCurrentTab('dashboard');
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/retail')) {
        setPortal('retail');
      } else {
        setPortal('enterprise');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // Cloud Instance Activation Lifecycle (Ephemeral Compute + Permanent Persistent Storage)
  const [isInstanceActive, setIsInstanceActive] = useState(() => {
    try {
      const activeUser = localStorage.getItem('nexaerp_user');
      const userId = activeUser ? JSON.parse(activeUser)?.id : null;
      if (!userId) return false;
      return sessionStorage.getItem(`nexaerp_instance_activated_${userId}`) === 'true';
    } catch {
      return false;
    }
  });

  const handleActivateInstance = () => {
    if (user?.id) {
      sessionStorage.setItem(`nexaerp_instance_activated_${user.id}`, 'true');
    }
    setIsInstanceActive(true);
  };

  // Initialize Enterprise 30-Second Multi-Module Server Auto-Sync
  useEffect(() => {
    startAutoSync();
    return () => stopAutoSync();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nexaerp_theme', theme);
  }, [theme]);

  // Enterprise Security: Intercept right-click only in Enterprise portal
  useEffect(() => {
    if (portal !== 'enterprise') return;
    let dismissTimer = null;

    const triggerControlDisabled = (data = {}) => {
      setControlDisabledNotice({
        action: data.action || 'Right Click',
        timestamp: new Date().toLocaleTimeString()
      });

      if (dismissTimer) clearTimeout(dismissTimer);
      dismissTimer = setTimeout(() => {
        setControlDisabledNotice(null);
      }, 3500);

      if (typeof data.x === 'number' && typeof data.y === 'number') {
        const x = Math.min(window.innerWidth - 160, Math.max(10, data.x + 8));
        const y = Math.min(window.innerHeight - 40, Math.max(10, data.y + 8));
        setCursorPill({ x, y });
        setTimeout(() => setCursorPill(null), 1800);
      }
    };

    const handleContextMenu = (e) => {
      // Don't block admins in dev
      if (user?.is_superuser || user?.email?.includes('admin')) return;
      e.preventDefault();
      triggerControlDisabled({ x: e.clientX, y: e.clientY, action: 'Right Click' });
    };

    window.addEventListener('contextmenu', handleContextMenu);
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [portal, user]);

  // Enterprise Security: Intercept screenshot attempts (exempt for Company Administrators/Superusers and Retail)
  useEffect(() => {
    if (!user || portal !== 'enterprise') return;
    if (user.is_superuser || user.role === 'admin' || user.email?.toLowerCase().includes('admin')) return;
    const cleanup = initScreenshotGuard((alertData) => {
      setDlpAlert({
        actionType: alertData.actionType,
        timestamp: alertData.timestamp,
        userName: user?.full_name || 'Employee',
        userEmail: user?.email || ''
      });
      setTimeout(() => {
        setDlpAlert(null);
      }, 8000);
    });
    return cleanup;
  }, [user, portal]);

  // Enterprise Hands-Free "Hey Alexa" Wake-Word Engine
  useEffect(() => {
    if (!user) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    let recognition = null;
    let isExplicitlyStopped = false;

    const startWakeWordListener = () => {
      try {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript.toLowerCase().trim();
            if (/\b(?:hey\s+|hi\s+|ok\s+|hello\s+)?(?:alexa|nexa)\b/i.test(transcript)) {
              setIsAIOpen(true);
              try { recognition.stop(); } catch (e) {}
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('start-alexa-voice', { detail: { wakePrompt: transcript } }));
              }, 250);
              return;
            }
          }
        };

        recognition.onerror = (e) => {
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
            isExplicitlyStopped = true;
          }
        };

        recognition.onend = () => {
          if (!isExplicitlyStopped && !isAIOpen) {
            setTimeout(() => {
              try { recognition.start(); } catch (e) {}
            }, 1200);
          }
        };

        recognition.start();
      } catch (err) {
        console.warn("Could not start global wake word listener:", err);
      }
    };

    startWakeWordListener();

    return () => {
      isExplicitlyStopped = true;
      if (recognition) {
        try { recognition.stop(); } catch (e) {}
      }
    };
  }, [user, isAIOpen]);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-main)',
        gap: '12px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          backgroundColor: '#0064d2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 800,
          fontSize: '20px'
        }}>
          N
        </div>
        <div style={{ fontSize: '14px', fontWeight: 600 }}>Loading NexaERP Suite...</div>
      </div>
    );
  }

  // ─── UN-AUTHENTICATED ROUTING: DIRECT LOGIN (NO PROMPTS FOR OTHER LOGINS) ─────
  if (!user) {
    if (portal === 'retail') {
      return (
        <RetailLoginPage 
          onLoginSuccess={() => setCurrentTab('dashboard')}
        />
      );
    }
    // Company / Enterprise Console is the direct default login
    return (
      <EnterpriseLoginPage 
        onLoginSuccess={() => setCurrentTab('dashboard')}
      />
    );
  }

  // Enterprise Gateway: Post-login Company Overview & Instance Activation Portal (Enterprise Only)
  if (portal === 'enterprise' && !isInstanceActive) {
    return (
      <InstanceActivationPage
        onActivate={handleActivateInstance}
      />
    );
  }

  // ─── AUTHENTICATED CONTENT ROUTING ──────────────────────
  const renderRetailContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <RetailDashboardPage onNavigate={setCurrentTab} />;
      case 'pos':
        return <POSTerminalPage onNavigate={setCurrentTab} />;
      case 'inventory':
      case 'products':
        return <InventoryPage initialTab="products" catalogType="retail" onNavigate={setCurrentTab} />;
      case 'orders':
      case 'sales_orders':
        return <SalesPage initialTab="orders" onNavigate={setCurrentTab} />;
      case 'customers':
        return <SalesPage initialTab="customers" onNavigate={setCurrentTab} />;
      case 'returns':
        return <SalesPage initialTab="returns" onNavigate={setCurrentTab} />;
      case 'cash_register':
        return <POSTerminalPage onNavigate={setCurrentTab} initialTab="register" />;
      case 'employees':
      case 'staff':
        return <HRPage initialTab="employees" onNavigate={setCurrentTab} />;
      case 'reports':
        return <ReportsPage />;
      default:
        return <RetailDashboardPage onNavigate={setCurrentTab} />;
    }
  };

  const renderEnterpriseContent = () => {
    switch (currentTab) {
      // Dashboard Home
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentTab} />;

      // Point of Sale & Cash Register (legacy route fallback to Sales Orders)
      case 'pos':
      case 'cash_register':
        return <SalesPage initialTab="orders" onNavigate={setCurrentTab} />;

      // Sales & Customer Management
      case 'sales':
      case 'sales_orders':
      case 'orders':
        return <SalesPage initialTab="orders" onNavigate={setCurrentTab} />;
      case 'customers':
        return <SalesPage initialTab="customers" onNavigate={setCurrentTab} />;
      case 'returns':
        return <SalesPage initialTab="returns" onNavigate={setCurrentTab} />;
      case 'invoices':
        return <SalesPage initialTab="invoices" onNavigate={setCurrentTab} />;

      // Inventory & Warehouse Management (Strictly Industrial / Manufacturing)
      case 'products':
        return <InventoryPage initialTab="products" catalogType="industrial" onNavigate={setCurrentTab} />;
      case 'inventory':
      case 'stock_overview':
        return <InventoryPage initialTab="overview" catalogType="industrial" onNavigate={setCurrentTab} />;
      case 'stock_movements':
        return <InventoryPage initialTab="movements" catalogType="industrial" onNavigate={setCurrentTab} />;
      case 'barcode_scanner':
        return <InventoryPage initialTab="scanner" catalogType="industrial" onNavigate={setCurrentTab} />;
      case 'stock_depletion':
      case 'stock_exhaustion':
        return <InventoryPage initialTab="predictions" catalogType="industrial" onNavigate={setCurrentTab} />;

      // Manufacturing & Industry 4.0
      case 'manufacturing':
        return <ManufacturingPage initialTab="orders" />;
      case 'boms':
        return <ManufacturingPage initialTab="boms" />;
      case 'work_centers':
        return <ManufacturingPage initialTab="work_centers" />;
      case 'oee':
        return <ManufacturingPage initialTab="oee" />;

      // Procurement & Intelligent Vendor Ratings
      case 'procurement':
        return <ProcurementPage initialTab="orders" />;
      case 'new_purchase':
        return <ProcurementPage initialTab="orders" initialAction="create" />;
      case 'suppliers':
        return <ProcurementPage initialTab="suppliers" />;

      // Corporate Finance & General Ledger
      case 'finance':
      case 'accounting':
        return <FinancePage initialTab="overview" />;
      case 'spreadsheet':
      case 'acdoca':
        return <FinancePage initialTab="spreadsheet" />;
      case 'chart_of_accounts':
        return <FinancePage initialTab="accounts" />;
      case 'expenses':
        return <FinancePage initialTab="expenses" />;
      case 'record_expense':
        return <FinancePage initialTab="expenses" initialAction="create" />;
      case 'financial_reports':
        return <FinancePage initialTab="reports" />;

      // Human Capital & Org Hierarchy
      case 'employees':
        return <HRPage initialTab="employees" />;
      case 'org_hierarchy':
      case 'hierarchy':
        return <HRPage initialTab="hierarchy" />;
      case 'add_employee':
        return <HRPage initialTab="employees" initialAction="create" />;
      case 'attendance':
        return <HRPage initialTab="attendance" />;
      case 'leaves':
        return <HRPage initialTab="leaves" />;
      case 'payroll':
        return <HRPage initialTab="payroll" />;
      case 'users':
        return <SecurityElevationPage initialTab="users" />;
      case 'elevation':
        return <SecurityElevationPage initialTab="elevation" />;

      // GRC & Risk Management
      case 'grc':
        return <GRCPage initialTab="heatmap" />;
      case 'compliance':
        return <GRCPage initialTab="frameworks" />;
      case 'risk_register':
        return <GRCPage initialTab="register" />;
      case 'audits':
        return <GRCPage initialTab="audits" />;

      // Email Hub & Communications
      case 'email_hub':
      case 'emails':
        return <EmailHubPage />;

      // Predictive AI & What-If Simulation
      case 'predictive_ai':
        return <PredictiveAIPage />;

      // Enterprise Security & Audit
      case 'security':
        return <SecurityElevationPage initialTab="elevation" />;
      case 'admin':
      case 'audit_logs':
        return <SecurityElevationPage initialTab="audit" />;
      case 'screenshots':
        return <SecurityElevationPage initialTab="screenshots" />;

      // Analytics & Reports
      case 'reports':
        return <ReportsPage />;

      // System Settings & Database Recovery
      case 'company_portal':
        return <SettingsPage initialTab="org" />;
      case 'disaster_recovery':
        return <SettingsPage initialTab="db" />;
      case 'settings':
        return <SettingsPage initialTab="org" />;

      default:
        return <DashboardPage onNavigate={setCurrentTab} />;
    }
  };

  // ─── RETAIL PORTAL LAYOUT ───────────────────────────────
  if (portal === 'retail') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <RetailTopNav
          currentTab={currentTab}
          onNavigate={setCurrentTab}
          onOpenScanner={() => setIsScannerOpen(true)}
          theme={theme}
          onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        />

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <RetailSidebar
            currentTab={currentTab}
            onNavigate={setCurrentTab}
          />

          <main style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            backgroundColor: 'var(--bg-app)'
          }}>
            {renderRetailContent()}
          </main>
        </div>

        {/* Universal Barcode Scanner Modal */}
        <BarcodeScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onBarcodeDetected={(prod) => {
            setCurrentTab('pos');
          }}
        />
      </div>
    );
  }

  // ─── ENTERPRISE PORTAL LAYOUT ───────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Top Application Bar */}
      <TopNav
        currentTab={currentTab}
        onNavigate={setCurrentTab}
        onToggleAI={() => setIsAIOpen(prev => !prev)}
        onOpenAI={() => setIsAIOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenSignature={() => setIsSignatureOpen(true)}
        theme={theme}
        setTheme={setTheme}
      />

      {/* Middle: Sidebar + Content Canvas + AI Assistant Drawer */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          currentTab={currentTab}
          onNavigate={setCurrentTab}
          onToggleAI={() => setIsAIOpen(prev => !prev)}
        />

        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          backgroundColor: 'var(--bg-app)'
        }}>
          {renderEnterpriseContent()}
        </main>

        <AIAssistantDrawer
          isOpen={isAIOpen}
          onClose={() => setIsAIOpen(false)}
        />
      </div>

      {/* Universal Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onBarcodeDetected={(prod) => {
          setCurrentTab('products');
        }}
      />

      {/* Digital E-Signature Capture Modal */}
      <SignatureCaptureModal
        isOpen={isSignatureOpen}
        onClose={() => setIsSignatureOpen(false)}
        signerName={user?.full_name || "Authorized Officer"}
        onConfirm={(sig) => {
          console.log('Digital signature captured:', sig);
        }}
      />

      {/* Enterprise Right-Click Restriction Modal */}
      <ActionNotAllowedModal
        isOpen={isRightClickBlocked}
        onClose={() => setIsRightClickBlocked(false)}
        actionType="Context Menu Inspection"
      />

      {/* DLP Security Warning Toast */}
      {dlpAlert && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999999,
          backgroundColor: '#991b1b',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          border: '1px solid #ef4444',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          maxWidth: '650px',
          width: '90%'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldAlert size={24} color="#ffffff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>DLP Security Alert: Screen Capture Detected</span>
              <span style={{ fontSize: '10px', backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                {dlpAlert.actionType}
              </span>
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
              User <strong>{dlpAlert.userName}</strong> attempted a screen capture at <strong>{dlpAlert.timestamp}</strong>. Evidence image & audit logs have been dispatched to the Administrator.
            </div>
          </div>
          <button
            onClick={() => setDlpAlert(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Floating Control Disabled Banner */}
      {controlDisabledNotice && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 999999,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            borderRadius: '10px',
            padding: '12px 18px',
            border: '1px solid #334155',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Lock size={15} color="#ef4444" />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#f8fafc' }}>Action Disabled</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              {controlDisabledNotice.action} is restricted by corporate DLP governance.
            </div>
          </div>
          <button
            onClick={() => setControlDisabledNotice(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              marginLeft: '8px'
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Floating Cursor Pill on Right Click */}
      {cursorPill && (
        <div
          style={{
            position: 'fixed',
            left: `${cursorPill.x}px`,
            top: `${cursorPill.y}px`,
            zIndex: 999999,
            pointerEvents: 'none',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          <Lock size={12} />
          <span>Control Disabled</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
