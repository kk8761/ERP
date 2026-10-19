import React from 'react';

/**
 * Parses inline markdown:
 * - **bold**
 * - *italic*
 * - `inline code`
 * - [link](url)
 * - Status tags / badges
 */
export function renderInlineMarkdown(text) {
  if (!text) return null;

  // Split by inline code first
  const parts = [];
  let remaining = text;

  // Regex for inline code: `code`
  const codeRegex = /`([^`]+)`/;
  // Regex for bold: **bold**
  const boldRegex = /\*\*([^*]+)\*\*/;
  // Regex for italic: *italic* or _italic_
  const italicRegex = /(?:\*([^*]+)\*|_([^_]+)_)/;

  let keyCounter = 0;

  function parseFormatted(str) {
    if (!str) return [];
    const elements = [];

    // Tokenize by code, bold, italic
    let cur = str;
    while (cur.length > 0) {
      const codeMatch = cur.match(codeRegex);
      const boldMatch = cur.match(boldRegex);
      const italicMatch = cur.match(italicRegex);

      // Find earliest match
      let firstMatch = null;
      let matchType = null;
      let earliestIndex = cur.length;

      if (codeMatch && codeMatch.index < earliestIndex) {
        earliestIndex = codeMatch.index;
        firstMatch = codeMatch;
        matchType = 'code';
      }
      if (boldMatch && boldMatch.index < earliestIndex) {
        earliestIndex = boldMatch.index;
        firstMatch = boldMatch;
        matchType = 'bold';
      }
      if (italicMatch && italicMatch.index < earliestIndex) {
        earliestIndex = italicMatch.index;
        firstMatch = italicMatch;
        matchType = 'italic';
      }

      if (!firstMatch) {
        // Render remaining text, highlighting badges like LOW STOCK, In Stock
        elements.push(renderBadges(cur, keyCounter++));
        break;
      }

      // Add text before match
      if (earliestIndex > 0) {
        elements.push(renderBadges(cur.slice(0, earliestIndex), keyCounter++));
      }

      // Add matched element
      if (matchType === 'code') {
        elements.push(
          <code
            key={keyCounter++}
            style={{
              backgroundColor: 'rgba(2, 132, 199, 0.1)',
              color: '#0284c7',
              padding: '1px 5px',
              borderRadius: '4px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '11px',
              fontWeight: 600,
              border: '1px solid rgba(2, 132, 199, 0.2)'
            }}
          >
            {firstMatch[1]}
          </code>
        );
      } else if (matchType === 'bold') {
        elements.push(
          <strong key={keyCounter++} style={{ fontWeight: 700, color: 'inherit' }}>
            {parseFormatted(firstMatch[1])}
          </strong>
        );
      } else if (matchType === 'italic') {
        const italicText = firstMatch[1] || firstMatch[2];
        elements.push(
          <em key={keyCounter++} style={{ fontStyle: 'italic', color: 'inherit' }}>
            {parseFormatted(italicText)}
          </em>
        );
      }

      cur = cur.slice(earliestIndex + firstMatch[0].length);
    }

    return elements;
  }

  function renderBadges(str, key) {
    if (!str) return null;

    // Check for common ERP status phrases to enhance visual presentation
    if (str.includes('⚠️') || str.includes('LOW STOCK') || str.includes('Low Stock')) {
      return (
        <span key={key} style={{ color: '#b45309', fontWeight: 600 }}>
          {str}
        </span>
      );
    }
    if (str.includes('✅') || str.includes('In Stock') || str.includes('Active')) {
      return (
        <span key={key} style={{ color: '#15803d', fontWeight: 600 }}>
          {str}
        </span>
      );
    }
    return <span key={key}>{str}</span>;
  }

  return parseFormatted(text);
}

/**
 * Checks if a line is a markdown table separator:
 * e.g. | :--- | :---: | ---: |
 */
function isTableSeparator(line) {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  const cells = trimmed.split('|').filter(c => c.trim().length > 0);
  if (cells.length === 0) return false;
  return cells.every(c => /^:?-+:?$/.test(c.trim()));
}

/**
 * Parses markdown table alignment from separator cells:
 * ':---' -> 'left', ':---:' -> 'center', '---:' -> 'right'
 */
function parseAlignments(sepLine) {
  const cells = sepLine.trim().split('|');
  const actualCells = cells.slice(cells[0].trim() === '' ? 1 : 0, cells[cells.length - 1].trim() === '' ? -1 : undefined);
  return actualCells.map(c => {
    const t = c.trim();
    if (t.startsWith(':') && t.endsWith(':')) return 'center';
    if (t.endsWith(':')) return 'right';
    return 'left';
  });
}

/**
 * Parses row cells split by pipes, respecting leading and trailing pipes
 */
function parseRowCells(rowLine) {
  const trimmed = rowLine.trim();
  const cells = trimmed.split('|');
  let startIdx = 0;
  let endIdx = cells.length;
  if (cells[0].trim() === '') startIdx = 1;
  if (cells[cells.length - 1].trim() === '') endIdx = cells.length - 1;
  return cells.slice(startIdx, endIdx).map(c => c.trim());
}

/**
 * MarkdownContent Component:
 * Parses full Markdown blocks including:
 * - GitHub-flavored Markdown Tables -> structured HTML <table> with zebra-striping and borders
 * - Headings (#, ##, ###)
 * - Unordered & ordered lists
 * - Blockquotes
 * - Paragraphs
 */
export default function MarkdownContent({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Headings (#, ##, ###)
    if (trimmed.startsWith('#')) {
      const level = trimmed.match(/^#+/)[0].length;
      const text = trimmed.replace(/^#+\s*/, '');
      const fontSize = level === 1 ? '16px' : level === 2 ? '14px' : '13px';
      const borderBottom = level <= 2 ? '1px solid var(--border-color, #e2e8f0)' : 'none';

      blocks.push(
        <div
          key={`h_${i}`}
          style={{
            fontSize,
            fontWeight: 700,
            color: 'var(--text-main, #0f172a)',
            marginTop: '12px',
            marginBottom: '6px',
            paddingBottom: level <= 2 ? '4px' : '0',
            borderBottom,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {renderInlineMarkdown(text)}
        </div>
      );
      i++;
      continue;
    }

    // 3. Markdown Tables: Check if current line looks like table header and next line is separator
    if (trimmed.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headerLine = trimmed;
      const separatorLine = lines[i + 1];
      const headers = parseRowCells(headerLine);
      const alignments = parseAlignments(separatorLine);

      const tableRows = [];
      i += 2; // Move past header and separator

      while (i < lines.length && lines[i].trim().includes('|') && !isTableSeparator(lines[i])) {
        const rowCells = parseRowCells(lines[i]);
        if (rowCells.length > 0) {
          tableRows.push(rowCells);
        }
        i++;
      }

      blocks.push(
        <div
          key={`table_${i}`}
          style={{
            margin: '12px 0',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            overflowX: 'auto',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11.5px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          >
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr style={{ backgroundColor: '#e2e8f0', borderBottom: '2px solid #94a3b8' }}>
                {headers.map((h, hIdx) => (
                  <th
                    key={hIdx}
                    style={{
                      padding: '8px 10px',
                      textAlign: alignments[hIdx] || 'left',
                      fontWeight: 700,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      borderRight: hIdx < headers.length - 1 ? '1px solid #cbd5e1' : 'none'
                    }}
                  >
                    {renderInlineMarkdown(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, rIdx) => {
                const isEven = rIdx % 2 === 1;
                return (
                  <tr
                    key={rIdx}
                    style={{
                      backgroundColor: isEven ? '#f8fafc' : '#ffffff',
                      borderBottom: rIdx < tableRows.length - 1 ? '1px solid #e2e8f0' : 'none',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isEven ? '#f8fafc' : '#ffffff'}
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        style={{
                          padding: '6px 10px',
                          textAlign: alignments[cIdx] || 'left',
                          color: '#334155',
                          borderRight: cIdx < row.length - 1 ? '1px solid #f1f5f9' : 'none',
                          whiteSpace: cell.length < 25 ? 'nowrap' : 'normal'
                        }}
                      >
                        {renderInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // 4. Bullet list items (- or *)
    if (/^[-*]\s+/.test(trimmed)) {
      const listItems = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^[-*]\s+/, '');
        listItems.push(itemText);
        i++;
      }

      blocks.push(
        <ul
          key={`ul_${i}`}
          style={{
            margin: '6px 0',
            paddingLeft: '18px',
            listStyleType: 'disc',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {listItems.map((item, idx) => (
            <li key={idx} style={{ color: 'inherit', fontSize: '12.5px', lineHeight: 1.5 }}>
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 5. Numbered list items (1. 2. etc.)
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^\d+\.\s+/, '');
        listItems.push(itemText);
        i++;
      }

      blocks.push(
        <ol
          key={`ol_${i}`}
          style={{
            margin: '6px 0',
            paddingLeft: '18px',
            listStyleType: 'decimal',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {listItems.map((item, idx) => (
            <li key={idx} style={{ color: 'inherit', fontSize: '12.5px', lineHeight: 1.5 }}>
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 6. Blockquote (> ...)
    if (trimmed.startsWith('>')) {
      const quoteText = trimmed.replace(/^>\s*/, '');
      blocks.push(
        <blockquote
          key={`quote_${i}`}
          style={{
            margin: '8px 0',
            padding: '6px 12px',
            borderLeft: '3px solid #0284c7',
            backgroundColor: 'rgba(2, 132, 199, 0.05)',
            borderRadius: '0 4px 4px 0',
            color: 'var(--text-secondary, #475569)',
            fontSize: '12px',
            fontStyle: 'italic'
          }}
        >
          {renderInlineMarkdown(quoteText)}
        </blockquote>
      );
      i++;
      continue;
    }

    // 7. Standard Paragraph
    blocks.push(
      <p
        key={`p_${i}`}
        style={{
          margin: '4px 0',
          lineHeight: 1.55,
          color: 'inherit',
          fontSize: '12.5px'
        }}
      >
        {renderInlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return <div>{blocks}</div>;
}
