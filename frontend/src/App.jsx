import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import TopNav from './components/TopNav';
import Sidebar from './components/Sidebar';
import AIAssistantDrawer from './components/AIAssistantDrawer';

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
import LoginPage from './pages/LoginPage';
import ManufacturingPage from './pages/ManufacturingPage';
import GRCPage from './pages/GRCPage';
import PredictiveAIPage from './pages/PredictiveAIPage';
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

  // Initialize Enterprise 30-Second Multi-Module Server Auto-Sync
  useEffect(() => {
    startAutoSync();
    return () => stopAutoSync();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nexaerp_theme', theme);
  }, [theme]);

  // Enterprise Security: Intercept right-click and display "Control Disabled" safety notification
  useEffect(() => {
    let dismissTimer = null;

    const triggerControlDisabled = (data = {}) => {
      // 1. Pop out main toast notification
      setControlDisabledNotice({
        action: data.action || 'Right Click',
        timestamp: new Date().toLocaleTimeString()
      });

      if (dismissTimer) clearTimeout(dismissTimer);
      dismissTimer = setTimeout(() => {
        setControlDisabledNotice(null);
      }, 3500);

      // 2. Pop out pill at cursor position if coordinates provided
      if (typeof data.x === 'number' && typeof data.y === 'number') {
        const x = Math.min(window.innerWidth - 160, Math.max(10, data.x + 8));
        const y = Math.min(window.innerHeight - 40, Math.max(10, data.y + 8));
        setCursorPill({ x, y });
        setTimeout(() => setCursorPill(null), 1800);
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      triggerControlDisabled({ x: e.clientX, y: e.clientY, action: 'Right Click' });
    };
    
    // Enterprise Security: Intercept DevTools shortcuts (F12, Ctrl+Shift+I/J, Ctrl+U)
    const handleKeySecurity = (e) => {
      // F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        triggerControlDisabled({ action: 'DevTools Shortcut (F12)' });
        return;
      }
      // Ctrl+Shift+I or Ctrl+Shift+J or Cmd+Alt+I (DevTools Inspect)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
        triggerControlDisabled({ action: 'Inspect Element Shortcut' });
        return;
      }
      // Ctrl+U / Cmd+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        triggerControlDisabled({ action: 'View Source Shortcut' });
        return;
      }
    };

    const handleCustomControlDisabled = (e) => {
      triggerControlDisabled(e.detail || {});
    };

    document.addEventListener('contextmenu', handleContextMenu, { capture: true });
    window.addEventListener('keydown', handleKeySecurity, { capture: true });
    window.addEventListener('nexa:control-disabled', handleCustomControlDisabled);

    return () => {
      if (dismissTimer) clearTimeout(dismissTimer);
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      window.removeEventListener('keydown', handleKeySecurity, { capture: true });
      window.removeEventListener('nexa:control-disabled', handleCustomControlDisabled);
    };
  }, []);

  // Enterprise Security: Intercept screenshot attempts (PrintScreen, Snipping tool, etc.)
  useEffect(() => {
    if (!user) return;
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
  }, [user]);

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
        <div style={{ fontSize: '14px', fontWeight: 600 }}>Loading NexaERP Workspace...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (currentTab) {
      // Dashboard Home
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentTab} />;

      // Point of Sale Register
      case 'pos':
        return <POSTerminalPage onNavigate={setCurrentTab} />;

      // Sales Sub-Modules
      case 'sales_orders':
        return <SalesPage initialTab="orders" onNavigate={setCurrentTab} />;
      case 'invoices':
        return <SalesPage initialTab="invoices" onNavigate={setCurrentTab} />;
      case 'customers':
        return <SalesPage initialTab="customers" onNavigate={setCurrentTab} />;
      case 'add_customer':
        return <SalesPage initialTab="customers" initialAction="create" onNavigate={setCurrentTab} />;
      case 'returns':
        return <SalesPage initialTab="returns" onNavigate={setCurrentTab} />;

      // Inventory Sub-Modules
      case 'products':
        return <InventoryPage initialTab="products" onNavigate={setCurrentTab} />;
      case 'add_product':
        return <InventoryPage initialTab="products" initialAction="create" onNavigate={setCurrentTab} />;
      case 'inventory':
        return <InventoryPage initialTab="overview" onNavigate={setCurrentTab} />;
      case 'stock_movements':
        return <InventoryPage initialTab="movements" onNavigate={setCurrentTab} />;
      case 'barcode_scanner':
        return <InventoryPage initialTab="scanner" onNavigate={setCurrentTab} />;
      case 'stock_depletion':
        return <InventoryPage initialTab="predictions" onNavigate={setCurrentTab} />;

      // Manufacturing & Industry 4.0 Sub-Modules (From NexaERP)
      case 'manufacturing':
        return <ManufacturingPage initialTab="orders" />;
      case 'boms':
        return <ManufacturingPage initialTab="boms" />;
      case 'work_centers':
        return <ManufacturingPage initialTab="work_centers" />;
      case 'oee':
        return <ManufacturingPage initialTab="oee" />;

      // Governance, Risk & Compliance (From NexaERP)
      case 'grc':
        return <GRCPage initialTab="heatmap" />;
      case 'compliance':
        return <GRCPage initialTab="frameworks" />;
      case 'risk_register':
        return <GRCPage initialTab="register" />;
      case 'audits':
        return <GRCPage initialTab="audits" />;

      // Predictive AI & What-If Simulation (From NexaERP)
      case 'predictive_ai':
        return <PredictiveAIPage />;

      // Procurement & Vendor Master
      case 'procurement':
        return <ProcurementPage initialTab="orders" />;
      case 'new_purchase':
        return <ProcurementPage initialTab="orders" initialAction="create" />;
      case 'suppliers':
        return <ProcurementPage initialTab="suppliers" />;

      // Finance & General Ledger Sub-Modules
      case 'accounting':
        return <FinancePage initialTab="overview" />;
      case 'chart_of_accounts':
        return <FinancePage initialTab="accounts" />;
      case 'expenses':
        return <FinancePage initialTab="expenses" />;
      case 'record_expense':
        return <FinancePage initialTab="expenses" initialAction="create" />;
      case 'financial_reports':
        return <FinancePage initialTab="reports" />;

      // Human Resources Sub-Modules
      case 'employees':
        return <HRPage initialTab="employees" />;
      case 'add_employee':
        return <HRPage initialTab="employees" initialAction="create" />;
      case 'attendance':
        return <HRPage initialTab="attendance" />;
      case 'leaves':
        return <HRPage initialTab="leaves" />;
      case 'payroll':
        return <HRPage initialTab="payroll" />;

      // Analytics & Executive Reports
      case 'reports':
        return <ReportsPage />;

      // System Settings & Outlets
      case 'settings':
        return <SettingsPage initialTab="org" />;
      case 'branches':
        return <SettingsPage initialTab="branches" />;
      case 'pos_settings':
        return <SettingsPage initialTab="pos" />;
      case 'security_policies':
        return <SettingsPage initialTab="security" />;
      case 'disaster_recovery':
        return <SettingsPage initialTab="db" />;

      // Security, JIT Elevation & User Administration
      case 'users':
        return <SecurityElevationPage initialTab="users" />;
      case 'elevation':
        return <SecurityElevationPage initialTab="elevation" />;
      case 'admin':
        return <SecurityElevationPage initialTab="audit" />;

      default:
        return <DashboardPage onNavigate={setCurrentTab} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Top Application Bar */}
      <TopNav
        currentTab={currentTab}
        onNavigate={setCurrentTab}
        onToggleAI={() => setIsAIOpen(prev => !prev)}
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
          {renderContent()}
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
      />

      {/* Floating Real-Time DLP Security Alert Banner */}
      {dlpAlert && (
        <div 
          className="animate-slide-down"
          style={{
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            border: '2px solid #ef4444',
            borderRadius: '10px',
            padding: '14px 20px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 0 15px rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            maxWidth: '620px',
            width: '92%'
          }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldAlert size={20} color="#ffffff" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>DLP SECURITY ALERT: SCREEN CAPTURE DETECTED</span>
              <span style={{ fontSize: '10px', backgroundColor: 'rgba(239, 68, 68, 0.3)', padding: '1px 6px', borderRadius: '4px' }}>
                {dlpAlert.actionType}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#e2e8f0', marginTop: '2px', lineHeight: 1.4 }}>
              User <strong>{dlpAlert.userName}</strong> attempted a screen capture at <strong>{dlpAlert.timestamp}</strong>. Evidence image & audit logs have been dispatched to the Administrator.
            </div>
          </div>

          <button
            onClick={() => setDlpAlert(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Pop-Out Notification: Control Disabled */}
      {controlDisabledNotice && (
        <div 
          role="alert"
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 99999,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            border: '2px solid #ef4444',
            borderRadius: '12px',
            padding: '12px 18px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '420px',
            animation: 'fadeIn 0.2s ease-out',
            cursor: 'default'
          }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
          }}>
            <Lock size={18} color="#ffffff" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.4px' }}>
              <span>CONTROL DISABLED</span>
              <span style={{ fontSize: '9px', fontWeight: 700, backgroundColor: 'rgba(239, 68, 68, 0.25)', border: '1px solid #ef4444', padding: '1px 5px', borderRadius: '4px', color: '#f87171' }}>
                RESTRICTED
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px', lineHeight: 1.4 }}>
              Right-click and context menu controls are disabled on this platform.
            </div>
          </div>

          <button
            onClick={() => setControlDisabledNotice(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px'
            }}
            title="Dismiss notification"
          >
            <X size={16} />
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
