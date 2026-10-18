import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet, Plus, Trash2, Download, Upload, CheckCircle2,
  AlertCircle, RefreshCw, Calculator, ArrowRightLeft, Search, Edit2,
  Columns, Rows, Copy, CornerDownRight, Check, X, ChevronDown, Table
} from 'lucide-react';
import { apiRequest } from '../services/api';

// Converts index (0, 1, 2...) to Excel Column letters (A, B, C... Z, AA, AB...)
function getColumnLetter(colIndex) {
  let letter = '';
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export default function FinancialSpreadsheetGrid({ accounts = [], onEntryPosted }) {
  // Sheets
  const [sheets, setSheets] = useState([
    {
      id: 'sheet_1',
      name: 'General Ledger Matrix',
      columns: [
        { id: 'c_code', name: 'Account Code', type: 'text', width: 130 },
        { id: 'c_title', name: 'Account Title', type: 'text', width: 220 },
        { id: 'c_center', name: 'Cost Center / Dept', type: 'text', width: 160 },
        { id: 'c_memo', name: 'Description / Memo', type: 'text', width: 260 },
        { id: 'c_debit', name: 'Debit (₹)', type: 'number', width: 140 },
        { id: 'c_credit', name: 'Credit (₹)', type: 'number', width: 140 },
        { id: 'c_balance', name: 'Net Balance', type: 'formula', width: 140 }
      ],
      rows: [
        { id: 'r_1', c_code: '1001', c_title: 'Cash in Hand', c_center: 'Headquarters', c_memo: 'Cash collection deposit', c_debit: 50000, c_credit: 0, c_balance: '=E1-F1' },
        { id: 'r_2', c_code: '4001', c_title: 'Sales Revenue', c_center: 'Retail Store 1', c_memo: 'Over-the-counter revenue', c_debit: 0, c_credit: 50000, c_balance: '=E2-F2' },
        { id: 'r_3', c_code: '5001', c_title: 'Cost of Goods Sold', c_center: 'Central Warehouse', c_memo: 'Inventory release for sales', c_debit: 22000, c_credit: 0, c_balance: '=E3-F3' },
        { id: 'r_4', c_code: '1003', c_title: 'Merchandise Inventory', c_center: 'Central Warehouse', c_memo: 'Stock adjustment relief', c_debit: 0, c_credit: 22000, c_balance: '=E4-F4' },
        { id: 'r_5', c_code: '', c_title: '', c_center: 'Administration', c_memo: '', c_debit: 0, c_credit: 0, c_balance: '' },
        { id: 'r_6', c_code: '', c_title: '', c_center: 'Logistics', c_memo: '', c_debit: 0, c_credit: 0, c_balance: '' }
      ]
    },
    {
      id: 'sheet_2',
      name: 'Trial Balance Sheet',
      columns: [
        { id: 'tb_code', name: 'Account Code', type: 'text', width: 130 },
        { id: 'tb_name', name: 'Account Title', type: 'text', width: 240 },
        { id: 'tb_type', name: 'Category / Classification', type: 'text', width: 180 },
        { id: 'tb_dr', name: 'Debit Balance (₹)', type: 'number', width: 150 },
        { id: 'tb_cr', name: 'Credit Balance (₹)', type: 'number', width: 150 }
      ],
      rows: [
        { id: 'tb_r1', tb_code: '1001', tb_name: 'Cash in Hand', tb_type: 'ASSET', tb_dr: 125000, tb_cr: 0 },
        { id: 'tb_r2', tb_code: '1002', tb_name: 'HDFC Bank Operating A/C', tb_type: 'ASSET', tb_dr: 450000, tb_cr: 0 },
        { id: 'tb_r3', tb_code: '1003', tb_name: 'Merchandise Inventory', tb_type: 'ASSET', tb_dr: 185000, tb_cr: 0 },
        { id: 'tb_r4', tb_code: '2001', tb_name: 'Accounts Payable (Vendors)', tb_type: 'LIABILITY', tb_dr: 0, tb_cr: 160000 },
        { id: 'tb_r5', tb_code: '3001', tb_name: 'Owner Capital Equity', tb_type: 'EQUITY', tb_dr: 0, tb_cr: 500000 },
        { id: 'tb_r6', tb_code: '4001', tb_name: 'Product Sales Revenue', tb_type: 'REVENUE', tb_dr: 0, tb_cr: 320000 },
        { id: 'tb_r7', tb_code: '5001', tb_name: 'Cost of Goods Sold', tb_type: 'EXPENSE', tb_dr: 170000, tb_cr: 0 },
        { id: 'tb_r8', tb_code: '5002', tb_name: 'Operating Expenses & Salaries', tb_type: 'EXPENSE', tb_dr: 50000, tb_cr: 0 }
      ]
    }
  ]);

  const [activeSheetId, setActiveSheetId] = useState('sheet_1');
  const currentSheet = sheets.find(s => s.id === activeSheetId) || sheets[0];

  // Selection & Formula bar state
  const [selectedCoord, setSelectedCoord] = useState({ rowIdx: 0, colIdx: 0 });
  const [editingHeaderId, setEditingHeaderId] = useState(null);
  const [editingHeaderName, setEditingHeaderName] = useState('');
  const [addColumnModalOpen, setAddColumnModalOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState('text');
  const [formulaInput, setFormulaInput] = useState('');
  const [posting, setPosting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvPasteText, setCsvPasteText] = useState('');
  const fileInputRef = useRef(null);

  // Sync formula bar with active selected cell
  const currentCols = currentSheet.columns;
  const currentRows = currentSheet.rows;
  const activeCol = currentCols[selectedCoord.colIdx] || currentCols[0];
  const activeRow = currentRows[selectedCoord.rowIdx] || currentRows[0];
  const activeCellVal = (activeRow && activeCol) ? (activeRow[activeCol.id] ?? '') : '';

  useEffect(() => {
    setFormulaInput(activeCellVal !== undefined && activeCellVal !== null ? String(activeCellVal) : '');
  }, [selectedCoord, activeSheetId]);

  // Evaluates formula (e.g. =E1-F1, =SUM(E1:E4), or raw number)
  const evaluateCellDisplay = (val, rowIdx, colId) => {
    if (val === undefined || val === null || val === '') return '';
    const strVal = String(val).trim();
    if (!strVal.startsWith('=')) {
      // Return raw or formatted numeric value
      if (typeof val === 'number') {
        return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      return val;
    }

    try {
      const expr = strVal.substring(1).toUpperCase();

      // Formula: =SUM(colLetter_start:colLetter_end) or =SUM(E1:E4)
      const sumMatch = expr.match(/^SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/);
      if (sumMatch) {
        const startRow = parseInt(sumMatch[2], 10) - 1;
        const endRow = parseInt(sumMatch[4], 10) - 1;
        const targetColLetter = sumMatch[1];
        const targetColIdx = targetColLetter.charCodeAt(0) - 65;
        const targetCol = currentCols[targetColIdx];
        if (targetCol) {
          let sum = 0;
          for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
            if (currentRows[r]) {
              const num = parseFloat(currentRows[r][targetCol.id]) || 0;
              sum += num;
            }
          }
          return sum.toLocaleString('en-IN', { minimumFractionDigits: 2 });
        }
      }

      // Formula: =E1-F1 or =A1+B1
      const mathMatch = expr.match(/^([A-Z]+)(\d+)\s*([\+\-\*\/])\s*([A-Z]+)(\d+)$/);
      if (mathMatch) {
        const col1Letter = mathMatch[1];
        const row1Idx = parseInt(mathMatch[2], 10) - 1;
        const op = mathMatch[3];
        const col2Letter = mathMatch[4];
        const row2Idx = parseInt(mathMatch[5], 10) - 1;

        const c1Idx = col1Letter.charCodeAt(0) - 65;
        const c2Idx = col2Letter.charCodeAt(0) - 65;

        const val1 = (currentRows[row1Idx] && currentCols[c1Idx]) ? (parseFloat(currentRows[row1Idx][currentCols[c1Idx].id]) || 0) : 0;
        const val2 = (currentRows[row2Idx] && currentCols[c2Idx]) ? (parseFloat(currentRows[row2Idx][currentCols[c2Idx].id]) || 0) : 0;

        let res = 0;
        if (op === '+') res = val1 + val2;
        if (op === '-') res = val1 - val2;
        if (op === '*') res = val1 * val2;
        if (op === '/' && val2 !== 0) res = val1 / val2;

        return res.toLocaleString('en-IN', { minimumFractionDigits: 2 });
      }

      return strVal;
    } catch (e) {
      return '#ERR';
    }
  };

  // Update cell value
  const updateCellValue = (rowIdx, colId, value) => {
    setSheets(prevSheets => prevSheets.map(s => {
      if (s.id !== activeSheetId) return s;
      const updatedRows = [...s.rows];
      const updatedRow = { ...updatedRows[rowIdx], [colId]: value };

      // Auto-lookup account title if editing account code
      if (colId === 'c_code' || colId === 'tb_code') {
        const found = accounts.find(a => a.code.toLowerCase() === String(value).trim().toLowerCase());
        if (found) {
          if (updatedRow.c_title !== undefined) updatedRow.c_title = found.name;
          if (updatedRow.tb_name !== undefined) updatedRow.tb_name = found.name;
        }
      }

      updatedRows[rowIdx] = updatedRow;
      return { ...s, rows: updatedRows };
    }));
  };

  // =========================================================================
  // DYNAMIC COLUMN OPERATIONS (Add, Edit, Delete)
  // =========================================================================

  const handleAddColumn = () => {
    if (!newColName.trim()) return;
    const newId = `col_${Date.now()}`;
    setSheets(prev => prev.map(s => {
      if (s.id !== activeSheetId) return s;
      const newCols = [...s.columns, {
        id: newId,
        name: newColName.trim(),
        type: newColType,
        width: 140
      }];
      // Initialize row values for new column
      const newRows = s.rows.map(r => ({ ...r, [newId]: newColType === 'number' ? 0 : '' }));
      return { ...s, columns: newCols, rows: newRows };
    }));
    setNewColName('');
    setAddColumnModalOpen(false);
    setStatusMessage({ type: 'success', text: `Added new column "${newColName}".` });
  };

  const handleRenameColumn = (colId, newName) => {
    if (!newName.trim()) return;
    setSheets(prev => prev.map(s => {
      if (s.id !== activeSheetId) return s;
      return {
        ...s,
        columns: s.columns.map(c => c.id === colId ? { ...c, name: newName.trim() } : c)
      };
    }));
    setEditingHeaderId(null);
  };

  const handleDeleteColumn = (colId) => {
    if (currentCols.length <= 2) {
      alert("A spreadsheet requires at least 2 columns.");
      return;
    }
    const colToDelete = currentCols.find(c => c.id === colId);
    if (!confirm(`Delete column "${colToDelete?.name}"? All data in this column will be removed.`)) return;

    setSheets(prev => prev.map(s => {
      if (s.id !== activeSheetId) return s;
      return {
        ...s,
        columns: s.columns.filter(c => c.id !== colId),
        rows: s.rows.map(r => {
          const newR = { ...r };
          delete newR[colId];
          return newR;
        })
      };
    }));
    setSelectedCoord({ rowIdx: 0, colIdx: 0 });
  };

  // =========================================================================
  // DYNAMIC ROW OPERATIONS (Add, Insert, Delete)
  // =========================================================================

  const handleAddRow = () => {
    const newRowId = `row_${Date.now()}`;
    const emptyRow = { id: newRowId };
    currentCols.forEach(col => {
      emptyRow[col.id] = col.type === 'number' ? 0 : '';
    });

    setSheets(prev => prev.map(s => {
      if (s.id !== activeSheetId) return s;
      return { ...s, rows: [...s.rows, emptyRow] };
    }));
  };

  const handleInsertRowAbove = (index) => {
    const newRowId = `row_${Date.now()}`;
    const emptyRow = { id: newRowId };
    currentCols.forEach(col => {
      emptyRow[col.id] = col.type === 'number' ? 0 : '';
    });

    setSheets(prev => prev.map(s => {
      if (s.id !== activeSheetId) return s;
      const nextRows = [...s.rows];
      nextRows.splice(index, 0, emptyRow);
      return { ...s, rows: nextRows };
    }));
  };

  const handleDeleteRow = (index) => {
    if (currentRows.length <= 1) {
      alert("Spreadsheet requires at least one row.");
      return;
    }
    setSheets(prev => prev.map(s => {
      if (s.id !== activeSheetId) return s;
      return { ...s, rows: s.rows.filter((_, i) => i !== index) };
    }));
    setSelectedCoord(prev => ({ ...prev, rowIdx: Math.max(0, prev.rowIdx - 1) }));
  };

  // Add new workbook sheet
  const handleAddNewSheet = () => {
    const sheetNum = sheets.length + 1;
    const newSheet = {
      id: `sheet_${Date.now()}`,
      name: `Sheet ${sheetNum}`,
      columns: [
        { id: 'c_a', name: 'Particulars', type: 'text', width: 220 },
        { id: 'c_b', name: 'Ref / Category', type: 'text', width: 160 },
        { id: 'c_c', name: 'Debit', type: 'number', width: 140 },
        { id: 'c_d', name: 'Credit', type: 'number', width: 140 },
        { id: 'c_e', name: 'Net', type: 'formula', width: 140 }
      ],
      rows: [
        { id: 'r1', c_a: '', c_b: '', c_c: 0, c_d: 0, c_e: '' },
        { id: 'r2', c_a: '', c_b: '', c_c: 0, c_d: 0, c_e: '' },
        { id: 'r3', c_a: '', c_b: '', c_c: 0, c_d: 0, c_e: '' }
      ]
    };
    setSheets([...sheets, newSheet]);
    setActiveSheetId(newSheet.id);
  };

  // Find debit & credit columns if present
  const debitCol = currentCols.find(c => c.name.toLowerCase().includes('debit') || c.id.includes('debit') || c.id.includes('dr'));
  const creditCol = currentCols.find(c => c.name.toLowerCase().includes('credit') || c.id.includes('credit') || c.id.includes('cr'));
  const codeCol = currentCols.find(c => c.name.toLowerCase().includes('code') || c.id.includes('code'));

  const totalDebits = debitCol ? currentRows.reduce((sum, r) => sum + (parseFloat(r[debitCol.id]) || 0), 0) : 0;
  const totalCredits = creditCol ? currentRows.reduce((sum, r) => sum + (parseFloat(r[creditCol.id]) || 0), 0) : 0;
  const variance = Math.abs(totalDebits - totalCredits);
  const isBalanced = debitCol && creditCol && totalDebits > 0 && variance < 0.01;

  // Post to backend General Ledger
  const handlePostLedger = async () => {
    if (!debitCol || !creditCol || !codeCol) {
      alert("To post this sheet to General Ledger, the sheet must have Account Code, Debit, and Credit columns.");
      return;
    }
    if (!isBalanced) {
      alert(`Imbalance detected! Total Debits (₹ ${totalDebits.toFixed(2)}) must equal Total Credits (₹ ${totalCredits.toFixed(2)}).`);
      return;
    }

    const validLines = [];
    for (const r of currentRows) {
      const dr = parseFloat(r[debitCol.id]) || 0;
      const cr = parseFloat(r[creditCol.id]) || 0;
      const rawCode = String(r[codeCol.id] || '').trim();

      if ((dr > 0 || cr > 0) && rawCode) {
        const found = accounts.find(a => a.code.toLowerCase() === rawCode.toLowerCase());
        if (!found) {
          alert(`Account code "${rawCode}" not found in Chart of Accounts!`);
          return;
        }
        validLines.push({
          account_id: found.id,
          debit: dr,
          credit: cr,
          description: r.c_memo || r.name || 'Excel Spreadsheet Batch Entry'
        });
      }
    }

    if (validLines.length < 2) {
      alert("At least two valid double-entry lines are required to post.");
      return;
    }

    try {
      setPosting(true);
      const res = await apiRequest('/api/finance/journal-entries', {
        method: 'POST',
        body: JSON.stringify({
          entry_date: new Date().toISOString().split('T')[0],
          reference: `SPREADSHEET-${Date.now().toString().slice(-4)}`,
          description: `Direct Post from ${currentSheet.name}`,
          lines: validLines
        })
      });

      setStatusMessage({
        type: 'success',
        text: `Posted Voucher ${res.entry_number} to General Ledger! Balanced at ₹ ${totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      });

      if (onEntryPosted) onEntryPosted();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to post journal entry.' });
    } finally {
      setPosting(false);
    }
  };

  // Export sheet to CSV
  const exportToCSV = () => {
    const headerRow = currentCols.map(c => `"${c.name}"`).join(",");
    const dataRows = currentRows.map(r => {
      return currentCols.map(c => `"${r[c.id] !== undefined ? r[c.id] : ''}"`).join(",");
    });
    const csvContent = [headerRow, ...dataRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentSheet.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Import CSV text
  const processImportText = (text) => {
    try {
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) return;

      const delimiter = lines[0].includes('\t') ? '\t' : ',';
      const rawHeaders = lines[0].split(delimiter).map(h => h.replace(/["']/g, '').trim());

      const newCols = rawHeaders.map((h, i) => ({
        id: `imp_col_${i}`,
        name: h || `Column ${getColumnLetter(i)}`,
        type: h.toLowerCase().includes('debit') || h.toLowerCase().includes('credit') || h.toLowerCase().includes('amount') ? 'number' : 'text',
        width: 150
      }));

      const newRows = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const vals = lines[i].split(delimiter).map(v => v.replace(/["']/g, '').trim());
        const rowObj = { id: `imp_row_${i}` };
        newCols.forEach((c, idx) => {
          rowObj[c.id] = c.type === 'number' ? (parseFloat(vals[idx]) || 0) : (vals[idx] || '');
        });
        newRows.push(rowObj);
      }

      setSheets(prev => prev.map(s => {
        if (s.id !== activeSheetId) return s;
        return { ...s, columns: newCols, rows: newRows };
      }));

      setImportModalOpen(false);
      setCsvPasteText('');
      setStatusMessage({ type: 'success', text: `Imported ${newCols.length} columns and ${newRows.length} rows.` });
    } catch (e) {
      alert("Error parsing CSV. Please check formatting.");
    }
  };

  // Active cell letter & number (e.g. B3, E5)
  const activeColLetter = getColumnLetter(selectedCoord.colIdx);
  const activeCellAddress = `${activeColLetter}${selectedCoord.rowIdx + 1}`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans">
      {/* 1. EXCEL-STYLE RIBBON TOOLBAR */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Branding & Formula Functions */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-emerald-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
                Excel Financial Spreadsheet
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Dynamic Rows & Columns
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Full grid editor: Add, edit, or delete both rows and columns with live Excel formulas & double-entry posting.
            </p>
          </div>
        </div>

        {/* Right: Ribbon Operations */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Add Row Button */}
          <button
            onClick={handleAddRow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition shadow-sm"
          >
            <Rows className="w-3.5 h-3.5 text-blue-400" />
            + Add Row
          </button>

          {/* Add Column Button */}
          <button
            onClick={() => setAddColumnModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition shadow-sm"
          >
            <Columns className="w-3.5 h-3.5 text-purple-400" />
            + Add Column
          </button>

          {/* Quick Functions Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition">
              <Calculator className="w-3.5 h-3.5 text-amber-400" />
              <span>fx Formula</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            <div className="absolute right-0 mt-1 w-44 bg-slate-950 border border-slate-800 rounded-lg shadow-xl py-1 hidden group-hover:block z-30 text-xs">
              <button
                onClick={() => {
                  const formula = `=SUM(${activeColLetter}1:${activeColLetter}${selectedCoord.rowIdx})`;
                  setFormulaInput(formula);
                  updateCellValue(selectedCoord.rowIdx, activeCol.id, formula);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 flex items-center justify-between"
              >
                <span>=SUM(col)</span>
                <span className="text-[10px] text-slate-500">Auto-Sum</span>
              </button>
              <button
                onClick={() => {
                  const formula = `=E${selectedCoord.rowIdx + 1}-F${selectedCoord.rowIdx + 1}`;
                  setFormulaInput(formula);
                  updateCellValue(selectedCoord.rowIdx, activeCol.id, formula);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 flex items-center justify-between"
              >
                <span>=Debit - Credit</span>
                <span className="text-[10px] text-slate-500">Net Diff</span>
              </button>
            </div>
          </div>

          {/* Import / Export */}
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition"
            title="Import from Excel / CSV"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            Import
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition"
            title="Export to Excel CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export
          </button>

          {/* Post to GL */}
          {debitCol && creditCol && (
            <button
              onClick={handlePostLedger}
              disabled={posting || !isBalanced}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition shadow-md ${
                isBalanced
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-950/40'
                  : 'bg-slate-800/80 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {posting ? 'Posting...' : 'Post General Ledger'}
            </button>
          )}
        </div>
      </div>

      {/* 2. EXCEL FORMULA BAR (fx & Name Box) */}
      <div className="bg-slate-950/90 px-4 py-1.5 border-b border-slate-800 flex items-center gap-2 text-xs font-mono">
        {/* Cell Name Box (A1, B3, E5...) */}
        <div className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-blue-400 font-bold min-w-[55px] text-center shadow-inner">
          {activeCellAddress}
        </div>

        {/* fx symbol */}
        <span className="text-slate-500 font-serif italic text-sm font-bold select-none">fx</span>

        {/* Formula Input Bar */}
        <input
          type="text"
          value={formulaInput}
          onChange={(e) => {
            setFormulaInput(e.target.value);
            updateCellValue(selectedCoord.rowIdx, activeCol.id, e.target.value);
          }}
          placeholder="Enter text, number, or formula (e.g. =SUM(E1:E4) or =E1-F1)..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-1 text-slate-200 text-xs font-mono outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />

        {/* Selected Column Type Badge */}
        <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-2">
          <span className="text-slate-500">Col: <strong className="text-slate-300">{activeCol?.name}</strong></span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px] uppercase font-mono">
            {activeCol?.type}
          </span>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className={`px-4 py-2 border-b flex items-center justify-between text-xs ${
          statusMessage.type === 'success'
            ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
            : 'bg-rose-950/50 border-rose-800/60 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* 3. INTERACTIVE EXCEL GRID */}
      <div className="overflow-x-auto overflow-y-auto max-h-[520px] font-sans text-xs select-none">
        <table className="w-full border-collapse">
          {/* Header Row: Letters + Editable Column Names */}
          <thead className="bg-slate-950 sticky top-0 z-20 shadow-md">
            <tr>
              {/* Row Number Header corner */}
              <th className="w-12 px-2 py-2 border-r border-b border-slate-800 bg-slate-950 text-slate-500 font-mono text-[11px] text-center font-bold">
                #
              </th>

              {/* Dynamic Columns */}
              {currentCols.map((col, cIdx) => {
                const colLetter = getColumnLetter(cIdx);
                const isColActive = selectedCoord.colIdx === cIdx;
                const isEditing = editingHeaderId === col.id;

                return (
                  <th
                    key={col.id}
                    style={{ minWidth: `${col.width || 140}px` }}
                    className={`px-2 py-1.5 border-r border-b border-slate-800 text-left font-medium group transition-colors ${
                      isColActive ? 'bg-slate-900 border-b-2 border-b-blue-500' : 'bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      {/* Column Letter Indicator */}
                      <span className="font-mono text-[10px] text-blue-400 font-bold bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
                        {colLetter}
                      </span>

                      {/* Editable Column Name */}
                      {isEditing ? (
                        <div className="flex items-center gap-1 flex-1">
                          <input
                            type="text"
                            autoFocus
                            value={editingHeaderName}
                            onChange={(e) => setEditingHeaderName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameColumn(col.id, editingHeaderName);
                              if (e.key === 'Escape') setEditingHeaderId(null);
                            }}
                            className="bg-slate-900 border border-blue-500 text-white text-xs px-1.5 py-0.5 rounded outline-none w-full"
                          />
                          <button
                            onClick={() => handleRenameColumn(col.id, editingHeaderName)}
                            className="text-emerald-400 hover:text-emerald-300 p-0.5"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onDoubleClick={() => {
                            setEditingHeaderId(col.id);
                            setEditingHeaderName(col.name);
                          }}
                          className="flex items-center gap-1.5 text-slate-200 text-xs font-semibold cursor-pointer truncate flex-1 hover:text-blue-300"
                          title="Double-click to rename column"
                        >
                          <span className="truncate">{col.name}</span>
                          <Edit2 className="w-2.5 h-2.5 text-slate-600 opacity-0 group-hover:opacity-100 transition" />
                        </div>
                      )}

                      {/* Delete Column Action */}
                      <button
                        onClick={() => handleDeleteColumn(col.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                        title="Delete this column"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                );
              })}

              {/* Add Column '+' Shortcut at end of header */}
              <th className="w-12 px-2 py-2 border-b border-slate-800 bg-slate-950 text-center">
                <button
                  onClick={() => setAddColumnModalOpen(true)}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-blue-400 rounded transition"
                  title="Add Column"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </th>
            </tr>
          </thead>

          {/* Grid Rows */}
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {currentRows.map((row, rIdx) => {
              const isRowSelected = selectedCoord.rowIdx === rIdx;

              return (
                <tr
                  key={row.id || rIdx}
                  className={`hover:bg-slate-800/30 transition-colors ${isRowSelected ? 'bg-slate-800/20' : ''}`}
                >
                  {/* Row Number Column (1, 2, 3...) */}
                  <td className="px-2 py-1.5 text-center bg-slate-950/70 border-r border-slate-800 text-slate-500 font-mono text-[11px] font-semibold group relative">
                    <div className="flex items-center justify-center gap-1">
                      <span>{rIdx + 1}</span>
                      {/* Context actions for row */}
                      <button
                        onClick={() => handleInsertRowAbove(rIdx)}
                        className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-300 absolute left-1"
                        title="Insert Row Above"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </td>

                  {/* Dynamic Cells */}
                  {currentCols.map((col, cIdx) => {
                    const isCellActive = selectedCoord.rowIdx === rIdx && selectedCoord.colIdx === cIdx;
                    const rawVal = row[col.id];
                    const isFormula = String(rawVal || '').startsWith('=');
                    const displayVal = isFormula ? evaluateCellDisplay(rawVal, rIdx, col.id) : rawVal;

                    return (
                      <td
                        key={col.id}
                        onClick={() => setSelectedCoord({ rowIdx: rIdx, colIdx: cIdx })}
                        className={`p-0 border-r border-slate-800 relative transition-all ${
                          isCellActive
                            ? 'bg-blue-950/30 ring-2 ring-blue-500 ring-inset z-10'
                            : 'bg-transparent'
                        }`}
                      >
                        {col.type === 'number' ? (
                          <input
                            type="number"
                            step="0.01"
                            value={rawVal === 0 ? '' : (rawVal ?? '')}
                            placeholder="0.00"
                            onFocus={() => setSelectedCoord({ rowIdx: rIdx, colIdx: cIdx })}
                            onChange={(e) => updateCellValue(rIdx, col.id, e.target.value === '' ? 0 : parseFloat(e.target.value))}
                            className="w-full h-full px-2.5 py-1.5 bg-transparent text-right font-mono text-xs text-slate-100 font-medium outline-none"
                          />
                        ) : isFormula ? (
                          <div
                            onFocus={() => setSelectedCoord({ rowIdx: rIdx, colIdx: cIdx })}
                            className="w-full h-full px-2.5 py-1.5 font-mono text-xs text-right text-emerald-300 font-semibold cursor-pointer truncate"
                            title={`Formula: ${rawVal}`}
                          >
                            {displayVal}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={rawVal ?? ''}
                            onFocus={() => setSelectedCoord({ rowIdx: rIdx, colIdx: cIdx })}
                            onChange={(e) => updateCellValue(rIdx, col.id, e.target.value)}
                            placeholder="..."
                            className="w-full h-full px-2.5 py-1.5 bg-transparent text-xs text-slate-200 outline-none"
                          />
                        )}
                      </td>
                    );
                  })}

                  {/* Delete Row Button */}
                  <td className="p-1 text-center border-slate-800">
                    <button
                      onClick={() => handleDeleteRow(rIdx)}
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                      title="Delete Row"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 4. WORKBOOK BOTTOM SHEET TABS & STATUS BAR */}
      <div className="bg-slate-950 border-t border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Excel Sheet Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mr-1">Sheets:</span>
          {sheets.map(sheet => {
            const isActive = sheet.id === activeSheetId;
            return (
              <button
                key={sheet.id}
                onClick={() => {
                  setActiveSheetId(sheet.id);
                  setSelectedCoord({ rowIdx: 0, colIdx: 0 });
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Table className="w-3 h-3" />
                <span>{sheet.name}</span>
              </button>
            );
          })}
          <button
            onClick={handleAddNewSheet}
            className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-blue-300 rounded-md border border-slate-800 text-xs font-medium transition"
            title="Create New Spreadsheet"
          >
            <Plus className="w-3 h-3" />
            New Sheet
          </button>
        </div>

        {/* Right: Live Calculation & Balancing Status */}
        <div className="flex items-center gap-4 font-mono text-xs flex-wrap">
          <div className="text-slate-400">
            <span>Cols: <strong className="text-white">{currentCols.length}</strong></span> | <span>Rows: <strong className="text-white">{currentRows.length}</strong></span>
          </div>

          {debitCol && creditCol && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Debits:</span>
                <span className="text-blue-400 font-bold">
                  ₹ {totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Credits:</span>
                <span className="text-emerald-400 font-bold">
                  ₹ {totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {isBalanced ? (
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-sans font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  BALANCED
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-sans font-semibold text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5" />
                  DIFF: ₹ {variance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 5. ADD COLUMN MODAL */}
      {addColumnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                <Columns className="w-4 h-4 text-purple-400" />
                Add New Spreadsheet Column
              </h4>
              <button onClick={() => setAddColumnModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Column Header Name</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Tax Rate, Cost Center, Vendor Ref"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Data Type</label>
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="text">Text / General</option>
                  <option value="number">Number / Amount (₹)</option>
                  <option value="formula">Calculated Formula (=)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAddColumnModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddColumn}
                disabled={!newColName.trim()}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg"
              >
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. IMPORT CSV / EXCEL MODAL */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                Import Spreadsheet Data (CSV or Excel)
              </h4>
              <button onClick={() => setImportModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              Upload any `.csv` file or paste tab/comma-delimited rows directly from Excel or Google Sheets.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400">Upload CSV File:</label>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => processImportText(ev.target.result);
                  reader.readAsText(file);
                }}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400">Or Paste Raw Spreadsheet Rows:</label>
              <textarea
                rows={5}
                value={csvPasteText}
                onChange={(e) => setCsvPasteText(e.target.value)}
                placeholder="Code, Account Title, Memo, Debit, Credit&#10;1001, Cash in Hand, Deposit, 50000, 0&#10;4001, Sales Revenue, Sales, 0, 50000"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setImportModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => processImportText(csvPasteText)}
                disabled={!csvPasteText.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg"
              >
                Import Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
