/**
 * tutorials.js
 *
 * NexaERP Interactive Tutorial Engine
 *
 * Provides guided step-by-step walkthroughs that highlight UI elements,
 * show contextual tooltips, and track completion via the backend API.
 *
 * Public API:
 *   TutorialEngine.init(options?)       — Boot the engine (loads progress, renders launcher)
 *   TutorialEngine.start(tutorialId)    — Launch a specific tutorial by ID
 *   TutorialEngine.openMenu()           — Show the tutorial menu
 *   TutorialEngine.closeMenu()          — Hide the tutorial menu
 *   TutorialEngine.destroy()            — Tear down all DOM and event listeners
 *
 * Requirements: 28.3
 */

(function (global) {
  'use strict';

  // ── Seed tutorials (used when the API is unavailable / unauthenticated) ────

  const SEED_TUTORIALS = [
    {
      id: 'seed-inventory-basics',
      title: 'Inventory Basics',
      description: 'Learn how to add, edit, and track products in your inventory.',
      slug: 'inventory-basics',
      module: 'inventory',
      category: 'getting-started',
      tags: ['inventory', 'products', 'stock'],
      sortOrder: 1,
      isActive: true,
      steps: [
        {
          id: 'seed-inv-1',
          stepNumber: 1,
          title: 'Open the Inventory Module',
          content:
            'Click **Inventory** in the left sidebar to open the inventory management panel.',
          targetSelector: '[data-module="inventory"], [href="#inventory"], .nav-item[data-section="inventory"]',
          placement: 'right',
          route: '/dashboard',
        },
        {
          id: 'seed-inv-2',
          stepNumber: 2,
          title: 'Add a New Product',
          content:
            'Click the **"+ Add Product"** button to open the product creation form. Fill in the name, SKU, price, and stock level.',
          targetSelector: '#add-product-btn, .add-product-btn, [data-action="add-product"]',
          placement: 'bottom',
          route: '/dashboard',
        },
        {
          id: 'seed-inv-3',
          stepNumber: 3,
          title: 'Set Reorder Alerts',
          content:
            'In the product form, set a **Minimum Stock** threshold. NexaERP will alert you when stock drops below this level.',
          targetSelector: '#min-stock, [name="minStock"], .min-stock-field',
          placement: 'top',
          route: '/dashboard',
        },
        {
          id: 'seed-inv-4',
          stepNumber: 4,
          title: 'Search & Filter Products',
          content:
            'Use the **search bar** at the top of the inventory table to quickly find products by name or SKU. Apply category filters from the dropdown.',
          targetSelector: '#inventory-search, .inventory-search, [data-search="inventory"]',
          placement: 'bottom',
          route: '/dashboard',
        },
      ],
    },
    {
      id: 'seed-pos-checkout',
      title: 'POS & Checkout',
      description: 'Complete your first sale using the Point of Sale module.',
      slug: 'pos-checkout',
      module: 'pos',
      category: 'getting-started',
      tags: ['pos', 'billing', 'sales'],
      sortOrder: 1,
      isActive: true,
      steps: [
        {
          id: 'seed-pos-1',
          stepNumber: 1,
          title: 'Open the POS Module',
          content:
            'Click **POS / Billing** in the sidebar to launch the Point of Sale interface.',
          targetSelector: '[data-module="pos"], [href="#pos"], .nav-item[data-section="pos"]',
          placement: 'right',
          route: '/dashboard',
        },
        {
          id: 'seed-pos-2',
          stepNumber: 2,
          title: 'Scan or Search Products',
          content:
            'Type a product name or scan a barcode in the **product search** field to add items to the current order.',
          targetSelector: '#pos-search, .pos-search, [data-pos="search"]',
          placement: 'bottom',
          route: '/dashboard',
        },
        {
          id: 'seed-pos-3',
          stepNumber: 3,
          title: 'Review the Cart',
          content:
            'The right panel shows your cart. You can adjust quantities, apply discounts, or remove items before checkout.',
          targetSelector: '.pos-cart, #pos-cart, [data-pos="cart"]',
          placement: 'left',
          route: '/dashboard',
        },
        {
          id: 'seed-pos-4',
          stepNumber: 4,
          title: 'Process Payment',
          content:
            'Click **Charge** to select a payment method (cash, card, UPI). A GST-compliant invoice is generated automatically.',
          targetSelector: '#charge-btn, .charge-btn, [data-action="charge"]',
          placement: 'top',
          route: '/dashboard',
        },
      ],
    },
    {
      id: 'seed-orders-overview',
      title: 'Sales & Purchase Orders',
      description: 'Create and manage sales orders and supplier purchase orders.',
      slug: 'orders-overview',
      module: 'orders',
      category: 'getting-started',
      tags: ['orders', 'sales', 'purchase'],
      sortOrder: 1,
      isActive: true,
      steps: [
        {
          id: 'seed-ord-1',
          stepNumber: 1,
          title: 'Navigate to Orders',
          content:
            'Click **Orders** in the sidebar. You will see two tabs: **Sales Orders** and **Purchase Orders**.',
          targetSelector: '[data-module="orders"], [href="#orders"], .nav-item[data-section="orders"]',
          placement: 'right',
          route: '/dashboard',
        },
        {
          id: 'seed-ord-2',
          stepNumber: 2,
          title: 'Create a Sales Order',
          content:
            'Under the **Sales Orders** tab, click **"+ New Order"**. Select a customer, add products, and confirm the order.',
          targetSelector: '#new-sales-order-btn, .new-order-btn, [data-action="new-order"]',
          placement: 'bottom',
          route: '/dashboard',
        },
        {
          id: 'seed-ord-3',
          stepNumber: 3,
          title: 'Track Order Status',
          content:
            'Each order displays a **status badge** (Pending → Confirmed → Shipped → Delivered). Click any row to view or update the status.',
          targetSelector: '.order-status, .orders-table, #orders-list',
          placement: 'top',
          route: '/dashboard',
        },
      ],
    },
    {
      id: 'seed-crm-leads',
      title: 'CRM & Customer Management',
      description: 'Add customers, manage leads, and track loyalty points.',
      slug: 'crm-leads',
      module: 'crm',
      category: 'getting-started',
      tags: ['crm', 'customers', 'leads'],
      sortOrder: 1,
      isActive: true,
      steps: [
        {
          id: 'seed-crm-1',
          stepNumber: 1,
          title: 'Open CRM',
          content: 'Click **CRM** in the sidebar to access customer and lead management.',
          targetSelector: '[data-module="crm"], [href="#crm"], .nav-item[data-section="crm"]',
          placement: 'right',
          route: '/dashboard',
        },
        {
          id: 'seed-crm-2',
          stepNumber: 2,
          title: 'Add a Customer',
          content:
            'Click **"+ New Customer"** and fill in their name, phone, and email. You can also assign loyalty tier and notes.',
          targetSelector: '#new-customer-btn, .new-customer-btn, [data-action="new-customer"]',
          placement: 'bottom',
          route: '/dashboard',
        },
        {
          id: 'seed-crm-3',
          stepNumber: 3,
          title: 'View Loyalty Points',
          content:
            'Each customer card shows their **loyalty point balance**. Points are auto-awarded on POS transactions.',
          targetSelector: '.loyalty-points, .customer-loyalty, [data-field="loyaltyPoints"]',
          placement: 'top',
          route: '/dashboard',
        },
      ],
    },
    {
      id: 'seed-accounting-basics',
      title: 'Accounting Basics',
      description: 'Record income and expenses, and view your P&L statement.',
      slug: 'accounting-basics',
      module: 'accounting',
      category: 'getting-started',
      tags: ['accounting', 'finance', 'reports'],
      sortOrder: 1,
      isActive: true,
      steps: [
        {
          id: 'seed-acc-1',
          stepNumber: 1,
          title: 'Open Accounting',
          content: 'Click **Accounting** in the sidebar to open the income/expense ledger.',
          targetSelector: '[data-module="accounting"], [href="#accounting"], .nav-item[data-section="accounting"]',
          placement: 'right',
          route: '/dashboard',
        },
        {
          id: 'seed-acc-2',
          stepNumber: 2,
          title: 'Add an Expense',
          content:
            'Click **"+ Add Entry"** and choose **Expense**. Enter the amount, category (rent, salaries, utilities), and date.',
          targetSelector: '#add-entry-btn, .add-entry-btn, [data-action="add-entry"]',
          placement: 'bottom',
          route: '/dashboard',
        },
        {
          id: 'seed-acc-3',
          stepNumber: 3,
          title: 'View P&L Report',
          content:
            'Click the **P&L Report** tab to see a summary of income vs. expenses for any date range.',
          targetSelector: '.pl-report-tab, [data-tab="pl-report"], #pl-tab',
          placement: 'top',
          route: '/dashboard',
        },
      ],
    },
  ];

  // ── Constants ─────────────────────────────────────────────────────────────

  const MODULE_ICONS = {
    inventory: '📦',
    pos: '🛒',
    orders: '📋',
    crm: '👥',
    accounting: '💰',
    hrms: '👤',
    analytics: '📊',
    default: '🎓',
  };

  const PLACEMENT_OFFSETS = {
    bottom: { tooltipTop: 16, tooltipLeft: 0 },
    top: { tooltipTop: -16, tooltipLeft: 0 },
    left: { tooltipTop: 0, tooltipLeft: -16 },
    right: { tooltipTop: 0, tooltipLeft: 16 },
    center: { tooltipTop: 0, tooltipLeft: 0 },
  };

  // ── State ─────────────────────────────────────────────────────────────────

  let _state = {
    initialized: false,
    tutorials: [],      // All tutorials (from API or seed)
    progress: {},       // { [tutorialId]: TutorialProgressSummary }
    active: null,       // Currently running tutorial object
    stepIndex: 0,       // 0-based index into active.steps
    menuOpen: false,
    token: null,        // JWT for API calls
    apiBase: '/api/tutorials',
  };

  // ── DOM references ────────────────────────────────────────────────────────

  let _dom = {
    overlay: null,
    spotlightRing: null,
    blocker: null,
    tooltip: null,
    launcher: null,
    menuBackdrop: null,
    menu: null,
  };

  // ── Utility helpers ───────────────────────────────────────────────────────

  function _getToken() {
    return (
      _state.token ||
      localStorage.getItem('nexaerp_token') ||
      sessionStorage.getItem('nexaerp_token') ||
      null
    );
  }

  async function _apiFetch(path, options = {}) {
    const token = _getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(_state.apiBase + path, {
        ...options,
        headers: { ...headers, ...(options.headers || {}) },
      });
      return res.json();
    } catch {
      return null;
    }
  }

  function _el(tag, cls, attrs = {}) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    Object.assign(node, attrs);
    return node;
  }

  function _parseMarkdown(text) {
    // Very light Markdown: bold, italic, inline code
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
  }

  function _getRect(selector) {
    if (!selector) return null;
    try {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return null;
      return r;
    } catch {
      return null;
    }
  }

  // ── API helpers ───────────────────────────────────────────────────────────

  async function _loadTutorials() {
    const res = await _apiFetch('?pageSize=100');
    if (res?.success && Array.isArray(res.data?.tutorials)) {
      _state.tutorials = res.data.tutorials;
    } else {
      // Fall back to seed data so the tutorial system works even offline
      _state.tutorials = SEED_TUTORIALS;
    }
  }

  async function _loadProgress() {
    const token = _getToken();
    if (!token) return;

    const res = await _apiFetch('/progress');
    if (res?.success && Array.isArray(res.data)) {
      _state.progress = {};
      res.data.forEach((p) => {
        _state.progress[p.tutorialId] = p;
      });
    }
  }

  async function _apiStartTutorial(tutorialId) {
    const token = _getToken();
    if (!token) return null;
    return _apiFetch(`/${tutorialId}/start`, { method: 'POST' });
  }

  async function _apiCompleteStep(tutorialId, stepId) {
    const token = _getToken();
    if (!token) return null;
    return _apiFetch(`/${tutorialId}/steps/${stepId}/complete`, { method: 'POST' });
  }

  async function _apiSkipTutorial(tutorialId) {
    const token = _getToken();
    if (!token) return null;
    return _apiFetch(`/${tutorialId}/skip`, { method: 'POST' });
  }

  // ── DOM construction ──────────────────────────────────────────────────────

  function _buildOverlay() {
    _dom.overlay = _el('div', 'tutorial-overlay');
    _dom.blocker = _el('div', 'tutorial-blocker');
    _dom.spotlightRing = _el('div', 'tutorial-spotlight-ring');
    _dom.tooltip = _el('div', 'tutorial-tooltip');
    _dom.tooltip.setAttribute('role', 'dialog');
    _dom.tooltip.setAttribute('aria-modal', 'true');
    _dom.tooltip.setAttribute('aria-label', 'Tutorial step');

    document.body.appendChild(_dom.overlay);
    document.body.appendChild(_dom.blocker);
    document.body.appendChild(_dom.spotlightRing);
    document.body.appendChild(_dom.tooltip);
  }

  function _buildLauncher() {
    _dom.launcher = _el('button', 'tutorial-launcher');
    _dom.launcher.setAttribute('aria-label', 'Open tutorial menu');
    _dom.launcher.innerHTML = `
      <span class="tutorial-launcher__icon">🎓</span>
      <span class="tutorial-launcher__label">Tutorials</span>
    `;
    _dom.launcher.addEventListener('click', () => TutorialEngine.openMenu());
    document.body.appendChild(_dom.launcher);
    _updateLauncherBadge();
  }

  function _updateLauncherBadge() {
    if (!_dom.launcher) return;

    const incomplete = _state.tutorials.filter((t) => {
      const p = _state.progress[t.id];
      return !p || (p.status !== 'completed' && p.status !== 'skipped');
    }).length;

    let badge = _dom.launcher.querySelector('.tutorial-launcher__count');
    if (incomplete > 0) {
      if (!badge) {
        badge = _el('span', 'tutorial-launcher__count');
        _dom.launcher.appendChild(badge);
      }
      badge.textContent = incomplete;
    } else if (badge) {
      badge.remove();
    }
  }

  function _buildMenu() {
    _dom.menuBackdrop = _el('div', 'tutorial-menu-backdrop');
    _dom.menuBackdrop.addEventListener('click', () => TutorialEngine.closeMenu());

    _dom.menu = _el('div', 'tutorial-menu');
    _dom.menu.setAttribute('role', 'dialog');
    _dom.menu.setAttribute('aria-label', 'Tutorial menu');

    document.body.appendChild(_dom.menuBackdrop);
    document.body.appendChild(_dom.menu);
  }

  function _renderMenu() {
    if (!_dom.menu) return;

    const completedCount = Object.values(_state.progress).filter(
      (p) => p.status === 'completed'
    ).length;
    const total = _state.tutorials.length;
    const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    // Group by module
    const groups = {};
    _state.tutorials.forEach((t) => {
      if (!groups[t.module]) groups[t.module] = [];
      groups[t.module].push(t);
    });

    let listHtml = '';
    Object.keys(groups)
      .sort()
      .forEach((mod) => {
        const icon = MODULE_ICONS[mod] || MODULE_ICONS.default;
        const label = mod.charAt(0).toUpperCase() + mod.slice(1);
        listHtml += `<div class="tutorial-menu__group-label">${icon} ${label}</div>`;

        groups[mod].forEach((t) => {
          const prog = _state.progress[t.id];
          const status = prog?.status ?? 'not_started';
          const steps = t._count?.steps ?? t.steps?.length ?? '?';

          const statusLabel = {
            not_started: 'Start',
            in_progress: 'Continue',
            completed: 'Replay',
            skipped: 'Resume',
          }[status] || 'Start';

          const statusClass = `tutorial-menu__item-status--${status.replace('_', '-')}`;
          const iconClass = status === 'completed' ? 'tutorial-menu__item-icon--done' : '';
          const itemIcon = status === 'completed' ? '✅' : icon;

          listHtml += `
            <button class="tutorial-menu__item" data-tutorial-id="${t.id}" aria-label="${t.title}">
              <div class="tutorial-menu__item-icon ${iconClass}">${itemIcon}</div>
              <div class="tutorial-menu__item-info">
                <div class="tutorial-menu__item-title">${t.title}</div>
                <div class="tutorial-menu__item-meta">${steps} steps${t.description ? ' · ' + t.description.substring(0, 45) + '…' : ''}</div>
              </div>
              <span class="tutorial-menu__item-status ${statusClass}">${statusLabel}</span>
            </button>`;
        });
      });

    _dom.menu.innerHTML = `
      <div class="tutorial-menu__header">
        <h2 class="tutorial-menu__title">🎓 Guided Tutorials</h2>
        <button class="tutorial-menu__close" aria-label="Close tutorial menu">✕</button>
      </div>
      <div class="tutorial-menu__summary">
        <div class="tutorial-menu__summary-text">${completedCount} of ${total} tutorials completed</div>
        <div class="tutorial-menu__summary-track">
          <div class="tutorial-menu__summary-fill" style="width:${pct}%"></div>
        </div>
      </div>
      <div class="tutorial-menu__list">${listHtml}</div>
    `;

    _dom.menu.querySelector('.tutorial-menu__close').addEventListener('click', () =>
      TutorialEngine.closeMenu()
    );

    _dom.menu.querySelectorAll('.tutorial-menu__item').forEach((btn) => {
      btn.addEventListener('click', async () => {
        TutorialEngine.closeMenu();
        const tutId = btn.dataset.tutorialId;
        const prog = _state.progress[tutId];
        if (prog?.status === 'completed') {
          // Reset then restart for replay
          await _apiFetch(`/${tutId}/reset`, { method: 'POST' });
          _state.progress[tutId] = null;
        }
        await TutorialEngine.start(tutId);
      });
    });
  }

  // ── Tooltip rendering ─────────────────────────────────────────────────────

  function _renderStep() {
    if (!_state.active) return;

    const tutorial = _state.active;
    const steps = tutorial.steps;
    const step = steps[_state.stepIndex];
    const totalSteps = steps.length;
    const currentNum = _state.stepIndex + 1;
    const pct = Math.round((currentNum / totalSteps) * 100);
    const placement = step.placement || 'bottom';
    const isLast = _state.stepIndex === totalSteps - 1;

    _dom.tooltip.setAttribute('data-placement', placement);
    _dom.tooltip.innerHTML = `
      <div class="tutorial-tooltip__header">
        <span class="tutorial-tooltip__badge">
          <span class="tutorial-tooltip__badge-dot"></span>
          Step ${currentNum} of ${totalSteps}
        </span>
        <button class="tutorial-tooltip__close" aria-label="Close tutorial">✕</button>
      </div>
      ${step.mediaUrl ? `<img class="tutorial-tooltip__media" src="${step.mediaUrl}" alt="" loading="lazy">` : ''}
      <h3 class="tutorial-tooltip__title">${step.title}</h3>
      <p class="tutorial-tooltip__content">${_parseMarkdown(step.content)}</p>
      <div class="tutorial-tooltip__progress">
        <div class="tutorial-tooltip__progress-label">
          <span>Progress</span><span>${pct}%</span>
        </div>
        <div class="tutorial-tooltip__progress-track">
          <div class="tutorial-tooltip__progress-fill" style="width:${pct}%"></div>
        </div>
      </div>
      <div class="tutorial-tooltip__nav">
        ${_state.stepIndex > 0 ? '<button class="tutorial-tooltip__btn tutorial-tooltip__btn--secondary" data-action="prev">← Back</button>' : ''}
        <button class="tutorial-tooltip__btn tutorial-tooltip__btn--primary" data-action="next">
          ${isLast ? '🎉 Finish' : 'Next →'}
        </button>
        <button class="tutorial-tooltip__btn--skip" data-action="skip">Skip tutorial</button>
      </div>
    `;

    _dom.tooltip.querySelector('[data-action="next"]').addEventListener('click', _onNext);
    _dom.tooltip.querySelector('[data-action="skip"]').addEventListener('click', _onSkip);
    _dom.tooltip.querySelector('.tutorial-tooltip__close').addEventListener('click', _onClose);
    const prevBtn = _dom.tooltip.querySelector('[data-action="prev"]');
    if (prevBtn) prevBtn.addEventListener('click', _onPrev);

    _positionTooltip(step);
  }

  function _positionTooltip(step) {
    const placement = step.placement || 'bottom';
    const rect = _getRect(step.targetSelector);

    if (!rect || placement === 'center') {
      // Center modal style
      _dom.overlay.classList.add('tutorial-overlay--full');
      _dom.spotlightRing.style.display = 'none';
      _dom.blocker.style.pointerEvents = 'none';

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const tw = Math.min(340, vw - 32);
      _dom.tooltip.style.width = tw + 'px';
      _dom.tooltip.style.left = (vw - tw) / 2 + 'px';
      _dom.tooltip.style.top = (vh - 300) / 2 + 'px';
      _dom.tooltip.style.display = 'block';
      return;
    }

    _dom.overlay.classList.remove('tutorial-overlay--full');

    // Update spotlight gradient via CSS custom properties
    const padX = 12;
    const padY = 8;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    _dom.overlay.style.setProperty('--spotlight-w', (rect.width / 2 + padX) + 'px');
    _dom.overlay.style.setProperty('--spotlight-h', (rect.height / 2 + padY) + 'px');
    _dom.overlay.style.setProperty('--spotlight-cx', cx + 'px');
    _dom.overlay.style.setProperty('--spotlight-cy', cy + 'px');

    // Position spotlight ring
    _dom.spotlightRing.style.display = 'block';
    _dom.spotlightRing.style.left = (rect.left - padX) + 'px';
    _dom.spotlightRing.style.top = (rect.top - padY) + 'px';
    _dom.spotlightRing.style.width = (rect.width + padX * 2) + 'px';
    _dom.spotlightRing.style.height = (rect.height + padY * 2) + 'px';

    // Position tooltip
    const tw = Math.min(340, window.innerWidth - 32);
    let left = rect.left;
    let top = rect.top;

    if (placement === 'bottom') {
      top = rect.bottom + 16;
      left = rect.left;
    } else if (placement === 'top') {
      top = rect.top - 16 - 280; // approx tooltip height
      left = rect.left;
    } else if (placement === 'right') {
      top = rect.top;
      left = rect.right + 16;
    } else if (placement === 'left') {
      top = rect.top;
      left = rect.left - tw - 16;
    }

    // Clamp to viewport
    left = Math.max(16, Math.min(left, window.innerWidth - tw - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - 300));

    _dom.tooltip.style.width = tw + 'px';
    _dom.tooltip.style.left = left + 'px';
    _dom.tooltip.style.top = top + 'px';
    _dom.tooltip.style.display = 'block';

    // Scroll target element into view smoothly
    try {
      document.querySelector(step.targetSelector)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch { /* ignore */ }
  }

  function _showComplete() {
    _dom.overlay.classList.add('tutorial-overlay--full');
    _dom.spotlightRing.style.display = 'none';
    _dom.blocker.style.pointerEvents = 'none';

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tw = Math.min(340, vw - 32);
    _dom.tooltip.style.width = tw + 'px';
    _dom.tooltip.style.left = (vw - tw) / 2 + 'px';
    _dom.tooltip.style.top = (vh - 260) / 2 + 'px';
    _dom.tooltip.setAttribute('data-placement', 'center');
    _dom.tooltip.classList.add('tutorial-tooltip--complete');

    _dom.tooltip.innerHTML = `
      <div class="tutorial-tooltip__complete-icon">🎉</div>
      <h3 class="tutorial-tooltip__title">Tutorial Complete!</h3>
      <p class="tutorial-tooltip__content">
        You've finished <strong>${_state.active.title}</strong>. 
        Explore other tutorials to master NexaERP.
      </p>
      <div class="tutorial-tooltip__nav">
        <button class="tutorial-tooltip__btn tutorial-tooltip__btn--secondary" data-action="close">Done</button>
        <button class="tutorial-tooltip__btn tutorial-tooltip__btn--primary" data-action="open-menu">Browse Tutorials</button>
      </div>
    `;

    _dom.tooltip.querySelector('[data-action="close"]').addEventListener('click', _onClose);
    _dom.tooltip.querySelector('[data-action="open-menu"]').addEventListener('click', () => {
      _teardownActive();
      TutorialEngine.openMenu();
    });
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  async function _onNext() {
    if (!_state.active) return;

    const step = _state.active.steps[_state.stepIndex];

    // Fire-and-forget progress tracking
    _apiCompleteStep(_state.active.id, step.id);

    // Update local progress cache
    const p = _state.progress[_state.active.id] || { completedSteps: 0, totalSteps: _state.active.steps.length };
    p.status = 'in_progress';
    p.completedSteps = (_state.stepIndex + 1);
    p.currentStep = _state.stepIndex + 2;
    _state.progress[_state.active.id] = p;

    if (_state.stepIndex >= _state.active.steps.length - 1) {
      // Last step → show completion screen
      _state.progress[_state.active.id].status = 'completed';
      _state.progress[_state.active.id].percentComplete = 100;
      _showComplete();
      _updateLauncherBadge();
    } else {
      _state.stepIndex++;
      _renderStep();
    }
  }

  function _onPrev() {
    if (!_state.active || _state.stepIndex === 0) return;
    _state.stepIndex--;
    _renderStep();
  }

  async function _onSkip() {
    if (!_state.active) return;
    await _apiSkipTutorial(_state.active.id);
    const p = _state.progress[_state.active.id] || {};
    p.status = 'skipped';
    _state.progress[_state.active.id] = p;
    _updateLauncherBadge();
    _teardownActive();
  }

  function _onClose() {
    _teardownActive();
  }

  function _onKeydown(e) {
    if (!_state.active) return;
    if (e.key === 'Escape') _teardownActive();
    if (e.key === 'ArrowRight' || e.key === 'Enter') {
      if (_state.active) _onNext();
    }
    if (e.key === 'ArrowLeft') {
      if (_state.stepIndex > 0) _onPrev();
    }
  }

  function _onResize() {
    if (!_state.active) return;
    _positionTooltip(_state.active.steps[_state.stepIndex]);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  function _showOverlay() {
    _dom.overlay.style.display = 'block';
    _dom.blocker.style.display = 'block';
    _dom.blocker.style.pointerEvents = 'all';
    _dom.tooltip.style.display = 'block';
    _dom.tooltip.classList.remove('tutorial-tooltip--complete');
    document.addEventListener('keydown', _onKeydown);
    window.addEventListener('resize', _onResize);
  }

  function _teardownActive() {
    _state.active = null;
    _state.stepIndex = 0;

    if (_dom.overlay) _dom.overlay.style.display = 'none';
    if (_dom.blocker) { _dom.blocker.style.display = 'none'; _dom.blocker.style.pointerEvents = 'none'; }
    if (_dom.spotlightRing) _dom.spotlightRing.style.display = 'none';
    if (_dom.tooltip) { _dom.tooltip.style.display = 'none'; _dom.tooltip.innerHTML = ''; }

    document.removeEventListener('keydown', _onKeydown);
    window.removeEventListener('resize', _onResize);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  const TutorialEngine = {

    /**
     * Initialize the tutorial engine.
     * Loads tutorials and progress, then renders the launcher button and menu.
     *
     * @param {object} [opts]
     * @param {string} [opts.token]      — JWT token (if not already in localStorage)
     * @param {string} [opts.apiBase]    — Override API base URL
     * @param {boolean} [opts.noLauncher] — Suppress the floating launcher button
     */
    async init(opts = {}) {
      if (_state.initialized) return;

      if (opts.token) _state.token = opts.token;
      if (opts.apiBase) _state.apiBase = opts.apiBase;

      // Build DOM elements
      _buildOverlay();
      _buildMenu();
      if (!opts.noLauncher) _buildLauncher();

      // Initially hidden
      _dom.overlay.style.display = 'none';
      _dom.blocker.style.display = 'none';
      _dom.spotlightRing.style.display = 'none';
      _dom.tooltip.style.display = 'none';

      // Load data
      await _loadTutorials();
      await _loadProgress();

      _renderMenu();
      _updateLauncherBadge();

      _state.initialized = true;
      console.log('[TutorialEngine] Initialized with', _state.tutorials.length, 'tutorials.');
    },

    /**
     * Launch a tutorial by its ID or slug.
     *
     * @param {string} tutorialId
     */
    async start(tutorialId) {
      if (!_state.initialized) await TutorialEngine.init();

      // Resolve from local cache first
      let tutorial = _state.tutorials.find(
        (t) => t.id === tutorialId || t.slug === tutorialId
      );

      if (!tutorial) {
        // Try fetching from API
        const res = await _apiFetch('/' + tutorialId);
        if (res?.success && res.data) {
          tutorial = res.data;
          // Normalise: if steps came from API they might not be nested
          if (!tutorial.steps) tutorial.steps = [];
        }
      }

      if (!tutorial || !Array.isArray(tutorial.steps) || tutorial.steps.length === 0) {
        console.warn('[TutorialEngine] Tutorial not found or has no steps:', tutorialId);
        return;
      }

      // Notify API of start
      _apiStartTutorial(tutorial.id);

      // Restore from previous progress if in_progress
      const prog = _state.progress[tutorial.id];
      let startStep = 0;
      if (prog?.status === 'in_progress' && prog.currentStep > 1) {
        startStep = Math.min(prog.currentStep - 1, tutorial.steps.length - 1);
      }

      _state.active = tutorial;
      _state.stepIndex = startStep;

      _showOverlay();
      _renderStep();
    },

    /**
     * Open the tutorial selection menu.
     */
    openMenu() {
      if (!_dom.menu) return;
      _renderMenu();
      _dom.menuBackdrop.classList.add('is-open');
      _dom.menu.classList.add('is-open');
      _state.menuOpen = true;
    },

    /**
     * Close the tutorial selection menu.
     */
    closeMenu() {
      if (!_dom.menu) return;
      _dom.menuBackdrop.classList.remove('is-open');
      _dom.menu.classList.remove('is-open');
      _state.menuOpen = false;
    },

    /**
     * Refresh tutorial and progress data from the API.
     */
    async refresh() {
      await _loadTutorials();
      await _loadProgress();
      _renderMenu();
      _updateLauncherBadge();
    },

    /**
     * Programmatically set the JWT token (e.g., after login).
     * @param {string} token
     */
    setToken(token) {
      _state.token = token;
    },

    /**
     * Retrieve the current progress snapshot.
     * @returns {object} map of tutorialId → progress summary
     */
    getProgress() {
      return { ..._state.progress };
    },

    /**
     * Return all loaded tutorials.
     * @returns {object[]}
     */
    getTutorials() {
      return [..._state.tutorials];
    },

    /**
     * Tear down the entire engine and remove all DOM elements.
     */
    destroy() {
      _teardownActive();

      [
        _dom.overlay,
        _dom.blocker,
        _dom.spotlightRing,
        _dom.tooltip,
        _dom.launcher,
        _dom.menuBackdrop,
        _dom.menu,
      ].forEach((el) => el?.remove());

      _dom = {};
      _state.initialized = false;
      _state.active = null;
      _state.tutorials = [];
      _state.progress = {};
    },
  };

  // Expose globally
  global.TutorialEngine = TutorialEngine;

  // Auto-init when the DOM is ready if a data attribute is present:
  // <body data-tutorials-autostart="true">
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _autoInit);
  } else {
    _autoInit();
  }

  function _autoInit() {
    if (document.body?.dataset?.tutorialsAutostart === 'true') {
      TutorialEngine.init();
    }
  }
})(window);
