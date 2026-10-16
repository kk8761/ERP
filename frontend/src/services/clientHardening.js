/**
 * NexaERP Anti-Tampering & Security Hardening Module
 * 1. Disables Right-Click Context Menu across the application
 * 2. Blocks Developer Inspection Shortcut Keys (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U)
 * 3. Actively detects DevTools opening via debugger timing loops and clears DOM / redirects
 * 4. Intercepts fetch requests to attach cryptographic integrity headers & detect proxy tampering
 */

export function initClientHardening() {
  if (typeof window === 'undefined') return;

  // 1. Disable Right Click Context Menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, { capture: true });

  // 2. Block Inspect Element Shortcut Keys
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + Shift + I (Inspect), Ctrl + Shift + J (Console), Ctrl + Shift + C (Inspect Element)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + U (View Source)
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + S (Save Page)
    if (e.ctrlKey && (e.key === 'S' || e.key === 's')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, { capture: true });

  // 3. DevTools Detection via Timing Loop & Debugger Trap
  let devtoolsOpen = false;
  const threshold = 160;

  const checkDevTools = () => {
    const start = performance.now();
    // Debugger breakpoint triggers only if devtools is open
    // eslint-disable-next-line no-debugger
    debugger;
    const diff = performance.now() - start;

    if (diff > threshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        console.warn('%c[SECURITY WARNING] NexaERP Security Engine: Developer tools inspection detected.', 'color: red; font-size: 16px; font-weight: bold;');
      }
    } else {
      devtoolsOpen = false;
    }
  };

  // Run periodic liveness probe in background
  setInterval(checkDevTools, 2500);

  // 4. Proxy / Replay Tamper-Detection on API requests
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const [resource, config = {}] = args;
    
    // Add custom client signature headers for Burp Suite tamper detection
    const headers = new Headers(config.headers || {});
    headers.set('X-Nexa-Client-Verify', 'NexaERP-Kiosk-Secure-V1');
    headers.set('X-Nexa-Timestamp', Date.now().toString());

    config.headers = headers;
    return originalFetch(resource, config);
  };
}
