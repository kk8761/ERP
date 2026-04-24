/**
 * NexaERP — Modules.js
 * Renders all remaining modules: Orders, Customers, Staff,
 * Payroll, Suppliers, Accounting, Notifications, Settings
 */

// ─── ORDERS MODULE ────────────────────────────────────────────
function renderOrders() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">Orders</div>
        <div class="page-meta">${DemoData.orders.length} total orders</div>
      </div>
      <div style="display:flex;gap:var(--space-3)">
        <button class="btn btn-secondary" onclick="exportCSV(DemoData.orders,'orders.csv');Toast.success('Exported!')">Export CSV</button>
        <button class="btn btn-primary" onclick="openNewOrderModal()">+ New Order</button>
      </div>
    </div>

    <!-- Stats -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4);margin-bottom:var(--space-6)">
      ${[
        { label:'Total Orders', value:DemoData.orders.length, color:'#6366f1' },
        { label:'Completed', value:DemoData.orders.filter(o=>o.status==='completed').length, color:'#10b981' },
        { label:'Pending', value:DemoData.orders.filter(o=>o.status==='pending').length, color:'#f59e0b' },
        { label:'Total Revenue', value:Format.currency(DemoData.orders.reduce((s,o)=>s+o.total,0)), color:'#a855f7' },
      ].map(s=>`
        <div class="stat-card" style="padding:var(--space-5)">
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:var(--space-1)">${s.label}</div>
          <div style="font-size:var(--text-2xl);font-weight:700;color:${s.color}">${s.value}</div>
        </div>
      `).join('')}
    </div>

    <!-- Filters -->
    <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-4);flex-wrap:wrap">
      <input type="text" class="form-input" id="order-search" placeholder="Search order ID, customer..." style="flex:1;min-width:200px" oninput="filterOrders()" />
      <select class="form-select" id="order-status" style="width:155px" onchange="filterOrders()">
        <option value="">All Status</option>
        <option value="completed">Completed</option>
        <option value="pending">Pending</option>
        <option value="processing">Processing</option>
      </select>
      <input type="date" class="form-input" id="order-date" style="width:160px" onchange="filterOrders()" />
    </div>

    <!-- Table -->
    <div class="panel-card">
      <div style="overflow-x:auto">
        <table class="data-table" id="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="orders-tbody"></tbody>
        </table>
      </div>
    </div>
  `;
  renderOrdersTable();
}

function renderOrdersTable() {
  const search = document.getElementById('order-search')?.value?.toLowerCase() || '';
  const status = document.getElementById('order-status')?.value || '';
  const date   = document.getElementById('order-date')?.value || '';

  const filtered = DemoData.orders.filter(o => {
    const matchSearch = !search || o.id.toLowerCase().includes(search) || o.customer.toLowerCase().includes(search);
    const matchStatus = !status || o.status === status;
    const matchDate   = !date   || o.date === date;
    return matchSearch && matchStatus && matchDate;
  });

  const payIcons = { cash:'💵', upi:'📱', card:'💳', credit:'📋' };
  document.getElementById('orders-tbody').innerHTML = filtered.map(o => `
    <tr>
      <td><code style="font-size:var(--text-xs);background:var(--color-bg-elevated);padding:2px 6px;border-radius:4px;cursor:pointer" onclick="viewOrder('${o.id}')">${o.id}</code></td>
      <td style="font-weight:500">${o.customer}</td>
      <td style="font-size:var(--text-xs);color:var(--color-text-secondary);max-width:200px;overflow:hidden;text-overflow:ellipsis">${o.items.join(', ')}</td>
      <td style="font-weight:700">${Format.currency(o.total)}</td>
      <td>${payIcons[o.payment]||'💰'} ${o.payment?.toUpperCase()}</td>
      <td><span class="badge badge-${o.status==='completed'?'success':o.status==='pending'?'warning':'info'}">${o.status}</span></td>
      <td style="font-size:var(--text-xs);color:var(--color-text-secondary)">${Format.date(o.date)}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm btn-secondary" onclick="viewOrder('${o.id}')">View</button>
          <button class="btn btn-sm btn-ghost" onclick="printOrderInvoice('${o.id}')">🖨️</button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="8" style="text-align:center;padding:48px;color:var(--color-text-secondary)">No orders found</td></tr>';
}

function filterOrders() { renderOrdersTable(); }

function viewOrder(id) {
  const o = DemoData.orders.find(or => or.id === id);
  if (!o) return;
  Modal.create({
    title: `Order — ${o.id}`,
    body: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-4)">
        ${[['Customer',o.customer],['Invoice',o.invoiceNo],['Date',Format.date(o.date)],['Payment',o.payment?.toUpperCase()],['Status',`<span class="badge badge-${o.status==='completed'?'success':'warning'}">${o.status}</span>`],['Total',`<strong style="color:var(--color-brand-400)">${Format.currency(o.total)}</strong>`]].map(([k,v])=>`
          <div style="background:var(--color-bg-secondary);padding:var(--space-3);border-radius:var(--radius-lg)">
            <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">${k}</div>
            <div style="font-weight:600;margin-top:2px">${v}</div>
          </div>
        `).join('')}
      </div>
      <div style="font-weight:600;font-size:var(--text-sm);margin-bottom:var(--space-3)">Items Ordered</div>
      ${o.items.map(item=>`
        <div style="padding:var(--space-3);background:var(--color-bg-secondary);border-radius:var(--radius-lg);margin-bottom:var(--space-2);font-size:var(--text-sm)">${item}</div>
      `).join('')}
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Close</button>
      <button class="btn btn-primary" onclick="Toast.success('Invoice sent!');document.querySelector('.modal-backdrop').remove()">📱 Resend Invoice</button>
    `
  });
}

function printOrderInvoice(id) { Toast.info(`Printing invoice for ${id}...`); }
function openNewOrderModal() { navigateTo('pos'); Toast.info('Navigate to POS to create a new sale'); }

// ─── CUSTOMERS MODULE ─────────────────────────────────────────
function renderCustomers() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">Customers</div>
        <div class="page-meta">${DemoData.customers.length} total customers</div>
      </div>
      <div style="display:flex;gap:var(--space-3)">
        <button class="btn btn-secondary" onclick="exportCSV(DemoData.customers,'customers.csv');Toast.success('Exported!')">Export</button>
        <button class="btn btn-primary" onclick="openCustomerModal()">+ Add Customer</button>
      </div>
    </div>

    <!-- Stats -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4);margin-bottom:var(--space-6)">
      ${[
        { label:'Total Customers', value:DemoData.customers.length, icon:'👥' },
        { label:'VIP Customers', value:DemoData.customers.filter(c=>c.type==='vip').length, icon:'⭐' },
        { label:'New This Month', value:DemoData.customers.filter(c=>c.type==='new').length, icon:'🆕' },
        { label:'Total Revenue', value:Format.currency(DemoData.customers.reduce((s,c)=>s+c.totalSpent,0)), icon:'💰' },
      ].map(s=>`
        <div class="stat-card" style="padding:var(--space-5)">
          <div style="font-size:28px;margin-bottom:var(--space-2)">${s.icon}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:4px">${s.label}</div>
          <div style="font-size:var(--text-xl);font-weight:700">${s.value}</div>
        </div>
      `).join('')}
    </div>

    <!-- Search -->
    <div style="margin-bottom:var(--space-5)">
      <input type="text" class="form-input" placeholder="Search by name, phone, email..." oninput="filterCustomers(this.value)" style="max-width:360px" />
    </div>

    <!-- Customer Cards Grid -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--space-4)" id="customer-grid">
      ${renderCustomerCards(DemoData.customers)}
    </div>
  `;
}

function renderCustomerCards(customers) {
  const typeColors = { vip:'var(--color-warning-400)', regular:'var(--color-brand-400)', new:'var(--color-success-400)' };
  return customers.map(c => `
    <div class="card" style="cursor:pointer" onclick="viewCustomer('${c.id}')">
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
        <div class="avatar avatar-lg" style="background:var(--gradient-brand)">${c.name.split(' ').map(n=>n[0]).join('').toUpperCase()}</div>
        <div>
          <div style="font-weight:700">${c.name}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">${c.phone}</div>
          <span class="badge" style="background:${typeColors[c.type]||'var(--color-brand-400)'}22;color:${typeColors[c.type]||'var(--color-brand-400)'};border-color:${typeColors[c.type]||'var(--color-brand-400)'}44;margin-top:4px">${c.type?.toUpperCase()}</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        ${[['Orders',c.totalOrders],['Spent',Format.currency(c.totalSpent)],['Points',c.loyaltyPoints+' pts'],['Last Visit',Format.date(c.lastVisit)]].map(([k,v])=>`
          <div style="background:var(--color-bg-secondary);border-radius:var(--radius-lg);padding:var(--space-2) var(--space-3)">
            <div style="font-size:10px;color:var(--color-text-secondary)">${k}</div>
            <div style="font-weight:700;font-size:var(--text-xs)">${v}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('') || '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--color-text-secondary)">No customers found</div>';
}

function filterCustomers(search) {
  const q = search.toLowerCase();
  const filtered = q ? DemoData.customers.filter(c =>
    c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q)
  ) : DemoData.customers;
  document.getElementById('customer-grid').innerHTML = renderCustomerCards(filtered);
}

function viewCustomer(id) {
  const c = DemoData.customers.find(cu => cu.id === id);
  if (!c) return;
  Modal.create({
    title: c.name,
    body: `
      <div style="text-align:center;margin-bottom:var(--space-5)">
        <div class="avatar avatar-xl" style="margin:0 auto var(--space-3)">${c.name.split(' ').map(n=>n[0]).join('')}</div>
        <span class="badge badge-primary">${c.type?.toUpperCase()}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        ${[['Phone',c.phone],['Email',c.email||'—'],['Address',c.address||'—'],['Total Orders',c.totalOrders],['Total Spent',Format.currency(c.totalSpent)],['Loyalty Points',c.loyaltyPoints+' pts'],['Last Visit',Format.date(c.lastVisit)]].map(([k,v])=>`
          <div style="background:var(--color-bg-secondary);border-radius:var(--radius-lg);padding:var(--space-3)">
            <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">${k}</div>
            <div style="font-weight:600;font-size:var(--text-sm)">${v}</div>
          </div>
        `).join('')}
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Close</button>
      <button class="btn btn-primary" onclick="navigateTo('pos');document.querySelector('.modal-backdrop').remove()">New Sale for Customer</button>
    `
  });
}

function openCustomerModal() {
  Modal.create({
    title: 'Add New Customer',
    body: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        <div class="form-group"><label class="form-label">First Name *</label><input type="text" id="nc-fname" class="form-input" /></div>
        <div class="form-group"><label class="form-label">Last Name</label><input type="text" id="nc-lname" class="form-input" /></div>
        <div class="form-group"><label class="form-label">Phone *</label><input type="tel" id="nc-phone" class="form-input" /></div>
        <div class="form-group"><label class="form-label">Email</label><input type="email" id="nc-email" class="form-input" /></div>
      </div>
      <div class="form-group"><label class="form-label">Address</label><input type="text" id="nc-address" class="form-input" /></div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="saveNewCustomer()">Add Customer</button>
    `
  });
}

function saveNewCustomer() {
  const fn = document.getElementById('nc-fname')?.value?.trim();
  const ln = document.getElementById('nc-lname')?.value?.trim();
  const phone = document.getElementById('nc-phone')?.value?.trim();
  if (!fn || !phone) { Toast.error('Name and phone are required'); return; }
  DemoData.customers.push({ id:generateId(), name:`${fn} ${ln}`.trim(), phone, email:document.getElementById('nc-email')?.value||'', address:document.getElementById('nc-address')?.value||'', totalOrders:0, totalSpent:0, loyaltyPoints:0, lastVisit:new Date().toISOString().split('T')[0], type:'new' });
  document.querySelector('.modal-backdrop')?.remove();
  Toast.success('Customer added successfully!');
  renderCustomers();
}

// ─── STAFF MODULE ─────────────────────────────────────────────
function renderStaff() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">Staff Management</div>
        <div class="page-meta">${DemoData.staff.length} employees</div>
      </div>
      <button class="btn btn-primary" onclick="openStaffModal()">+ Add Employee</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--space-4)">
      ${DemoData.staff.map(s => `
        <div class="card">
          <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
            <div class="avatar avatar-lg">${s.avatar}</div>
            <div>
              <div style="font-weight:700">${s.name}</div>
              <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">${s.role} · ${s.dept}</div>
              <div class="status-dot ${s.status==='active'?'status-online':'status-offline'}" style="display:inline-block;margin-top:4px"></div>
              <span style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-left:4px">${s.status}</span>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)">
            <div style="background:var(--color-bg-secondary);border-radius:var(--radius-lg);padding:var(--space-2) var(--space-3)">
              <div style="font-size:10px;color:var(--color-text-secondary)">Salary</div>
              <div style="font-weight:700;font-size:var(--text-sm)">${Format.currency(s.salary)}/mo</div>
            </div>
            <div style="background:var(--color-bg-secondary);border-radius:var(--radius-lg);padding:var(--space-2) var(--space-3)">
              <div style="font-size:10px;color:var(--color-text-secondary)">Attendance</div>
              <div style="font-weight:700;font-size:var(--text-sm);color:${s.attendance>=95?'var(--color-success-400)':'var(--color-warning-400)'}">${s.attendance}%</div>
            </div>
          </div>
          <div style="margin-top:var(--space-3)">
            <div style="font-size:10px;color:var(--color-text-secondary);margin-bottom:4px">Attendance</div>
            <div class="progress-bar"><div class="progress-fill" style="width:${s.attendance}%;background:${s.attendance>=95?'var(--gradient-success)':'var(--gradient-warning)'}"></div></div>
          </div>
          <div style="display:flex;gap:var(--space-2);margin-top:var(--space-4)">
            <button class="btn btn-sm btn-secondary" style="flex:1" onclick="Toast.info('Calling ${s.name}...')">📞 Call</button>
            <button class="btn btn-sm btn-primary" style="flex:1" onclick="openPayrollFor('${s.id}')">💰 Payroll</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function openStaffModal() {
  Modal.create({
    title: 'Add Employee',
    body: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        <div class="form-group"><label class="form-label">Full Name *</label><input type="text" id="se-name" class="form-input" /></div>
        <div class="form-group"><label class="form-label">Role *</label>
          <select id="se-role" class="form-select">
            <option value="cashier">Cashier</option>
            <option value="manager">Manager</option>
            <option value="storekeeper">Storekeeper</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Phone</label><input type="tel" id="se-phone" class="form-input" /></div>
        <div class="form-group"><label class="form-label">Email</label><input type="email" id="se-email" class="form-input" /></div>
        <div class="form-group"><label class="form-label">Salary (₹/month) *</label><input type="number" id="se-salary" class="form-input" min="0" /></div>
        <div class="form-group"><label class="form-label">Join Date</label><input type="date" id="se-join" class="form-input" /></div>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="saveStaff()">Add Employee</button>
    `
  });
}

function saveStaff() {
  const name = document.getElementById('se-name')?.value?.trim();
  const role = document.getElementById('se-role')?.value;
  const salary = parseFloat(document.getElementById('se-salary')?.value);
  if (!name || !salary) { Toast.error('Name and salary are required'); return; }
  DemoData.staff.push({ id:generateId(), name, role, dept:'Operations', salary, phone:document.getElementById('se-phone')?.value||'', email:document.getElementById('se-email')?.value||'', joinDate:document.getElementById('se-join')?.value||new Date().toISOString().split('T')[0], status:'active', attendance:100, avatar:name.split(' ').map(n=>n[0]).join('').toUpperCase() });
  document.querySelector('.modal-backdrop')?.remove();
  Toast.success('Employee added!');
  renderStaff();
}

// ─── PAYROLL MODULE ───────────────────────────────────────────
function openPayrollFor(staffId) {
  const s = DemoData.staff.find(st => st.id === staffId);
  if (!s) return;
  const workingDays = 26;
  const presentDays = Math.round(workingDays * s.attendance / 100);
  const basicSalary = s.salary;
  const deductions   = Math.round(basicSalary * 0.12); // PF
  const netSalary    = basicSalary - deductions;

  Modal.create({
    title: `Payroll — ${s.name}`,
    body: `
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-5)">
        <div class="avatar avatar-lg">${s.avatar}</div>
        <div>
          <div style="font-weight:700">${s.name}</div>
          <div style="font-size:var(--text-sm);color:var(--color-text-secondary)">${s.role} · Joined ${Format.date(s.joinDate)}</div>
        </div>
      </div>
      <div style="background:var(--color-bg-secondary);border-radius:var(--radius-xl);padding:var(--space-5)">
        ${[
          ['Working Days', workingDays, ''],
          ['Present Days', presentDays, presentDays < 22 ? 'color:var(--color-warning-400)' : ''],
          ['Basic Salary', Format.currency(basicSalary), ''],
          ['PF Deduction (12%)', `-${Format.currency(deductions)}`, 'color:var(--color-danger-400)'],
          ['Other Deductions','₹0.00',''],
          ['Net Payable', Format.currency(netSalary), 'font-weight:800;font-size:1.1rem;color:var(--color-success-400)'],
        ].map(([k,v,style])=>`
          <div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--color-border-subtle)">
            <span style="font-size:var(--text-sm);color:var(--color-text-secondary)">${k}</span>
            <span style="font-size:var(--text-sm);font-weight:600;${style}">${v}</span>
          </div>
        `).join('')}
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="Toast.success('Salary of ${Format.currency(netSalary)} marked as paid for ${s.name}!');document.querySelector('.modal-backdrop').remove()">✅ Mark as Paid</button>
    `
  });
}

function renderPayroll() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">Payroll</div>
        <div class="page-meta">April 2026 · ${DemoData.staff.length} employees</div>
      </div>
      <div style="display:flex;gap:var(--space-3)">
        <select class="form-select" style="width:auto">
          <option>April 2026</option><option>March 2026</option>
        </select>
        <button class="btn btn-primary" onclick="processAllPayroll()">Process All Payroll</button>
      </div>
    </div>

    <div class="panel-card">
      <div style="overflow-x:auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee</th><th>Role</th><th>Days Present</th><th>Basic Salary</th><th>Deductions</th><th>Net Payable</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${DemoData.staff.map(s => {
              const net = Math.round(s.salary * 0.88);
              return `
                <tr>
                  <td><div style="display:flex;align-items:center;gap:var(--space-2)"><div class="avatar avatar-sm">${s.avatar}</div>${s.name}</div></td>
                  <td><span class="chip">${s.role}</span></td>
                  <td>${Math.round(26 * s.attendance / 100)}/26</td>
                  <td>${Format.currency(s.salary)}</td>
                  <td style="color:var(--color-danger-400)">-${Format.currency(Math.round(s.salary * 0.12))}</td>
                  <td style="font-weight:700;color:var(--color-success-400)">${Format.currency(net)}</td>
                  <td><span class="badge badge-warning">Pending</span></td>
                  <td><button class="btn btn-sm btn-primary" onclick="openPayrollFor('${s.id}')">Pay</button></td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:var(--color-bg-elevated)">
              <td colspan="5" style="padding:var(--space-3) var(--space-4);font-weight:700;text-align:right">Total Net Payable:</td>
              <td style="padding:var(--space-3) var(--space-4);font-weight:800;color:var(--color-brand-400);font-size:var(--text-lg)">${Format.currency(DemoData.staff.reduce((s,e)=>s+Math.round(e.salary*0.88),0))}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;
}

function processAllPayroll() { Toast.success('All payroll processed for April 2026!'); }

// ─── SUPPLIERS MODULE ──────────────────────────────────────────
function renderSuppliers() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">Suppliers</div>
        <div class="page-meta">${DemoData.suppliers.length} suppliers</div>
      </div>
      <button class="btn btn-primary" onclick="openSupplierModal()">+ Add Supplier</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--space-4)">
      ${DemoData.suppliers.map(s => `
        <div class="card">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-4)">
            <div>
              <div style="font-weight:700;font-size:var(--text-base)">${s.name}</div>
              <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-top:2px">${s.city} · ${s.contact}</div>
            </div>
            <span class="badge badge-${s.status==='active'?'success':'gray'}">${s.status}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);margin-bottom:var(--space-4)">
            <div style="background:var(--color-bg-secondary);border-radius:var(--radius-lg);padding:var(--space-2) var(--space-3)">
              <div style="font-size:10px;color:var(--color-text-secondary)">Products</div>
              <div style="font-weight:700">${s.products}</div>
            </div>
            <div style="background:var(--color-bg-secondary);border-radius:var(--radius-lg);padding:var(--space-2) var(--space-3)">
              <div style="font-size:10px;color:var(--color-text-secondary)">Outstanding</div>
              <div style="font-weight:700;color:${s.outstanding>0?'var(--color-warning-400)':'var(--color-success-400)'}">${Format.currency(s.outstanding)}</div>
            </div>
          </div>
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:var(--space-3)">
            📞 ${s.phone} · Last Order: ${Format.date(s.lastOrder)}
          </div>
          <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);font-family:monospace;margin-bottom:var(--space-3)">GST: ${s.gst}</div>
          <div style="display:flex;gap:var(--space-2)">
            <button class="btn btn-sm btn-secondary" style="flex:1" onclick="Toast.info('Creating PO for ${s.name}...')">+ Purchase Order</button>
            ${s.outstanding > 0 ? `<button class="btn btn-sm btn-primary" onclick="Toast.success('Payment recorded for ${s.name}!')">Pay ₹${(s.outstanding/1000).toFixed(1)}k</button>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function openSupplierModal() { Toast.info('Supplier form opening...'); }

// ─── ACCOUNTING MODULE ────────────────────────────────────────
function renderAccounting() {
  const income = DemoData.transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense = DemoData.transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);

  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div><div class="page-heading">Accounting</div></div>
      <div style="display:flex;gap:var(--space-3)">
        <button class="btn btn-secondary" onclick="exportCSV(DemoData.transactions,'transactions.csv');Toast.success('Exported!')">Export</button>
        <button class="btn btn-primary" onclick="openTransactionModal()">+ Add Transaction</button>
      </div>
    </div>

    <!-- P&L Summary -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-4);margin-bottom:var(--space-6)">
      <div class="stat-card"><div style="color:var(--color-text-secondary);font-size:var(--text-xs);font-weight:600;text-transform:uppercase;margin-bottom:var(--space-1)">Total Income</div><div style="font-size:var(--text-2xl);font-weight:700;color:var(--color-success-400)">${Format.currency(income)}</div></div>
      <div class="stat-card"><div style="color:var(--color-text-secondary);font-size:var(--text-xs);font-weight:600;text-transform:uppercase;margin-bottom:var(--space-1)">Total Expense</div><div style="font-size:var(--text-2xl);font-weight:700;color:var(--color-danger-400)">${Format.currency(expense)}</div></div>
      <div class="stat-card"><div style="color:var(--color-text-secondary);font-size:var(--text-xs);font-weight:600;text-transform:uppercase;margin-bottom:var(--space-1)">Net Profit</div><div style="font-size:var(--text-2xl);font-weight:700;color:${income-expense>0?'var(--color-brand-400)':'var(--color-danger-400)'}">${Format.currency(income-expense)}</div></div>
    </div>

    <!-- Transactions Table -->
    <div class="panel-card">
      <div style="overflow-x:auto">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Reference</th><th>Amount</th></tr></thead>
          <tbody>
            ${DemoData.transactions.map(t=>`
              <tr>
                <td style="font-size:var(--text-xs)">${Format.date(t.date)}</td>
                <td><span class="badge badge-${t.type==='income'?'success':'danger'}">${t.type}</span></td>
                <td><span class="chip">${t.category}</span></td>
                <td style="font-size:var(--text-sm)">${t.description}</td>
                <td style="font-size:var(--text-xs);color:var(--color-text-secondary);font-family:monospace">${t.ref}</td>
                <td style="font-weight:700;${t.type==='income'?'color:var(--color-success-400)':'color:var(--color-danger-400)'}">${t.type==='income'?'+':'-'}${Format.currency(t.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openTransactionModal() {
  Modal.create({
    title: 'Record Transaction',
    body: `
      <div class="form-group"><label class="form-label">Type *</label>
        <select id="tr-type" class="form-select"><option value="income">Income</option><option value="expense">Expense</option></select>
      </div>
      <div class="form-group"><label class="form-label">Category *</label>
        <select id="tr-cat" class="form-select">
          <option>Sales</option><option>Purchase</option><option>Rent</option><option>Utilities</option><option>Salary</option><option>Other</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Description *</label><input type="text" id="tr-desc" class="form-input" /></div>
      <div class="form-group"><label class="form-label">Amount (₹) *</label><input type="number" id="tr-amount" class="form-input" min="0" step="0.01" /></div>
      <div class="form-group"><label class="form-label">Date</label><input type="date" id="tr-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" /></div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="saveTransaction()">Save</button>
    `
  });
}

function saveTransaction() {
  const type = document.getElementById('tr-type')?.value;
  const amount = parseFloat(document.getElementById('tr-amount')?.value);
  const desc = document.getElementById('tr-desc')?.value?.trim();
  if (!desc||!amount) { Toast.error('Description and amount are required'); return; }
  DemoData.transactions.unshift({ id:'T'+Date.now(), date:document.getElementById('tr-date')?.value, type, category:document.getElementById('tr-cat')?.value, description:desc, amount, ref:'MANUAL' });
  document.querySelector('.modal-backdrop')?.remove();
  Toast.success('Transaction recorded!');
  renderAccounting();
}

// ─── NOTIFICATIONS MODULE ──────────────────────────────────────
function renderNotifications() {
  document.getElementById('page-body').innerHTML = `
    <div style="max-width:680px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-6)">
        <div class="page-heading">All Notifications</div>
        <button class="btn btn-secondary" onclick="markAllRead();renderNotifications()">Mark All Read</button>
      </div>
      ${DemoData.notifications.map(n => `
        <div class="panel-card" style="margin-bottom:var(--space-3);${!n.read?'border-left:3px solid var(--color-brand-500)':''}">
          <div style="display:flex;gap:var(--space-4);padding:var(--space-4)">
            <div style="width:44px;height:44px;border-radius:var(--radius-xl);background:${n.type==='warning'?'rgba(234,179,8,0.15)':n.type==='success'?'rgba(34,197,94,0.15)':'rgba(99,102,241,0.15)'};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${n.icon}</div>
            <div style="flex:1">
              <div style="font-weight:${n.read?'500':'700'};margin-bottom:4px">${n.title}</div>
              <div style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:4px">${n.message}</div>
              <div style="font-size:var(--text-xs);color:var(--color-text-tertiary)">${Format.relativeTime(n.time)}</div>
            </div>
            ${!n.read?`<div class="status-dot status-online" style="flex-shrink:0;margin-top:6px"></div>`:''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ─── SETTINGS MODULE ──────────────────────────────────────────
function renderSettings() {
  const user = Auth.getUser() || {};

  document.getElementById('page-body').innerHTML = `
    <div style="display:grid;grid-template-columns:220px 1fr;gap:var(--space-6)">

      <!-- Settings Nav -->
      <div>
        ${['Business Profile','Store Settings','Users & Roles','Tax & GST','Payment Methods','Notifications','Security','Integrations','Billing & Plan'].map((s,i) => `
          <button onclick="showSettingsSection('${s}')" class="nav-item" style="width:100%;border-radius:var(--radius-lg);margin-bottom:4px;text-align:left;${i===0?'background:rgba(99,102,241,0.1);color:var(--color-brand-400)':''}">${s}</button>
        `).join('')}
      </div>

      <!-- Settings Content -->
      <div>
        <div class="panel-card" style="padding:var(--space-8)">
          <h3 style="font-family:var(--font-display);font-size:var(--text-xl);font-weight:700;margin-bottom:var(--space-6)">Business Profile</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
            <div class="form-group"><label class="form-label">Business Name</label><input type="text" class="form-input" value="${user.business||'My Business'}" /></div>
            <div class="form-group"><label class="form-label">Business Type</label><select class="form-select"><option>Grocery Store</option><option>Pharmacy</option><option>Restaurant</option><option>Hostel</option><option>School</option></select></div>
            <div class="form-group"><label class="form-label">Owner Name</label><input type="text" class="form-input" value="${user.name||''}" /></div>
            <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" value="${user.email||''}" /></div>
            <div class="form-group"><label class="form-label">Phone</label><input type="tel" class="form-input" placeholder="+91 9876543210" /></div>
            <div class="form-group"><label class="form-label">GSTIN</label><input type="text" class="form-input" placeholder="27AABCN1234Z1ZI" /></div>
            <div class="form-group" style="grid-column:1/-1"><label class="form-label">Address</label><input type="text" class="form-input" placeholder="Shop address" /></div>
            <div class="form-group"><label class="form-label">Currency</label><select class="form-select"><option value="INR">₹ INR (Indian Rupee)</option><option value="USD">$ USD</option></select></div>
            <div class="form-group"><label class="form-label">Financial Year</label><select class="form-select"><option>April - March</option><option>January - December</option></select></div>
          </div>
          <button class="btn btn-primary" style="margin-top:var(--space-6)" onclick="Toast.success('Settings saved successfully!')">💾 Save Changes</button>
        </div>

        <!-- Danger Zone -->
        <div class="panel-card" style="padding:var(--space-6);margin-top:var(--space-4);border-color:rgba(239,68,68,0.3)">
          <h4 style="color:var(--color-danger-400);margin-bottom:var(--space-4)">⚠️ Danger Zone</h4>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-weight:600;font-size:var(--text-sm)">Sign Out from All Devices</div>
              <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">This will invalidate all active sessions</div>
            </div>
            <button class="btn btn-danger" onclick="Auth.clearSession();window.location.href='index.html'">Sign Out</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function showSettingsSection(name) { Toast.info(`Opening ${name} settings...`); }
