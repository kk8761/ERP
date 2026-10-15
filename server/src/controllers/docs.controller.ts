/**
 * Docs Controller
 *
 * Serves the interactive developer documentation portal and the OpenAPI spec.
 *
 * Routes:
 *   GET /api/docs              — HTML developer portal
 *   GET /api/docs/openapi.yaml — Raw OpenAPI 3.0 YAML spec
 *   GET /api/docs/openapi.json — OpenAPI spec in JSON format (convenience)
 *
 * Requirements: 28.7
 */

import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

// Path to the docs directory (relative to compiled output in dist/)
const DOCS_DIR = path.join(__dirname, '../../docs');
const OPENAPI_PATH = path.join(DOCS_DIR, 'openapi.yaml');

/**
 * Serve the OpenAPI YAML specification.
 *
 * GET /api/docs/openapi.yaml
 */
export function serveOpenApiSpec(_req: Request, res: Response): void {
  if (!fs.existsSync(OPENAPI_PATH)) {
    res.status(404).json({
      success: false,
      error: 'OpenAPI specification file not found',
    });
    return;
  }

  const yaml = fs.readFileSync(OPENAPI_PATH, 'utf-8');
  res.setHeader('Content-Type', 'application/yaml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(yaml);
}

/**
 * Serve the OpenAPI spec as JSON (parsed from YAML for convenience).
 *
 * GET /api/docs/openapi.json
 */
export function serveOpenApiJson(_req: Request, res: Response): void {
  if (!fs.existsSync(OPENAPI_PATH)) {
    res.status(404).json({
      success: false,
      error: 'OpenAPI specification file not found',
    });
    return;
  }

  try {
    // Lazy-load js-yaml only if available; otherwise serve raw YAML with a warning
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jsYaml = require('js-yaml');
    const yaml = fs.readFileSync(OPENAPI_PATH, 'utf-8');
    const spec = jsYaml.load(yaml);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json(spec);
  } catch {
    // js-yaml not installed — redirect to YAML endpoint
    res.redirect('/api/docs/openapi.yaml');
  }
}

/**
 * Serve the interactive developer documentation HTML portal.
 *
 * Uses Swagger UI via CDN to render the OpenAPI spec — no build step required.
 * Falls back to a static HTML portal if the spec is unavailable.
 *
 * GET /api/docs
 */
export function serveDocsPortal(req: Request, res: Response): void {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const openapiUrl = `${baseUrl}/api/docs/openapi.yaml`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NexaERP API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    /* ── Reset / base ────────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: #0f0f1a;
      color: #e2e8f0;
      min-height: 100vh;
    }

    /* ── Top nav bar ─────────────────────────────────────────────── */
    .nav-bar {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-bottom: 1px solid rgba(99,102,241,0.3);
      padding: 0 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(10px);
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: inherit;
    }

    .nav-logo {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 16px;
      color: #fff;
    }

    .nav-title {
      font-size: 1.1rem;
      font-weight: 700;
      background: linear-gradient(135deg, #6366f1, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .nav-subtitle {
      font-size: 0.75rem;
      color: #94a3b8;
      margin-left: 4px;
    }

    .nav-links {
      display: flex;
      gap: 1.5rem;
      align-items: center;
    }

    .nav-links a {
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.875rem;
      transition: color 0.2s;
    }

    .nav-links a:hover { color: #a78bfa; }

    .badge {
      background: rgba(99,102,241,0.2);
      border: 1px solid rgba(99,102,241,0.4);
      color: #a78bfa;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 600;
    }

    /* ── Hero section ────────────────────────────────────────────── */
    .hero {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      padding: 3rem 2rem 2.5rem;
      text-align: center;
      border-bottom: 1px solid rgba(99,102,241,0.2);
    }

    .hero h1 {
      font-size: 2.25rem;
      font-weight: 800;
      margin: 0 0 0.75rem;
      background: linear-gradient(135deg, #fff 0%, #a78bfa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero p {
      color: #94a3b8;
      font-size: 1.05rem;
      margin: 0 0 1.5rem;
      max-width: 600px;
      margin-inline: auto;
    }

    .hero-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 0.6rem 1.4rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
      cursor: pointer;
      border: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff;
      box-shadow: 0 4px 12px rgba(99,102,241,0.3);
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(99,102,241,0.5);
    }

    .btn-outline {
      background: transparent;
      border: 1px solid rgba(99,102,241,0.5);
      color: #a78bfa;
    }

    .btn-outline:hover {
      background: rgba(99,102,241,0.1);
    }

    /* ── Quick-start cards ───────────────────────────────────────── */
    .quick-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      padding: 1.5rem 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(99,102,241,0.2);
      border-radius: 12px;
      padding: 1.25rem;
      transition: all 0.2s;
    }

    .card:hover {
      border-color: rgba(99,102,241,0.5);
      background: rgba(99,102,241,0.08);
      transform: translateY(-2px);
    }

    .card-icon { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .card-title { font-weight: 700; font-size: 0.95rem; margin-bottom: 0.35rem; }
    .card-desc { color: #94a3b8; font-size: 0.8rem; line-height: 1.5; }

    /* ── Swagger UI wrapper ──────────────────────────────────────── */
    #swagger-ui-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1rem 1rem 3rem;
    }

    /* ── Swagger UI theme overrides ──────────────────────────────── */
    .swagger-ui { color: #e2e8f0; }
    .swagger-ui .info { margin: 1rem 0; }
    .swagger-ui .info .title { color: #a78bfa; font-size: 1.5rem; }
    .swagger-ui .info .base-url { color: #94a3b8; }
    .swagger-ui .info .description p { color: #cbd5e1; }

    .swagger-ui .opblock-tag { color: #e2e8f0; border-color: rgba(99,102,241,0.3); }
    .swagger-ui .opblock-tag:hover { background: rgba(99,102,241,0.08); }

    .swagger-ui .opblock { border-radius: 8px; border-color: rgba(99,102,241,0.2); margin-bottom: 8px; }
    .swagger-ui .opblock .opblock-summary { border-radius: 8px; }
    .swagger-ui .opblock.opblock-get { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.3); }
    .swagger-ui .opblock.opblock-post { background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.3); }
    .swagger-ui .opblock.opblock-put { background: rgba(234,179,8,0.1); border-color: rgba(234,179,8,0.3); }
    .swagger-ui .opblock.opblock-patch { background: rgba(249,115,22,0.1); border-color: rgba(249,115,22,0.3); }
    .swagger-ui .opblock.opblock-delete { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); }

    .swagger-ui .opblock-summary-method { border-radius: 4px; font-weight: 700; }
    .swagger-ui .opblock-summary-path { color: #e2e8f0; }
    .swagger-ui .opblock-summary-description { color: #94a3b8; }

    .swagger-ui section.models { background: rgba(255,255,255,0.03); border-radius: 12px; border-color: rgba(99,102,241,0.2); }
    .swagger-ui .model-title { color: #a78bfa; }
    .swagger-ui .prop-type { color: #34d399; }
    .swagger-ui .prop-format { color: #94a3b8; }

    .swagger-ui .btn { border-radius: 6px; }
    .swagger-ui .btn.execute { background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; }
    .swagger-ui .btn.authorize { background: rgba(99,102,241,0.2); color: #a78bfa; border-color: rgba(99,102,241,0.5); }

    .swagger-ui .scheme-container { background: rgba(255,255,255,0.03); border-radius: 8px; padding: 1rem; }
    .swagger-ui select, .swagger-ui input[type=text], .swagger-ui textarea {
      background: rgba(255,255,255,0.07);
      border-color: rgba(99,102,241,0.3);
      color: #e2e8f0;
      border-radius: 6px;
    }

    .swagger-ui .response-col_status { color: #34d399; }
    .swagger-ui table.responses-table thead tr td { color: #94a3b8; }

    .swagger-ui .highlight-code pre { background: #0d1117; border-radius: 6px; }

    /* Hide Swagger UI top bar (we have our own nav) */
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>

  <!-- Navigation -->
  <nav class="nav-bar">
    <a class="nav-brand" href="/api/docs">
      <div class="nav-logo">N</div>
      <div>
        <div class="nav-title">NexaERP</div>
      </div>
      <span class="nav-subtitle">Developer Portal</span>
    </a>
    <div class="nav-links">
      <span class="badge">v2.0.0</span>
      <a href="/api/docs/openapi.yaml" target="_blank">OpenAPI Spec</a>
      <a href="/api/docs/openapi.yaml" download="nexaerp-openapi.yaml">Download YAML</a>
      <a href="https://nexaerp.netlify.app" target="_blank">Live App ↗</a>
    </div>
  </nav>

  <!-- Hero -->
  <section class="hero">
    <h1>NexaERP API Reference</h1>
    <p>
      Complete REST API documentation for the NexaERP ERP platform —
      authentication, inventory, POS, accounting, CRM, analytics and more.
    </p>
    <div class="hero-actions">
      <a href="#swagger-ui-container" class="btn btn-primary">
        📖 Browse API
      </a>
      <a href="/api/docs/openapi.yaml" download="nexaerp-openapi.yaml" class="btn btn-outline">
        ⬇️ Download OpenAPI Spec
      </a>
    </div>
  </section>

  <!-- Quick-start cards -->
  <div class="quick-cards">
    <div class="card">
      <div class="card-icon">🔐</div>
      <div class="card-title">Authentication</div>
      <div class="card-desc">JWT sessions, MFA (TOTP/SMS/email), Google &amp; Microsoft SSO</div>
    </div>
    <div class="card">
      <div class="card-icon">📦</div>
      <div class="card-title">Inventory</div>
      <div class="card-desc">Product CRUD, barcode scanning, stock adjustments, low-stock alerts</div>
    </div>
    <div class="card">
      <div class="card-icon">🧾</div>
      <div class="card-title">POS / Billing</div>
      <div class="card-desc">Touch-friendly POS transactions, GST invoice PDF generation</div>
    </div>
    <div class="card">
      <div class="card-icon">📋</div>
      <div class="card-title">Orders</div>
      <div class="card-desc">Purchase orders, goods receipt (GRN), supplier management</div>
    </div>
    <div class="card">
      <div class="card-icon">💰</div>
      <div class="card-title">Accounting</div>
      <div class="card-desc">Journal entries, trial balance, P&amp;L, chart of accounts</div>
    </div>
    <div class="card">
      <div class="card-icon">👥</div>
      <div class="card-title">CRM</div>
      <div class="card-desc">Customer management, loyalty tiers, activity logging</div>
    </div>
    <div class="card">
      <div class="card-icon">👷</div>
      <div class="card-title">HCM</div>
      <div class="card-desc">Employee records, departments, payroll processing</div>
    </div>
    <div class="card">
      <div class="card-icon">📊</div>
      <div class="card-title">Analytics</div>
      <div class="card-desc">KPIs, GST reports, inventory valuation, Excel exports</div>
    </div>
  </div>

  <!-- Swagger UI -->
  <div id="swagger-ui-container">
    <div id="swagger-ui"></div>
  </div>

  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function () {
      SwaggerUIBundle({
        url: '${openapiUrl}',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
        deepLinking: true,
        displayRequestDuration: true,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 2,
        docExpansion: 'list',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true,
        persistAuthorization: true,
        withCredentials: true,
      });
    };
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(html);
}
