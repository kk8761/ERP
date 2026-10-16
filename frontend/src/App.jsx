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

function MainApp() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [isRightClickBlocked, setIsRightClickBlocked] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('nexaerp_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nexaerp_theme', theme);
  }, [theme]);

  // Enterprise Security: Intercept right-click and display safety warning
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      setIsRightClickBlocked(true);
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

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
