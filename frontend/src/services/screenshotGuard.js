/**
 * NexaERP Data Loss Prevention (DLP) Screenshot Guard
 * Intercepts unauthorized screen captures (PrintScreen, Snipping tool, Print-to-PDF)
 * Takes a viewport snapshot and transmits evidence to the security administration.
 */

// Generate base64 screenshot canvas representation of current document
export async function captureViewportSnapshot() {
  const width = Math.min(window.innerWidth || 1280, 1440);
  const height = Math.min(window.innerHeight || 800, 900);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }

  // Draw background
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  // Draw Header Bar
  ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
  ctx.fillRect(0, 0, width, 56);
  ctx.strokeStyle = isDark ? '#334155' : '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, 56);

  // Logo / Title
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(16, 12, 32, 32);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('N', 26, 34);

  ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('NexaERP Enterprise Workspace', 58, 33);

  // Draw URL/Route Badge
  const currentPath = window.location.pathname + window.location.search + window.location.hash;
  ctx.fillStyle = isDark ? '#334155' : '#f1f5f9';
  ctx.fillRect(width - 320, 14, 300, 28);
  ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
  ctx.font = '12px monospace';
  ctx.fillText(currentPath.substring(0, 36) || '/dashboard', width - 310, 32);

  // Render Page Content representation
  // Render main layout grid
  const sidebarWidth = 220;
  ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
  ctx.fillRect(0, 56, sidebarWidth, height - 56);
  ctx.strokeRect(0, 56, sidebarWidth, height - 56);

  // Sidebar mock lines
  ctx.fillStyle = isDark ? '#334155' : '#e2e8f0';
  for (let y = 80; y < 360; y += 38) {
    ctx.fillRect(20, y, 180, 22);
  }

  // Main workspace area
  const mainX = sidebarWidth + 20;
  const mainW = width - mainX - 20;
  
  // Card 1: Top stats bar
  ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
  ctx.fillRect(mainX, 76, mainW, 110);
  ctx.strokeRect(mainX, 76, mainW, 110);

  ctx.fillStyle = isDark ? '#f1f5f9' : '#0f172a';
  ctx.font = 'bold 18px sans-serif';
  const heading = document.querySelector('h1, h2, .page-title')?.textContent || 'Enterprise Dashboard & Operations';
  ctx.fillText(heading.substring(0, 45), mainX + 20, 110);

  // Card 2: Main data grid
  ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
  ctx.fillRect(mainX, 206, mainW, height - 230);
  ctx.strokeRect(mainX, 206, mainW, height - 230);

  // Mock table rows
  ctx.fillStyle = isDark ? '#334155' : '#f1f5f9';
  ctx.fillRect(mainX + 16, 226, mainW - 32, 32);

  for (let y = 270; y < height - 60; y += 42) {
    ctx.fillStyle = isDark ? '#26334d' : '#f8fafc';
    ctx.fillRect(mainX + 16, y, mainW - 32, 32);
    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.fillRect(mainX + 32, y + 10, 120, 12);
    ctx.fillRect(mainX + 180, y + 10, 80, 12);
    ctx.fillRect(mainX + 280, y + 10, 60, 12);
  }

  // Draw Security Watermark across screen
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 8);
  ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  const now = new Date();
  ctx.fillText('NEXA-ERP DLP PROTECTED ENVIRONMENT', 0, -40);
  ctx.font = 'bold 20px monospace';
  ctx.fillText(`CAPTURED: ${now.toISOString()} | CONFIDENTIAL`, 0, 10);
  ctx.restore();

  try {
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
}

/**
 * Sends a captured screenshot incident to the backend DLP API
 */
export async function reportScreenshotIncident({ actionType = 'PRINT_SCREEN_KEY', onIncidentLogged }) {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    const base64Image = await captureViewportSnapshot();
    const payload = {
      page_url: window.location.pathname + window.location.search + window.location.hash || '/dashboard',
      action_type: actionType,
      image_data: base64Image,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      captured_at: new Date().toISOString()
    };

    const res = await fetch('/api/security/screenshot-incident', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const saved = await res.json();
      window.dispatchEvent(new CustomEvent('screenshot-incident-logged', { detail: saved }));
      if (onIncidentLogged) onIncidentLogged(saved);
      return saved;
    }
  } catch (err) {
    console.warn('Screenshot DLP capture reporting encountered error:', err);
  }
}

/**
 * Initializes global event listeners to detect screenshot actions
 * Returns cleanup function.
 */
export function initScreenshotGuard(onAlert) {
  let isThrottled = false;

  const triggerDetection = async (actionType) => {
    if (isThrottled) return;
    isThrottled = true;
    setTimeout(() => { isThrottled = false; }, 3000);

    if (onAlert) {
      onAlert({
        actionType,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
    }

    await reportScreenshotIncident({ actionType });
  };

  // 1. PrintScreen keyup listener
  const handleKeyUp = (e) => {
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
      triggerDetection('PRINT_SCREEN_KEY');
    }
  };

  // 2. Keydown combinations (Snipping Tool Win+Shift+S, Cmd+Shift+3/4/5, Ctrl+P)
  const handleKeyDown = (e) => {
    // Snipping tool Windows/Mac shortcuts: Win+Shift+S or Cmd+Shift+3/4/5
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'S' || e.key === 's' || e.code === 'KeyS')) {
      triggerDetection('SNIPPING_TOOL_SHORTCUT');
    } else if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
      triggerDetection('MACOS_SCREENSHOT_SHORTCUT');
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
      // Prevent unauthorized print to PDF
      e.preventDefault();
      triggerDetection('PRINT_PAGE_TO_PDF');
    }
  };

  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('keydown', handleKeyDown);

  return () => {
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('keydown', handleKeyDown);
  };
}
