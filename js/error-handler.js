/**
 * NexaERP — Frontend Error Handler
 * Renders helpful, actionable error messages with icons, context, and
 * resolution steps using the Toast / Modal system already in utils.js.
 *
 * Requirement 28.5: WHEN errors occur, THE System SHALL provide helpful error
 *                   messages with resolution steps.
 *
 * Usage:
 *   // After an API call:
 *   const res = await Http.post('/api/products', data);
 *   if (!res || !res.success) {
 *     ErrorHandler.fromResponse(res);   // auto-picks best display
 *     return;
 *   }
 *
 *   // For a raw fetch / HTTP status:
 *   ErrorHandler.fromStatus(403);
 *
 *   // For validation errors returned by the API:
 *   ErrorHandler.showValidation(res.fieldErrors, formElement);
 */

// ─── Error Catalog (client-side copy) ────────────────────────────────────────
// Mirrors server/src/services/error-catalog.service.ts so the frontend can
// provide good messages even when the server response is minimal.

const CLIENT_ERROR_CATALOG = {
  AUTH_NO_TOKEN: {
    icon: '🔒',
    userMessage: 'You need to be logged in to access this page.',
    resolutionSteps: [
      'Click "Sign In" to log in with your credentials.',
      'Your session may have expired — please sign in again.',
    ],
  },
  AUTH_TOKEN_EXPIRED: {
    icon: '⏰',
    userMessage: 'Your session has expired for security reasons.',
    resolutionSteps: [
      'Sign in again to continue where you left off.',
      'Tick "Remember me" on the login page to stay signed in longer.',
    ],
  },
  AUTH_TOKEN_INVALID: {
    icon: '🔑',
    userMessage: 'Your login session is no longer valid.',
    resolutionSteps: [
      'Sign out and sign back in to get a fresh session.',
      'If this keeps happening, clear your browser cookies and try again.',
    ],
  },
  AUTH_INVALID_CREDENTIALS: {
    icon: '🔐',
    userMessage: 'The email or password you entered is incorrect.',
    resolutionSteps: [
      'Check that Caps Lock is not on.',
      'Use "Forgot Password" to reset your password.',
      'Make sure you are using your registered email address.',
    ],
  },
  AUTH_ACCOUNT_LOCKED: {
    icon: '🚫',
    userMessage: 'Your account has been temporarily locked after too many failed login attempts.',
    resolutionSteps: [
      'Wait 15 minutes, then try again.',
      'Use "Forgot Password" to reset and unlock your account.',
      'Contact your system administrator for immediate access.',
    ],
  },
  AUTH_MFA_REQUIRED: {
    icon: '📱',
    userMessage: 'This account requires two-factor authentication.',
    resolutionSteps: [
      'Open your authenticator app and enter the 6-digit code.',
      'Lost access to your authenticator? Contact your administrator for recovery.',
    ],
  },
  VALIDATION_FAILED: {
    icon: '📋',
    userMessage: 'Some of the information you entered is not valid.',
    resolutionSteps: [
      'Review the highlighted fields and correct the errors.',
      'Make sure all required fields are filled in.',
      'Check that values are in the correct format.',
    ],
  },
  VALIDATION_DUPLICATE: {
    icon: '📑',
    userMessage: 'A record with this information already exists.',
    resolutionSteps: [
      'Search for the existing record and update it instead.',
      'Use a different value (e.g., a different email address or SKU).',
    ],
  },
  NOT_FOUND_GENERIC: {
    icon: '🔍',
    userMessage: "We couldn't find what you were looking for.",
    resolutionSteps: [
      'Check that the link or ID you used is correct.',
      'The item may have been deleted — check the audit log.',
      'Use the search feature to find the item.',
    ],
  },
  NOT_FOUND_ROUTE: {
    icon: '🗺️',
    userMessage: 'The page or feature you are trying to reach does not exist.',
    resolutionSteps: [
      'Check the URL for any typos.',
      'Navigate back to the dashboard and try again.',
    ],
  },
  PERMISSION_DENIED: {
    icon: '🛑',
    userMessage: "You don't have permission to perform this action.",
    resolutionSteps: [
      'Contact your administrator to request the necessary access.',
      'Check that you are logged in with the correct account.',
      'If you recently changed roles, sign out and back in to refresh your permissions.',
    ],
  },
  PERMISSION_ROLE_REQUIRED: {
    icon: '👤',
    userMessage: 'This action requires a higher access level than your current role.',
    resolutionSteps: [
      'Ask your manager or administrator to grant you the required role.',
      'Ask someone with the correct role to perform this action on your behalf.',
    ],
  },
  RATE_LIMIT_EXCEEDED: {
    icon: '⏳',
    userMessage: "You're doing that too quickly. Please slow down.",
    resolutionSteps: [
      'Wait a moment and try again.',
      'If you are importing data, try processing smaller batches.',
      'Contact support if you regularly hit this limit.',
    ],
  },
  RATE_LIMIT_LOGIN: {
    icon: '⏳',
    userMessage: 'Too many login attempts from your device. Please try again in a few minutes.',
    resolutionSteps: [
      'Wait 5 minutes before trying again.',
      'Use "Forgot Password" if you cannot remember your password.',
    ],
  },
  DB_CONNECTION_ERROR: {
    icon: '🔌',
    userMessage: "We're having trouble connecting to our database right now.",
    resolutionSteps: [
      'Wait a moment and try again — this is usually temporary.',
      'Contact your system administrator if the problem persists.',
    ],
  },
  NETWORK_TIMEOUT: {
    icon: '🌐',
    userMessage: 'The request took too long to complete.',
    resolutionSteps: [
      'Check your internet connection and try again.',
      'If you are processing a large amount of data, try smaller batches.',
    ],
  },
  NETWORK_SERVICE_UNAVAILABLE: {
    icon: '🔧',
    userMessage: "This feature is temporarily unavailable. We're working on it.",
    resolutionSteps: [
      'Wait a few minutes and try again.',
      'Check the system status page for any ongoing maintenance.',
    ],
  },
  FILE_TOO_LARGE: {
    icon: '📦',
    userMessage: "The file you're trying to upload is too large.",
    resolutionSteps: [
      'Maximum file size is 10 MB. Reduce the file size and try again.',
      'For images, use an image compression tool.',
      'For documents, try saving as a smaller format.',
    ],
  },
  FILE_INVALID_TYPE: {
    icon: '📄',
    userMessage: 'This file type is not supported.',
    resolutionSteps: [
      'Allowed file types are: JPG, PNG, PDF, XLSX, CSV, DOCX.',
      'Convert your file to a supported format and try again.',
    ],
  },
  FILE_UPLOAD_FAILED: {
    icon: '📤',
    userMessage: "We couldn't upload your file. Something went wrong.",
    resolutionSteps: [
      'Check your internet connection and try uploading again.',
      "Make sure the file is not open in another application.",
      'Try refreshing the page and uploading again.',
    ],
  },
  SERVER_ERROR: {
    icon: '⚡',
    userMessage: 'Something unexpected went wrong on our end.',
    resolutionSteps: [
      'Refresh the page and try again.',
      'Contact support if the problem keeps happening.',
    ],
  },
  BUSINESS_INSUFFICIENT_STOCK: {
    icon: '📦',
    userMessage: "There isn't enough stock available to complete this order.",
    resolutionSteps: [
      'Reduce the quantity to match the available stock.',
      'Create a purchase order to restock the item first.',
      'Check if there is stock available in another warehouse.',
    ],
  },
  BUSINESS_APPROVAL_REQUIRED: {
    icon: '✅',
    userMessage: 'This action requires approval before it can proceed.',
    resolutionSteps: [
      'Submit the record for approval using the "Request Approval" button.',
      'Contact your manager or approver to review the request.',
      'You will be notified once it has been approved.',
    ],
  },
};

// ─── Status-code → catalog code map ──────────────────────────────────────────
const STATUS_TO_CODE = {
  400: 'VALIDATION_FAILED',
  401: 'AUTH_TOKEN_INVALID',
  403: 'PERMISSION_DENIED',
  404: 'NOT_FOUND_GENERIC',
  409: 'VALIDATION_DUPLICATE',
  413: 'FILE_TOO_LARGE',
  415: 'FILE_INVALID_TYPE',
  422: 'VALIDATION_FAILED',
  429: 'RATE_LIMIT_EXCEEDED',
  500: 'SERVER_ERROR',
  503: 'NETWORK_SERVICE_UNAVAILABLE',
  504: 'NETWORK_TIMEOUT',
};

// ─── ErrorHandler ─────────────────────────────────────────────────────────────

const ErrorHandler = {

  // ─── Core display methods ──────────────────────────────────────────────────

  /**
   * Show a brief, helpful toast for a single error.
   * @param {string} message  User-friendly message to display.
   * @param {string[]} [steps] Optional resolution steps (shows "More info" link if present).
   * @param {string} [icon]   Emoji/icon prefix.
   */
  toast(message, steps = [], icon = '❌') {
    if (!steps.length) {
      // Simple toast — no expand needed
      if (typeof Toast !== 'undefined') {
        Toast.error(`${icon} ${message}`);
      } else {
        console.error(`[ErrorHandler] ${message}`);
      }
      return;
    }

    // Toast with an expandable "More info" link
    const container = this._getToastContainer();
    const el = document.createElement('div');
    el.className = 'toast-item error-helpful-toast';
    el.style.cssText = `
      display:flex;flex-direction:column;gap:8px;
      background:var(--color-bg-elevated,#1e1e2e);
      border:1px solid var(--color-border-default,rgba(255,255,255,0.08));
      border-left:3px solid var(--color-danger-400,#f87171);
      border-radius:12px;padding:14px 16px;
      animation:slideInRight 0.3s ease;
      box-shadow:0 8px 32px rgba(0,0,0,0.4);
      backdrop-filter:blur(8px);
      max-width:400px;
      cursor:default;
    `;

    const stepsId = `err-steps-${Date.now()}`;
    el.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:10px">
        <span style="font-size:18px;flex-shrink:0">${icon}</span>
        <span style="font-size:13px;color:var(--color-text-primary,#f8fafc);flex:1;line-height:1.5">${this._escapeHtml(message)}</span>
        <button
          onclick="this.closest('.error-helpful-toast').remove()"
          style="background:none;border:none;color:var(--color-text-tertiary,#64748b);cursor:pointer;font-size:16px;line-height:1;flex-shrink:0;padding:0"
          aria-label="Dismiss"
        >×</button>
      </div>
      <div>
        <button
          onclick="document.getElementById('${stepsId}').toggleAttribute('hidden'); this.textContent = document.getElementById('${stepsId}').hasAttribute('hidden') ? '▾ How to fix this' : '▴ Hide steps'"
          style="background:none;border:none;color:var(--color-brand-400,#818cf8);cursor:pointer;font-size:12px;padding:0;text-decoration:underline"
        >▾ How to fix this</button>
        <ol id="${stepsId}" hidden style="margin:8px 0 0 16px;padding:0;font-size:12px;color:var(--color-text-secondary,#94a3b8);line-height:1.6">
          ${steps.map((s) => `<li>${this._escapeHtml(s)}</li>`).join('')}
        </ol>
      </div>
    `;

    container.appendChild(el);
    setTimeout(() => el.remove(), 10000);
  },

  /**
   * Show a modal dialog with full error details and resolution steps.
   * Use for blocking errors where the user must acknowledge before continuing.
   * @param {string} title
   * @param {string} message
   * @param {string[]} steps
   * @param {string} [icon]
   */
  modal(title, message, steps = [], icon = '❌') {
    if (typeof Modal === 'undefined') {
      // Fallback if Modal utility not loaded
      alert(`${title}\n\n${message}${steps.length ? '\n\nHow to fix:\n• ' + steps.join('\n• ') : ''}`);
      return;
    }

    const stepsHtml = steps.length
      ? `<div style="margin-top:16px">
           <p style="font-size:13px;font-weight:600;color:var(--color-text-secondary);margin:0 0 8px">How to fix this:</p>
           <ol style="margin:0;padding-left:20px;font-size:13px;color:var(--color-text-secondary);line-height:1.7">
             ${steps.map((s) => `<li>${this._escapeHtml(s)}</li>`).join('')}
           </ol>
         </div>`
      : '';

    Modal.create({
      title: `${icon} ${title}`,
      body: `
        <div style="font-size:14px;color:var(--color-text-primary);line-height:1.6">
          ${this._escapeHtml(message)}
        </div>
        ${stepsHtml}
      `,
      footer: `<button class="btn btn-primary" onclick="document.querySelector('.modal-backdrop').remove()">OK, got it</button>`,
    });
  },

  // ─── API response helpers ──────────────────────────────────────────────────

  /**
   * Handle a standardised API error response from Http.*() calls.
   * Automatically chooses toast vs modal based on severity.
   *
   * @param {object|null} response  The JSON response (may be null for network failures).
   * @param {{ modal?: boolean, silent?: boolean }} [opts]
   */
  fromResponse(response, opts = {}) {
    if (!response) {
      // Network failure / server offline
      this.toast(
        "Can't reach the server. Check your internet connection.",
        [
          'Make sure you are connected to the internet.',
          'The server may be starting up — wait 30 seconds and try again.',
          'Contact support if the problem persists.',
        ],
        '🌐',
      );
      return;
    }

    if (response.success) return; // Nothing to do

    // Prefer server-provided fields; fall back to catalog lookup
    const catalogEntry = CLIENT_ERROR_CATALOG[response.code] || {};
    const icon = catalogEntry.icon || '❌';
    const userMessage = response.userMessage || catalogEntry.userMessage || response.message || response.error || 'Something went wrong.';
    const steps = response.resolutionSteps || catalogEntry.resolutionSteps || [];

    // Show field-level validation inline if fieldErrors are present
    if (response.fieldErrors && Array.isArray(response.fieldErrors) && response.fieldErrors.length) {
      this._highlightFieldErrors(response.fieldErrors);
    }

    if (opts.silent) return;

    if (opts.modal) {
      this.modal('Error', userMessage, steps, icon);
    } else {
      this.toast(userMessage, steps, icon);
    }
  },

  /**
   * Show a helpful error for a known HTTP status code
   * (e.g. when you only have the numeric status, not a full response body).
   * @param {number} status  HTTP status code.
   */
  fromStatus(status) {
    const code = STATUS_TO_CODE[status] || 'SERVER_ERROR';
    const entry = CLIENT_ERROR_CATALOG[code] || CLIENT_ERROR_CATALOG['SERVER_ERROR'];
    this.toast(entry.userMessage, entry.resolutionSteps, entry.icon || '❌');
  },

  // ─── Validation helpers ────────────────────────────────────────────────────

  /**
   * Display validation errors as a toast and, if a form element is provided,
   * highlight the individual fields.
   *
   * @param {Array<{field:string, message:string}>} fieldErrors
   * @param {HTMLFormElement|null} [formEl]
   */
  showValidation(fieldErrors, formEl = null) {
    if (!fieldErrors || !fieldErrors.length) return;

    if (formEl) this._highlightFieldErrors(fieldErrors, formEl);

    const summary = fieldErrors.map((fe) => `${fe.field}: ${fe.message}`).join(' — ');
    const entry = CLIENT_ERROR_CATALOG['VALIDATION_FAILED'];
    this.toast(
      fieldErrors.length === 1
        ? fieldErrors[0].message
        : `Please correct ${fieldErrors.length} field errors. ${summary}`,
      entry.resolutionSteps,
      entry.icon,
    );
  },

  /**
   * Clear all field-level error indicators from a form.
   * @param {HTMLFormElement} formEl
   */
  clearValidation(formEl) {
    if (!formEl) return;
    formEl.querySelectorAll('.field-error-msg').forEach((el) => el.remove());
    formEl.querySelectorAll('.field-error').forEach((el) => el.classList.remove('field-error'));
  },

  // ─── Convenient shortcuts ──────────────────────────────────────────────────

  /** 401 — session expired */
  sessionExpired() {
    const entry = CLIENT_ERROR_CATALOG['AUTH_TOKEN_EXPIRED'];
    this.toast(entry.userMessage, entry.resolutionSteps, entry.icon);
    setTimeout(() => {
      if (!window.location.pathname.includes('index')) {
        window.location.href = 'index.html';
      }
    }, 3000);
  },

  /** 403 — access denied */
  accessDenied(context = '') {
    const entry = CLIENT_ERROR_CATALOG['PERMISSION_DENIED'];
    const msg = context
      ? `You don't have permission to ${context}.`
      : entry.userMessage;
    this.toast(msg, entry.resolutionSteps, entry.icon);
  },

  /** 404 — resource not found */
  notFound(resourceName = 'item') {
    const entry = CLIENT_ERROR_CATALOG['NOT_FOUND_GENERIC'];
    this.toast(
      `The ${resourceName} you were looking for could not be found.`,
      entry.resolutionSteps,
      entry.icon,
    );
  },

  /** 429 — rate limited */
  rateLimited() {
    const entry = CLIENT_ERROR_CATALOG['RATE_LIMIT_EXCEEDED'];
    this.toast(entry.userMessage, entry.resolutionSteps, entry.icon);
  },

  /** 500 — generic server error */
  serverError() {
    const entry = CLIENT_ERROR_CATALOG['SERVER_ERROR'];
    this.toast(entry.userMessage, entry.resolutionSteps, entry.icon);
  },

  // ─── Internal helpers ──────────────────────────────────────────────────────

  _getToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText =
        'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:400px';
      document.body.appendChild(container);
    }
    return container;
  },

  _highlightFieldErrors(fieldErrors, formEl = null) {
    const root = formEl || document;

    fieldErrors.forEach(({ field, message }) => {
      // Try to find the input by name, id, or data-field attribute
      const input =
        root.querySelector(`[name="${field}"]`) ||
        root.querySelector(`#${field}`) ||
        root.querySelector(`[data-field="${field}"]`);

      if (!input) return;

      // Mark the input
      input.classList.add('field-error');
      input.style.borderColor = 'var(--color-danger-400, #f87171)';

      // Remove any existing error message for this field
      const existingMsg = input.parentElement?.querySelector('.field-error-msg');
      if (existingMsg) existingMsg.remove();

      // Inject the error message below the input
      const msgEl = document.createElement('span');
      msgEl.className = 'field-error-msg';
      msgEl.style.cssText =
        'display:block;font-size:11px;color:var(--color-danger-400,#f87171);margin-top:4px';
      msgEl.textContent = message;
      input.parentElement?.appendChild(msgEl);

      // Clear the error styling when the user starts correcting
      input.addEventListener(
        'input',
        () => {
          input.classList.remove('field-error');
          input.style.borderColor = '';
          msgEl.remove();
        },
        { once: true },
      );
    });
  },

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  },
};

// ─── Global integration: override Http error handling ────────────────────────
// Patch Http.request() so that 401, 403, 404, 429, 500 errors are automatically
// shown via ErrorHandler, falling back to the existing Toast.error for others.
// This runs ONCE when the script loads — Http must already be defined (utils.js).

(function patchHttpClient() {
  if (typeof Http === 'undefined') {
    // utils.js not yet loaded — set up a DOMContentLoaded retry
    document.addEventListener('DOMContentLoaded', patchHttpClient);
    return;
  }

  const _originalRequest = Http.request.bind(Http);

  Http.request = async function patchedRequest(method, path, data, opts = {}) {
    try {
      const url = path.startsWith('http') ? path : `${(typeof CONFIG !== 'undefined' ? CONFIG.API_BASE : '') || ''}${path}`;
      const token = (typeof Auth !== 'undefined') ? Auth.getToken() : null;
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(opts.timeout || 15000),
      });

      const json = await res.json().catch(() => ({
        success: false,
        error: res.statusText,
        userMessage: null,
        resolutionSteps: [],
      }));

      // Handle 401 — session management
      if (res.status === 401) {
        if (typeof Auth !== 'undefined') Auth.clearSession();
        ErrorHandler.sessionExpired();
        return null;
      }

      // For non-OK responses, enrich the json with catalog data if missing
      if (!res.ok) {
        if (!json.userMessage) {
          const code = STATUS_TO_CODE[res.status] || 'SERVER_ERROR';
          const catalogEntry = CLIENT_ERROR_CATALOG[code] || CLIENT_ERROR_CATALOG['SERVER_ERROR'];
          json.userMessage = json.userMessage || catalogEntry.userMessage;
          json.resolutionSteps = json.resolutionSteps || catalogEntry.resolutionSteps;
          json.code = json.code || code;
        }

        // Auto-show error (unless the caller opts out with { silent: true })
        if (!opts.silent && !opts.raw) {
          ErrorHandler.fromResponse(json);
        }
      }

      return json;

    } catch (err) {
      const isNetworkError =
        err.name === 'TimeoutError' ||
        err.name === 'TypeError' ||
        (err.message && err.message.includes('fetch'));

      if (isNetworkError) {
        ErrorHandler.toast(
          "Can't reach the server. Check your connection.",
          [
            'Make sure you are connected to the internet.',
            'The server may be starting up — wait ~30 seconds and try again.',
          ],
          '🌐',
        );
        return null;
      }

      // Re-throw unexpected errors
      throw err;
    }
  };
})();

// ─── Exports ─────────────────────────────────────────────────────────────────
// Make available globally (vanilla JS, no bundler)
window.ErrorHandler = ErrorHandler;
window.CLIENT_ERROR_CATALOG = CLIENT_ERROR_CATALOG;
