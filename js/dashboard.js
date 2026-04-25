/**
 * NexaERP Ã¢â‚¬â€ Dashboard Module
 * Renders the main dashboard with KPIs, charts, recent activity
 */

let currentModule = 'dashboard';
let sidebarCollapsed = false;

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Navigation Router Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function navigateTo(module) {
  currentModule = module;

  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.getElementById(`nav-${module}`);
  if (navEl) navEl.classList.add('active');

  // Update header
  const titles = {
    dashboard: { title: 'Dashboard', sub: 'Overview of your business' },
    analytics:  { title: 'Analytics', sub: 'Sales trends and insights' },
    pos:        { title: 'POS / Billing', sub: 'Point of sale terminal' },
    inventory:  { title: 'Inventory', sub: 'Manage products and stock' },
    orders:     { title: 'Orders', sub: 'Purchase and sales orders' },
    suppliers:  { title: 'Suppliers', sub: 'Manage supplier relationships' },
    accounting: { title: 'Accounting & Ledger', sub: 'SAP-style AR/AP Ã‚Â· Accounts Receivable & Payable' },
    payroll:    { title: 'Payroll', sub: 'Staff salaries and attendance' },
    reports:    { title: 'Reports', sub: 'Business intelligence reports' },
    customers:  { title: 'Customers', sub: 'Customer relationship management' },
    staff:      { title: 'Staff', sub: 'Employee management' },
    chat:       { title: 'Messenger', sub: 'Chat with employees, managers & vendors' },
    gst:        { title: 'GST Management', sub: 'GSTR-1 Ã‚Â· GSTR-3B Ã‚Â· Input Tax Credit' },
    costcenter: { title: 'Cost Centers & Budget', sub: 'SAP CO Ã¢â‚¬â€ Budget vs Actual by Department' },
    assets:     { title: 'Asset Management', sub: 'SAP FI-AA Ã¢â‚¬â€ Fixed Asset Register & Depreciation' },
    notifications: { title: 'Notifications', sub: 'Alerts and updates' },
    settings:   { title: 'Settings', sub: 'Business and system settings' },
    approvals:  { title: 'Approvals', sub: 'Release Strategy Ã‚Â· Document Release' },
    export:     { title: 'Export Center', sub: 'Data Exchange Ã‚Â· Unified Governance' },
  };

  const info = titles[module] || { title: module, sub: '' };
  document.getElementById('page-title').textContent = info.title;
  document.getElementById('page-breadcrumb').textContent = info.sub;

  // Render module
  const body = document.getElementById('page-body');
  body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px"><div class="spinner"></div></div>';

  setTimeout(() => {
    switch (module) {
      case 'dashboard':   renderDashboard(); break;
      case 'analytics':   renderAnalytics(); break;
      case 'pos':         renderPOS(); break;
      case 'inventory':   renderInventory(); break;
      case 'orders':      renderPurchaseOrders(); break;
      case 'suppliers':   renderSuppliers(); break;
      case 'accounting':  renderAccounting(); break;
      case 'payroll':     renderPayroll(); break;
      case 'reports':     renderReports(); break;
      case 'customers':   renderCustomers(); break;
      case 'staff':       renderStaff(); break;
      case 'personnel':   renderPersonnel(); break;
      case 'chat':        renderChat(); break;
      case 'gst':         renderGST(); break;
      case 'costcenter':  renderCostCenter(); break;
      case 'assets':      renderAssets(); break;
      case 'notifications': renderNotifications(); break;
      case 'settings':    renderSettings(); break;
      case 'approvals':   renderApprovals(); break;
      case 'export':      renderExport(); break;
      case 'procurement':     renderProcurement(); break;
      case 'audit-logs':      renderAuditLogs(); break;
      case 'stock-transfers': renderStockTransfers(); break;
      case 'demand-forecast': renderDemandForecast(); break;
      case 'barcode':         renderBarcode(); break;
      case 'automation':      renderAutomation(); break;
      default:            renderDashboard();
    }
  }, 150);
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Sidebar Toggle Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  const sidebar = document.getElementById('sidebar');
  const main = document.getElementById('main-content');

  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('mobile-open');
    document.getElementById('sidebar-backdrop').classList.toggle('visible');
  } else {
    sidebar.classList.toggle('collapsed', sidebarCollapsed);
    main.classList.toggle('sidebar-collapsed', sidebarCollapsed);
  }
}

function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebar-backdrop').classList.remove('visible');
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ User Info Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function loadUserInfo() {
  const user = Auth.getUser();
  if (!user) return;

  const avatarEl = document.getElementById('user-avatar');
  const nameEl   = document.getElementById('sidebar-user-name');
  const roleEl   = document.getElementById('sidebar-user-role');

  if (avatarEl) avatarEl.textContent = user.avatar || user.name?.substring(0,2).toUpperCase() || 'U';
  if (nameEl)   nameEl.textContent   = user.name || user.email;
  if (roleEl)   roleEl.textContent   = capitalizeFirst(user.role || 'staff');
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Logout Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function handleLogout(e) {
  e.stopPropagation();
  Auth.clearSession();
  Toast.info('Signed out successfully');
  setTimeout(() => { window.location.href = 'index.html'; }, 600);
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Notifications Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
let notifOpen = false;

function toggleNotifications() {
  notifOpen = !notifOpen;
  const panel = document.getElementById('notif-panel');
  panel.style.display = notifOpen ? 'block' : 'none';
  if (notifOpen) loadNotifPanel();
}

async function loadNotifPanel() {
  const list = document.getElementById('notif-list');
  if (!list) return;

  // Try real API first, fallback to demo data
  let notifications = [];
  try {
    const res = await Http.get('/notifications?limit=20');
    if (res?.success) {
      notifications = res.data;
      if (res.meta?.unreadCount !== undefined) {
        NotificationManager._count = res.meta.unreadCount;
        NotificationManager.updateBadge();
      }
    }
  } catch {}

  // Fallback to demo if empty
  if (!notifications.length) notifications = DemoData.notifications.map(n => ({
    _id: n.id, type: n.type || 'system', priority: n.type === 'warning' ? 'high' : 'medium',
    title: n.title, message: n.message, icon: n.icon, isRead: n.read, createdAt: n.time,
    actionLabel: n.type === 'warning' ? 'Order Stock' : null, relatedProduct: n.productId
  }));

  if (!notifications.length) {
    list.innerHTML = '<div style="text-align:center;padding:32px;color:var(--color-text-secondary);font-size:13px">Ã°Å¸Å½â€° No new notifications</div>';
    return;
  }

  const prioColors = { critical:'var(--color-danger-400)', high:'var(--color-warning-400)', medium:'var(--color-brand-400)', low:'var(--color-text-secondary)' };

  list.innerHTML = notifications.map(n => `
    <div class="notif-item ${n.isRead ? '' : 'unread'}" style="padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--color-border-subtle);cursor:pointer" onclick="markNotifRead('${n._id}')">
      <div style="display:flex;gap:var(--space-3);align-items:flex-start">
        <div style="width:36px;height:36px;border-radius:var(--radius-lg);background:rgba(99,102,241,0.12);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${n.icon || 'Ã°Å¸â€â€'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:var(--text-xs);font-weight:${n.isRead ? '500' : '700'};margin-bottom:2px;${n.priority === 'critical' ? 'color:var(--color-danger-400)' : ''};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n.title}</div>
          <div style="font-size:11px;color:var(--color-text-secondary);line-height:1.4;margin-bottom:4px">${n.message}</div>
          <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap">
            <span style="font-size:10px;color:var(--color-text-tertiary)">${Format.relativeTime(n.createdAt)}</span>
            ${n.priority === 'critical' ? '<span style="font-size:10px;font-weight:700;color:var(--color-danger-400);background:rgba(239,68,68,0.1);padding:1px 6px;border-radius:99px">CRITICAL</span>' : ''}
            ${!n.isRead ? '<span style="width:6px;height:6px;border-radius:50%;background:var(--color-brand-500);display:inline-block;flex-shrink:0"></span>' : ''}
          </div>
          ${n.actionLabel && !n.poCreated ? `<button class="btn btn-sm btn-primary" style="margin-top:var(--space-2);font-size:11px" onclick="event.stopPropagation();createPOFromNotif('${n._id}','${n.relatedProduct}')">Ã°Å¸â€œâ€¹ ${n.actionLabel}</button>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

async function markNotifRead(id) {
  try {
    await Http.patch(`/notifications/${id}/read`);
    NotificationManager._count = Math.max(0, NotificationManager._count - 1);
    NotificationManager.updateBadge();
  } catch {}
  // Update UI
  loadNotifPanel();
}

async function createPOFromNotif(notifId, productId) {
  try {
    const res = await Http.post(`/notifications/${notifId}/create-po`);
    if (res?.success) {
      Toast.success(`Ã¢Å“â€¦ ${res.message || 'Purchase Order created!'} `);
      await loadNotifPanel();
    }
  } catch(e) {
    Toast.error('Could not create PO: ' + e.message);
  }
}

// Close notifications when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('#notif-btn') && !e.target.closest('#notif-panel')) {
    notifOpen = false;
    const panel = document.getElementById('notif-panel');
    if (panel) panel.style.display = 'none';
  }
});

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ THEME PICKER Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const THEME_META = {
  dark:   { label: 'Dark',    emoji: 'Ã°Å¸Å’â€˜', preview: '#0a0a0f' },
  light:  { label: 'Light',   emoji: 'Ã¢Ëœâ‚¬Ã¯Â¸Â', preview: '#f8fafc' },
  ocean:  { label: 'Ocean',   emoji: 'Ã°Å¸Å’Å ', preview: '#040d14' },
  forest: { label: 'Forest',  emoji: 'Ã°Å¸Å’Â¿', preview: '#050e06' },
  sunset: { label: 'Sunset',  emoji: 'Ã°Å¸Å’â€¦', preview: '#140808' },
};

function openThemePicker() {
  const modal = document.getElementById('theme-picker-modal');
  const grid  = document.getElementById('theme-grid');
  if (!grid) return;

  grid.innerHTML = Object.entries(THEME_META).map(([key, meta]) => `
    <button onclick="applyTheme('${key}')" class="theme-btn" data-theme="${key}"
      style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:var(--space-4);border-radius:var(--radius-xl);border:2px solid ${ThemeManager.current===key?'var(--color-brand-500)':'var(--color-border-default)'};background:${meta.preview};cursor:pointer;transition:all 0.2s">
      <span style="font-size:28px">${meta.emoji}</span>
      <span style="font-size:var(--text-xs);font-weight:600;color:${key==='light'?'#0f172a':'#f8fafc'}">${meta.label}</span>
    </button>
  `).join('');

  modal.style.display = 'flex';
}

function applyTheme(name) {
  ThemeManager.apply(name);
  // Save to backend if logged in
  Http.patch('/auth/theme', { theme: name }).catch(() => {});
  // Update grid
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.style.borderColor = b.dataset.theme === name ? 'var(--color-brand-500)' : 'rgba(255,255,255,0.1)';
  });
  Toast.success(`Theme changed to ${THEME_META[name]?.label || name}!`);
}


// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ AI Assistant Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function openAIAssistant() {
  const modal = document.getElementById('ai-modal');
  modal.style.display = 'flex';

  // Initial AI message
  const chat = document.getElementById('ai-chat');
  if (chat.children.length === 0) {
    appendAIMessage('assistant', DemoData.aiResponses.default);

    // Suggestion chips
    const chips = ['Ã°Å¸â€œË† Sales insights', 'Ã°Å¸â€œÂ¦ Inventory status', 'Ã°Å¸â€Â® Demand forecast', 'Ã°Å¸â€™Â° Profit analysis'];
    const chipHtml = `
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">
        ${chips.map(c => `<button class="chip" style="cursor:pointer" onclick="handleAISuggestion('${c}')">${c}</button>`).join('')}
      </div>
    `;
    chat.insertAdjacentHTML('beforeend', chipHtml);
  }
}

function closeAIAssistant() {
  document.getElementById('ai-modal').style.display = 'none';
}

function handleAISuggestion(text) {
  document.getElementById('ai-input').value = text;
  sendAIMessage();
}

async function sendAIMessage() {
  const input = document.getElementById('ai-input');
  const msg = input.value.trim();
  if (!msg) return;

  appendAIMessage('user', msg);
  input.value = '';

  // Show typing indicator
  const chat = document.getElementById('ai-chat');
  const typing = document.createElement('div');
  typing.className = 'ai-typing';
  typing.innerHTML = '<div style="color:var(--color-text-secondary);font-size:var(--text-sm)">NexaAI is thinking...</div>';
  chat.appendChild(typing);
  chat.scrollTop = chat.scrollHeight;

  await new Promise(r => setTimeout(r, 1000));
  typing.remove();

  // Simple keyword matching for demo
  const lower = msg.toLowerCase();
  let response;
  if (lower.includes('sales') || lower.includes('revenue'))   response = DemoData.aiResponses.sales;
  else if (lower.includes('inventory') || lower.includes('stock')) response = DemoData.aiResponses.inventory;
  else if (lower.includes('forecast') || lower.includes('demand')) response = DemoData.aiResponses.forecast;
  else if (lower.includes('profit') || lower.includes('margin'))   response = DemoData.aiResponses.profit;
  else response = `Here's what I found regarding "${msg}": Based on your 7-day data, your business is trending positively with 18.7% monthly growth. Would you like me to dive deeper into any specific area? Ã°Å¸Å½Â¯`;

  appendAIMessage('assistant', response);
}

function appendAIMessage(role, text) {
  const chat = document.getElementById('ai-chat');
  const isUser = role === 'user';
  const div = document.createElement('div');
  div.style.cssText = `display:flex;gap:10px;align-items:flex-start;flex-direction:${isUser?'row-reverse':'row'}`;
  div.innerHTML = `
    <div style="width:32px;height:32px;border-radius:50%;background:${isUser?'var(--gradient-brand)':'rgba(99,102,241,0.2)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px">
      ${isUser ? (Auth.getUser()?.avatar || 'Ã°Å¸â€˜Â¤') : 'Ã¢Å“Â¨'}
    </div>
    <div style="max-width:75%;background:${isUser?'var(--gradient-brand)':'var(--color-bg-elevated)'};color:${isUser?'white':'var(--color-text-primary)'};padding:10px 14px;border-radius:${isUser?'14px 14px 4px 14px':'14px 14px 14px 4px'};font-size:var(--text-sm);line-height:1.5">
      ${text}
    </div>
  `;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Dashboard Render Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function renderDashboard() {
  const kpis = DemoData.kpis;
  const trend = DemoData.salesTrend;
  const lowStock = DemoData.products.filter(p => p.stock <= p.minStock);
  const recentOrders = DemoData.orders.slice(0, 5);

  document.getElementById('page-body').innerHTML = `
    <!-- Welcome Banner -->
    <div style="background:linear-gradient(135deg,rgba(99,102,241,0.15) 0%,rgba(139,92,246,0.08) 100%);border:1px solid rgba(99,102,241,0.2);border-radius:var(--radius-2xl);padding:var(--space-6);margin-bottom:var(--space-6);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-4)">
      <div>
        <div style="font-size:var(--text-xs);color:var(--color-brand-400);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Good ${getTimeOfDay()} Ã°Å¸â€˜â€¹</div>
        <h2 style="font-family:var(--font-display);font-size:var(--text-2xl);font-weight:700;color:var(--color-text-primary)" id="welcome-name">Arjun Sharma</h2>
        <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-top:4px">Here's what's happening at <strong>Sharma Grocery & Provisions</strong> today.</p>
      </div>
      <div style="display:flex;gap:var(--space-3)">
        <button class="btn btn-secondary" onclick="navigateTo('reports')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          View Report
        </button>
        <button class="btn btn-primary" onclick="navigateTo('pos')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Sale
        </button>
      </div>
    </div>

    <!-- KPI Stats Grid -->
    <div class="stats-grid" style="margin-bottom:var(--space-6)">
      ${renderKPICard("Today's Sales", Format.currency(kpis.todaySales.value), kpis.todaySales.delta, 'Ã°Å¸â€™Â°', 'rgba(99,102,241,0.15)', [8420, 12300, 9800, 15600, 11200, 14800, 8420])}
      ${renderKPICard("Today's Orders", kpis.todayOrders.value, kpis.todayOrders.delta, 'Ã°Å¸â€ºÂÃ¯Â¸Â', 'rgba(34,197,94,0.15)', [35, 42, 38, 51, 44, 49, 47])}
      ${renderKPICard("Monthly Revenue", Format.currency(kpis.monthlyRevenue.value), kpis.monthlyRevenue.delta, 'Ã°Å¸â€œË†', 'rgba(168,85,247,0.15)', [110000, 118000, 125000, 130000, 135000, 140000, 142800])}
      ${renderKPICard("Low Stock Alerts", kpis.lowStockItems.value + ' items', 0, 'Ã¢Å¡Â Ã¯Â¸Â', 'rgba(239,68,68,0.15)', null, true)}
    </div>

    <!-- Charts Row -->
    <div class="charts-grid" style="margin-bottom:var(--space-6)">
      <!-- Revenue Chart -->
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Revenue Trend</div>
            <div class="chart-subtitle">Last 7 days performance</div>
          </div>
          <div style="display:flex;gap:var(--space-2)">
            <button class="btn btn-sm btn-ghost" style="font-size:10px">7D</button>
            <button class="btn btn-sm btn-secondary" style="font-size:10px">30D</button>
            <button class="btn btn-sm btn-ghost" style="font-size:10px">90D</button>
          </div>
        </div>
        ${renderBarChart(trend.data, trend.labels)}
        <div style="display:flex;justify-content:space-between;margin-top:var(--space-4);padding-top:var(--space-4);border-top:1px solid var(--color-border-subtle)">
          <div style="text-align:center">
            <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">Total 7D</div>
            <div style="font-weight:700;font-size:var(--text-base)">${Format.currency(trend.data.reduce((a,b)=>a+b,0))}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">Best Day</div>
            <div style="font-weight:700;font-size:var(--text-base);color:var(--color-success-400)">${trend.labels[trend.data.indexOf(Math.max(...trend.data))]}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">Avg / Day</div>
            <div style="font-weight:700;font-size:var(--text-base)">${Format.currency(Math.round(trend.data.reduce((a,b)=>a+b,0)/trend.data.length))}</div>
          </div>
        </div>
      </div>

      <!-- Category Donut -->
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Sales by Category</div>
            <div class="chart-subtitle">This month</div>
          </div>
        </div>
        ${renderCategoryDonut()}
      </div>
    </div>

    <!-- Bottom Panel Row -->
    <div class="panel-row">
      <!-- Recent Orders -->
      <div class="panel-card">
        <div class="panel-header">
          <div class="panel-title">Recent Orders</div>
          <button class="btn btn-sm btn-ghost" onclick="navigateTo('orders')">View All Ã¢â€ â€™</button>
        </div>
        <div style="overflow-x:auto">
          <table class="data-table" style="width:100%">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${recentOrders.map(o => `
                <tr>
                  <td style="font-weight:600;font-family:monospace;font-size:var(--text-xs)">${o.id}</td>
                  <td>${o.customer}</td>
                  <td style="font-weight:600">${Format.currency(o.total)}</td>
                  <td><span class="badge badge-${o.status==='completed'?'success':o.status==='pending'?'warning':'info'}">${o.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Low Stock Alerts -->
      <div class="panel-card">
        <div class="panel-header">
          <div class="panel-title">Ã¢Å¡Â Ã¯Â¸Â Low Stock Alerts</div>
          <button class="btn btn-sm btn-ghost" onclick="navigateTo('inventory')">Manage Ã¢â€ â€™</button>
        </div>
        <div style="padding:var(--space-4)">
          ${lowStock.length === 0
            ? '<div style="text-align:center;color:var(--color-text-secondary);padding:var(--space-8)">Ã¢Å“â€¦ All items are well stocked!</div>'
            : lowStock.map(p => `
              <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);border-bottom:1px solid var(--color-border-subtle)">
                <span style="font-size:24px">${p.image}</span>
                <div style="flex:1">
                  <div style="font-size:var(--text-sm);font-weight:600">${p.name}</div>
                  <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">${p.stock} ${p.unit} remaining Ã‚Â· Min: ${p.minStock}</div>
                </div>
                <div class="progress-bar" style="width:80px">
                  <div class="progress-fill" style="width:${Math.min(100,(p.stock/p.minStock)*100)}%;background:${p.stock <= p.minStock/2 ? 'var(--gradient-danger)' : 'var(--gradient-warning)'}"></div>
                </div>
                <button class="btn btn-sm btn-primary" onclick="quickReorder('${p.id}')">Reorder</button>
              </div>
            `).join('')
          }

          <!-- AI Suggestion -->
          <div style="margin-top:var(--space-4);padding:var(--space-4);background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:var(--radius-lg)">
            <div style="font-size:var(--text-xs);font-weight:600;color:var(--color-brand-400);margin-bottom:var(--space-2)">Ã¢Å“Â¨ AI Recommendation</div>
            <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">Place reorder for Dettol products Ã¢â‚¬â€ supplier Reckitt has 2-day delivery. Estimated reorder cost: <strong>Ã¢â€šÂ¹4,200</strong></div>
            <button class="btn btn-sm btn-primary" style="margin-top:var(--space-3)" onclick="generatePO()">Generate PO</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions Bar -->
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:var(--space-3);margin-top:var(--space-6)">
      ${['New Sale', 'Add Product', 'Add Customer', 'Stock Count', 'Daily Report', 'Staff Check-in'].map((action, i) => {
        const icons = ['Ã°Å¸â€™Â³','Ã°Å¸â€œÂ¦','Ã°Å¸â€˜Â¤','Ã°Å¸â€œÂ','Ã°Å¸â€œÅ ','Ã¢Å“â€¦'];
        const modules = ['pos','inventory','customers','inventory','reports','staff'];
        return `
          <button class="btn btn-secondary" onclick="navigateTo('${modules[i]}')" style="flex-direction:column;height:72px;gap:var(--space-1)">
            <span style="font-size:20px">${icons[i]}</span>
            <span style="font-size:var(--text-xs)">${action}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;

  // Load username
  const user = Auth.getUser();
  if (user) {
    const el = document.getElementById('welcome-name');
    if (el) el.textContent = user.name || 'Business Owner';
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Helper Renderers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function renderKPICard(label, value, delta, icon, bgColor, sparkData, isAlert = false) {
  const deltaHtml = delta !== 0 ? `
    <span class="stat-card-delta ${delta > 0 ? 'delta-up' : 'delta-down'}">
      ${delta > 0 ? 'Ã¢â€ â€˜' : 'Ã¢â€ â€œ'} ${Math.abs(delta)}%
      <span style="font-weight:400;color:var(--color-text-tertiary)"> vs last month</span>
    </span>
  ` : `<span class="stat-card-delta" style="color:var(--color-text-tertiary)">No change</span>`;

  const sparkHtml = sparkData ? `
    <div style="margin-top:var(--space-3)">
      ${MicroChart.sparkline(sparkData, { width: 130, height: 40, color: isAlert ? '#ef4444' : '#6366f1' })}
    </div>
  ` : '';

  return `
    <div class="stat-card" style="${isAlert ? 'border-color:rgba(239,68,68,0.3)' : ''}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between">
        <div>
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:var(--space-2)">${label}</div>
          <div class="stat-card-value" style="${isAlert ? 'color:var(--color-danger-400)' : 'background:var(--gradient-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text'}">${value}</div>
          <div style="margin-top:var(--space-1)">${deltaHtml}</div>
        </div>
        <div style="width:44px;height:44px;border-radius:var(--radius-xl);background:${bgColor};display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${icon}</div>
      </div>
      ${sparkHtml}
    </div>
  `;
}

function renderBarChart(data, labels) {
  const max = Math.max(...data);
  const width = 100 / data.length;

  return `
    <div style="display:flex;align-items:flex-end;gap:8px;height:140px;padding-bottom:24px;position:relative">
      ${data.map((v, i) => {
        const height = (v / max) * 100;
        const isToday = i === data.length - 1;
        return `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end">
            <div style="font-size:9px;color:var(--color-text-tertiary)">Ã¢â€šÂ¹${(v/1000).toFixed(1)}k</div>
            <div style="width:100%;border-radius:4px 4px 0 0;background:${isToday?'var(--gradient-brand)':'rgba(99,102,241,0.3)'};height:${height}%;min-height:4px;transition:height 0.5s ease" title="${labels[i]}: Ã¢â€šÂ¹${Format.number(v)}"></div>
            <div style="font-size:9px;font-weight:600;color:${isToday?'var(--color-brand-400)':'var(--color-text-tertiary)'}">${labels[i]}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderCategoryDonut() {
  const cats = DemoData.categorySales;
  const colors = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6'];
  const total = cats.reduce((s, c) => s + c.value, 0);

  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:var(--space-4)">
      ${MicroChart.donut(cats, { size: 140, strokeWidth: 20, colors })}
      <div style="width:100%">
        ${cats.map((c, i) => `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2)">
            <div style="display:flex;align-items:center;gap:var(--space-2)">
              <div style="width:10px;height:10px;border-radius:50%;background:${colors[i]};flex-shrink:0"></div>
              <span style="font-size:var(--text-xs);color:var(--color-text-secondary)">${c.category}</span>
            </div>
            <span style="font-size:var(--text-xs);font-weight:700;color:var(--color-text-primary)">${c.value}%</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// â”€â”€â”€ Interaction Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.addEventListener('DOMContentLoaded', () => {
  loadUserInfo();
  loadBranches();
  
  // Close branch list on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sidebar-branch-selector')) {
      const list = document.getElementById('branch-list');
      if (list) list.style.display = 'none';
    }
  });
});

// â”€â”€â”€ Branch Selector Logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let selectedBranches = Storage.get('nexaerp_branches') || ['all'];

function loadBranches() {
  const currentLabel = document.getElementById('current-branch-label');
  if (!currentLabel) return;

  const branches = {
    all: 'All Branches',
    main: 'Main Store',
    branch1: 'Warehouse A',
    branch2: 'Retail B'
  };

  // Sync checkboxes
  document.querySelectorAll('.branch-item input').forEach(input => {
    const br = input.id.replace('br-', '');
    input.checked = selectedBranches.includes(br);
  });

  if (selectedBranches.includes('all')) {
    currentLabel.textContent = 'All Branches';
  } else if (selectedBranches.length === 1) {
    currentLabel.textContent = branches[selectedBranches[0]] || selectedBranches[0];
  } else {
    currentLabel.textContent = `${selectedBranches.length} Branches Selected`;
  }
}

function toggleBranchList() {
  const list = document.getElementById('branch-list');
  if (list) {
    list.style.display = list.style.display === 'none' ? 'block' : 'none';
  }
}

function setBranch(branch) {
  if (branch === 'all') {
    selectedBranches = ['all'];
  } else {
    // Remove 'all' if present
    selectedBranches = selectedBranches.filter(b => b !== 'all');
    
    if (selectedBranches.includes(branch)) {
      selectedBranches = selectedBranches.filter(b => b !== branch);
    } else {
      selectedBranches.push(branch);
    }
    
    // If empty, default to 'all'
    if (selectedBranches.length === 0) selectedBranches = ['all'];
  }

  Storage.set('nexaerp_branches', selectedBranches);
  loadBranches();
  
  // Reload current module to reflect changes
  Toast.info(`Switched context to: ${selectedBranches.includes('all') ? 'Global' : selectedBranches.join(', ')}`);
  navigateTo(currentModule);
}

// â”€â”€â”€ Analytics Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
