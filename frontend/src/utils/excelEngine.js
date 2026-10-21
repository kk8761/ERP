/**
 * Excel Spreadsheet Engine Utility
 * Supports:
 * - Column letter mapping (0 -> A, 1 -> B, 26 -> AA, etc.)
 * - Cell coordinate resolution (e.g. A1, AD3, etc.)
 * - Range value extraction (e.g. AD1:AD12, A1:B4)
 * - Built-in Excel formulas: SUM, AVERAGE (AVG), COUNT, MIN, MAX
 * - Basic mathematical expressions (+, -, *, /, parentheses)
 */

export function getColLetter(index) {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export function getColIndex(str) {
  if (!str) return -1;
  let index = 0;
  const upper = str.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index - 1;
}

/**
 * Evaluates an Excel formula string like '=SUM(AD1:AD8)' or '=AD1*0.18'
 * Returns the computed number or text result.
 */
export function evaluateExcelFormula(formulaStr, allRows, allCols, visited = new Set()) {
  if (typeof formulaStr !== 'string' || !formulaStr.startsWith('=')) {
    return formulaStr;
  }

  const expr = formulaStr.slice(1).trim();
  if (!expr) return 0;

  // Resolve single cell coordinate e.g. "AD1" or "D3" or "A1"
  const getCellValue = (coord) => {
    const trimmed = coord.trim().toUpperCase();
    const match = trimmed.match(/^([A-Z]+)(\d+)$/);
    if (!match) {
      // Check if coordinate is a column name identifier like "debit"
      const foundCol = allCols.find(c =>
        c.id.toLowerCase() === trimmed.toLowerCase() ||
        c.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (foundCol) {
        return allRows.map(r => {
          const raw = r[foundCol.id];
          if (typeof raw === 'string' && raw.startsWith('=')) {
            const evalVal = evaluateExcelFormula(raw, allRows, allCols, new Set([...visited, trimmed]));
            return typeof evalVal === 'number' ? evalVal : (parseFloat(String(evalVal).replace(/[^\d.-]/g, '')) || 0);
          }
          if (typeof raw === 'number') return raw;
          if (typeof raw === 'string') {
            const clean = raw.replace(/[^\d.-]/g, '');
            return clean !== '' && !isNaN(Number(clean)) ? parseFloat(clean) : 0;
          }
          return 0;
        });
      }
      return 0;
    }

    const colLetters = match[1];
    const rowNum = parseInt(match[2], 10) - 1;
    const colIdx = getColIndex(colLetters);

    // Prevent circular recursion loops
    const cellKey = `${colLetters}${rowNum + 1}`;
    if (visited.has(cellKey)) return 0;

    if (rowNum >= 0 && rowNum < allRows.length && colIdx >= 0 && colIdx < allCols.length) {
      const colId = allCols[colIdx].id;
      const raw = allRows[rowNum][colId];
      if (typeof raw === 'string' && raw.startsWith('=')) {
        const nextVisited = new Set([...visited, cellKey]);
        const evalVal = evaluateExcelFormula(raw, allRows, allCols, nextVisited);
        return typeof evalVal === 'number' ? evalVal : (parseFloat(String(evalVal).replace(/[^\d.-]/g, '')) || 0);
      }
      if (typeof raw === 'number') return raw;
      if (typeof raw === 'string') {
        const clean = raw.replace(/[^\d.-]/g, '');
        if (clean !== '' && !isNaN(Number(clean))) {
          return parseFloat(clean);
        }
        return raw;
      }
      return raw ?? 0;
    }
    return 0;
  };

  // Direct single cell reference like "=AD1" or "=C2"
  if (/^[A-Z]+\d+$/i.test(expr)) {
    return getCellValue(expr);
  }

  // Resolve cell range e.g. "AD1:AD12" or "A1:B3"
  const getRangeValues = (rangeStr) => {
    const parts = rangeStr.split(':').map(p => p.trim());
    if (parts.length === 1) {
      const single = getCellValue(parts[0]);
      return Array.isArray(single) ? single : [typeof single === 'number' ? single : (parseFloat(String(single).replace(/[^\d.-]/g, '')) || 0)];
    }

    const m1 = parts[0].toUpperCase().match(/^([A-Z]+)(\d+)$/);
    const m2 = parts[1].toUpperCase().match(/^([A-Z]+)(\d+)$/);
    if (!m1 || !m2) return [];

    const c1 = getColIndex(m1[1]);
    const r1 = parseInt(m1[2], 10) - 1;
    const c2 = getColIndex(m2[1]);
    const r2 = parseInt(m2[2], 10) - 1;

    const startCol = Math.min(c1, c2);
    const endCol = Math.max(c1, c2);
    const startRow = Math.min(r1, r2);
    const endRow = Math.max(r1, r2);

    const values = [];
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        if (r >= 0 && r < allRows.length && c >= 0 && c < allCols.length) {
          const colId = allCols[c].id;
          const raw = allRows[r][colId];
          const cellKey = `${getColLetter(c)}${r + 1}`;
          let num = 0;
          if (typeof raw === 'string' && raw.startsWith('=')) {
            if (!visited.has(cellKey)) {
              const nextVisited = new Set([...visited, cellKey]);
              const evalVal = evaluateExcelFormula(raw, allRows, allCols, nextVisited);
              num = typeof evalVal === 'number' ? evalVal : (parseFloat(String(evalVal).replace(/[^\d.-]/g, '')) || 0);
            }
          } else if (typeof raw === 'number') {
            num = raw;
          } else if (typeof raw === 'string') {
            const clean = raw.replace(/[^\d.-]/g, '');
            num = clean !== '' && !isNaN(Number(clean)) ? parseFloat(clean) : 0;
          }
          values.push(num);
        }
      }
    }
    return values;
  };

  // 1. =SUM(...)
  const sumMatch = expr.match(/^SUM\((.*)\)$/i);
  if (sumMatch) {
    const args = sumMatch[1].split(',').map(a => a.trim());
    let total = 0;
    args.forEach(arg => {
      const vals = getRangeValues(arg);
      vals.forEach(v => total += (typeof v === 'number' ? v : 0));
    });
    return total;
  }

  // 2. =AVERAGE(...) or =AVG(...)
  const avgMatch = expr.match(/^(?:AVERAGE|AVG)\((.*)\)$/i);
  if (avgMatch) {
    const args = avgMatch[1].split(',').map(a => a.trim());
    let total = 0;
    let count = 0;
    args.forEach(arg => {
      const vals = getRangeValues(arg);
      vals.forEach(v => {
        total += v;
        count++;
      });
    });
    return count > 0 ? total / count : 0;
  }

  // 3. =COUNT(...)
  const countMatch = expr.match(/^COUNT\((.*)\)$/i);
  if (countMatch) {
    const args = countMatch[1].split(',').map(a => a.trim());
    let count = 0;
    args.forEach(arg => {
      const vals = getRangeValues(arg);
      count += vals.length;
    });
    return count;
  }

  // 4. =MIN(...)
  const minMatch = expr.match(/^MIN\((.*)\)$/i);
  if (minMatch) {
    const args = minMatch[1].split(',').map(a => a.trim());
    let minVal = Infinity;
    args.forEach(arg => {
      const vals = getRangeValues(arg);
      vals.forEach(v => { if (v < minVal) minVal = v; });
    });
    return minVal === Infinity ? 0 : minVal;
  }

  // 5. =MAX(...)
  const maxMatch = expr.match(/^MAX\((.*)\)$/i);
  if (maxMatch) {
    const args = maxMatch[1].split(',').map(a => a.trim());
    let maxVal = -Infinity;
    args.forEach(arg => {
      const vals = getRangeValues(arg);
      vals.forEach(v => { if (v > maxVal) maxVal = v; });
    });
    return maxVal === -Infinity ? 0 : maxVal;
  }

  // 6. Direct mathematical expressions with cell references e.g. "=AD1 + AD2" or "=(AD1 - AD2) * 0.18"
  try {
    const parsedMath = expr.replace(/[A-Z]+\d+/gi, (cellCoord) => {
      const val = getCellValue(cellCoord);
      return typeof val === 'number' ? val : 0;
    });

    let sanitizedMath = parsedMath.replace(/(\d+(?:\.\d+)?)%/g, '($1 * 0.01)');

    if (/^[\d\s+\-*/().]+$/.test(sanitizedMath)) {
      // Safe mathematical calculation
      // eslint-disable-next-line no-new-func
      const calcResult = Function(`"use strict"; return (${sanitizedMath})`)();
      return isNaN(calcResult) || !isFinite(calcResult) ? 0 : calcResult;
    }
  } catch {
    return '#VALUE!';
  }

  return expr;
}

/**
 * Calculates summary metrics for any selected range of cells:
 * returns { count, sum, average, min, max, isNumeric }
 */
export function getSelectionMetrics(selectionRange, rows, cols) {
  if (!selectionRange) return null;

  const { startRow, startCol, endRow, endCol } = selectionRange;
  const minR = Math.min(startRow, endRow);
  const maxR = Math.max(startRow, endRow);
  const minC = Math.min(startCol, endCol);
  const maxC = Math.max(startCol, endCol);

  let count = 0;
  let numericCount = 0;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (r >= 0 && r < rows.length && c >= 0 && c < cols.length) {
        count++;
        const colId = cols[c].id;
        const raw = rows[r][colId];
        let numVal = null;

        if (typeof raw === 'string' && raw.startsWith('=')) {
          const evaled = evaluateExcelFormula(raw, rows, cols);
          if (typeof evaled === 'number' && !isNaN(evaled)) {
            numVal = evaled;
          }
        } else if (typeof raw === 'number') {
          numVal = raw;
        } else if (raw !== '' && raw !== null && raw !== undefined && !isNaN(Number(raw))) {
          numVal = Number(raw);
        }

        if (numVal !== null) {
          numericCount++;
          sum += numVal;
          if (numVal < min) min = numVal;
          if (numVal > max) max = numVal;
        }
      }
    }
  }

  const average = numericCount > 0 ? sum / numericCount : 0;
  const rangeName = `${getColLetter(minC)}${minR + 1}${minR === maxR && minC === maxC ? '' : `:${getColLetter(maxC)}${maxR + 1}`}`;

  return {
    rangeName,
    count,
    numericCount,
    sum,
    average,
    min: min === Infinity ? 0 : min,
    max: max === -Infinity ? 0 : max,
    hasNumbers: numericCount > 0
  };
}
