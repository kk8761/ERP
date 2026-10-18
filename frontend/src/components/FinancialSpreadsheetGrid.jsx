import React, { useState, useMemo, useRef } from 'react';
import {
  FileSpreadsheet, Plus, Trash2, Download, Upload, CheckCircle2,
  AlertCircle, Search, Edit2, Filter, ArrowUp, ArrowDown, Printer,
  Save, Info, Columns, Check, X, SlidersHorizontal, Table
} from 'lucide-react';
import { apiRequest } from '../services/api';
import './FinancialSpreadsheetGrid.css';

export default function FinancialSpreadsheetGrid({ accounts = [], onEntryPosted }) {
  // 1. ACDOCA Table Column Definitions exactly matching the user's reference screenshot
  const [columns, setColumns] = useState([
    // Group 1: Pale Cyan Columns (Key & Ledger identifiers)
    { id: 'ld', name: 'Ld', label: 'Ledger', width: 44, align: 'center', type: 'text', group: 'cyan' },
    { id: 'cocd', name: 'CoCd', label: 'Company Code', width: 55, align: 'center', type: 'text', group: 'cyan' },
    { id: 'year', name: 'Year', label: 'Fiscal Year', width: 52, align: 'center', type: 'text', group: 'cyan' },
    { id: 'doc_no', name: 'DocumentNo', label: 'Document Number', width: 105, align: 'left', type: 'text', group: 'cyan' },
    { id: 'line_itm', name: 'LnItm', label: 'Line Item', width: 60, align: 'center', type: 'text', group: 'cyan' },
    { id: 'clfy', name: 'CLFY', label: 'Clear Fiscal Year', width: 50, align: 'center', type: 'text', group: 'cyan' },
    { id: 'record_type', name: 'R', label: 'Record Type', width: 36, align: 'center', type: 'text', group: 'cyan' },

    // Group 2: Pale Yellow Columns (Transaction Types)
    { id: 'tty', name: 'TTy', label: 'Transaction Type', width: 58, align: 'center', type: 'text', group: 'yellow' },
    { id: 'tr_ty', name: 'TrTy', label: 'Transaction Type Sub', width: 58, align: 'center', type: 'text', group: 'yellow' },
    { id: 'b_tran', name: 'BTran', label: 'Business Transaction', width: 62, align: 'center', type: 'text', group: 'yellow' },
    { id: 'bus_tran_typ', name: 'BusTranTyp', label: 'Bus Tran Type', width: 80, align: 'center', type: 'text', group: 'yellow' },

    // Group 3: Neutral Reference Columns (White background)
    { id: 'ref_proc', name: 'Ref. proc.', label: 'Reference Procedure', width: 72, align: 'center', type: 'text', group: 'white' },
    { id: 'log_system', name: 'Log. System', label: 'Logical System', width: 80, align: 'center', type: 'text', group: 'white' },
    { id: 'ref_org', name: 'Ref.org.un', label: 'Ref Org Unit', width: 70, align: 'center', type: 'text', group: 'white' },
    { id: 'ref_doc', name: 'Ref. doc.', label: 'Reference Document', width: 95, align: 'left', type: 'text', group: 'white' },
    { id: 'ref_it', name: 'Ref.It', label: 'Reference Item', width: 50, align: 'center', type: 'text', group: 'white' },
    { id: 'ref_grp', name: 'RefGrp', label: 'Reference Group', width: 55, align: 'center', type: 'text', group: 'white' },
    { id: 'sub_ta', name: 'SubTA', label: 'Sub Transaction', width: 55, align: 'center', type: 'text', group: 'white' },
    { id: 'reving', name: 'Reving', label: 'Reversing Flag', width: 55, align: 'center', type: 'text', group: 'white' },
    { id: 'revd', name: 'Revd', label: 'Reversed Flag', width: 50, align: 'center', type: 'text', group: 'white' },
    { id: 'tru_rev', name: 'TruRev', label: 'True Reversal', width: 55, align: 'center', type: 'text', group: 'white' },
    { id: 'revers_trns', name: 'ReversTrns', label: 'Reversal Transaction', width: 75, align: 'center', type: 'text', group: 'white' },
    { id: 'rev_org', name: 'Rev. Org.', label: 'Reversal Org', width: 68, align: 'center', type: 'text', group: 'white' },
    { id: 'reversal_ref', name: 'Reversal Ref.', label: 'Reversal Reference', width: 85, align: 'center', type: 'text', group: 'white' },
    { id: 'r_sub_ta', name: 'RSubTA', label: 'Rev Sub TA', width: 60, align: 'center', type: 'text', group: 'white' },
    { id: 'settlg', name: 'Settlg', label: 'Settling Doc', width: 55, align: 'center', type: 'text', group: 'white' },
    { id: 'settld', name: 'Settld', label: 'Settled Status', width: 55, align: 'center', type: 'text', group: 'white' },

    // Financial Posting Integration Columns
    { id: 'gl_account', name: 'GL Account', label: 'General Ledger Account', width: 100, align: 'left', type: 'account', group: 'posting' },
    { id: 'gl_title', name: 'Account Name', label: 'Account Title', width: 140, align: 'left', type: 'text', group: 'posting' },
    { id: 'debit', name: 'Debit (₹)', label: 'Debit Amount', width: 95, align: 'right', type: 'currency', group: 'posting' },
    { id: 'credit', name: 'Credit (₹)', label: 'Credit Amount', width: 95, align: 'right', type: 'currency', group: 'posting' },
    { id: 'cost_center', name: 'Cost Center', label: 'Cost Center', width: 100, align: 'left', type: 'text', group: 'posting' },
    { id: 'text_memo', name: 'Line Text', label: 'Item Memo / Text', width: 160, align: 'left', type: 'text', group: 'posting' }
  ]);

  // 2. Initial Data Matching the exact rows from the user's reference screenshot
  const [rows, setRows] = useState([
    {
      id: 'r1', ld: '0L', cocd: '6010', year: '2017', doc_no: '4900000301', line_itm: '000003', clfy: '2017', record_type: '0',
      tty: 'RMWA', tr_ty: 'RMWA', b_tran: 'RMWA', bus_tran_typ: 'RMWA', ref_proc: 'MKPF', log_system: '', ref_org: '2018', ref_doc: '4900003458',
      ref_it: '', ref_grp: '', sub_ta: '', reving: '', revd: '', tru_rev: '', revers_trns: '', rev_org: '', reversal_ref: '', r_sub_ta: '', settlg: '', settld: '',
      gl_account: '1001', gl_title: 'Cash in Hand', debit: 50000, credit: 0, cost_center: 'CC-HQ-MAIN', text_memo: 'Line entry collection'
    },
    {
      id: 'r2', ld: '0L', cocd: '6010', year: '2017', doc_no: '4900000301', line_itm: '000004', clfy: '2017', record_type: '0',
      tty: 'RMWA', tr_ty: 'RMWA', b_tran: 'RMWA', bus_tran_typ: 'RMWA', ref_proc: 'MKPF', log_system: '', ref_org: '2018', ref_doc: '4900003458',
      ref_it: '', ref_grp: '', sub_ta: '', reving: '', revd: '', tru_rev: '', revers_trns: '', rev_org: '', reversal_ref: '', r_sub_ta: '', settlg: '', settld: '',
      gl_account: '4001', gl_title: 'Sales Revenue', debit: 0, credit: 50000, cost_center: 'CC-SALES-RETAIL', text_memo: 'Line entry settlement'
    },
    {
      id: 'r3', ld: '0L', cocd: '6010', year: '2017', doc_no: '4900000303', line_itm: '000013', clfy: '2017', record_type: '0',
      tty: 'RMWI', tr_ty: 'RMWI', b_tran: 'RMWI', bus_tran_typ: 'RMWI', ref_proc: 'MKPF', log_system: '', ref_org: '2018', ref_doc: '4900003469',
      ref_it: '', ref_grp: '', sub_ta: '', reving: '', revd: '', tru_rev: '', revers_trns: '', rev_org: '', reversal_ref: '', r_sub_ta: '', settlg: '', settld: '',
      gl_account: '5001', gl_title: 'Cost of Goods Sold', debit: 22000, credit: 0, cost_center: 'CC-WH-CENTRAL', text_memo: 'Stock release cost'
    },
    {
      id: 'r4', ld: '0L', cocd: '6010', year: '2017', doc_no: '4900000305', line_itm: '000014', clfy: '2017', record_type: '0',
      tty: 'RMWI', tr_ty: 'RMWI', b_tran: 'RMWI', bus_tran_typ: 'RMWI', ref_proc: 'MKPF', log_system: '', ref_org: '2018', ref_doc: '4900003469',
      ref_it: '', ref_grp: '', sub_ta: '', reving: '', revd: '', tru_rev: '', revers_trns: '', rev_org: '', reversal_ref: '', r_sub_ta: '', settlg: '', settld: '',
      gl_account: '1003', gl_title: 'Merchandise Inventory', debit: 0, credit: 22000, cost_center: 'CC-WH-CENTRAL', text_memo: 'Warehouse reduction'
    },
    {
      id: 'r5', ld: '0L', cocd: '6010', year: '2017', doc_no: '4900000305', line_itm: '000015', clfy: '2017', record_type: '0',
      tty: 'RMWI', tr_ty: 'RMWI', b_tran: 'RMWI', bus_tran_typ: 'RMWI', ref_proc: 'MKPF', log_system: '', ref_org: '2018', ref_doc: '4900003469',
      ref_it: '', ref_grp: '', sub_ta: '', reving: '', revd: '', tru_rev: '', revers_trns: '', rev_org: '', reversal_ref: '', r_sub_ta: '', settlg: '', settld: '',
      gl_account: '1002', gl_title: 'HDFC Bank Operating A/C', debit: 18000, credit: 0, cost_center: 'CC-FIN-TREASURY', text_memo: 'Direct bank debit'
    },
    {
      id: 'r6', ld: '0L', cocd: '6010', year: '2017', doc_no: '4900000305', line_itm: '000016', clfy: '2017', record_type: '0',
      tty: 'RMWI', tr_ty: 'RMWI', b_tran: 'RMWI', bus_tran_typ: 'RMWI', ref_proc: 'MKPF', log_system: '', ref_org: '2018', ref_doc: '4900003469',
      ref_it: '', ref_grp: '', sub_ta: '', reving: '', revd: '', tru_rev: '', revers_trns: '', rev_org: '', reversal_ref: '', r_sub_ta: '', settlg: '', settld: '',
      gl_account: '2001', gl_title: 'Accounts Payable', debit: 0, credit: 18000, cost_center: 'CC-PROC-CORP', text_memo: 'Supplier clearance'
    },
    {
      id: 'r7', ld: '0L', cocd: '6010', year: '2017', doc_no: '4900000305', line_itm: '000017', clfy: '2017', record_type: '0',
      tty: 'RMWI', tr_ty: 'RMWI', b_tran: 'RMWI', bus_tran_typ: 'RMWI', ref_proc: 'MKPF', log_system: '', ref_org: '2018', ref_doc: '4900003469',
      ref_it: '', ref_grp: '', sub_ta: '', reving: '', revd: '', tru_rev: '', revers_trns: '', rev_org: '', reversal_ref: '', r_sub_ta: '', settlg: '', settld: '',
      gl_account: '5002', gl_title: 'Warehouse Rent Expense', debit: 14500, credit: 0, cost_center: 'CC-ADMIN-FACIL', text_memo: 'Facility charge'
    },
    {
      id: 'r8', ld: '0L', cocd: '6010', year: '2017', doc_no: '4900000305', line_itm: '000018', clfy: '2017', record_type: '0',
      tty: 'RMWI', tr_ty: 'RMWI', b_tran: 'RMWI', bus_tran_typ: 'RMWI', ref_proc: 'MKPF', log_system: '', ref_org: '2018', ref_doc: '4900003469',
      ref_it: '', ref_grp: '', sub_ta: '', reving: '', revd: '', tru_rev: '', revers_trns: '', rev_org: '', reversal_ref: '', r_sub_ta: '', settlg: '', settld: '',
      gl_account: '1002', gl_title: 'HDFC Bank Operating A/C', debit: 0, credit: 14500, cost_center: 'CC-FIN-TREASURY', text_memo: 'Remittance voucher'
    },
    {
      id: 'r9', ld: '0L', cocd: '6010', year: '2017', doc_no: '4900000306', line_itm: '000003', clfy: '2017', record_type: '0',
      tty: 'RMWL', tr_ty: 'RMWL', b_tran: 'RMWL', bus_tran_typ: 'RMWL', ref_proc: 'MKPF', log_system: '', ref_org: '2018', ref_doc: '4900003471',
      ref_it: '', ref_grp: '', sub_ta: '', reving: '', revd: '', tru_rev: '', revers_trns: '', rev_org: '', reversal_ref: '', r_sub_ta: '', settlg: '', settld: '',
      gl_account: '1001', gl_title: 'Cash in Hand', debit: 12000, credit: 0, cost_center: 'CC-HQ-MAIN', text_memo: 'Retail cash'
    },
    {
      id: 'r10', ld: '0L', cocd: '6010', year: '2017', doc_no: '4900000306', line_itm: '000004', clfy: '2017', record_type: '0',
      tty: 'RMWL', tr_ty: 'RMWL', b_tran: 'RMWL', bus_tran_typ: 'RMWL', ref_proc: 'MKPF', log_system: '', ref_org: '2018', ref_doc: '4900003471',
      ref_it: '', ref_grp: '', sub_ta: '', reving: '', revd: '', tru_rev: '', revers_trns: '', rev_org: '', reversal_ref: '', r_sub_ta: '', settlg: '', settld: '',
      gl_account: '4001', gl_title: 'Sales Revenue', debit: 0, credit: 12000, cost_center: 'CC-SALES-RETAIL', text_memo: 'Service income'
    },
    {
      id: 'r11', ld: '0L', cocd: '6010', year: '2017', doc_no: '4900000307', line_itm: '000003', clfy: '2017', record_type: '0',
      tty: 'RMWL', tr_ty: 'RMWL', b_tran: 'RMWL', bus_tran_typ: 'RMWL', ref_proc: 'MKPF', log_system: '', ref_org: '2018', ref_doc: '4900003472',
      ref_it: '', ref_grp: '', sub_ta: '', reving: '', revd: '', tru_rev: '', revers_trns: '', rev_org: '', reversal_ref: '', r_sub_ta: '', settlg: '', settld: '',
      gl_account: '1002', gl_title: 'HDFC Bank Operating A/C', debit: 31000, credit: 0, cost_center: 'CC-FIN-TREASURY', text_memo: 'Inward wire'
    },
    {
      id: 'r12', ld: '0L', cocd: '6010', year: '2017', doc_no: '4900000307', line_itm: '000004', clfy: '2017', record_type: '0',
      tty: 'RMWL', tr_ty: 'RMWL', b_tran: 'RMWL', bus_tran_typ: 'RMWL', ref_proc: 'MKPF', log_system: '', ref_org: '2018', ref_doc: '4900003472',
      ref_it: '', ref_grp: '', sub_ta: '', reving: '', revd: '', tru_rev: '', revers_trns: '', rev_org: '', reversal_ref: '', r_sub_ta: '', settlg: '', settld: '',
      gl_account: '4001', gl_title: 'Sales Revenue', debit: 0, credit: 31000, cost_center: 'CC-SALES-RETAIL', text_memo: 'Export revenue'
    },
    {
      id: 'r13', ld: '0L', cocd: '6010', year: '2017', doc_no: '4900000312', line_itm: '000003', clfy: '2017', record_type: '0',
      tty: 'RMWA', tr_ty: 'RMWA', b_tran: 'RMWA', bus_tran_typ: 'RMWA', ref_proc: 'MKPF', log_system: '', ref_org: '2018', ref_doc: '4900003481',
      ref_it: '', ref_grp: '', sub_ta: '', reving: '', revd: '', tru_rev: '', revers_trns: '', rev_org: '', reversal_ref: '', r_sub_ta: '', settlg: '', settld: '',
      gl_account: '1001', gl_title: 'Cash in Hand', debit: 25000, credit: 25000, cost_center: 'CC-HQ-MAIN', text_memo: 'Transfer line'
    }
  ]);

  // Parameters & Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [tableName, setTableName] = useState('ACDOCA');
  const [maxHits, setMaxHits] = useState('500');
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: 'doc_no', direction: 'asc' });

  // Modals & Dynamic Headers
  const [editingHeaderId, setEditingHeaderId] = useState(null);
  const [editingHeaderName, setEditingHeaderName] = useState('');
  const [addColumnModalOpen, setAddColumnModalOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState('text');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvPasteText, setCsvPasteText] = useState('');
  const [posting, setPosting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Cell editing
  const handleCellChange = (rowIdx, colId, value) => {
    setRows(prev => {
      const next = [...prev];
      const updatedRow = { ...next[rowIdx], [colId]: value };

      if (colId === 'gl_account') {
        const found = accounts.find(a => a.code.toLowerCase() === String(value).trim().toLowerCase());
        if (found) {
          updatedRow.gl_title = found.name;
        }
      }

      next[rowIdx] = updatedRow;
      return next;
    });
  };

  // Add Row
  const handleAddRow = () => {
    const nextDocNum = `4900000${(rows.length + 301).toString().slice(-3)}`;
    const newRow = {
      id: `r_${Date.now()}`,
      ld: '0L',
      cocd: '6010',
      year: '2026',
      doc_no: nextDocNum,
      line_itm: '000001',
      clfy: '2026',
      record_type: '0',
      tty: 'RMWA',
      tr_ty: 'RMWA',
      b_tran: 'RMWA',
      bus_tran_typ: 'RMWA',
      ref_proc: 'MKPF',
      log_system: '',
      ref_org: '2026',
      ref_doc: `490000${(rows.length + 3480).toString().slice(-4)}`,
      ref_it: '',
      ref_grp: '',
      sub_ta: '',
      reving: '',
      revd: '',
      tru_rev: '',
      revers_trns: '',
      rev_org: '',
      reversal_ref: '',
      r_sub_ta: '',
      settlg: '',
      settld: '',
      gl_account: '',
      gl_title: '',
      debit: 0,
      credit: 0,
      cost_center: 'CC-HQ-MAIN',
      text_memo: ''
    };

    // Initialize custom columns
    columns.forEach(c => {
      if (!(c.id in newRow)) {
        newRow[c.id] = c.type === 'currency' ? 0 : '';
      }
    });

    setRows(prev => [...prev, newRow]);
    setSelectedRowIndex(rows.length);
    setStatusMessage({ type: 'success', text: `Appended new document line item ${nextDocNum}.` });
  };

  // Delete Row
  const handleDeleteRow = (index) => {
    if (rows.length <= 1) {
      alert("Spreadsheet requires at least one row.");
      return;
    }
    setRows(prev => prev.filter((_, i) => i !== index));
    setSelectedRowIndex(Math.max(0, index - 1));
  };

  // Add Column
  const handleAddColumn = () => {
    if (!newColName.trim()) return;
    const colKey = `c_${Date.now()}`;
    const newCol = {
      id: colKey,
      name: newColName.trim(),
      label: newColName.trim(),
      width: 110,
      align: newColType === 'currency' ? 'right' : 'left',
      type: newColType,
      group: 'white'
    };

    setColumns(prev => [...prev, newCol]);
    setRows(prev => prev.map(r => ({ ...r, [colKey]: newColType === 'currency' ? 0 : '' })));
    setNewColName('');
    setAddColumnModalOpen(false);
    setStatusMessage({ type: 'success', text: `Added column "${newCol.name}" to ACDOCA matrix.` });
  };

  // Rename Column
  const handleRenameColumn = (colId, newName) => {
    if (!newName.trim()) return;
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, name: newName.trim(), label: newName.trim() } : c));
    setEditingHeaderId(null);
  };

  // Delete Column
  const handleDeleteColumn = (colId) => {
    if (['doc_no', 'gl_account', 'debit', 'credit'].includes(colId)) {
      alert(`Cannot delete required core ledger field "${colId}".`);
      return;
    }
    setColumns(prev => prev.filter(c => c.id !== colId));
  };

  // Sort
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filtered & Sorted Rows
  const displayedRows = useMemo(() => {
    let result = [...rows];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(r =>
        Object.values(r).some(v => String(v).toLowerCase().includes(q))
      );
    }
    if (sortConfig.key) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key] ?? '';
        const valB = b[sortConfig.key] ?? '';
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        return sortConfig.direction === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }
    const limit = parseInt(maxHits, 10);
    if (!isNaN(limit) && limit > 0) {
      result = result.slice(0, limit);
    }
    return result;
  }, [rows, searchTerm, sortConfig, maxHits]);

  // Totals & Balance
  const totalDebits = useMemo(() => rows.reduce((s, r) => s + (parseFloat(r.debit) || 0), 0), [rows]);
  const totalCredits = useMemo(() => rows.reduce((s, r) => s + (parseFloat(r.credit) || 0), 0), [rows]);
  const isBalanced = useMemo(() => Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0, [totalDebits, totalCredits]);
  const activeRow = displayedRows[selectedRowIndex] || displayedRows[0];

  // Post to General Ledger
  const handlePostGeneralLedger = async () => {
    if (!isBalanced) {
      setStatusMessage({ type: 'error', text: `Cannot post: Debits (₹${totalDebits.toFixed(2)}) and Credits (₹${totalCredits.toFixed(2)}) must balance!` });
      return;
    }

    setPosting(true);
    setStatusMessage(null);

    try {
      const validLines = rows.filter(r => (parseFloat(r.debit) > 0 || parseFloat(r.credit) > 0));
      for (const line of validLines) {
        if (!line.gl_account) continue;
        const matchedAcc = accounts.find(a => a.code.toLowerCase() === String(line.gl_account).trim().toLowerCase());
        const accId = matchedAcc ? matchedAcc.id : 1;

        await apiRequest('/api/finance/journal', {
          method: 'POST',
          body: JSON.stringify({
            account_id: accId,
            description: `[ACDOCA ${line.doc_no || 'MANUAL'}] ${line.text_memo || 'Universal Journal Fast Post'} (${line.cost_center || 'HQ'})`,
            debit: parseFloat(line.debit) || 0,
            credit: parseFloat(line.credit) || 0,
            date: new Date().toISOString()
          })
        });
      }

      setStatusMessage({ type: 'success', text: `Successfully posted ${validLines.length} line items to General Ledger!` });
      if (onEntryPosted) onEntryPosted();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Failed posting to ledger: ${err.message || 'Server error'}` });
    } finally {
      setPosting(false);
    }
  };

  // Export CSV
  const exportToCSV = () => {
    const headerLine = columns.map(c => `"${c.name}"`).join(',');
    const rowLines = displayedRows.map(r => columns.map(c => `"${r[c.id] ?? ''}"`).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headerLine, ...rowLines].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ACDOCA_Universal_Journal_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import CSV
  const handleImportCSV = () => {
    if (!csvPasteText.trim()) return;
    try {
      const lines = csvPasteText.trim().split(/\r?\n/);
      if (lines.length < 2) return;
      const delimiter = lines[0].includes('\t') ? '\t' : ',';
      const rawHeaders = lines[0].split(delimiter).map(h => h.replace(/["']/g, '').trim());

      const newCols = rawHeaders.map((h, i) => {
        const existing = columns.find(c => c.name.toLowerCase() === h.toLowerCase());
        return existing || {
          id: `imp_col_${i}`,
          name: h,
          label: h,
          width: 100,
          align: 'left',
          type: 'text',
          group: 'white'
        };
      });

      const newRows = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const vals = lines[i].split(delimiter).map(v => v.replace(/["']/g, '').trim());
        const rowObj = { id: `r_imp_${i}` };
        newCols.forEach((c, idx) => {
          rowObj[c.id] = c.type === 'currency' ? (parseFloat(vals[idx]) || 0) : (vals[idx] || '');
        });
        newRows.push(rowObj);
      }

      setColumns(newCols);
      setRows(newRows);
      setImportModalOpen(false);
      setCsvPasteText('');
      setStatusMessage({ type: 'success', text: `Imported ${newRows.length} entries into ACDOCA matrix.` });
    } catch {
      alert("Error parsing CSV data. Please check formatting.");
    }
  };

  return (
    <div className="acdoca-grid-container">
      {/* 1. TOP SAP CLASSIC TITLE & PARAMETERS BAR */}
      <div className="acdoca-header">
        <div className="acdoca-title-row">
          <div className="acdoca-title">
            ACDOCA: Display of Entries Found
          </div>

          <div className="acdoca-quick-search">
            <span>Filter Search:</span>
            <input
              type="text"
              placeholder="Search in grid..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Parameter Strip matching reference screenshot */}
        <div className="acdoca-param-grid">
          <div className="acdoca-param-item">
            <span className="acdoca-param-label">Search in Table</span>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="acdoca-param-box"
              style={{ width: '80px', textTransform: 'uppercase' }}
            />
            <span style={{ color: '#64748b' }}>Universal Journal Entry Line Items</span>
          </div>

          <div className="acdoca-param-item">
            <span className="acdoca-param-label">Number of hits</span>
            <div className="acdoca-param-box" style={{ width: '60px', textAlign: 'center' }}>
              {displayedRows.length}
            </div>
          </div>

          <div className="acdoca-param-item">
            <span className="acdoca-param-label">Runtime</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, width: '20px' }}>0</span>
            <span className="acdoca-param-label" style={{ marginLeft: '12px' }}>Maximum no. of hits</span>
            <input
              type="text"
              value={maxHits}
              onChange={(e) => setMaxHits(e.target.value)}
              className="acdoca-param-active-box"
            />
          </div>
        </div>
      </div>

      {/* 2. ALV TOOLBAR WITH DETAILS BUTTON & ACTION ICONS (Matching Screenshot Exactly) */}
      <div className="acdoca-toolbar">
        <div className="acdoca-toolbar-left">
          {/* Table select icon */}
          <button
            onClick={() => setSelectedRowIndex(0)}
            className="acdoca-icon-btn"
            title="First Row"
          >
            <Table size={14} />
          </button>

          {/* Print Icon */}
          <button
            onClick={() => window.print()}
            className="acdoca-icon-btn"
            title="Print List / Export View"
          >
            <Printer size={14} />
          </button>

          {/* Filter Funnel Icon */}
          <button
            onClick={() => setSearchTerm(searchTerm ? '' : activeRow?.doc_no || '')}
            className="acdoca-icon-btn"
            style={{ color: searchTerm ? '#0284c7' : undefined }}
            title="Set Filter on Active Document"
          >
            <Filter size={14} />
          </button>

          {/* Sort Ascending */}
          <button
            onClick={() => handleSort('doc_no')}
            className="acdoca-icon-btn"
            title="Sort in Ascending Order"
          >
            <ArrowUp size={14} />
          </button>

          {/* Sort Descending */}
          <button
            onClick={() => handleSort('doc_no')}
            className="acdoca-icon-btn"
            title="Sort in Descending Order"
          >
            <ArrowDown size={14} />
          </button>

          {/* Find (Binoculars/Search) */}
          <button
            onClick={() => {
              const term = prompt("Enter search value for ACDOCA entry:", searchTerm);
              if (term !== null) setSearchTerm(term);
            }}
            className="acdoca-icon-btn"
            title="Find Entry"
          >
            <Search size={14} />
          </button>

          {/* Sum Σ (Sigma) */}
          <div
            style={{
              padding: '0 6px',
              fontWeight: 700,
              fontSize: '13px',
              color: '#475569',
              cursor: 'default',
              userSelect: 'none'
            }}
            title="Total Sum debits/credits calculation"
          >
            Σ
          </div>

          {/* Export to Excel Spreadsheet */}
          <button
            onClick={exportToCSV}
            className="acdoca-icon-btn"
            style={{ color: '#10b981' }}
            title="Export Universal Journal Entries to Excel CSV"
          >
            <Download size={14} />
          </button>

          {/* Layout / Variants */}
          <button
            onClick={() => alert(`Active ACDOCA Layout: Standard ALV Matrix. Columns: ${columns.length}, Rows: ${rows.length}`)}
            className="acdoca-icon-btn"
            title="Select / Change Layout"
          >
            <SlidersHorizontal size={14} />
          </button>

          {/* Details Button with exact SAP button appearance */}
          <button
            onClick={() => setDetailsModalOpen(true)}
            className="acdoca-alv-btn"
            title="Display Document Line Details (F2)"
          >
            <Info size={13} style={{ color: '#0284c7' }} />
            <span>Details</span>
          </button>

          <div className="acdoca-separator" />

          {/* Add Row Button */}
          <button
            onClick={handleAddRow}
            className="acdoca-alv-btn"
            title="Append Line Item"
          >
            <Plus size={13} style={{ color: '#10b981' }} />
            <span>Add Row</span>
          </button>

          {/* Add Column Button */}
          <button
            onClick={() => setAddColumnModalOpen(true)}
            className="acdoca-alv-btn"
            title="Add Custom Field Column"
          >
            <Columns size={13} style={{ color: '#6366f1' }} />
            <span>Add Column</span>
          </button>

          {/* Delete Row Button */}
          <button
            onClick={() => handleDeleteRow(selectedRowIndex)}
            className="acdoca-icon-btn"
            style={{ color: '#ef4444' }}
            title="Delete Selected Row"
          >
            <Trash2 size={14} />
          </button>

          {/* Import CSV */}
          <button
            onClick={() => setImportModalOpen(true)}
            className="acdoca-icon-btn"
            style={{ color: '#0284c7' }}
            title="Paste / Import CSV Matrix"
          >
            <Upload size={14} />
          </button>

          {/* Post GL Button */}
          <button
            onClick={handlePostGeneralLedger}
            disabled={posting || !isBalanced}
            className={`acdoca-alv-btn ${isBalanced ? 'acdoca-alv-btn-primary' : ''}`}
            style={{
              marginLeft: '6px',
              opacity: isBalanced ? 1 : 0.6,
              cursor: isBalanced ? 'pointer' : 'not-allowed'
            }}
            title="Post Balanced Voucher into General Ledger"
          >
            <Save size={13} />
            <span>Post GL</span>
          </button>
        </div>

        {/* Right: Real-time Debit & Credit Balance Indicator */}
        <div className="acdoca-toolbar-right">
          <span>
            Dr: <strong style={{ color: '#0284c7' }}>₹ {totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </span>
          <span>
            Cr: <strong style={{ color: '#10b981' }}>₹ {totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </span>
          {isBalanced ? (
            <span className="acdoca-badge-balanced">
              ✔ BALANCED
            </span>
          ) : (
            <span className="acdoca-badge-diff">
              DIFF: ₹ {Math.abs(totalDebits - totalCredits).toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div style={{
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: statusMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
          borderBottom: `1px solid ${statusMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: statusMessage.type === 'success' ? '#065f46' : '#991b1b',
          fontSize: '11px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {statusMessage.type === 'success' ? <CheckCircle2 size={14} style={{ color: '#10b981' }} /> : <AlertCircle size={14} style={{ color: '#ef4444' }} />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* 3. DENSE ENTERPRISE ACDOCA MATRIX TABLE */}
      <div className="acdoca-table-scroll">
        <table className="acdoca-table">
          <thead className="acdoca-thead">
            <tr>
              {/* Row Selector Header */}
              <th
                className="acdoca-th acdoca-th-white"
                style={{ width: '28px', textAlign: 'center', background: '#dbe2e8' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ display: 'inline-block', width: '12px', height: '10px', background: '#fbbf24', border: '1px solid #d97706', borderRadius: '1px' }} />
                </div>
              </th>

              {columns.map((col) => {
                const isEditing = editingHeaderId === col.id;
                const thClass =
                  col.group === 'cyan' ? 'acdoca-th-cyan' :
                  col.group === 'yellow' ? 'acdoca-th-yellow' :
                  col.group === 'posting' ? 'acdoca-th-posting' :
                  'acdoca-th-white';

                return (
                  <th
                    key={col.id}
                    style={{ minWidth: `${col.width}px` }}
                    className={`acdoca-th ${thClass}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                          <input
                            type="text"
                            autoFocus
                            value={editingHeaderName}
                            onChange={(e) => setEditingHeaderName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameColumn(col.id, editingHeaderName);
                              if (e.key === 'Escape') setEditingHeaderId(null);
                            }}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #0284c7',
                              fontSize: '10px',
                              padding: '1px 3px',
                              borderRadius: '2px',
                              width: '100%'
                            }}
                          />
                          <button onClick={() => handleRenameColumn(col.id, editingHeaderName)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }}>
                            <Check size={12} />
                          </button>
                        </div>
                      ) : (
                        <div
                          onDoubleClick={() => {
                            setEditingHeaderId(col.id);
                            setEditingHeaderName(col.name);
                          }}
                          style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%'
                          }}
                          title={`Double-click to rename. ${col.label}`}
                        >
                          <span style={{ fontWeight: 700 }}>{col.name}</span>
                          <Edit2 size={10} style={{ opacity: 0.35, marginLeft: '4px' }} />
                        </div>
                      )}

                      {col.group === 'white' && columns.length > 20 && (
                        <button
                          onClick={() => handleDeleteColumn(col.id)}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 2px' }}
                          title="Remove column"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}

              <th className="acdoca-th acdoca-th-white" style={{ width: '24px', textAlign: 'center', background: '#dbe2e8' }}>
                <button
                  onClick={() => setAddColumnModalOpen(true)}
                  style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '2px' }}
                  title="Add Column"
                >
                  <Plus size={12} />
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {displayedRows.map((row, rIdx) => {
              const isSelected = selectedRowIndex === rIdx;

              return (
                <tr
                  key={row.id || rIdx}
                  onClick={() => setSelectedRowIndex(rIdx)}
                  className={`acdoca-tr ${isSelected ? 'selected' : ''}`}
                >
                  {/* Selector Cell */}
                  <td
                    className="acdoca-td"
                    style={{ textAlign: 'center', background: '#f1f5f9', width: '28px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        width: '12px',
                        height: '10px',
                        borderRadius: '1px',
                        background: isSelected ? '#fbbf24' : '#6ee7b7',
                        border: isSelected ? '1px solid #b45309' : '1px solid #059669',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                      }} />
                    </div>
                  </td>

                  {/* Columns */}
                  {columns.map((col) => {
                    const rawVal = row[col.id];
                    const isCurrency = col.type === 'currency';

                    const tdClass =
                      col.group === 'cyan' ? 'acdoca-td-cyan' :
                      col.group === 'yellow' ? 'acdoca-td-yellow' :
                      col.group === 'posting' ? 'acdoca-td-posting' :
                      'acdoca-td-white';

                    return (
                      <td
                        key={col.id}
                        className={`acdoca-td ${tdClass}`}
                      >
                        {isCurrency ? (
                          <input
                            type="number"
                            step="0.01"
                            value={rawVal === 0 ? '' : (rawVal ?? '')}
                            placeholder="0.00"
                            onChange={(e) => handleCellChange(rIdx, col.id, e.target.value === '' ? 0 : parseFloat(e.target.value))}
                            className="acdoca-cell-input"
                            style={{ textAlign: 'right' }}
                          />
                        ) : (
                          <input
                            type="text"
                            value={rawVal ?? ''}
                            onChange={(e) => handleCellChange(rIdx, col.id, e.target.value)}
                            className="acdoca-cell-input"
                            style={{ textAlign: col.align || 'left' }}
                          />
                        )}
                      </td>
                    );
                  })}

                  <td className="acdoca-td" style={{ textAlign: 'center', width: '24px', background: '#ffffff' }}>
                    <button
                      onClick={() => handleDeleteRow(rIdx)}
                      style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#cbd5e1'}
                      title="Delete line"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 4. FOOTER STATUS BAR */}
      <div className="acdoca-footer">
        <div className="acdoca-footer-info">
          <span>Entries: <strong style={{ color: '#0f172a' }}>{displayedRows.length}</strong></span>
          <span>Doc: <strong style={{ color: '#0284c7' }}>{activeRow?.doc_no || 'None'}</strong></span>
          <span>Line: <strong>{activeRow?.line_itm || '000001'}</strong></span>
          <span>Ref Doc: <strong>{activeRow?.ref_doc || '-'}</strong></span>
          <span>Account: <strong style={{ color: '#6366f1' }}>{activeRow?.gl_account || '-'} ({activeRow?.gl_title || 'Unassigned'})</strong></span>
        </div>

        <div className="acdoca-footer-totals">
          <span>Total Dr: <strong style={{ color: '#0284c7' }}>₹ {totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
          <span>Total Cr: <strong style={{ color: '#10b981' }}>₹ {totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
        </div>
      </div>

      {/* 5. ACDOCA LINE ITEM DETAILS POPUP */}
      {detailsModalOpen && activeRow && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            maxWidth: '680px',
            width: '100%',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: '#0052a3',
              color: '#ffffff',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '13px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={16} />
                <span>ACDOCA: Universal Journal Line Item Details</span>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px', maxHeight: '65vh', overflowY: 'auto' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                padding: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                marginBottom: '16px'
              }}>
                <div>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Document Number</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '14px', color: '#0284c7' }}>{activeRow.doc_no}</span>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Line Item</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{activeRow.line_itm}</span>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Ledger / Company Code</span>
                  <span style={{ fontFamily: 'monospace', color: '#334155' }}>{activeRow.ld} / {activeRow.cocd}</span>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Fiscal Year / Clear Year</span>
                  <span style={{ fontFamily: 'monospace', color: '#334155' }}>{activeRow.year} / {activeRow.clfy}</span>
                </div>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '11px' }}>
                  <thead style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <tr>
                      <th style={{ padding: '6px 12px', textAlign: 'left', color: '#475569' }}>Field Code</th>
                      <th style={{ padding: '6px 12px', textAlign: 'left', color: '#475569' }}>Field Description</th>
                      <th style={{ padding: '6px 12px', textAlign: 'left', color: '#475569' }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '5px 12px', fontWeight: 700, color: '#0284c7' }}>{c.name}</td>
                        <td style={{ padding: '5px 12px', color: '#64748b' }}>{c.label}</td>
                        <td style={{ padding: '5px 12px', fontWeight: 600, color: '#0f172a' }}>
                          {c.type === 'currency' ? `₹ ${parseFloat(activeRow[c.id] || 0).toFixed(2)}` : (activeRow[c.id] || '-')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              padding: '10px 16px',
              display: 'flex',
              justifyContent: 'flex-end',
              borderTop: '1px solid #e2e8f0'
            }}>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '4px 14px', fontSize: '12px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. ADD COLUMN MODAL */}
      {addColumnModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            maxWidth: '420px',
            width: '100%',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: '#0052a3',
              color: '#ffffff',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '13px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Columns size={16} />
                <span>Add Custom Field to ACDOCA Matrix</span>
              </div>
              <button onClick={() => setAddColumnModalOpen(false)} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Column Name / Field Code:
                </label>
                <input
                  type="text"
                  placeholder="e.g. ProfitCenter, WBS_Elem, Segment..."
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Data Type:
                </label>
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                >
                  <option value="text">Text / Code (Alpha-numeric)</option>
                  <option value="currency">Currency / Amount (₹)</option>
                  <option value="account">Account Identifier</option>
                </select>
              </div>
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              padding: '10px 16px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              borderTop: '1px solid #e2e8f0'
            }}>
              <button
                onClick={() => setAddColumnModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '4px 12px', fontSize: '12px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddColumn}
                disabled={!newColName.trim()}
                className="btn btn-primary"
                style={{ padding: '4px 14px', fontSize: '12px' }}
              >
                Insert Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. CSV IMPORT MODAL */}
      {importModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            maxWidth: '560px',
            width: '100%',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: '#0052a3',
              color: '#ffffff',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '13px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={16} />
                <span>Import Spreadsheet / CSV Data</span>
              </div>
              <button onClick={() => setImportModalOpen(false)} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ color: '#64748b', fontSize: '11px' }}>
                Paste comma-separated or tab-delimited records below with a header row:
              </p>
              <textarea
                rows={8}
                value={csvPasteText}
                onChange={(e) => setCsvPasteText(e.target.value)}
                placeholder={'Ld,CoCd,Year,DocumentNo,LnItm,CLFY,R,TTy,TrTy,BTran,BusTranTyp,Ref. proc.,Log. System,Ref.org.un,Ref. doc.\n0L,6010,2017,4900000301,000003,2017,0,RMWA,RMWA,RMWA,RMWA,MKPF,,2018,4900003458'}
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              padding: '10px 16px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              borderTop: '1px solid #e2e8f0'
            }}>
              <button
                onClick={() => setImportModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '4px 12px', fontSize: '12px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleImportCSV}
                disabled={!csvPasteText.trim()}
                className="btn btn-primary"
                style={{ padding: '4px 14px', fontSize: '12px' }}
              >
                Parse & Populate Matrix
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
