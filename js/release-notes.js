/**
 * Release Notes Module
 *
 * Fetches and renders the NexaERP version changelog in a timeline layout.
 * Also handles the "What's New" login notification banner.
 *
 * Requirements: 28.6
 */

(function (global) {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────────────

  const API_BASE = global.NEXAERP_API || '/api';
  const RELEASE_NOTES_URL = `${API_BASE}/help/release-notes`;
  const LATEST_URL = `${API_BASE}/help/release-notes/latest`;

  /** localStorage key that stores the version the user last dismissed */
  const DISMISSED_KEY = 'nexaerp_whats_new_dismissed';

  // ── Internal State ─────────────────────────────────────────────────────────

  let _state = {
    notes: [],
    page: 1,
    pageSize: 10,
    totalPages: 1,
    filter: 'all',   // 'all' | 'major' | 'minor' | 'patch'
    loading: false,
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  function _formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function _timeAgo(dateStr) {
    const now = Date.now();
    const d = new Date(dateStr).getTime();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo ago`;
    return `${Math.floor(diff / 31536000)}y ago`;
  }

  function _escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── Render: skeleton loaders ───────────────────────────────────────────────

  function _renderSkeletons(container, count) {
    container.innerHTML = Array.from({ length: count }, () => `
      <div class="rn-skeleton" aria-hidden="true">
        <div class="rn-skeleton-line short" style="margin-bottom:12px"></div>
        <div class="rn-skeleton-line wide"></div>
        <div class="rn-skeleton-line mid"></div>
      </div>
    `).join('');
  }

  // ── Render: single release note card ──────────────────────────────────────

  function _renderCard(note, expanded) {
    const type = note.type || 'minor';
    const sections = Array.isArray(note.sections) ? note.sections : [];
    const isExpanded = expanded || sections.length <= 2;

    const sectionsHtml = sections.map(sec => `
      <div class="rn-section">
        <div class="rn-section-title">${_escape(sec.category)}</div>
        <ul class="rn-items" role="list">
          ${(sec.items || []).map(item => `<li>${_escape(item)}</li>`).join('')}
        </ul>
      </div>
    `).join('');

    const hasMore = sections.length > 0;

    return `
      <article
        class="rn-card ${isExpanded ? 'expanded' : ''}"
        data-id="${_escape(note.id)}"
        data-type="${_escape(type)}"
        aria-label="Release ${_escape(note.version)}: ${_escape(note.title)}"
      >
        <header class="rn-card-header">
          <span class="rn-version-badge ${_escape(type)}" aria-label="Version ${_escape(note.version)}">
            v${_escape(note.version)}
          </span>
          <div class="rn-card-meta">
            <h2 class="rn-card-title">${_escape(note.title)}</h2>
            <time class="rn-card-date" datetime="${_escape(note.releaseDate)}">
              ${_formatDate(note.releaseDate)} &middot; ${_timeAgo(note.releaseDate)}
            </time>
          </div>
          <span class="rn-type-pill ${_escape(type)}" aria-label="${_escape(type)} release">
            ${_escape(type)}
          </span>
        </header>

        <div class="rn-card-body">
          <p class="rn-summary">${_escape(note.summary)}</p>

          ${hasMore ? `
            <div class="rn-sections" role="list" aria-label="Change sections">
              ${sectionsHtml}
            </div>
            <button
              class="rn-toggle"
              aria-expanded="${isExpanded}"
              aria-label="${isExpanded ? 'Collapse' : 'Expand'} release details"
            >
              <svg class="rn-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="m6 9 6 6 6-6"/>
              </svg>
              ${isExpanded ? 'Show less' : 'Show all changes'}
            </button>
          ` : ''}
        </div>
      </article>
    `;
  }

  // ── Render: full timeline ──────────────────────────────────────────────────

  function _renderTimeline(container) {
    const notes = _state.notes;

    if (!notes.length) {
      container.innerHTML = `
        <div class="rn-empty" role="status">
          <svg class="rn-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
            <path d="M9 12h6M9 16h4"/>
          </svg>
          <p>No release notes found.</p>
        </div>
      `;
      return;
    }

    // Group by major version for visual separation
    let html = '<div class="rn-timeline" role="feed" aria-label="Release notes timeline">';
    notes.forEach((note, i) => {
      html += _renderCard(note, i === 0); // expand latest by default
    });
    html += '</div>';

    container.innerHTML = html;

    // Attach expand/collapse handlers
    container.querySelectorAll('.rn-toggle').forEach(btn => {
      btn.addEventListener('click', function () {
        const card = btn.closest('.rn-card');
        const isNowExpanded = card.classList.toggle('expanded');
        btn.setAttribute('aria-expanded', String(isNowExpanded));
        btn.innerHTML = `
          <svg class="rn-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="m6 9 6 6 6-6"/>
          </svg>
          ${isNowExpanded ? 'Show less' : 'Show all changes'}
        `;
      });
    });
  }

  // ── Render: pagination controls ───────────────────────────────────────────

  function _renderPagination(paginationEl) {
    if (_state.totalPages <= 1) {
      paginationEl.innerHTML = '';
      return;
    }

    let html = '';
    const prev = _state.page - 1;
    const next = _state.page + 1;

    html += `<button class="rn-page-btn" ${prev < 1 ? 'disabled' : ''} data-page="${prev}" aria-label="Previous page">&#8249;</button>`;
    for (let p = 1; p <= _state.totalPages; p++) {
      html += `<button class="rn-page-btn ${p === _state.page ? 'active' : ''}" data-page="${p}" aria-label="Page ${p}" aria-current="${p === _state.page ? 'page' : 'false'}">${p}</button>`;
    }
    html += `<button class="rn-page-btn" ${next > _state.totalPages ? 'disabled' : ''} data-page="${next}" aria-label="Next page">&#8250;</button>`;

    paginationEl.innerHTML = html;

    paginationEl.querySelectorAll('.rn-page-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', function () {
        _state.page = parseInt(btn.dataset.page, 10);
        _loadNotes();
      });
    });
  }

  // ── Data fetching ──────────────────────────────────────────────────────────

  async function _loadNotes() {
    if (_state.loading) return;
    _state.loading = true;

    const container = document.getElementById('rn-timeline-container');
    const paginationEl = document.getElementById('rn-pagination');
    if (!container) { _state.loading = false; return; }

    _renderSkeletons(container, 3);

    try {
      const params = new URLSearchParams({
        page: String(_state.page),
        pageSize: String(_state.pageSize),
      });

      const res = await fetch(`${RELEASE_NOTES_URL}?${params}`);
      const json = await res.json();

      if (!json.success) throw new Error(json.error || 'Request failed');

      const result = json.data;
      let notes = result.notes || [];

      // Client-side type filter
      if (_state.filter !== 'all') {
        notes = notes.filter(n => n.type === _state.filter);
      }

      _state.notes = notes;
      _state.totalPages = result.totalPages || 1;

      _renderTimeline(container);
      if (paginationEl) _renderPagination(paginationEl);

    } catch (err) {
      console.warn('[ReleaseNotes] Failed to load from API, using demo data:', err.message);
      _state.notes = _getDemoNotes();
      _state.totalPages = 1;
      _renderTimeline(container);
      if (paginationEl) _renderPagination(paginationEl);
    } finally {
      _state.loading = false;
    }
  }

  // ── Demo / offline data ────────────────────────────────────────────────────

  function _getDemoNotes() {
    return [
      {
        id: 'demo-1',
        version: '1.3.0',
        title: 'Enterprise Security, Help Center & Notifications',
        releaseDate: '2024-08-05',
        summary: 'Delivers zero-trust security architecture, a full help center with tutorials and video training, real-time notifications, and multi-factor authentication.',
        type: 'minor',
        sections: [
          { category: '🚀 New Features', items: ['Help Center — searchable knowledge base, interactive tutorials, and video training library', 'Release Notes — in-app changelog with "What\'s New" login banner', 'Multi-Factor Authentication (TOTP / SMS / email)', 'Real-time in-app notifications with notification center'] },
          { category: '🐛 Bug Fixes', items: ['Fixed notification badge not resetting after marking all as read', 'Resolved tutorial progress not saving on mobile browsers'] },
          { category: '⚠️ Breaking Changes', items: ['JWT tokens now expire after 8 hours (previously 30 days) — users must re-login'] },
        ],
      },
      {
        id: 'demo-2',
        version: '1.2.0',
        title: 'Analytics, Reports & AI Assistant',
        releaseDate: '2024-05-22',
        summary: 'Introduces rich business analytics, GST report exports, a natural-language AI assistant, and multi-branch support.',
        type: 'minor',
        sections: [
          { category: '🚀 New Features', items: ['Analytics & Reports — revenue trend charts, category breakdown, export to PDF/Excel', 'GST report generation with GSTR-1 compatible CSV export', 'AI Assistant — natural language queries'] },
          { category: '🐛 Bug Fixes', items: ['Fixed chart data gap when no sales occur on a weekend', 'Resolved duplicate barcode entry not showing validation error'] },
        ],
      },
      {
        id: 'demo-3',
        version: '1.1.0',
        title: 'Accounting, CRM & Orders',
        releaseDate: '2024-03-10',
        summary: 'Adds a double-entry accounting ledger, customer relationship management with loyalty points, and purchase/sales order workflows.',
        type: 'minor',
        sections: [
          { category: '🚀 New Features', items: ['Accounting module — income/expense ledger, chart of accounts, and P&L statements', 'CRM module — lead pipeline, opportunity tracking, and customer loyalty points', 'Orders module — purchase orders with supplier management'] },
          { category: '🐛 Bug Fixes', items: ['Fixed rounding error in GST calculation for multi-item invoices'] },
        ],
      },
      {
        id: 'demo-4',
        version: '1.0.0',
        title: 'NexaERP — General Availability',
        releaseDate: '2024-01-15',
        summary: 'The first stable release of NexaERP brings a full-featured POS, real-time inventory tracking, and a modern glassmorphism dashboard.',
        type: 'major',
        sections: [
          { category: '🚀 New Features', items: ['Point-of-Sale (POS) module with touch-friendly billing and GST invoice generation', 'Real-time inventory management with low-stock alerts', 'Animated dashboard with revenue charts and KPI cards', 'Multi-role authentication — owner, manager, cashier'] },
        ],
      },
    ];
  }

  // ── Filter UI ──────────────────────────────────────────────────────────────

  function _initFilters() {
    const bar = document.getElementById('rn-filter-bar');
    if (!bar) return;

    bar.addEventListener('click', function (e) {
      const btn = e.target.closest('.rn-filter-btn');
      if (!btn) return;

      bar.querySelectorAll('.rn-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      _state.filter = btn.dataset.filter || 'all';
      _state.page = 1;
      _loadNotes();
    });
  }

  // ── "What's New" banner ────────────────────────────────────────────────────

  /**
   * showWhatsNew
   *
   * Fetches the latest published release note and shows a dismissable banner
   * if the user hasn't already seen it (tracked via localStorage).
   */
  async function showWhatsNew() {
    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY);

      // Attempt API fetch
      let note = null;
      try {
        const res = await fetch(LATEST_URL);
        const json = await res.json();
        if (json.success && json.data) note = json.data;
      } catch (_) {
        // Offline — use static demo fallback
        note = { version: '1.3.0', title: 'Enterprise Security, Help Center & Notifications', summary: 'Multi-Factor Authentication, real-time notifications, a full help center, and release notes are now live.', releaseDate: '2024-08-05' };
      }

      if (!note) return;
      if (dismissed === note.version) return; // already seen

      _renderWhatsNewBanner(note);
    } catch (err) {
      // Silently ignore — banner is non-critical
    }
  }

  function _renderWhatsNewBanner(note) {
    // Remove any existing banner
    const existing = document.getElementById('whats-new-banner');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'whats-new-banner';
    el.className = 'whats-new-banner';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', "What's New in NexaERP");
    el.innerHTML = `
      <div class="whats-new-header">
        <span class="whats-new-badge">✨ What's New</span>
        <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-left:6px;">v${_escape(note.version)}</span>
        <button class="whats-new-close" id="whats-new-close" aria-label="Dismiss what's new banner">✕</button>
      </div>
      <p class="whats-new-title">${_escape(note.title)}</p>
      <p class="whats-new-summary">${_escape(note.summary)}</p>
      <div class="whats-new-actions">
        <a href="docs.html#release-notes" class="whats-new-btn primary">See what changed</a>
        <button class="whats-new-btn secondary" id="whats-new-dismiss">Dismiss</button>
      </div>
    `;

    document.body.appendChild(el);

    function _dismiss() {
      el.classList.add('hiding');
      localStorage.setItem(DISMISSED_KEY, note.version);
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }

    document.getElementById('whats-new-close').addEventListener('click', _dismiss);
    document.getElementById('whats-new-dismiss').addEventListener('click', _dismiss);
  }

  // ── Public init ────────────────────────────────────────────────────────────

  /**
   * ReleaseNotes.init(containerSelector)
   *
   * Mounts the changelog UI inside the given container element.
   */
  function init(containerSelector) {
    const root = document.querySelector(containerSelector);
    if (!root) return;

    root.innerHTML = `
      <!-- Filter bar -->
      <div class="rn-filter-bar" id="rn-filter-bar" role="group" aria-label="Filter releases by type">
        <span class="rn-filter-label">Show:</span>
        <button class="rn-filter-btn active" data-filter="all">All releases</button>
        <button class="rn-filter-btn" data-filter="major">
          <span aria-hidden="true">🚀</span> Major
        </button>
        <button class="rn-filter-btn" data-filter="minor">
          <span aria-hidden="true">⚡</span> Minor
        </button>
        <button class="rn-filter-btn" data-filter="patch">
          <span aria-hidden="true">🔧</span> Patches
        </button>
      </div>

      <!-- Timeline -->
      <div id="rn-timeline-container" aria-live="polite" aria-label="Release notes"></div>

      <!-- Pagination -->
      <nav id="rn-pagination" class="rn-pagination" aria-label="Release notes pages"></nav>
    `;

    _initFilters();
    _loadNotes();
  }

  // ── Expose public API ──────────────────────────────────────────────────────

  global.ReleaseNotes = { init, showWhatsNew };

}(typeof window !== 'undefined' ? window : this));
