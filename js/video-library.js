/**
 * video-library.js
 *
 * NexaERP Video Training Library
 *
 * Renders a searchable, filterable grid of training videos grouped by module.
 * Supports YouTube/Vimeo embeds and direct video files via an in-page player.
 * Tracks recently-watched videos in localStorage.
 *
 * Public API:
 *   VideoLibrary.init(containerSelector, options?)  — Mount the library into a container
 *   VideoLibrary.destroy()                          — Tear down all DOM and listeners
 *   VideoLibrary.refresh()                          — Reload videos from the API
 *
 * Requirements: 28.4, 28.1
 */

(function (global) {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────────────

  const API_BASE = '/api/help/videos';
  const LS_KEY   = 'nexaerp_video_recently_watched'; // localStorage key
  const MAX_RECENT = 10;

  // ── Seed / fallback videos (used when no backend is available) ────────────

  const SEED_VIDEOS = [
    {
      id: 'seed-dash-1', module: 'Dashboard', title: 'Dashboard Overview',
      description: 'Get familiar with the NexaERP dashboard — KPIs, charts, alerts, and AI assistant.',
      duration: '3:45', level: 'beginner', sortOrder: 1, viewCount: 0,
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['dashboard', 'overview', 'kpi'],
    },
    {
      id: 'seed-dash-2', module: 'Dashboard', title: 'Customizing Dashboard Widgets',
      description: 'Add, remove, and rearrange widgets to tailor your dashboard view.',
      duration: '5:12', level: 'intermediate', sortOrder: 2, viewCount: 0,
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['dashboard', 'widgets'],
    },
    {
      id: 'seed-pos-1', module: 'POS', title: 'Processing Your First Sale',
      description: 'Step-by-step walkthrough of adding items, applying discounts, and completing a transaction.',
      duration: '6:20', level: 'beginner', sortOrder: 1, viewCount: 0,
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['pos', 'billing'],
    },
    {
      id: 'seed-pos-2', module: 'POS', title: 'GST Invoices & Receipts',
      description: 'How to generate, print, and email GST-compliant invoices.',
      duration: '4:55', level: 'beginner', sortOrder: 2, viewCount: 0,
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['pos', 'gst', 'invoice'],
    },
    {
      id: 'seed-inv-1', module: 'Inventory', title: 'Adding & Managing Products',
      description: 'Create product records, set pricing, configure tax rates, and manage categories.',
      duration: '7:15', level: 'beginner', sortOrder: 1, viewCount: 0,
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['inventory', 'products'],
    },
    {
      id: 'seed-inv-2', module: 'Inventory', title: 'Stock Movements & Adjustments',
      description: 'Record incoming stock, perform stock counts, and adjust for shrinkage.',
      duration: '6:40', level: 'beginner', sortOrder: 2, viewCount: 0,
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['inventory', 'stock'],
    },
    {
      id: 'seed-ord-1', module: 'Orders', title: 'Creating Purchase Orders',
      description: 'Raise purchase orders for suppliers, track delivery status, and receive goods.',
      duration: '5:50', level: 'beginner', sortOrder: 1, viewCount: 0,
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['orders', 'purchase'],
    },
    {
      id: 'seed-acc-1', module: 'Accounting', title: 'Recording Income & Expenses',
      description: 'Add journal entries, categorise transactions, and reconcile accounts.',
      duration: '7:30', level: 'beginner', sortOrder: 1, viewCount: 0,
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['accounting', 'income'],
    },
    {
      id: 'seed-crm-1', module: 'CRM', title: 'Managing Customers & Leads',
      description: 'Add customer profiles, track leads through the pipeline, and log activities.',
      duration: '6:45', level: 'beginner', sortOrder: 1, viewCount: 0,
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['crm', 'customers'],
    },
    {
      id: 'seed-sta-1', module: 'Staff', title: 'Employee Onboarding & Profiles',
      description: 'Create employee records, assign roles, and manage HR information.',
      duration: '5:15', level: 'beginner', sortOrder: 1, viewCount: 0,
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['staff', 'hr'],
    },
    {
      id: 'seed-ana-1', module: 'Analytics', title: 'Revenue Trends & KPI Reports',
      description: 'Visualise revenue trends, top products, and customer insights.',
      duration: '5:40', level: 'beginner', sortOrder: 1, viewCount: 0,
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['analytics', 'reports'],
    },
    {
      id: 'seed-set-1', module: 'Settings', title: 'User Roles & Permissions',
      description: 'Configure role-based access control — create roles and assign permissions.',
      duration: '6:50', level: 'intermediate', sortOrder: 1, viewCount: 0,
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['settings', 'rbac'],
    },
  ];

  // ── Internal state ────────────────────────────────────────────────────────

  const state = {
    container: null,
    videos: [],
    filteredVideos: [],
    modules: [],
    activeModule: 'all',
    activeLevel: 'all',
    searchQuery: '',
    loading: false,
    usingSeeds: false,
    debounceTimer: null,
  };

  // ── localStorage helpers ──────────────────────────────────────────────────

  function getRecentlyWatched() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    } catch (_) {
      return [];
    }
  }

  function addToRecentlyWatched(video) {
    const recent = getRecentlyWatched().filter((v) => v.id !== video.id);
    recent.unshift({ id: video.id, title: video.title, module: video.module, duration: video.duration, thumbnailUrl: video.thumbnailUrl || '' });
    if (recent.length > MAX_RECENT) recent.length = MAX_RECENT;
    try { localStorage.setItem(LS_KEY, JSON.stringify(recent)); } catch (_) {}
  }

  // ── API helpers ───────────────────────────────────────────────────────────

  async function fetchVideos() {
    const params = new URLSearchParams();
    if (state.activeModule !== 'all') params.set('module', state.activeModule);
    if (state.activeLevel  !== 'all') params.set('level',  state.activeLevel);
    if (state.searchQuery)            params.set('search', state.searchQuery);
    params.set('pageSize', '200'); // fetch all for client-side grouping

    const res = await fetch(`${API_BASE}?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data?.videos ?? json.data ?? [];
  }

  async function fetchModules() {
    const res = await fetch(`${API_BASE}/modules`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data ?? [];
  }

  // ── Rendering helpers ─────────────────────────────────────────────────────

  function levelBadge(level) {
    const map = { beginner: 'badge-success', intermediate: 'badge-warning', advanced: 'badge-danger' };
    const cls  = map[level] || 'badge-info';
    return `<span class="vl-badge ${cls}">${escHtml(level)}</span>`;
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function renderVideoCard(video) {
    const thumb = video.thumbnailUrl
      ? `<img src="${escHtml(video.thumbnailUrl)}" alt="${escHtml(video.title)}" loading="lazy">`
      : `<div class="vl-thumb-placeholder"><i class="fas fa-play-circle"></i></div>`;

    return `
      <div class="vl-card" data-id="${escHtml(video.id)}" tabindex="0" role="button"
           aria-label="Watch ${escHtml(video.title)}">
        <div class="vl-thumb">
          ${thumb}
          <div class="vl-play-overlay"><i class="fas fa-play"></i></div>
          <span class="vl-duration">${escHtml(video.duration)}</span>
        </div>
        <div class="vl-card-body">
          <div class="vl-card-meta">
            <span class="vl-module-tag">${escHtml(video.module)}</span>
            ${levelBadge(video.level || 'beginner')}
          </div>
          <h4 class="vl-card-title">${escHtml(video.title)}</h4>
          <p class="vl-card-desc">${escHtml(video.description)}</p>
          <div class="vl-card-footer">
            <span class="vl-views"><i class="fas fa-eye"></i> ${video.viewCount ?? 0}</span>
            <button class="vl-watch-btn btn btn-sm btn-primary" data-id="${escHtml(video.id)}">
              <i class="fas fa-play"></i> Watch
            </button>
          </div>
        </div>
      </div>`;
  }

  function renderRecentSection(recentIds, allVideos) {
    if (!recentIds.length) return '';
    const map = {};
    allVideos.forEach((v) => { map[v.id] = v; });
    const recent = recentIds.map((r) => map[r.id]).filter(Boolean);
    if (!recent.length) return '';

    return `
      <section class="vl-section" id="vl-section-recent">
        <h3 class="vl-section-title"><i class="fas fa-history"></i> Recently Watched</h3>
        <div class="vl-grid">${recent.map(renderVideoCard).join('')}</div>
      </section>`;
  }

  function groupByModule(videos) {
    const groups = {};
    videos.forEach((v) => {
      if (!groups[v.module]) groups[v.module] = [];
      groups[v.module].push(v);
    });
    return groups;
  }

  function renderSections(videos) {
    const recent = getRecentlyWatched();
    const recentHtml = renderRecentSection(recent, videos);

    if (state.activeModule !== 'all' || state.searchQuery || state.activeLevel !== 'all') {
      // Flat filtered view
      if (!videos.length) {
        return `${recentHtml}<div class="vl-empty"><i class="fas fa-video-slash"></i><p>No videos match your filters.</p></div>`;
      }
      return `${recentHtml}<section class="vl-section"><div class="vl-grid">${videos.map(renderVideoCard).join('')}</div></section>`;
    }

    // Grouped by module
    const groups = groupByModule(videos);
    if (!Object.keys(groups).length) {
      return `${recentHtml}<div class="vl-empty"><i class="fas fa-video-slash"></i><p>No training videos available yet.</p></div>`;
    }

    return recentHtml + Object.entries(groups).map(([mod, vids]) => `
      <section class="vl-section" id="vl-section-${escHtml(mod.toLowerCase())}">
        <h3 class="vl-section-title">
          <i class="fas fa-layer-group"></i> ${escHtml(mod)}
          <span class="vl-section-count">${vids.length} video${vids.length !== 1 ? 's' : ''}</span>
        </h3>
        <div class="vl-grid">${vids.map(renderVideoCard).join('')}</div>
      </section>`).join('');
  }

  function renderModuleFilters(modules) {
    const all = ['all', ...modules];
    return all.map((m) => {
      const active = state.activeModule === m ? ' vl-filter-active' : '';
      const label  = m === 'all' ? 'All Modules' : m;
      return `<button class="vl-filter-btn${active}" data-module="${escHtml(m)}">${escHtml(label)}</button>`;
    }).join('');
  }

  function renderLevelFilters() {
    return ['all', 'beginner', 'intermediate', 'advanced'].map((l) => {
      const active = state.activeLevel === l ? ' vl-filter-active' : '';
      const label  = l === 'all' ? 'All Levels' : l.charAt(0).toUpperCase() + l.slice(1);
      return `<button class="vl-filter-btn${active}" data-level="${escHtml(l)}">${escHtml(label)}</button>`;
    }).join('');
  }

  function render() {
    if (!state.container) return;

    state.container.innerHTML = `
      <div class="vl-root">
        <div class="vl-header">
          <div class="vl-header-text">
            <h2 class="vl-title"><i class="fas fa-film"></i> Video Training Library</h2>
            <p class="vl-subtitle">Step-by-step video guides for every NexaERP module</p>
          </div>
          <div class="vl-search-wrap">
            <i class="fas fa-search vl-search-icon"></i>
            <input type="text" class="vl-search" id="vl-search-input"
              placeholder="Search videos…" value="${escHtml(state.searchQuery)}"
              aria-label="Search training videos">
            ${state.searchQuery ? `<button class="vl-search-clear" id="vl-clear-search" aria-label="Clear search"><i class="fas fa-times"></i></button>` : ''}
          </div>
        </div>

        <div class="vl-filters">
          <div class="vl-filter-group" id="vl-module-filters">
            <span class="vl-filter-label">Module:</span>
            ${renderModuleFilters(state.modules)}
          </div>
          <div class="vl-filter-group" id="vl-level-filters">
            <span class="vl-filter-label">Level:</span>
            ${renderLevelFilters()}
          </div>
        </div>

        <div class="vl-content" id="vl-content">
          ${state.loading
            ? '<div class="vl-loading"><div class="vl-spinner"></div><p>Loading videos…</p></div>'
            : renderSections(state.filteredVideos)}
        </div>
      </div>

      <!-- Video Player Modal -->
      <div class="vl-modal" id="vl-modal" role="dialog" aria-modal="true" aria-label="Video Player" hidden>
        <div class="vl-modal-backdrop" id="vl-modal-backdrop"></div>
        <div class="vl-modal-box">
          <div class="vl-modal-header">
            <h3 class="vl-modal-title" id="vl-modal-title"></h3>
            <button class="vl-modal-close" id="vl-modal-close" aria-label="Close video player">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="vl-modal-body">
            <div class="vl-player-wrap" id="vl-player-wrap"></div>
            <div class="vl-modal-meta" id="vl-modal-meta"></div>
          </div>
        </div>
      </div>`;

    attachListeners();
  }

  // ── Event handling ────────────────────────────────────────────────────────

  function attachListeners() {
    if (!state.container) return;

    // Search
    const searchInput = state.container.querySelector('#vl-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(state.debounceTimer);
        state.debounceTimer = setTimeout(() => {
          state.searchQuery = e.target.value.trim();
          applyFilters();
          render();
        }, 280);
      });
    }

    const clearBtn = state.container.querySelector('#vl-clear-search');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        state.searchQuery = '';
        applyFilters();
        render();
      });
    }

    // Module filter buttons
    state.container.querySelectorAll('[data-module]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeModule = btn.dataset.module;
        applyFilters();
        render();
      });
    });

    // Level filter buttons
    state.container.querySelectorAll('[data-level]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeLevel = btn.dataset.level;
        applyFilters();
        render();
      });
    });

    // Video cards — click anywhere on card or Watch button
    state.container.querySelectorAll('.vl-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.vl-watch-btn') || !e.target.closest('button')) {
          openPlayer(card.dataset.id);
        }
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPlayer(card.dataset.id);
        }
      });
    });

    // Modal close
    const modalClose    = state.container.querySelector('#vl-modal-close');
    const modalBackdrop = state.container.querySelector('#vl-modal-backdrop');
    if (modalClose)    modalClose.addEventListener('click', closePlayer);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closePlayer);

    state.container.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePlayer();
    });
  }

  function applyFilters() {
    let videos = state.videos;

    if (state.activeModule !== 'all') {
      videos = videos.filter((v) => v.module.toLowerCase() === state.activeModule.toLowerCase());
    }

    if (state.activeLevel !== 'all') {
      videos = videos.filter((v) => (v.level || 'beginner') === state.activeLevel);
    }

    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      videos = videos.filter((v) =>
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.module.toLowerCase().includes(q) ||
        (v.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }

    state.filteredVideos = videos;
  }

  // ── Video player ──────────────────────────────────────────────────────────

  function buildPlayerHTML(video) {
    const url = video.videoUrl || '';

    // YouTube embed
    if (/youtube\.com\/embed|youtu\.be/.test(url)) {
      // Ensure autoplay param
      const src = url.includes('?') ? `${url}&autoplay=1` : `${url}?autoplay=1`;
      return `<iframe src="${escHtml(src)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }

    // Vimeo embed
    if (/vimeo\.com\/video/.test(url)) {
      const src = url.includes('?') ? `${url}&autoplay=1` : `${url}?autoplay=1`;
      return `<iframe src="${escHtml(src)}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    }

    // Direct video file
    const ext = url.split('.').pop().toLowerCase();
    const type = ext === 'webm' ? 'video/webm' : ext === 'ogg' ? 'video/ogg' : 'video/mp4';
    return `<video controls autoplay><source src="${escHtml(url)}" type="${type}">Your browser does not support the video tag.</video>`;
  }

  function openPlayer(videoId) {
    const video = state.filteredVideos.find((v) => v.id === videoId)
               || state.videos.find((v) => v.id === videoId);
    if (!video) return;

    addToRecentlyWatched(video);

    // Increment view via API (fire-and-forget)
    if (!state.usingSeeds && !videoId.startsWith('seed-')) {
      fetch(`${API_BASE}/${videoId}`).catch(() => {});
    }

    const modal     = state.container.querySelector('#vl-modal');
    const titleEl   = state.container.querySelector('#vl-modal-title');
    const playerWrap = state.container.querySelector('#vl-player-wrap');
    const metaEl    = state.container.querySelector('#vl-modal-meta');

    if (!modal || !titleEl || !playerWrap) return;

    titleEl.textContent = video.title;
    playerWrap.innerHTML = buildPlayerHTML(video);
    metaEl.innerHTML = `
      <div class="vl-meta-row">
        <span class="vl-module-tag">${escHtml(video.module)}</span>
        ${levelBadge(video.level || 'beginner')}
        <span class="vl-meta-duration"><i class="fas fa-clock"></i> ${escHtml(video.duration)}</span>
      </div>
      <p class="vl-meta-desc">${escHtml(video.description)}</p>
      ${video.tags && video.tags.length ? `<div class="vl-tag-list">${video.tags.map((t) => `<span class="vl-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}`;

    modal.removeAttribute('hidden');
    modal.classList.add('vl-modal-open');
    document.body.style.overflow = 'hidden';

    // Focus the close button for keyboard users
    const closeBtn = state.container.querySelector('#vl-modal-close');
    if (closeBtn) closeBtn.focus();
  }

  function closePlayer() {
    const modal = state.container && state.container.querySelector('#vl-modal');
    if (!modal) return;

    // Stop the media before removing it
    const iframe = modal.querySelector('iframe');
    const video  = modal.querySelector('video');
    if (iframe) iframe.src = '';
    if (video)  { video.pause(); video.src = ''; }

    modal.setAttribute('hidden', '');
    modal.classList.remove('vl-modal-open');
    document.body.style.overflow = '';
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  async function loadData() {
    state.loading = true;
    render();

    try {
      const [videos, modules] = await Promise.all([fetchVideos(), fetchModules()]);
      state.videos  = videos;
      state.modules = modules;
      state.usingSeeds = false;
    } catch (err) {
      console.warn('[VideoLibrary] API unavailable, using seed data:', err.message);
      state.videos  = SEED_VIDEOS;
      state.modules = [...new Set(SEED_VIDEOS.map((v) => v.module))].sort();
      state.usingSeeds = true;
    }

    applyFilters();
    state.loading = false;
    render();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  const VideoLibrary = {
    /**
     * Mount the video library into the given container element or selector.
     *
     * @param {string|HTMLElement} container - CSS selector or DOM element
     * @param {object} [options] - Reserved for future use
     */
    init(container, options = {}) {
      const el = typeof container === 'string'
        ? document.querySelector(container)
        : container;

      if (!el) {
        console.error('[VideoLibrary] Container not found:', container);
        return;
      }

      state.container = el;
      loadData();
    },

    /** Reload video data from the API. */
    async refresh() {
      await loadData();
    },

    /** Unmount and clean up. */
    destroy() {
      if (state.container) {
        state.container.innerHTML = '';
        state.container = null;
      }
      clearTimeout(state.debounceTimer);
      document.body.style.overflow = '';
    },

    /** Expose recently-watched list for external consumers. */
    getRecentlyWatched,
  };

  global.VideoLibrary = VideoLibrary;

}(typeof window !== 'undefined' ? window : this));
