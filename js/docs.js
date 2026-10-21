/**
 * NexaERP — Documentation Portal
 * Searchable help documentation with category filtering and article browsing
 * Integrates with: GET /api/help/articles, GET /api/help/categories, GET /api/help/articles/:slug
 *
 * Requirements: 28.2
 */

// ─── State ────────────────────────────────────────────────
const DocsState = {
  articles: [],
  categories: [],
  currentArticle: null,
  currentCategory: 'all',
  searchQuery: '',
  currentPage: 1,
  pageSize: 12,
  totalArticles: 0,
  totalPages: 0,
  loading: false,
  searchDebounceTimer: null,
};

// ─── Demo Data (fallback when no backend) ─────────────────
const DemoArticles = [
  {
    id: '1',
    slug: 'getting-started-with-nexaerp',
    title: 'Getting Started with NexaERP',
    summary: 'A complete guide to setting up and navigating NexaERP for the first time. Learn about modules, navigation, and key features.',
    content: `# Getting Started with NexaERP\n\nWelcome to NexaERP! This guide will help you get up and running quickly.\n\n## First Steps\n\n1. **Login** – Use your credentials at the login page\n2. **Dashboard** – Your central hub showing real-time KPIs\n3. **Navigation** – Use the sidebar to switch between modules\n\n## Key Modules\n\n- **Dashboard** – Overview of business metrics\n- **POS / Billing** – Process sales and generate invoices\n- **Inventory** – Manage products and stock levels\n- **Orders** – Track purchases and sales orders\n- **Accounting** – Income, expenses, and reports\n- **CRM** – Customer management\n- **Staff & Payroll** – Employee records and payroll\n\n## Quick Tips\n\n- Use the search bar in the top navigation to find anything quickly\n- The AI Assistant (bottom-right) can answer business questions\n- All data syncs in real time via WebSocket connections`,
    category: 'Getting Started',
    tags: ['setup', 'navigation', 'basics'],
    viewCount: 1204,
    helpfulCount: 87,
    notHelpfulCount: 3,
    isPublished: true,
    contextKey: 'global.home',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-03-01T08:30:00Z',
  },
  {
    id: '2',
    slug: 'pos-billing-guide',
    title: 'POS & Billing — Complete Guide',
    summary: 'Learn how to process sales, apply discounts, generate GST invoices, and manage payment methods in the Point of Sale module.',
    content: `# POS & Billing Guide\n\n## Opening a Sale\n\n1. Navigate to **POS / Billing** from the sidebar\n2. Add products by scanning barcode or searching by name\n3. Adjust quantities as needed\n\n## Applying Discounts\n\n- **Item discount** – Click on a line item and enter the discount %\n- **Order discount** – Use the Discount button below the cart\n\n## Payment Methods\n\n- Cash\n- Card (credit/debit)\n- UPI\n- Split payment\n\n## GST Invoices\n\nAll invoices automatically include GST breakdown. Click **Print Invoice** to generate a PDF with GSTIN, HSN codes, and tax components (CGST, SGST, IGST).\n\n## Returns & Refunds\n\nGo to **Orders**, find the original sale, and click **Create Return** to process a refund.`,
    category: 'POS & Billing',
    tags: ['pos', 'billing', 'gst', 'invoices', 'payments'],
    viewCount: 956,
    helpfulCount: 74,
    notHelpfulCount: 5,
    isPublished: true,
    contextKey: 'pos.billing',
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-03-05T09:00:00Z',
  },
  {
    id: '3',
    slug: 'inventory-management',
    title: 'Inventory Management',
    summary: 'How to add products, track stock levels, set reorder points, manage barcode scanning, and handle stock adjustments.',
    content: `# Inventory Management\n\n## Adding Products\n\n1. Go to **Inventory** → **Products**\n2. Click **Add Product**\n3. Fill in: name, SKU, category, price, tax rate\n4. Set minimum stock level for automatic alerts\n\n## Stock Management\n\n- **Receive Stock** – Record incoming stock from suppliers\n- **Stock Adjustment** – Correct variances found during counting\n- **Transfer** – Move stock between warehouses\n\n## Barcode Scanning\n\nNexaERP supports barcode scanning via camera or USB scanners. In POS or Inventory, press the scan button and point at the barcode.\n\n## Low Stock Alerts\n\nWhen stock falls below the minimum level, the system generates automatic alerts visible in the Dashboard and notification bell.`,
    category: 'Inventory',
    tags: ['inventory', 'stock', 'barcode', 'products', 'warehouse'],
    viewCount: 834,
    helpfulCount: 61,
    notHelpfulCount: 4,
    isPublished: true,
    contextKey: 'inventory.products',
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-03-10T11:00:00Z',
  },
  {
    id: '4',
    slug: 'accounting-module',
    title: 'Accounting & Finance',
    summary: 'Managing your income and expenses ledger, generating P&L reports, GST filings, and understanding financial dashboards.',
    content: `# Accounting & Finance\n\n## Chart of Accounts\n\nNexaERP ships with a standard chart of accounts pre-configured for Indian businesses.\n\n## Recording Transactions\n\n1. Navigate to **Accounting**\n2. Use **Income** to record revenue entries\n3. Use **Expenses** to record costs\n4. View the **Ledger** for a chronological transaction list\n\n## Reports\n\n- **P&L Statement** – Monthly/annual profitability\n- **Balance Sheet** – Assets, liabilities, equity snapshot\n- **Cash Flow** – Track money movement\n- **GST Report** – GSTR-1, GSTR-3B ready exports\n\n## Export\n\nAll reports can be exported to PDF or Excel from the report toolbar.`,
    category: 'Accounting',
    tags: ['accounting', 'finance', 'gst', 'reports', 'p&l'],
    viewCount: 712,
    helpfulCount: 55,
    notHelpfulCount: 6,
    isPublished: true,
    contextKey: 'accounting.ledger',
    createdAt: '2024-02-10T10:00:00Z',
    updatedAt: '2024-03-12T14:00:00Z',
  },
  {
    id: '5',
    slug: 'crm-customer-management',
    title: 'CRM & Customer Management',
    summary: 'Build customer profiles, track purchase history, manage loyalty points, and communicate effectively with your customer base.',
    content: `# CRM & Customer Management\n\n## Customer Profiles\n\nEach customer record stores:\n- Contact information\n- Purchase history\n- Outstanding balance\n- Loyalty points\n\n## Loyalty Points\n\nNexaERP includes a built-in loyalty programme. Points are earned on every purchase and can be redeemed at POS.\n\nConfigure earning rate and redemption rules in **Settings → Loyalty**.\n\n## Lead Tracking\n\nFor B2B businesses, use the **CRM** module to manage leads and opportunities through a Kanban pipeline.\n\n## Bulk Communication\n\nUse **CRM → Campaigns** to send bulk SMS or email to customer segments.`,
    category: 'CRM',
    tags: ['crm', 'customers', 'loyalty', 'leads'],
    viewCount: 589,
    helpfulCount: 43,
    notHelpfulCount: 2,
    isPublished: true,
    contextKey: 'crm.customers',
    createdAt: '2024-02-15T10:00:00Z',
    updatedAt: '2024-03-15T10:00:00Z',
  },
  {
    id: '6',
    slug: 'staff-payroll',
    title: 'Staff & Payroll Management',
    summary: 'Add employees, assign roles, configure attendance, process monthly payroll, and generate payslips.',
    content: `# Staff & Payroll Management\n\n## Adding Employees\n\n1. Go to **Staff & Payroll** → **Employees**\n2. Click **Add Employee**\n3. Enter personal details, role, salary, and joining date\n\n## Roles & Permissions\n\nNexaERP supports these built-in roles:\n- **Owner** – Full access\n- **Manager** – All modules except system settings\n- **Cashier** – POS only\n- **Staff** – Limited read access\n\nCustom roles can be created in **Settings → RBAC**.\n\n## Attendance\n\nRecord daily attendance manually or integrate with biometric devices.\n\n## Payroll Processing\n\n1. Go to **Payroll** → **Run Payroll**\n2. Select the period\n3. Review and confirm salary components\n4. Generate payslips in PDF`,
    category: 'Staff & HR',
    tags: ['staff', 'hr', 'payroll', 'attendance', 'roles'],
    viewCount: 445,
    helpfulCount: 38,
    notHelpfulCount: 3,
    isPublished: true,
    contextKey: 'staff.employees',
    createdAt: '2024-02-20T10:00:00Z',
    updatedAt: '2024-03-18T12:00:00Z',
  },
  {
    id: '7',
    slug: 'analytics-reports',
    title: 'Analytics & Reports',
    summary: 'Understanding the analytics dashboard, generating business reports, revenue trends, and exporting data.',
    content: `# Analytics & Reports\n\n## Dashboard KPIs\n\nThe main dashboard shows:\n- Today's revenue and order count\n- Week-over-week growth\n- Low stock alerts\n- Top-selling products\n\n## Report Types\n\n| Report | Description |\n|--------|-------------|\n| Sales Report | Daily/weekly/monthly revenue breakdown |\n| Inventory Report | Stock levels, movement, valuation |\n| GST Report | Tax collected, GSTR-1 summary |\n| P&L Statement | Revenue vs expenses |\n| Customer Report | Top customers, retention |\n\n## Exporting\n\nAll reports support export to:\n- PDF (formatted for print)\n- Excel/CSV (for further analysis)`,
    category: 'Analytics',
    tags: ['analytics', 'reports', 'dashboard', 'export', 'gst'],
    viewCount: 632,
    helpfulCount: 51,
    notHelpfulCount: 4,
    isPublished: true,
    contextKey: 'analytics.dashboard',
    createdAt: '2024-02-25T10:00:00Z',
    updatedAt: '2024-03-20T09:00:00Z',
  },
  {
    id: '8',
    slug: 'settings-configuration',
    title: 'Settings & Configuration',
    summary: 'Configure store details, tax rates, user permissions, integrations, notifications, and system preferences.',
    content: `# Settings & Configuration\n\n## Store Settings\n\nSet your:\n- Business name, logo, and address\n- GSTIN and tax registration details\n- Currency and date format\n- Business type (grocery, pharmacy, restaurant, etc.)\n\n## Tax Configuration\n\nDefine GST slabs (0%, 5%, 12%, 18%, 28%) and assign them to product categories.\n\n## User & Role Management\n\n- Create staff accounts with specific roles\n- Set module-level permissions\n- Enable MFA for sensitive accounts\n\n## Notifications\n\nConfigure:\n- Low stock threshold alerts\n- Daily/weekly sales digest emails\n- New order notifications\n\n## Integrations\n\n- Payment gateways (Razorpay, Paytm)\n- SMS providers (Twilio, MSG91)\n- Accounting exports (Tally, Zoho Books)`,
    category: 'Settings',
    tags: ['settings', 'configuration', 'tax', 'users', 'permissions'],
    viewCount: 398,
    helpfulCount: 29,
    notHelpfulCount: 5,
    isPublished: true,
    contextKey: 'settings.general',
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-22T10:00:00Z',
  },
  {
    id: '9',
    slug: 'ai-assistant',
    title: 'AI Assistant Guide',
    summary: 'Using the NexaERP AI Assistant for natural language business queries, insights, and automated recommendations.',
    content: `# AI Assistant Guide\n\n## Accessing the AI Assistant\n\nClick the **AI** button in the bottom-right corner of any page to open the AI Assistant panel.\n\n## What You Can Ask\n\nThe AI Assistant can answer questions like:\n- "What were my top 5 products this week?"\n- "Which customers haven't purchased in 30 days?"\n- "Generate a summary of last month's expenses"\n- "What items need to be reordered?"\n\n## Automatic Insights\n\nThe AI proactively surfaces:\n- Revenue anomalies and trends\n- Stock level recommendations\n- Customer churn risk signals\n\n## Limitations\n\nThe AI works with your business data only and does not access external systems. For complex financial analysis, use the Reports module.`,
    category: 'AI & Automation',
    tags: ['ai', 'assistant', 'automation', 'insights'],
    viewCount: 721,
    helpfulCount: 65,
    notHelpfulCount: 8,
    isPublished: true,
    contextKey: 'global.ai-assistant',
    createdAt: '2024-03-05T10:00:00Z',
    updatedAt: '2024-03-25T11:00:00Z',
  },
  {
    id: '10',
    slug: 'mobile-app-pwa',
    title: 'Mobile App & PWA',
    summary: 'Install NexaERP as a Progressive Web App on mobile devices for offline access and native-like experience.',
    content: `# Mobile App & PWA\n\n## Installing on Android\n\n1. Open NexaERP in **Chrome**\n2. Tap the menu (⋮) → **Add to Home Screen**\n3. Tap **Install**\n\n## Installing on iOS\n\n1. Open NexaERP in **Safari**\n2. Tap the Share button (□↑)\n3. Select **Add to Home Screen**\n\n## Offline Mode\n\nNexaERP supports limited offline use via its service worker:\n- View recent data (read-only)\n- Queue POS transactions to sync when back online\n\n## Push Notifications\n\nAllow notifications after install to receive:\n- Low stock alerts\n- New order notifications\n- Daily sales digest`,
    category: 'Getting Started',
    tags: ['mobile', 'pwa', 'offline', 'app', 'install'],
    viewCount: 503,
    helpfulCount: 47,
    notHelpfulCount: 6,
    isPublished: true,
    contextKey: 'global.mobile',
    createdAt: '2024-03-08T10:00:00Z',
    updatedAt: '2024-03-26T13:00:00Z',
  },
  {
    id: '11',
    slug: 'purchase-orders',
    title: 'Purchase Orders & Suppliers',
    summary: 'Create purchase orders, manage supplier relationships, receive goods, and handle supplier invoices.',
    content: `# Purchase Orders & Suppliers\n\n## Adding Suppliers\n\n1. Go to **Orders** → **Suppliers**\n2. Click **Add Supplier**\n3. Enter name, contact, payment terms, and GSTIN\n\n## Creating a Purchase Order\n\n1. Go to **Orders** → **Purchase Orders**\n2. Click **New PO**\n3. Select supplier and add line items\n4. Submit for approval if configured\n\n## Receiving Goods\n\nWhen stock arrives:\n1. Open the PO\n2. Click **Receive Goods**\n3. Enter quantities received\n4. Inventory is automatically updated\n\n## Supplier Invoices\n\nAfter receiving, match the supplier invoice to the PO to complete the AP cycle.`,
    category: 'Orders',
    tags: ['orders', 'purchase', 'suppliers', 'procurement'],
    viewCount: 367,
    helpfulCount: 31,
    notHelpfulCount: 2,
    isPublished: true,
    contextKey: 'orders.purchase',
    createdAt: '2024-03-10T10:00:00Z',
    updatedAt: '2024-03-27T14:00:00Z',
  },
  {
    id: '12',
    slug: 'data-import-export',
    title: 'Data Import & Export',
    summary: 'Bulk import products, customers, and transactions via CSV/Excel. Export your data for backup or migration.',
    content: `# Data Import & Export\n\n## Importing Data\n\n### Products\n\n1. Go to **Inventory** → **Products**\n2. Click **Import** → **Download Template**\n3. Fill in the template with your product data\n4. Upload the completed file\n\n### Customers\n\n1. Go to **CRM** → **Customers**\n2. Click **Import** → **Download Template**\n\n### Supported Formats\n\n- CSV (UTF-8 encoded)\n- Excel (.xlsx)\n\n## Exporting Data\n\nMost tables have an **Export** button. You can export to:\n- CSV for spreadsheet analysis\n- PDF for formatted reports\n\n## Backup\n\nContact support to request a full database export for backup purposes.`,
    category: 'Settings',
    tags: ['import', 'export', 'csv', 'excel', 'backup', 'data'],
    viewCount: 289,
    helpfulCount: 24,
    notHelpfulCount: 7,
    isPublished: true,
    contextKey: 'settings.import',
    createdAt: '2024-03-12T10:00:00Z',
    updatedAt: '2024-03-28T10:00:00Z',
  },
];

const DemoCategories = [
  'Getting Started',
  'POS & Billing',
  'Inventory',
  'Accounting',
  'CRM',
  'Staff & HR',
  'Analytics',
  'Settings',
  'AI & Automation',
  'Orders',
];

// ─── API ──────────────────────────────────────────────────
const DocsAPI = {
  BASE: window.NEXAERP_API || 'https://nexaerp-api.onrender.com/api',

  async get(path) {
    try {
      const res = await fetch(`${this.BASE}${path}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null; // Triggers demo fallback
    }
  },

  async listArticles(params = {}) {
    const qs = new URLSearchParams();
    if (params.search)   qs.set('search', params.search);
    if (params.category) qs.set('category', params.category);
    if (params.page)     qs.set('page', params.page);
    if (params.pageSize) qs.set('pageSize', params.pageSize);

    const res = await this.get(`/help/articles?${qs}`);
    if (res?.success) return res.data;

    // Demo fallback
    return DocsAPI._demoListArticles(params);
  },

  async getCategories() {
    const res = await this.get('/help/categories');
    if (res?.success) return res.data;
    return DemoCategories;
  },

  async getArticleBySlug(slug) {
    const res = await this.get(`/help/articles/${slug}`);
    if (res?.success) return res.data;

    // Demo fallback
    const article = DemoArticles.find(a => a.slug === slug);
    if (article) {
      article.viewCount = (article.viewCount || 0) + 1;
      return article;
    }
    return null;
  },

  async submitFeedback(articleId, helpful) {
    try {
      const res = await fetch(`${this.BASE}/help/articles/${articleId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful }),
        signal: AbortSignal.timeout(5000),
      });
      const json = await res.json();
      return json?.success ? json.data : null;
    } catch {
      return null;
    }
  },

  _demoListArticles({ search, category, page = 1, pageSize = 12 } = {}) {
    let articles = [...DemoArticles];

    if (category && category !== 'all') {
      articles = articles.filter(a => a.category === category);
    }

    if (search) {
      const q = search.toLowerCase();
      articles = articles.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    const total = articles.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const items = articles.slice(start, start + pageSize);

    return { articles: items, total, page, pageSize, totalPages };
  }
};

// ─── Rendering Helpers ─────────────────────────────────────

function categoryIcon(category) {
  const icons = {
    'Getting Started': '🚀',
    'POS & Billing':   '🧾',
    'Inventory':       '📦',
    'Accounting':      '💰',
    'CRM':             '👥',
    'Staff & HR':      '👤',
    'Analytics':       '📊',
    'Settings':        '⚙️',
    'AI & Automation': '🤖',
    'Orders':          '🛒',
  };
  return icons[category] || '📄';
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarkdown(md) {
  if (!md) return '';
  let html = escapeHtml(md);

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold & italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');

  // Tables
  html = html.replace(/\|(.+)\|/g, (match) => {
    const cells = match.split('|').filter(c => c.trim() !== '');
    const isHeader = false;
    return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
  });
  html = html.replace(/(<tr>.*<\/tr>\n?)+/g, (match) => {
    const rows = match.trim().split('\n').filter(r => r.includes('<tr>'));
    // Detect if there's a separator row
    const cleanRows = rows.filter(r => !r.includes('---'));
    if (cleanRows.length === 0) return match;
    const [headerRow, ...bodyRows] = cleanRows;
    const header = headerRow.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>');
    const body = bodyRows.map(r => r).join('\n');
    return `<table><thead>${header}</thead><tbody>${body}</tbody></table>`;
  });

  // Unordered lists
  html = html.replace(/(^- .+$\n?)+/gm, (match) => {
    const items = match.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`).join('');
    return `<ul>${items}</ul>`;
  });

  // Ordered lists
  html = html.replace(/(^\d+\. .+$\n?)+/gm, (match) => {
    const items = match.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('');
    return `<ol>${items}</ol>`;
  });

  // Paragraphs — double newline
  html = html.replace(/\n\n+/g, '</p><p>');
  html = '<p>' + html + '</p>';

  // Clean up empty paragraphs and block elements wrapped in p
  html = html
    .replace(/<p>(<h[1-6]>)/g, '$1')
    .replace(/(<\/h[1-6]>)<\/p>/g, '$1')
    .replace(/<p>(<ul>)/g, '$1')
    .replace(/(<\/ul>)<\/p>/g, '$1')
    .replace(/<p>(<ol>)/g, '$1')
    .replace(/(<\/ol>)<\/p>/g, '$1')
    .replace(/<p>(<table>)/g, '$1')
    .replace(/(<\/table>)<\/p>/g, '$1')
    .replace(/<p>\s*<\/p>/g, '');

  return html;
}

function renderArticleCard(article) {
  const icon = categoryIcon(article.category);
  const tags = (article.tags || []).slice(0, 3).map(t =>
    `<span class="docs-tag">${escapeHtml(t)}</span>`
  ).join('');

  return `
    <article class="docs-card" data-slug="${escapeHtml(article.slug)}" onclick="DocsPortal.openArticle('${escapeHtml(article.slug)}')">
      <div class="docs-card-header">
        <span class="docs-card-icon">${icon}</span>
        <span class="docs-card-category">${escapeHtml(article.category)}</span>
      </div>
      <h3 class="docs-card-title">${escapeHtml(article.title)}</h3>
      <p class="docs-card-summary">${escapeHtml(article.summary || '')}</p>
      <div class="docs-card-footer">
        <div class="docs-card-tags">${tags}</div>
        <div class="docs-card-meta">
          <span title="Views">👁 ${article.viewCount || 0}</span>
          <span title="Helpful">👍 ${article.helpfulCount || 0}</span>
        </div>
      </div>
    </article>
  `;
}

function renderSkeletonCards(count = 6) {
  return Array.from({ length: count }, () => `
    <div class="docs-card docs-card-skeleton">
      <div class="skeleton-line skeleton-icon"></div>
      <div class="skeleton-line skeleton-title"></div>
      <div class="skeleton-line skeleton-text"></div>
      <div class="skeleton-line skeleton-text short"></div>
    </div>
  `).join('');
}

function highlightSearchTerms(text, query) {
  if (!query || !text) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const safeQ = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(`(${safeQ})`, 'gi'), '<mark>$1</mark>');
}

// ─── Main Portal Controller ────────────────────────────────
const DocsPortal = {

  async init() {
    this._setupSearch();
    this._setupHashNavigation();
    await this._loadCategories();
    await this._loadArticles();

    // Handle direct deep link (e.g. docs.html#slug)
    const hash = window.location.hash.slice(1);
    if (hash) {
      await this.openArticle(decodeURIComponent(hash));
    }
  },

  // ── Search ──────────────────────────────────────────────
  _setupSearch() {
    const input = document.getElementById('docs-search-input');
    if (!input) return;

    input.addEventListener('input', () => {
      clearTimeout(DocsState.searchDebounceTimer);
      DocsState.searchDebounceTimer = setTimeout(() => {
        DocsState.searchQuery = input.value.trim();
        DocsState.currentPage = 1;
        this._loadArticles();
      }, 300);
    });

    // Clear button
    const clearBtn = document.getElementById('docs-search-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        DocsState.searchQuery = '';
        DocsState.currentPage = 1;
        this._loadArticles();
        input.focus();
      });
    }
  },

  // ── Hash navigation for deep linking ──────────────────
  _setupHashNavigation() {
    window.addEventListener('popstate', () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        this.openArticle(decodeURIComponent(hash));
      } else {
        this.closeArticle();
      }
    });
  },

  // ── Load categories ─────────────────────────────────────
  async _loadCategories() {
    const categories = await DocsAPI.getCategories();
    DocsState.categories = categories || [];
    this._renderCategories();
  },

  _renderCategories() {
    const container = document.getElementById('docs-categories');
    if (!container) return;

    const items = [
      `<button class="docs-cat-btn ${DocsState.currentCategory === 'all' ? 'active' : ''}" data-category="all" onclick="DocsPortal.setCategory('all')">
        <span>📚</span> All Articles
      </button>`,
      ...DocsState.categories.map(cat => `
        <button class="docs-cat-btn ${DocsState.currentCategory === cat ? 'active' : ''}" data-category="${escapeHtml(cat)}" onclick="DocsPortal.setCategory('${escapeHtml(cat).replace(/'/g, "\\'")}')">
          <span>${categoryIcon(cat)}</span> ${escapeHtml(cat)}
        </button>
      `)
    ];

    container.innerHTML = items.join('');
  },

  setCategory(category) {
    DocsState.currentCategory = category;
    DocsState.currentPage = 1;
    this._renderCategories(); // Update active state
    this._loadArticles();
  },

  // ── Load articles ────────────────────────────────────────
  async _loadArticles() {
    if (DocsState.loading) return;
    DocsState.loading = true;

    const grid = document.getElementById('docs-grid');
    if (grid) grid.innerHTML = renderSkeletonCards(6);

    const params = {
      page: DocsState.currentPage,
      pageSize: DocsState.pageSize,
    };

    if (DocsState.searchQuery) params.search = DocsState.searchQuery;
    if (DocsState.currentCategory && DocsState.currentCategory !== 'all') {
      params.category = DocsState.currentCategory;
    }

    const result = await DocsAPI.listArticles(params);
    DocsState.loading = false;

    if (!result) {
      if (grid) {
        grid.innerHTML = `
          <div class="docs-empty">
            <div class="docs-empty-icon">😕</div>
            <p>Failed to load articles. Please try again.</p>
            <button class="btn-docs-retry" onclick="DocsPortal._loadArticles()">Retry</button>
          </div>
        `;
      }
      return;
    }

    DocsState.articles = result.articles || result;
    DocsState.totalArticles = result.total || DocsState.articles.length;
    DocsState.totalPages = result.totalPages || 1;

    this._renderGrid();
    this._renderPagination();
    this._updateResultCount();
  },

  _renderGrid() {
    const grid = document.getElementById('docs-grid');
    if (!grid) return;

    if (!DocsState.articles.length) {
      const msg = DocsState.searchQuery
        ? `No articles found for "<strong>${escapeHtml(DocsState.searchQuery)}</strong>"`
        : 'No articles in this category yet.';

      grid.innerHTML = `
        <div class="docs-empty">
          <div class="docs-empty-icon">🔍</div>
          <p>${msg}</p>
          ${DocsState.searchQuery ? `<button class="btn-docs-retry" onclick="DocsPortal.clearSearch()">Clear search</button>` : ''}
        </div>
      `;
      return;
    }

    grid.innerHTML = DocsState.articles.map(a => renderArticleCard(a)).join('');
  },

  _renderPagination() {
    const pag = document.getElementById('docs-pagination');
    if (!pag) return;

    if (DocsState.totalPages <= 1) {
      pag.innerHTML = '';
      return;
    }

    const { currentPage: p, totalPages: tp } = DocsState;
    const pages = [];

    // Prev
    pages.push(`<button class="docs-page-btn" ${p <= 1 ? 'disabled' : ''} onclick="DocsPortal.goToPage(${p - 1})">‹ Prev</button>`);

    // Page numbers
    for (let i = 1; i <= tp; i++) {
      if (i === 1 || i === tp || (i >= p - 1 && i <= p + 1)) {
        pages.push(`<button class="docs-page-btn ${i === p ? 'active' : ''}" onclick="DocsPortal.goToPage(${i})">${i}</button>`);
      } else if (i === p - 2 || i === p + 2) {
        pages.push(`<span class="docs-page-ellipsis">…</span>`);
      }
    }

    // Next
    pages.push(`<button class="docs-page-btn" ${p >= tp ? 'disabled' : ''} onclick="DocsPortal.goToPage(${p + 1})">Next ›</button>`);

    pag.innerHTML = pages.join('');
  },

  _updateResultCount() {
    const counter = document.getElementById('docs-result-count');
    if (!counter) return;

    const { totalArticles, searchQuery, currentCategory } = DocsState;
    let label = `${totalArticles} article${totalArticles !== 1 ? 's' : ''}`;

    if (searchQuery) label += ` for "<strong>${escapeHtml(searchQuery)}</strong>"`;
    if (currentCategory !== 'all') label += ` in <strong>${escapeHtml(currentCategory)}</strong>`;

    counter.innerHTML = label;
  },

  goToPage(page) {
    DocsState.currentPage = page;
    this._loadArticles();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  clearSearch() {
    const input = document.getElementById('docs-search-input');
    if (input) input.value = '';
    DocsState.searchQuery = '';
    DocsState.currentPage = 1;
    this._loadArticles();
  },

  // ── Article Viewer ───────────────────────────────────────
  async openArticle(slug) {
    const viewer = document.getElementById('docs-article-viewer');
    const body = document.getElementById('docs-article-body');
    if (!viewer || !body) return;

    // Show viewer with loading state
    viewer.classList.add('open');
    body.innerHTML = `
      <div class="docs-article-loading">
        <div class="docs-spinner"></div>
        <p>Loading article…</p>
      </div>
    `;
    document.body.style.overflow = 'hidden';

    // Update URL hash for deep linking
    history.pushState(null, '', `#${encodeURIComponent(slug)}`);

    const article = await DocsAPI.getArticleBySlug(slug);
    DocsState.currentArticle = article;

    if (!article) {
      body.innerHTML = `
        <div class="docs-article-error">
          <div class="docs-empty-icon">😕</div>
          <h3>Article not found</h3>
          <p>This article may have been moved or removed.</p>
          <button class="docs-btn-secondary" onclick="DocsPortal.closeArticle()">← Back to docs</button>
        </div>
      `;
      return;
    }

    this._renderArticle(article);
  },

  _renderArticle(article) {
    const body = document.getElementById('docs-article-body');
    if (!body) return;

    const tags = (article.tags || []).map(t =>
      `<span class="docs-tag">${escapeHtml(t)}</span>`
    ).join('');

    const related = (article.relatedArticles || []).slice(0, 4);
    const relatedHtml = related.length ? `
      <div class="docs-related">
        <h4>Related Articles</h4>
        <ul>
          ${related.map(r => `
            <li><a href="#" onclick="DocsPortal.openArticle('${escapeHtml(r.slug)}'); return false;">
              ${categoryIcon(r.category || '')} ${escapeHtml(r.title)}
            </a></li>
          `).join('')}
        </ul>
      </div>
    ` : '';

    const updatedDate = article.updatedAt
      ? new Date(article.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '';

    body.innerHTML = `
      <div class="docs-article-meta-bar">
        <span class="docs-card-category">
          ${categoryIcon(article.category)} ${escapeHtml(article.category)}
        </span>
        ${updatedDate ? `<span class="docs-article-date">Updated ${updatedDate}</span>` : ''}
        <span class="docs-article-views">👁 ${article.viewCount || 0} views</span>
      </div>

      <h1 class="docs-article-title">${escapeHtml(article.title)}</h1>

      ${article.summary ? `<p class="docs-article-summary">${escapeHtml(article.summary)}</p>` : ''}

      <div class="docs-article-tags">${tags}</div>

      <div class="docs-article-content">
        ${renderMarkdown(article.content)}
      </div>

      ${relatedHtml}

      <div class="docs-article-feedback">
        <p>Was this article helpful?</p>
        <div class="docs-feedback-buttons">
          <button class="docs-feedback-btn positive" onclick="DocsPortal.submitFeedback('${escapeHtml(article.id)}', true)">
            👍 Yes, helpful
          </button>
          <button class="docs-feedback-btn negative" onclick="DocsPortal.submitFeedback('${escapeHtml(article.id)}', false)">
            👎 Not helpful
          </button>
        </div>
        <div class="docs-feedback-result" id="feedback-result-${escapeHtml(article.id)}" style="display:none;"></div>
      </div>
    `;
  },

  closeArticle() {
    const viewer = document.getElementById('docs-article-viewer');
    if (viewer) viewer.classList.remove('open');
    document.body.style.overflow = '';
    DocsState.currentArticle = null;

    // Clear hash
    history.pushState(null, '', window.location.pathname);
  },

  async submitFeedback(articleId, helpful) {
    const resultEl = document.getElementById(`feedback-result-${articleId}`);
    const btns = document.querySelectorAll('.docs-feedback-btn');
    btns.forEach(b => b.disabled = true);

    await DocsAPI.submitFeedback(articleId, helpful);

    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = helpful
        ? '✅ Thank you! We\'re glad this was helpful.'
        : '🙏 Thank you for your feedback. We\'ll improve this article.';
    }
  },
};

// ─── Keyboard Navigation ───────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const viewer = document.getElementById('docs-article-viewer');
    if (viewer?.classList.contains('open')) {
      DocsPortal.closeArticle();
    }
  }

  // Cmd/Ctrl+K for search focus
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    const input = document.getElementById('docs-search-input');
    if (input) {
      input.focus();
      input.select();
    }
  }
});

// ─── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => DocsPortal.init());
