/**
 * NexaERP — Utility Functions
 * Shared helpers used across all modules
 */

// ─── API Base ────────────────────────────────────────────────────
const API_BASE = '/api'; // Update to your backend URL in production

// ─── Local Storage Helpers ───────────────────────────────────────
const Storage = {
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
  remove(key) { localStorage.removeItem(key); },
  clear() { localStorage.clear(); }
};

// ─── Auth Token Management ────────────────────────────────────────
const Auth = {
  getToken: () => Storage.get('nexaerp_token'),
  getUser:  () => Storage.get('nexaerp_user'),
  setSession(token, user) {
    Storage.set('nexaerp_token', token);
    Storage.set('nexaerp_user', user);
  },
  clearSession() {
    Storage.remove('nexaerp_token');
    Storage.remove('nexaerp_user');
  },
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return !!token; // For demo tokens
    }
  },
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '/index.html';
      return false;
    }
    return true;
  }
};

// ─── HTTP Client ─────────────────────────────────────────────────
const Http = {
  async request(method, url, body = null, options = {}) {
    const token = Auth.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers
    };

    try {
      const config = { method, headers };
      if (body) config.body = JSON.stringify(body);

      const res = await fetch(`${API_BASE}${url}`, config);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) {
          Auth.clearSession();
          window.location.href = '/index.html';
        }
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      return data;
    } catch (err) {
      // In demo mode, simulate responses
      return Http._demoResponse(method, url, body);
    }
  },
  get(url, opts)       { return this.request('GET', url, null, opts); },
  post(url, body, opts) { return this.request('POST', url, body, opts); },
  put(url, body, opts)  { return this.request('PUT', url, body, opts); },
  delete(url, opts)    { return this.request('DELETE', url, null, opts); },

  _demoResponse(method, url, body) {
    // Simulate backend in demo mode
    console.log(`[Demo API] ${method} ${url}`, body);
    return { success: true, demo: true };
  }
};

// ─── Toast Notifications ──────────────────────────────────────────
const Toast = {
  _container: null,

  _getContainer() {
    if (!this._container) {
      this._container = document.getElementById('toast-container');
      if (!this._container) {
        this._container = document.createElement('div');
        this._container.id = 'toast-container';
        this._container.className = 'toast-container';
        document.body.appendChild(this._container);
      }
    }
    return this._container;
  },

  show(message, type = 'info', duration = 4000) {
    const container = this._getContainer();
    const icons = {
      success: '✅',
      error:   '❌',
      warning: '⚠️',
      info:    'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span style="font-size:18px;flex-shrink:0">${icons[type] || icons.info}</span>
      <div style="flex:1">
        <div style="font-size:0.875rem;font-weight:500;color:var(--color-text-primary)">${message}</div>
      </div>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--color-text-tertiary);cursor:pointer;font-size:16px;padding:0 4px" aria-label="Close">×</button>
    `;

    container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 200);
      }, duration);
    }

    return toast;
  },

  success: (msg, dur) => Toast.show(msg, 'success', dur),
  error:   (msg, dur) => Toast.show(msg, 'error', dur),
  warning: (msg, dur) => Toast.show(msg, 'warning', dur),
  info:    (msg, dur) => Toast.show(msg, 'info', dur),
};

// ─── Modal Helpers ───────────────────────────────────────────────
const Modal = {
  create(options = {}) {
    const { title = '', body = '', footer = '', size = '' } = options;
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <h3 class="heading-4" id="modal-title">${title}</h3>
          <button class="btn btn-icon btn-ghost" onclick="this.closest('.modal-backdrop').remove()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    `;

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.remove();
    });

    document.body.appendChild(backdrop);
    return backdrop;
  },

  close(el) {
    const backdrop = el.closest ? el.closest('.modal-backdrop') : el;
    if (backdrop) backdrop.remove();
  }
};

// ─── Format Helpers ──────────────────────────────────────────────
const Format = {
  currency(amount, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount || 0);
  },

  number(n, decimals = 0) {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(n || 0);
  },

  date(dateStr, opts = {}) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
      ...opts
    });
  },

  dateTime(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },

  relativeTime(dateStr) {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60)   return 'just now';
    if (secs < 3600) return `${Math.floor(secs/60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs/3600)}h ago`;
    return `${Math.floor(secs/86400)}d ago`;
  },

  percent(value, total) {
    if (!total) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  },

  fileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
};

// ─── Validation ───────────────────────────────────────────────────
const Validate = {
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  phone: (v) => /^[+]?[\d\s\-]{10,15}$/.test(v),
  required: (v) => v !== null && v !== undefined && String(v).trim() !== '',
  minLength: (v, min) => String(v).length >= min,
  maxLength: (v, max) => String(v).length <= max,
  number: (v) => !isNaN(parseFloat(v)) && isFinite(v),
  positiveNumber: (v) => Validate.number(v) && parseFloat(v) > 0,
  gst: (v) => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v),
  pincode: (v) => /^[0-9]{6}$/.test(v),

  passwordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (password.length >= 12) score++;
    return score; // 0-5
  },

  showError(fieldId, message) {
    const el = document.getElementById(fieldId);
    if (el) {
      el.classList.add('error');
      const errEl = document.getElementById(`${fieldId}-err`);
      if (errEl) errEl.textContent = message;
    }
  },

  clearError(fieldId) {
    const el = document.getElementById(fieldId);
    if (el) {
      el.classList.remove('error');
      const errEl = document.getElementById(`${fieldId}-err`);
      if (errEl) errEl.textContent = '';
    }
  }
};

// ─── DOM Helpers ─────────────────────────────────────────────────
const DOM = {
  $: (selector, ctx = document) => ctx.querySelector(selector),
  $$: (selector, ctx = document) => [...ctx.querySelectorAll(selector)],

  on(el, event, handler, opts) {
    if (typeof el === 'string') el = DOM.$(el);
    if (el) el.addEventListener(event, handler, opts);
  },

  off(el, event, handler) {
    if (typeof el === 'string') el = DOM.$(el);
    if (el) el.removeEventListener(event, handler);
  },

  show(el, display = 'flex') {
    if (typeof el === 'string') el = DOM.$(el);
    if (el) el.style.display = display;
  },

  hide(el) {
    if (typeof el === 'string') el = DOM.$(el);
    if (el) el.style.display = 'none';
  },

  toggle(el, condition, display = 'flex') {
    condition ? DOM.show(el, display) : DOM.hide(el);
  },

  setText(el, text) {
    if (typeof el === 'string') el = DOM.$(el);
    if (el) el.textContent = text;
  },

  setHTML(el, html) {
    if (typeof el === 'string') el = DOM.$(el);
    if (el) el.innerHTML = html;
  },

  addClass(el, ...classes) {
    if (typeof el === 'string') el = DOM.$(el);
    if (el) el.classList.add(...classes);
  },

  removeClass(el, ...classes) {
    if (typeof el === 'string') el = DOM.$(el);
    if (el) el.classList.remove(...classes);
  },

  toggleClass(el, cls, force) {
    if (typeof el === 'string') el = DOM.$(el);
    if (el) el.classList.toggle(cls, force);
  },

  create(tag, attrs = {}, text = '') {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') el.className = v;
      else if (k === 'style') Object.assign(el.style, v);
      else if (k.startsWith('data-')) el.setAttribute(k, v);
      else el[k] = v;
    });
    if (text) el.textContent = text;
    return el;
  },

  emptyEl(el) {
    if (typeof el === 'string') el = DOM.$(el);
    if (el) el.innerHTML = '';
  }
};

// ─── Chart Micro Renderer ────────────────────────────────────────
const MicroChart = {
  // Simple SVG sparkline
  sparkline(data, options = {}) {
    const {
      width = 200, height = 60,
      color = '#6366f1', fill = true,
      strokeWidth = 2
    } = options;

    if (!data || !data.length) return '';

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    }).join(' ');

    const fillPath = fill
      ? `<polygon fill="${color}" fill-opacity="0.15"
           points="0,${height} ${points} ${width},${height}"/>`
      : '';

    return `
      <svg width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
        ${fillPath}
        <polyline points="${points}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  },

  // Donut chart
  donut(segments, options = {}) {
    const {
      size = 120, strokeWidth = 18,
      colors = ['#6366f1','#10b981','#f59e0b','#ef4444']
    } = options;

    const r = (size - strokeWidth) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;
    const total = segments.reduce((s, seg) => s + seg.value, 0);

    let offset = 0;
    const arcs = segments.map((seg, i) => {
      const dashLen = (seg.value / total) * circumference;
      const dashOffset = circumference - offset;
      offset += dashLen;
      return `
        <circle
          cx="${cx}" cy="${cy}" r="${r}"
          fill="none"
          stroke="${colors[i % colors.length]}"
          stroke-width="${strokeWidth}"
          stroke-dasharray="${dashLen} ${circumference - dashLen}"
          stroke-dashoffset="${dashOffset}"
          stroke-linecap="round"
          style="transform: rotate(-90deg); transform-origin: center"
        />
      `;
    }).join('');

    return `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
          stroke="rgba(255,255,255,0.05)" stroke-width="${strokeWidth}"/>
        ${arcs}
      </svg>
    `;
  },

  // Bar chart
  bars(data, options = {}) {
    const {
      width = 300, height = 120,
      color = '#6366f1', gap = 4,
      labels = []
    } = options;

    const max = Math.max(...data) || 1;
    const barWidth = (width - (data.length - 1) * gap) / data.length;

    const bars = data.map((v, i) => {
      const barH = (v / max) * (height - 20);
      const x = i * (barWidth + gap);
      const y = height - 20 - barH;
      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}"
          rx="3" fill="${color}" fill-opacity="${0.6 + (v/max)*0.4}"/>
        ${labels[i] ? `<text x="${x + barWidth/2}" y="${height}" text-anchor="middle"
          fill="rgba(255,255,255,0.4)" font-size="10">${labels[i]}</text>` : ''}
      `;
    }).join('');

    return `
      <svg width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
        ${bars}
      </svg>
    `;
  }
};

// ─── Debounce / Throttle ─────────────────────────────────────────
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function throttle(fn, interval = 100) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= interval) {
      last = now;
      fn(...args);
    }
  };
}

// ─── UUID Generator ──────────────────────────────────────────────
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ─── CSV Export ──────────────────────────────────────────────────
function exportCSV(data, filename = 'export.csv') {
  if (!data || !data.length) return;
  const cols = Object.keys(data[0]);
  const rows = [
    cols.join(','),
    ...data.map(row => cols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(','))
  ];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Print Helper ───────────────────────────────────────────────
function printElement(el, title = 'NexaERP') {
  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html><html><head><title>${title}</title>
    <style>body{font-family:sans-serif;color:#000;background:#fff}table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#f5f5f5}
    </style></head><body>${el.outerHTML}</body></html>
  `);
  win.document.close();
  win.print();
}

// Expose utils globally
window.Storage   = Storage;
window.Auth      = Auth;
window.Http      = Http;
window.Toast     = Toast;
window.Modal     = Modal;
window.Format    = Format;
window.Validate  = Validate;
window.DOM       = DOM;
window.MicroChart = MicroChart;
window.debounce  = debounce;
window.throttle  = throttle;
window.generateId = generateId;
window.exportCSV = exportCSV;
window.printElement = printElement;
