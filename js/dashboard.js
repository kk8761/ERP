/**
 * NexaERP — Dashboard Module
 * Renders the main dashboard with KPIs, charts, recent activity
 */

let currentModule = 'dashboard';
let sidebarCollapsed = false;

// ─── Navigation Router ─────────────────────────────────────
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
    accounting: { title: 'Accounting', sub: 'Financial transactions' },
    payroll:    { title: 'Payroll', sub: 'Staff salaries and attendance' },
    reports:    { title: 'Reports', sub: 'Business intelligence reports' },
    customers:  { title: 'Customers', sub: 'Customer relationship management' },
    staff:      { title: 'Staff', sub: 'Employee management' },
    notifications: { title: 'Notifications', sub: 'Alerts and updates' },
    settings:   { title: 'Settings', sub: 'Business and system settings' },
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
      case 'orders':      renderOrders(); break;
      case 'suppliers':   renderSuppliers(); break;
      case 'accounting':  renderAccounting(); break;
      case 'payroll':     renderPayroll(); break;
      case 'reports':     renderReports(); break;
      case 'customers':   renderCustomers(); break;
      case 'staff':       renderStaff(); break;
      case 'notifications': renderNotifications(); break;
      case 'settings':    renderSettings(); break;
      default:            renderDashboard();
    }
  }, 150);
}

// ─── Sidebar Toggle ────────────────────────────────────────
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

// ─── User Info ─────────────────────────────────────────────
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

// ─── Logout ────────────────────────────────────────────────
function handleLogout(e) {
  e.stopPropagation();
  Auth.clearSession();
  Toast.info('Signed out successfully');
  setTimeout(() => { window.location.href = 'index.html'; }, 600);
}

// ─── Notifications ─────────────────────────────────────────
let notifOpen = false;

function toggleNotifications() {
  notifOpen = !notifOpen;
  const panel = document.getElementById('notif-panel');
  panel.style.display = notifOpen ? 'block' : 'none';

  if (notifOpen) renderNotifPanel();
}

function renderNotifPanel() {
  const list = document.getElementById('notif-list');
  if (!list) return;

  const notifs = DemoData.notifications;
  list.innerHTML = notifs.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotifRead('${n.id}')">
      <div class="notif-icon" style="background:${n.type==='warning'?'rgba(234,179,8,0.15)':n.type==='success'?'rgba(34,197,94,0.15)':'rgba(99,102,241,0.15)'}">${n.icon}</div>
      <div class="notif-content">
        <div class="notif-title">${n.title}</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:2px">${n.message}</div>
        <div class="notif-time">${Format.relativeTime(n.time)}</div>
      </div>
      ${!n.read ? '<div class="status-dot status-online" style="flex-shrink:0"></div>' : ''}
    </div>
  `).join('');
}

function markAllRead() {
  DemoData.notifications.forEach(n => n.read = true);
  document.querySelector('.notif-badge').style.display = 'none';
  renderNotifPanel();
}

function markNotifRead(id) {
  const n = DemoData.notifications.find(n => n.id === id);
  if (n) n.read = true;
}

// Close notifications when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('#notif-btn') && !e.target.closest('#notif-panel')) {
    notifOpen = false;
    const panel = document.getElementById('notif-panel');
    if (panel) panel.style.display = 'none';
  }
});

// ─── AI Assistant ──────────────────────────────────────────
function openAIAssistant() {
  const modal = document.getElementById('ai-modal');
  modal.style.display = 'flex';

  // Initial AI message
  const chat = document.getElementById('ai-chat');
  if (chat.children.length === 0) {
    appendAIMessage('assistant', DemoData.aiResponses.default);

    // Suggestion chips
    const chips = ['📈 Sales insights', '📦 Inventory status', '🔮 Demand forecast', '💰 Profit analysis'];
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
  else response = `Here's what I found regarding "${msg}": Based on your 7-day data, your business is trending positively with 18.7% monthly growth. Would you like me to dive deeper into any specific area? 🎯`;

  appendAIMessage('assistant', response);
}

function appendAIMessage(role, text) {
  const chat = document.getElementById('ai-chat');
  const isUser = role === 'user';
  const div = document.createElement('div');
  div.style.cssText = `display:flex;gap:10px;align-items:flex-start;flex-direction:${isUser?'row-reverse':'row'}`;
  div.innerHTML = `
    <div style="width:32px;height:32px;border-radius:50%;background:${isUser?'var(--gradient-brand)':'rgba(99,102,241,0.2)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px">
      ${isUser ? (Auth.getUser()?.avatar || '👤') : '✨'}
    </div>
    <div style="max-width:75%;background:${isUser?'var(--gradient-brand)':'var(--color-bg-elevated)'};color:${isUser?'white':'var(--color-text-primary)'};padding:10px 14px;border-radius:${isUser?'14px 14px 4px 14px':'14px 14px 14px 4px'};font-size:var(--text-sm);line-height:1.5">
      ${text}
    </div>
  `;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// ─── Dashboard Render ──────────────────────────────────────
function renderDashboard() {
  const kpis = DemoData.kpis;
  const trend = DemoData.salesTrend;
  const lowStock = DemoData.products.filter(p => p.stock <= p.minStock);
  const recentOrders = DemoData.orders.slice(0, 5);

  document.getElementById('page-body').innerHTML = `
    <!-- Welcome Banner -->
    <div style="background:linear-gradient(135deg,rgba(99,102,241,0.15) 0%,rgba(139,92,246,0.08) 100%);border:1px solid rgba(99,102,241,0.2);border-radius:var(--radius-2xl);padding:var(--space-6);margin-bottom:var(--space-6);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-4)">
      <div>
        <div style="font-size:var(--text-xs);color:var(--color-brand-400);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Good ${getTimeOfDay()} 👋</div>
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
      ${renderKPICard("Today's Sales", Format.currency(kpis.todaySales.value), kpis.todaySales.delta, '💰', 'rgba(99,102,241,0.15)', [8420, 12300, 9800, 15600, 11200, 14800, 8420])}
      ${renderKPICard("Today's Orders", kpis.todayOrders.value, kpis.todayOrders.delta, '🛍️', 'rgba(34,197,94,0.15)', [35, 42, 38, 51, 44, 49, 47])}
      ${renderKPICard("Monthly Revenue", Format.currency(kpis.monthlyRevenue.value), kpis.monthlyRevenue.delta, '📈', 'rgba(168,85,247,0.15)', [110000, 118000, 125000, 130000, 135000, 140000, 142800])}
      ${renderKPICard("Low Stock Alerts", kpis.lowStockItems.value + ' items', 0, '⚠️', 'rgba(239,68,68,0.15)', null, true)}
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
          <button class="btn btn-sm btn-ghost" onclick="navigateTo('orders')">View All →</button>
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
          <div class="panel-title">⚠️ Low Stock Alerts</div>
          <button class="btn btn-sm btn-ghost" onclick="navigateTo('inventory')">Manage →</button>
        </div>
        <div style="padding:var(--space-4)">
          ${lowStock.length === 0
            ? '<div style="text-align:center;color:var(--color-text-secondary);padding:var(--space-8)">✅ All items are well stocked!</div>'
            : lowStock.map(p => `
              <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);border-bottom:1px solid var(--color-border-subtle)">
                <span style="font-size:24px">${p.image}</span>
                <div style="flex:1">
                  <div style="font-size:var(--text-sm);font-weight:600">${p.name}</div>
                  <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">${p.stock} ${p.unit} remaining · Min: ${p.minStock}</div>
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
            <div style="font-size:var(--text-xs);font-weight:600;color:var(--color-brand-400);margin-bottom:var(--space-2)">✨ AI Recommendation</div>
            <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">Place reorder for Dettol products — supplier Reckitt has 2-day delivery. Estimated reorder cost: <strong>₹4,200</strong></div>
            <button class="btn btn-sm btn-primary" style="margin-top:var(--space-3)" onclick="generatePO()">Generate PO</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions Bar -->
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:var(--space-3);margin-top:var(--space-6)">
      ${['New Sale', 'Add Product', 'Add Customer', 'Stock Count', 'Daily Report', 'Staff Check-in'].map((action, i) => {
        const icons = ['💳','📦','👤','📝','📊','✅'];
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

// ─── Helper Renderers ──────────────────────────────────────
function renderKPICard(label, value, delta, icon, bgColor, sparkData, isAlert = false) {
  const deltaHtml = delta !== 0 ? `
    <span class="stat-card-delta ${delta > 0 ? 'delta-up' : 'delta-down'}">
      ${delta > 0 ? '↑' : '↓'} ${Math.abs(delta)}%
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
            <div style="font-size:9px;color:var(--color-text-tertiary)">₹${(v/1000).toFixed(1)}k</div>
            <div style="width:100%;border-radius:4px 4px 0 0;background:${isToday?'var(--gradient-brand)':'rgba(99,102,241,0.3)'};height:${height}%;min-height:4px;transition:height 0.5s ease" title="${labels[i]}: ₹${Format.number(v)}"></div>
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

// ─── Analytics Page ────────────────────────────────────────
function renderAnalytics() {
  document.getElementById('page-body').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-5);margin-bottom:var(--space-6)">
      ${[
        { label:'Gross Revenue MTD', value: Format.currency(142800), delta:'+18.7%', color:'#6366f1' },
        { label:'Net Profit MTD',    value: Format.currency(28600),  delta:'+22.1%', color:'#10b981' },
        { label:'Gross Margin',      value: '21.4%',                 delta:'+0.8pp', color:'#a855f7' },
      ].map(s => `
        <div class="stat-card">
          <div style="color:var(--color-text-secondary);font-size:var(--text-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.05em">${s.label}</div>
          <div style="font-size:var(--text-3xl);font-weight:700;margin:var(--space-2) 0;color:${s.color}">${s.value}</div>
          <span class="badge badge-success">${s.delta} vs prev period</span>
        </div>
      `).join('')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5)">
      <div class="chart-card">
        <div class="chart-title" style="margin-bottom:var(--space-4)">Daily Revenue — April 2026</div>
        ${renderBarChart(
          [18200,22450,19800,24100,21300,28500,8420,19100,22300,25400],
          ['15','16','17','18','19','20','21','22','23','24']
        )}
      </div>
      <div class="chart-card">
        <div class="chart-title" style="margin-bottom:var(--space-4)">Top Products by Revenue</div>
        ${DemoData.products.slice(0,6).map(p => {
          const rev = p.price * Math.floor(Math.random()*80+20);
          return `
            <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3)">
              <span style="font-size:20px">${p.image}</span>
              <div style="flex:1">
                <div style="font-size:var(--text-xs);font-weight:600;margin-bottom:3px">${p.name}</div>
                <div class="progress-bar"><div class="progress-fill" style="width:${(rev/15000)*100}%"></div></div>
              </div>
              <span style="font-size:var(--text-xs);font-weight:700;min-width:60px;text-align:right">${Format.currency(rev)}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ─── Reports Page ──────────────────────────────────────────
function renderReports() {
  const reports = [
    { name:'Daily Sales Summary', icon:'📊', desc:'Revenue, orders, and top items', type:'sales' },
    { name:'Inventory Status Report', icon:'📦', desc:'Stock levels, low stock, dead stock', type:'inventory' },
    { name:'GST Report', icon:'📋', desc:'GST-wise sales and purchase summary', type:'gst' },
    { name:'P&L Statement', icon:'💹', desc:'Monthly profit and loss overview', type:'pl' },
    { name:'Customer Ledger', icon:'👥', desc:'Customer-wise purchase history', type:'customers' },
    { name:'Supplier Statement', icon:'🚛', desc:'Supplier orders and payments', type:'suppliers' },
    { name:'Payroll Report', icon:'💰', desc:'Staff salaries and attendance', type:'payroll' },
    { name:'Stock Movement Report', icon:'📉', desc:'Item-wise stock in/out history', type:'stock' },
  ];

  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">Reports & Exports</div>
        <div class="page-meta">Generate and download business reports</div>
      </div>
      <div style="display:flex;gap:var(--space-3)">
        <input type="month" class="form-input" style="width:auto" value="2026-04" />
        <button class="btn btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export All
        </button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4)">
      ${reports.map(r => `
        <div class="card" style="cursor:pointer" onclick="generateReport('${r.type}')">
          <div style="font-size:36px;margin-bottom:var(--space-3)">${r.icon}</div>
          <div style="font-weight:600;font-size:var(--text-sm);margin-bottom:var(--space-1)">${r.name}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:var(--space-4)">${r.desc}</div>
          <div style="display:flex;gap:var(--space-2)">
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();previewReport('${r.type}')">Preview</button>
            <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();downloadReport('${r.type}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function generateReport(type) { Toast.info(`Generating ${type} report...`); }
function previewReport(type)  { Toast.info(`Opening ${type} report preview...`); }
function downloadReport(type) {
  const data = [
    { Report: type.toUpperCase(), Period: 'April 2026', Generated: new Date().toLocaleDateString(), Business: Auth.getUser()?.business || 'My Business' }
  ];
  exportCSV(data, `nexaerp-${type}-report-april2026.csv`);
  Toast.success('Report exported successfully!');
}

function generatePO() {
  Toast.success('Purchase Order generated for Reckitt products! Check Orders module.');
}

function quickReorder(productId) {
  const p = DemoData.products.find(pr => pr.id === productId);
  if (p) Toast.success(`Reorder initiated for ${p.name}!`);
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// ─── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;
  loadUserInfo();
  renderDashboard();
  renderNotifPanel();

  // Global search
  document.getElementById('global-search')?.addEventListener('input', debounce((e) => {
    const q = e.target.value.trim();
    if (q.length > 2) Toast.info(`Searching for "${q}"...`, 1500);
  }, 400));
});
