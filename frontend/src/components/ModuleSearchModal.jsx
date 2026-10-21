import React, { useState, useEffect, useRef } from 'react';
import {
  Search, X, ShoppingCart, FileText, UserCheck, RotateCcw,
  Boxes, Package, ArrowLeftRight, ScanLine, TrendingDown, Truck, Building,
  Factory, Layers, Cpu, Sparkles, BookOpen, Wallet, DollarSign, BarChart3,
  Users, Clock, Calendar, ShieldAlert, Award, User, KeyRound, ShieldCheck,
  Database, Sliders, ExternalLink, Filter, ChevronRight, PenTool, UserPlus, PlusCircle, Mail
} from 'lucide-react';

export const SYSTEM_FUNCTIONS = [
  // --- Communication & Mail Hub ---
  {
    id: 'email_hub',
    name: 'Mail Center & AI Hub',
    module: 'Communication & AI',
    category: 'all',
    tab: 'email_hub',
    icon: Mail,
    color: '#0284c7',
    bgColor: '#f0f9ff',
    borderColor: '#bae6fd',
    description: 'Bi-directional business email, automated IMAP/SMTP sync, Groq AI entity extraction (PO, amounts, dates), and smart content drafting.',
    keywords: ['email', 'mail', 'inbox', 'send mail', 'receive mail', 'suggest mail', 'extract mail', 'message', 'smtp', 'imap', 'ai email']
  },
  // --- Sales & POS ---
  {
    id: 'pos_terminal',
    name: 'Point of Sale (POS) Terminal',
    module: 'Sales & POS',
    category: 'sales',
    tab: 'pos',
    icon: ShoppingCart,
    color: '#10b981',
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    description: 'Fast optical barcode checkout, automated GST tax calculation, dynamic cart discounts, and instant thermal receipt printing.',
    keywords: ['pos', 'billing', 'cashier', 'checkout', 'sale', 'barcode', 'sell', 'receipt', 'tax invoice']
  },
  {
    id: 'sales_orders',
    name: 'Sales Orders Master',
    module: 'Sales & POS',
    category: 'sales',
    tab: 'sales_orders',
    icon: FileText,
    color: '#0064d2',
    bgColor: '#e8f3ff',
    borderColor: '#bfdbfe',
    description: 'Search, review and export completed sales order history, order statuses, and sales revenue breakdown.',
    keywords: ['orders', 'sales orders', 'transactions', 'revenue', 'receipts']
  },
  {
    id: 'tax_invoices',
    name: 'Tax Invoices & Billing Archive',
    module: 'Sales & POS',
    category: 'sales',
    tab: 'invoices',
    icon: FileText,
    color: '#0284c7',
    bgColor: '#f0f9ff',
    borderColor: '#bae6fd',
    description: 'Search official GST tax invoices, reprint receipts, verify tax breakdown and customer invoice records.',
    keywords: ['invoices', 'tax', 'gst', 'bill', 'receipt archive', 'print invoice']
  },
  {
    id: 'customers_crm',
    name: 'Customer Directory & Accounts (CRM)',
    module: 'Sales & POS',
    category: 'sales',
    tab: 'customers',
    icon: UserCheck,
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    description: 'Manage retail & wholesale customer accounts, track cumulative spending history, contact numbers and credit balances.',
    keywords: ['customers', 'clients', 'crm', 'buyers', 'customer account', 'credit']
  },
  {
    id: 'add_customer_quick',
    name: 'Register New Customer Account',
    module: 'Sales & POS',
    category: 'sales',
    tab: 'add_customer',
    icon: UserPlus,
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    description: 'Quickly register a new retail or wholesale customer account with contact phone and delivery address.',
    keywords: ['add customer', 'new customer', 'create customer', 'client registration']
  },
  {
    id: 'sales_returns',
    name: 'Returns & Refund Authorizations',
    module: 'Sales & POS',
    category: 'sales',
    tab: 'returns',
    icon: RotateCcw,
    color: '#ef4444',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    description: 'Authorize sales order returns, refund payments, and automatically replenish returned merchandise back to inventory.',
    keywords: ['returns', 'refunds', 'restock', 'credit note', 'exchange', 'cancel sale']
  },

  // --- Inventory & Warehouse ---
  {
    id: 'products_master',
    name: 'Product Catalog & Pricing Master',
    module: 'Inventory',
    category: 'inventory',
    tab: 'products',
    icon: Boxes,
    color: '#0064d2',
    bgColor: '#e8f3ff',
    borderColor: '#bfdbfe',
    description: 'Register and update product catalogue: SKU codes, barcodes, unit of measure, purchase cost and retail selling prices.',
    keywords: ['products', 'catalog', 'items', 'add product', 'sku', 'price list', 'goods']
  },
  {
    id: 'stock_overview',
    name: 'Stock Overview & Warehouse Balances',
    module: 'Inventory',
    category: 'inventory',
    tab: 'inventory',
    icon: Package,
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    description: 'Real-time stock availability, low-stock threshold alerts, out-of-stock highlights, and manual stock adjustment controls.',
    keywords: ['stock', 'inventory levels', 'warehouse', 'stock count', 'quantity', 'adjust stock']
  },
  {
    id: 'stock_movements',
    name: 'Stock Movements & Audit Ledger',
    module: 'Inventory',
    category: 'inventory',
    tab: 'stock_movements',
    icon: ArrowLeftRight,
    color: '#6366f1',
    bgColor: '#eef2ff',
    borderColor: '#c7d2fe',
    description: 'Full audit ledger of every stock quantity delta: SALE_OUT deductions, RETURN_IN restocks, and warehouse transfers.',
    keywords: ['movements', 'audit trail', 'stock in', 'stock out', 'goods receipt', 'variance']
  },
  {
    id: 'barcode_scanner',
    name: 'Optical & Camera Barcode Scanner',
    module: 'Inventory',
    category: 'inventory',
    tab: 'barcode_scanner',
    icon: ScanLine,
    color: '#06b6d4',
    bgColor: '#ecfeff',
    borderColor: '#a5f3fc',
    description: 'High-speed camera and optical laser barcode reader with audio beep verification and instant product metadata inspection.',
    keywords: ['scan', 'barcode', 'qr', 'camera scanner', 'optical reader', 'lookup']
  },
  {
    id: 'stock_depletion',
    name: 'Stock Exhaustion & Depletion Predictor',
    module: 'Inventory',
    category: 'inventory',
    tab: 'stock_depletion',
    icon: TrendingDown,
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fca5a5',
    description: 'AI velocity forecasting model predicting exact days until stockout for every item with 1-click reorder requisitions.',
    keywords: ['prediction', 'depletion', 'exhaustion', 'burn rate', 'reorder', 'stockout forecast', 'forecast']
  },
  {
    id: 'purchase_orders',
    name: 'Purchase Orders & Requisitions',
    module: 'Inventory',
    category: 'inventory',
    tab: 'procurement',
    icon: Truck,
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    description: 'Generate purchase orders to replenishment vendors, approve PO requisitions, and register incoming shipments.',
    keywords: ['procurement', 'purchase orders', 'po', 'buy', 'vendor orders', 'replenishment']
  },
  {
    id: 'suppliers_master',
    name: 'Supplier & Vendor Master',
    module: 'Inventory',
    category: 'inventory',
    tab: 'suppliers',
    icon: Building,
    color: '#d97706',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    description: 'Manage vendor relationships, contact credentials, payment terms, delivery reliability scores, and vendor status.',
    keywords: ['suppliers', 'vendors', 'distributors', 'manufacturers', 'wholesalers']
  },

  // --- Manufacturing & Industry 4.0 ---
  {
    id: 'work_orders',
    name: 'Manufacturing Work Orders & Scheduling',
    module: 'Manufacturing',
    category: 'manufacturing',
    tab: 'manufacturing',
    icon: Factory,
    color: '#0284c7',
    bgColor: '#f0f9ff',
    borderColor: '#bae6fd',
    description: 'Track shop-floor production runs, work order completion rates, plant line status, and live output telemetry.',
    keywords: ['manufacturing', 'production', 'work orders', 'assembly', 'shop floor', 'factory']
  },
  {
    id: 'bill_of_materials',
    name: 'Bill of Materials (BOM) Configurator',
    module: 'Manufacturing',
    category: 'manufacturing',
    tab: 'boms',
    icon: Layers,
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    description: 'Configure multi-level component BOM recipe trees, raw material consumption ratios, and expected scrap tolerances.',
    keywords: ['bom', 'bill of materials', 'raw materials', 'recipe', 'formula', 'components']
  },
  {
    id: 'iot_work_centers',
    name: 'IoT Work Centers & OEE Performance',
    module: 'Manufacturing',
    category: 'manufacturing',
    tab: 'work_centers',
    icon: Cpu,
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    description: 'Monitor IoT factory machinery health, equipment availability percentages, operational speed, and Overall Equipment Effectiveness.',
    keywords: ['oee', 'iot', 'work centers', 'machines', 'equipment', 'telemetry', 'downtime']
  },
  {
    id: 'mrp_engine',
    name: 'MRP Requirements Planning Engine',
    module: 'Manufacturing',
    category: 'manufacturing',
    tab: 'manufacturing',
    icon: Sparkles,
    color: '#059669',
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    description: 'Run automated material explosion algorithms against active work orders to prevent component manufacturing shortages.',
    keywords: ['mrp', 'material planning', 'shortage', 'explosion', 'raw material forecast']
  },

  // --- Finance & Accounting ---
  {
    id: 'financial_overview',
    name: 'Finance & General Ledger Overview',
    module: 'Finance',
    category: 'finance',
    tab: 'accounting',
    icon: BookOpen,
    color: '#059669',
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    description: 'Executive financial cockpit: net revenue, operating expenses, monthly net profit, and general ledger health.',
    keywords: ['finance', 'accounting', 'profit', 'revenue', 'ledger', 'balance']
  },
  {
    id: 'chart_of_accounts',
    name: 'Chart of Accounts (COA Master)',
    module: 'Finance',
    category: 'finance',
    tab: 'chart_of_accounts',
    icon: BookOpen,
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    description: 'Standard GAAP/IFRS account tree: Assets, Liabilities, Equity, Revenue, and Operating Expense GL codes.',
    keywords: ['chart of accounts', 'coa', 'gl', 'debit', 'credit', 'accounts tree']
  },
  {
    id: 'expenses_tracker',
    name: 'Expense Tracking & Voucher Receipts',
    module: 'Finance',
    category: 'finance',
    tab: 'expenses',
    icon: Wallet,
    color: '#a855f7',
    bgColor: '#faf5ff',
    borderColor: '#e9d5ff',
    description: 'Log vendor utility payments, rent, administrative expenses, petty cash vouchers, and tax deductions.',
    keywords: ['expenses', 'bills', 'petty cash', 'spending', 'cost tracking', 'vouchers']
  },
  {
    id: 'financial_reports',
    name: 'Financial Statements & Reports',
    module: 'Finance',
    category: 'finance',
    tab: 'financial_reports',
    icon: BarChart3,
    color: '#0891b2',
    bgColor: '#ecfeff',
    borderColor: '#a5f3fc',
    description: 'Produce audited balance sheets, profit & loss (P&L) statements, cash flow statements, and tax summary tables.',
    keywords: ['financial statements', 'p&l', 'balance sheet', 'cash flow', 'tax report']
  },

  // --- Human Resources ---
  {
    id: 'employees_directory',
    name: 'Employee Master Directory',
    module: 'People & HR',
    category: 'hr',
    tab: 'employees',
    icon: Users,
    color: '#0284c7',
    bgColor: '#f0f9ff',
    borderColor: '#bae6fd',
    description: 'Personnel records: staff names, assigned departments, job titles, base compensation, and employment status.',
    keywords: ['employees', 'staff', 'hr', 'personnel', 'workers', 'team']
  },
  {
    id: 'attendance_tracking',
    name: 'Daily Attendance & Shift Clock-In',
    module: 'People & HR',
    category: 'hr',
    tab: 'attendance',
    icon: Clock,
    color: '#d97706',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    description: 'Daily clock-in and clock-out timestamp tracking, late arrivals, overtime hours, and staff shift schedules.',
    keywords: ['attendance', 'clock in', 'clock out', 'shifts', 'working hours', 'timesheet']
  },
  {
    id: 'leave_management',
    name: 'Leave Management & PTO Requests',
    module: 'People & HR',
    category: 'hr',
    tab: 'leaves',
    icon: Calendar,
    color: '#ea580c',
    bgColor: '#fff7ed',
    borderColor: '#ffedd5',
    description: 'Employee paid time off (PTO), sick leave applications, vacation balances, and management approval workflows.',
    keywords: ['leaves', 'vacation', 'pto', 'sick leave', 'time off', 'leave balance']
  },
  {
    id: 'payroll_processing',
    name: 'Payroll Engine & Compensation Processing',
    module: 'People & HR',
    category: 'hr',
    tab: 'payroll',
    icon: DollarSign,
    color: '#ec4899',
    bgColor: '#fdf2f8',
    borderColor: '#fbcfe8',
    description: 'Calculate monthly salary disbursements, tax withholdings, allowances, employee benefits, and salary slip generation.',
    keywords: ['payroll', 'salary', 'wages', 'compensation', 'pay slips', 'payout']
  },

  // --- Governance, Risk & Compliance (GRC) ---
  {
    id: 'grc_risk_matrix',
    name: '5×5 Enterprise Risk Heatmap',
    module: 'GRC & Risk',
    category: 'grc',
    tab: 'grc',
    icon: ShieldAlert,
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fca5a5',
    description: 'Interactive 5×5 severity vs. likelihood risk matrix, risk registers, mitigation action items, and risk scoring.',
    keywords: ['grc', 'risk', 'heatmap', 'risk register', 'threats', 'mitigation']
  },
  {
    id: 'compliance_frameworks',
    name: 'Compliance Frameworks & Audits',
    module: 'GRC & Risk',
    category: 'grc',
    tab: 'compliance',
    icon: Award,
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    description: 'Monitor organizational compliance readiness against ISO 27001, SOC 2 Type II, and GDPR data protection regulations.',
    keywords: ['compliance', 'iso 27001', 'soc 2', 'gdpr', 'regulatory', 'audits']
  },

  // --- Security & System Administration ---
  {
    id: 'security_users',
    name: 'User Accounts & Access Control',
    module: 'Security & Admin',
    category: 'security',
    tab: 'users',
    icon: User,
    color: '#475569',
    bgColor: '#f8fafc',
    borderColor: '#cbd5e1',
    description: 'Administer employee login accounts, assign RBAC enterprise roles, reset credentials, and suspend unauthorized users.',
    keywords: ['users', 'roles', 'permissions', 'rbac', 'credentials', 'accounts']
  },
  {
    id: 'jit_elevation',
    name: 'Just-In-Time (JIT) Dual-Custody Elevation',
    module: 'Security & Admin',
    category: 'security',
    tab: 'elevation',
    icon: KeyRound,
    color: '#f59e0b',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    description: 'Request, approve, or revoke time-bound administrative privileges with dual-custody authorization and auto-expiry.',
    keywords: ['jit', 'elevation', 'privilege', 'admin access', 'dual custody', 'security']
  },
  {
    id: 'audit_logs',
    name: 'Immutable Security Audit Logs',
    module: 'Security & Admin',
    category: 'security',
    tab: 'admin',
    icon: ShieldCheck,
    color: '#059669',
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    description: 'Tamper-evident system log tracking all security events, logins, price adjustments, elevation approvals, and refunds.',
    keywords: ['audit', 'logs', 'security events', 'forensics', 'access trail']
  },
  {
    id: 'disaster_recovery',
    name: 'Disaster Recovery & Point-In-Time Restore (PITR)',
    module: 'Security & Admin',
    category: 'security',
    tab: 'disaster_recovery',
    icon: Database,
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    description: 'Trigger full/differential backups, verify 90+ day retention policies, execute monthly failover drills, and point-in-time recovery.',
    keywords: ['backup', 'disaster recovery', 'pitr', 'failover', 'retention', 'restore']
  },
  {
    id: 'system_settings',
    name: 'System Settings & Multi-Branch Registers',
    module: 'Security & Admin',
    category: 'security',
    tab: 'settings',
    icon: Sliders,
    color: '#64748b',
    bgColor: '#f8fafc',
    borderColor: '#cbd5e1',
    description: 'Manage corporate legal parameters, register physical store branches & POS lanes, POS receipt memos, and security policies.',
    keywords: ['settings', 'branches', 'outlets', 'configuration', 'pos settings', 'company profile']
  },

  // --- AI & Tools ---
  {
    id: 'predictive_ai_tool',
    name: 'Predictive AI & What-If Simulations',
    module: 'AI & Intelligence',
    category: 'ai',
    tab: 'predictive_ai',
    icon: Sparkles,
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    description: 'Simulate price changes, supply chain disruption scenarios, and AI demand forecasting across consumer segments.',
    keywords: ['predictive ai', 'what if', 'simulation', 'forecast', 'demand model', 'ai']
  },
  {
    id: 'ai_assistant_copilot',
    name: 'Nexa AI ERP Copilot Drawer',
    module: 'AI & Intelligence',
    category: 'ai',
    action: 'toggle_ai',
    icon: Sparkles,
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    description: 'Open the conversational AI assistant to ask business questions, generate executive summaries, and analyze operations.',
    keywords: ['ai copilot', 'assistant', 'chat', 'ask ai', 'intelligence']
  },
  {
    id: 'digital_signature',
    name: 'Digital E-Signature Capture Pad',
    module: 'Tools & Utilities',
    category: 'tools',
    action: 'open_signature',
    icon: PenTool,
    color: '#0284c7',
    bgColor: '#f0f9ff',
    borderColor: '#bae6fd',
    description: 'Interactive HTML5 canvas digital signature pad for tender authorizations, receipts, and officer approvals.',
    keywords: ['signature', 'sign', 'pad', 'digital seal', 'approval']
  },
  {
    id: 'executive_reports',
    name: 'Executive Analytics & BI Reports',
    module: 'Analytics',
    category: 'reports',
    tab: 'reports',
    icon: BarChart3,
    color: '#0064d2',
    bgColor: '#e8f3ff',
    borderColor: '#bfdbfe',
    description: 'Generate high-level sales revenue analytics, inventory valuation summaries, and export data pipelines to CSV.',
    keywords: ['reports', 'analytics', 'charts', 'export csv', 'bi', 'sales report']
  }
];

export const CATEGORIES = [
  { id: 'all', label: 'All Modules & Functions' },
  { id: 'sales', label: 'Sales & POS' },
  { id: 'inventory', label: 'Inventory & Stock' },
  { id: 'manufacturing', label: 'Manufacturing & MRP' },
  { id: 'finance', label: 'Finance & Ledger' },
  { id: 'hr', label: 'People & HR' },
  { id: 'grc', label: 'GRC & Risk' },
  { id: 'security', label: 'Security & Admin' },
  { id: 'ai', label: 'AI & Tools' }
];

export default function ModuleSearchModal({
  isOpen,
  onClose,
  onNavigate,
  onToggleAI,
  onOpenScanner,
  onOpenSignature,
  initialQuery = '',
  initialCategory = 'all'
}) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery(initialQuery);
      setSelectedCategory(initialCategory);
      setSelectedIndex(0);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, [isOpen, initialQuery, initialCategory]);

  const filteredFunctions = SYSTEM_FUNCTIONS.filter(func => {
    // Filter by Category
    if (selectedCategory !== 'all' && func.category !== selectedCategory) {
      // Also include tools/reports in AI or appropriate tabs if applicable
      if (selectedCategory === 'ai' && (func.category === 'tools' || func.category === 'reports')) {
        // match
      } else {
        return false;
      }
    }

    // Filter by Search Query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = func.name.toLowerCase().includes(q);
    const descMatch = func.description.toLowerCase().includes(q);
    const moduleMatch = func.module.toLowerCase().includes(q);
    const keywordMatch = func.keywords.some(k => k.toLowerCase().includes(q));
    return nameMatch || descMatch || moduleMatch || keywordMatch;
  });

  const handleExecute = (func) => {
    onClose();
    if (func.action === 'toggle_ai') {
      if (onToggleAI) onToggleAI();
    } else if (func.action === 'open_scanner') {
      if (onOpenScanner) onOpenScanner();
    } else if (func.action === 'open_signature') {
      if (onOpenSignature) onOpenSignature();
    } else if (func.tab) {
      if (onNavigate) onNavigate(func.tab);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredFunctions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredFunctions.length) % Math.max(1, filteredFunctions.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredFunctions[selectedIndex]) {
        handleExecute(filteredFunctions[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '60px',
        zIndex: 1050,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div
        className="modal-content animate-fade-in"
        style={{
          width: '90%',
          maxWidth: '820px',
          maxHeight: '82vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-surface, #ffffff)',
          borderRadius: '16px',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header Search Bar with Integrated Search Button */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'var(--bg-card, #ffffff)'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: '#e8f3ff',
            color: '#0064d2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Search size={20} />
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search ERP modules, functions, features, or workflows (e.g. 'stock', 'pos', 'mrp', 'backup')..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-main, #0f172a)'
              }}
            />
          </div>

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="btn btn-ghost"
              style={{ padding: '4px', borderRadius: '50%', color: 'var(--text-muted)' }}
              title="Clear Search"
            >
              <X size={16} />
            </button>
          )}

          <button
            onClick={() => {
              if (filteredFunctions.length > 0) {
                handleExecute(filteredFunctions[selectedIndex] || filteredFunctions[0]);
              }
            }}
            className="btn btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '8px'
            }}
          >
            <Search size={14} />
            <span>Search</span>
          </button>

          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '6px', color: 'var(--text-muted)' }}
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Pills Ribbon */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 22px',
          backgroundColor: 'var(--bg-subtle, #f8fafc)',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          overflowX: 'auto',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary, #64748b)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', marginRight: '4px' }}>
            <Filter size={13} />
            <span>Filter By:</span>
          </span>

          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedIndex(0);
                }}
                style={{
                  border: isSelected ? '1px solid #0064d2' : '1px solid var(--border-color, #e2e8f0)',
                  backgroundColor: isSelected ? '#0064d2' : 'var(--bg-surface, #ffffff)',
                  color: isSelected ? '#ffffff' : 'var(--text-main, #334155)',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  padding: '5px 12px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #64748b)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Available Functions & Sub-Modules ({filteredFunctions.length})
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
              Use <kbd style={{ padding: '2px 5px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '10px' }}>↑</kbd> <kbd style={{ padding: '2px 5px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '10px' }}>↓</kbd> to navigate, <kbd style={{ padding: '2px 5px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '10px' }}>Enter</kbd> to launch
            </span>
          </div>

          {filteredFunctions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Search size={40} strokeWidth={1.5} style={{ margin: '0 auto 12px auto', display: 'block', opacity: 0.5 }} />
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>No matching modules or functions found</div>
              <div style={{ fontSize: '12.5px', marginTop: '4px' }}>Try searching with keywords like 'stock', 'invoice', 'leave', 'pos', or reset the category filter.</div>
            </div>
          ) : (
            filteredFunctions.map((func, idx) => {
              const Icon = func.icon;
              const isSelected = selectedIndex === idx;

              return (
                <div
                  key={func.id}
                  onClick={() => handleExecute(func)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: isSelected ? '1px solid #0064d2' : '1px solid var(--border-color, #e2e8f0)',
                    backgroundColor: isSelected ? 'rgba(0, 100, 210, 0.04)' : 'var(--bg-surface, #ffffff)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 4px 12px rgba(0, 100, 210, 0.08)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                    {/* Visual Icon Badge */}
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      backgroundColor: func.bgColor,
                      color: func.color,
                      border: `1px solid ${func.borderColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                    }}>
                      <Icon size={20} strokeWidth={2.2} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                          {func.name}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: func.bgColor,
                          color: func.color,
                          border: `1px solid ${func.borderColor}`
                        }}>
                          {func.module}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary, #64748b)',
                        lineHeight: 1.4,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {func.description}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExecute(func);
                      }}
                      className="btn"
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: isSelected ? '#0064d2' : 'var(--bg-subtle, #f1f5f9)',
                        color: isSelected ? '#ffffff' : 'var(--text-main, #334155)',
                        border: 'none',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span>Open</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 22px',
          borderTop: '1px solid var(--border-color, #e2e8f0)',
          backgroundColor: 'var(--bg-subtle, #f8fafc)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: 'var(--text-secondary, #64748b)'
        }}>
          <div>
            NexaERP Enterprise Module & Function Navigator • Instant Execution
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Shortcut:</span>
            <kbd style={{ padding: '2px 6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Ctrl + K</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
