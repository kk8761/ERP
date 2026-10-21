import React, { useMemo } from 'react';

/**
 * Sanitizes untrusted HTML by stripping executable tags, event handlers,
 * and javascript: URLs to eliminate XSS risks (SEC-06).
 */
export function sanitizeHtml(rawHtml) {
  if (!rawHtml) return '';
  let clean = String(rawHtml);
  // 1. Strip script, object, embed, iframe, form tags
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  clean = clean.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  clean = clean.replace(/<embed\b[^>]*>/gi, '');
  clean = clean.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');

  // 2. Strip event handler attributes (onload, onerror, onclick, etc.)
  clean = clean.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // 3. Neutralize dangerous pseudo-protocols
  clean = clean.replace(/(href|src|action)\s*=\s*["']\s*(javascript|vbscript|data:text\/html):[^"']*["']/gi, '$1="#"');

  return clean;
}

/**
 * Secure Sandboxed HTML Preview Component
 * Uses an isolated sandbox iframe with restrictive CSP to completely neutralize XSS.
 */
export default function SafeHtmlPreview({ html, style = {}, minHeight = '280px' }) {
  const sanitized = useMemo(() => sanitizeHtml(html), [html]);

  const doc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src https:; font-family: sans-serif;">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.6;
      color: #334155;
      margin: 0;
      padding: 12px;
      background: transparent;
      word-break: break-word;
    }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #e2e8f0; padding: 6px 10px; }
  </style>
</head>
<body>
  ${sanitized}
</body>
</html>`;

  return (
    <iframe
      sandbox="allow-popups"
      srcDoc={doc}
      title="Secure Sandboxed Email Preview"
      style={{
        width: '100%',
        minHeight,
        border: 'none',
        borderRadius: '6px',
        backgroundColor: '#ffffff',
        display: 'block',
        ...style
      }}
    />
  );
}
