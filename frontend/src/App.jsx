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
import LoginPage from './pages/LoginPage';

function MainApp() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('nexaerp_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nexaerp_theme', theme);
  }, [theme]);

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
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentTab} />;
      case 'pos':
      case 'barcode_scanner':
        return <POSTerminalPage />;
      case 'products':
      case 'inventory':
      case 'stock_movements':
        return <InventoryPage />;
      case 'sales_orders':
      case 'invoices':
      case 'customers':
      case 'returns':
        return <SalesPage />;
      case 'procurement':
      case 'suppliers':
        return <ProcurementPage />;
      case 'accounting':
      case 'expenses':
      case 'chart_of_accounts':
      case 'financial_reports':
        return <FinancePage />;
      case 'employees':
      case 'attendance':
      case 'leaves':
      case 'payroll':
        return <HRPage />;
      case 'elevation':
      case 'admin':
      case 'settings':
      case 'reports':
        return <SecurityElevationPage />;
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
