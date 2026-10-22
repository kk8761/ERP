import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Download, Upload, CheckCircle2,
  AlertCircle, Search, Edit2, Filter, ArrowUp, ArrowDown, Printer,
  Save, Info, Columns, Check, X, SlidersHorizontal, Table,
  Calculator, ChevronDown, CheckSquare, RefreshCw, Maximize2, Minimize2
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { registerModuleSyncProvider, triggerSyncNow } from '../services/syncManager';
import {
  getColLetter,
  getColIndex,
  evaluateExcelFormula,
  getSelectionMetrics
} from '../utils/excelEngine';
import './FinancialSpreadsheetGrid.css';

export default function FinancialSpreadsheetGrid({ accounts = [], onEntryPosted }) {
  // 1. ACDOCA Table Column Definitions exactly matching enterprise ALV browser
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

  // 2. Initial Data Matching the exact rows from the reference screenshot
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

  // Excel Cell & Range Selection State
  // Default selected cell: Debit column on first row (Col index 29: 'debit', Row 0)
  const defaultColIdx = useMemo(() => {
    const idx = columns.findIndex(c => c.id === 'debit');
    return idx >= 0 ? idx : 0;
  }, [columns]);

  const [selectedCell, setSelectedCell] = useState({ rowIdx: 0, colIdx: 29, colId: 'debit' });
  const [selectionRange, setSelectionRange] = useState({ startRow: 0, startCol: 29, endRow: 0, endCol: 29 });
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { rowIdx, colId }
  const [formulaInput, setFormulaInput] = useState('50000');
  const [showAutoSumMenu, setShowAutoSumMenu] = useState(false);

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

  const formulaInputRef = useRef(null);
  const gridContainerRef = useRef(null);

  // Full Screen Excel Immersion Mode (Dedicated spreadsheet workspace)
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => {
      const next = !prev;
      if (next) {
        if (gridContainerRef.current?.requestFullscreen && !document.fullscreenElement) {
          gridContainerRef.current.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
      return next;
    });
  }, []);

  // Sync state if native browser fullscreen is toggled or exited via browser Esc
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreen]);

  // Lock background scroll when full screen so user only works in Excel
  useEffect(() => {
    if (isFullscreen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isFullscreen]);

  // Resizable Cell Dimensions (Column Widths & Row Heights)
  const [columnWidths, setColumnWidths] = useState(() => {
    try {
      const saved = localStorage.getItem('nexaerp_acdoca_col_widths');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [rowHeights, setRowHeights] = useState(() => {
    try {
      const saved = localStorage.getItem('nexaerp_acdoca_row_heights');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [activeResizingCol, setActiveResizingCol] = useState(null);
  const [activeResizingRow, setActiveResizingRow] = useState(null);
  const [isDraggingCorner, setIsDraggingCorner] = useState(false);

  // Auto-sync status tracking (every 30 seconds across modules)
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    secondsRemaining: 30,
    lastSyncTimestamp: null
  });

  useEffect(() => {
    const handleSyncUpdate = (e) => {
      if (e.detail) {
        setSyncStatus(prev => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener('nexaerp:sync_update', handleSyncUpdate);
    return () => window.removeEventListener('nexaerp:sync_update', handleSyncUpdate);
  }, []);

  // Column resize start
  const handleColResizeStart = (colId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveResizingCol(colId);
    const startX = e.clientX;
    const initialWidth = columnWidths[colId] || (columns.find(c => c.id === colId)?.width || 75);

    const onMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(45, Math.min(600, initialWidth + delta));
      setColumnWidths(prev => {
        const next = { ...prev, [colId]: newWidth };
        try { localStorage.setItem('nexaerp_acdoca_col_widths', JSON.stringify(next)); } catch {}
        return next;
      });
    };

    const onMouseUp = () => {
      setActiveResizingCol(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Double-click column resizer: Auto-fit column to content
  const handleColAutoFit = (colId) => {
    const colObj = columns.find(c => c.id === colId);
    let maxChars = (colObj?.name || '').length;
    rows.forEach(r => {
      const val = String(r[colId] ?? '');
      if (val.length > maxChars) maxChars = val.length;
    });
    const fittedWidth = Math.min(400, Math.max(55, maxChars * 8 + 32));
    setColumnWidths(prev => {
      const next = { ...prev, [colId]: fittedWidth };
      try { localStorage.setItem('nexaerp_acdoca_col_widths', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Row resize start (drag bottom edge of row number)
  const handleRowResizeStart = (rIdx, e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveResizingRow(rIdx);
    const startY = e.clientY;
    const initialHeight = rowHeights[rIdx] || 28;

    const onMouseMove = (moveEvent) => {
      const delta = moveEvent.clientY - startY;
      const newHeight = Math.max(22, Math.min(200, initialHeight + delta));
      setRowHeights(prev => {
        const next = { ...prev, [rIdx]: newHeight };
        try { localStorage.setItem('nexaerp_acdoca_row_heights', JSON.stringify(next)); } catch {}
        return next;
      });
    };

    const onMouseUp = () => {
      setActiveResizingRow(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Quick row height preset
  const handleApplyRowHeightPreset = (height) => {
    const updated = {};
    rows.forEach((_, idx) => {
      updated[idx] = height;
    });
    setRowHeights(updated);
    try { localStorage.setItem('nexaerp_acdoca_row_heights', JSON.stringify(updated)); } catch {}
  };

  // Quick column width adjustment
  const handleExpandAllColumns = (delta) => {
    setColumnWidths(prev => {
      const next = { ...prev };
      columns.forEach(c => {
        const current = next[c.id] || c.width || 75;
        next[c.id] = Math.max(50, current + delta);
      });
      try { localStorage.setItem('nexaerp_acdoca_col_widths', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Excel Engine Core State
  const [formulaMode, setFormulaMode] = useState(false); // Active when typing/building a formula
  const [formulaTarget, setFormulaTarget] = useState(null); // { rowIdx, colIdx, colId } target receiving formula
  const [formulaRefRange, setFormulaRefRange] = useState(null); // { startRow, startCol, endRow, endCol } referenced cells
  const [isDraggingFormula, setIsDraggingFormula] = useState(false);
  const [prevCellValue, setPrevCellValue] = useState('');
  const [editingValue, setEditingValue] = useState('');

  // Sync formula bar input with active cell when not actively in formula editing mode
  useEffect(() => {
    if (!formulaMode && selectedCell && rows[selectedCell.rowIdx]) {
      const raw = rows[selectedCell.rowIdx][selectedCell.colId] ?? '';
      setFormulaInput(String(raw));
    }
  }, [selectedCell, rows, formulaMode]);

  // Global Esc / F11 keyboard handler for full screen immersion mode
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape' && isFullscreen && !editingCell && !formulaMode) {
        setIsFullscreen(false);
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [isFullscreen, editingCell, formulaMode, toggleFullscreen]);

  // Handle cell selection
  const selectCell = useCallback((rowIdx, colIdx, colId, isShift = false) => {
    setSelectedRowIndex(rowIdx);
    setSelectedCell({ rowIdx, colIdx, colId });

    if (isShift) {
      setSelectionRange(prev => ({
        ...prev,
        endRow: rowIdx,
        endCol: colIdx
      }));
    } else {
      setSelectionRange({
        startRow: rowIdx,
        startCol: colIdx,
        endRow: rowIdx,
        endCol: colIdx
      });
    }
  }, []);

  // Cell editing & Formula evaluation callback
  const handleCellChange = useCallback((rowIdx, colId, value) => {
    setRows(prev => {
      if (!prev[rowIdx]) return prev;
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

    if (selectedCell && selectedCell.rowIdx === rowIdx && selectedCell.colId === colId) {
      setFormulaInput(String(value));
    }
  }, [accounts, selectedCell]);

  // Formula Bar submit / Enter commit
  const handleFormulaCommit = useCallback(() => {
    const target = formulaTarget || selectedCell;
    if (!target) return;

    let finalInput = formulaInput.trim();

    // Auto-close missing parentheses in formulas e.g. =SUM(AD1:AD8 -> =SUM(AD1:AD8)
    if (finalInput.startsWith('=') && finalInput.includes('(')) {
      const openCount = (finalInput.match(/\(/g) || []).length;
      const closeCount = (finalInput.match(/\)/g) || []).length;
      if (openCount > closeCount) {
        finalInput += ')'.repeat(openCount - closeCount);
      }
    }

    handleCellChange(target.rowIdx, target.colId, finalInput);
    setFormulaInput(finalInput);
    setFormulaMode(false);
    setFormulaTarget(null);
    setFormulaRefRange(null);
    setIsDraggingFormula(false);
    setEditingCell(null);

    const evalVal = evaluateExcelFormula(finalInput, rows, columns);
    const displayVal = typeof evalVal === 'number'
      ? `₹ ${evalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      : evalVal;

    setStatusMessage({
      type: 'success',
      text: `Formula applied to ${getColLetter(target.colIdx)}${target.rowIdx + 1}: ${finalInput} = ${displayVal}`
    });

    // Advance selection to row below (classic Excel Enter behavior)
    const nextRow = Math.min(rows.length - 1, target.rowIdx + 1);
    selectCell(nextRow, target.colIdx, target.colId);
  }, [formulaTarget, selectedCell, formulaInput, handleCellChange, rows, columns, selectCell]);

  // Formula Cancel / Escape revert
  const handleFormulaCancel = useCallback(() => {
    const target = formulaTarget || selectedCell;
    if (target) {
      handleCellChange(target.rowIdx, target.colId, prevCellValue);
      setFormulaInput(String(prevCellValue));
    }
    setFormulaMode(false);
    setFormulaTarget(null);
    setFormulaRefRange(null);
    setIsDraggingFormula(false);
    setEditingCell(null);
  }, [formulaTarget, selectedCell, prevCellValue, handleCellChange]);

  // Mouse drag range selection & point-and-click formula cell referencing
  const handleCellMouseDown = (rowIdx, colIdx, colId, e) => {
    // If formula mode is active: clicking or dragging selects cell/range references
    if (formulaMode && formulaTarget) {
      e.preventDefault();
      e.stopPropagation();

      setIsDraggingFormula(true);
      setFormulaRefRange({ startRow: rowIdx, startCol: colIdx, endRow: rowIdx, endCol: colIdx });

      const coord = `${getColLetter(colIdx)}${rowIdx + 1}`;
      setFormulaInput(prev => {
        let nextStr;
        // Check if formula already ends with a cell reference or range e.g. "AD1" or "AD1:AD8"
        const refRegex = /([A-Z]+\d+(:[A-Z]+\d+)?)$/i;
        if (refRegex.test(prev)) {
          // Replace last reference
          nextStr = prev.replace(refRegex, coord);
        } else {
          // Append coordinate
          nextStr = `${prev}${coord}`;
        }
        handleCellChange(formulaTarget.rowIdx, formulaTarget.colId, nextStr);
        return nextStr;
      });
      return;
    }

    // Normal cell selection
    if (e.shiftKey) {
      selectCell(rowIdx, colIdx, colId, true);
    } else {
      setIsMouseDown(true);
      selectCell(rowIdx, colIdx, colId, false);
    }
  };

  const handleCellMouseEnter = (rowIdx, colIdx) => {
    // If dragging formula reference range
    if (formulaMode && isDraggingFormula && formulaRefRange && formulaTarget) {
      const minR = Math.min(formulaRefRange.startRow, rowIdx);
      const maxR = Math.max(formulaRefRange.startRow, rowIdx);
      const minC = Math.min(formulaRefRange.startCol, colIdx);
      const maxC = Math.max(formulaRefRange.startCol, colIdx);

      setFormulaRefRange(prev => ({ ...prev, endRow: rowIdx, endCol: colIdx }));

      const startCoord = `${getColLetter(minC)}${minR + 1}`;
      const endCoord = `${getColLetter(maxC)}${maxR + 1}`;
      const rangeCoord = startCoord === endCoord ? startCoord : `${startCoord}:${endCoord}`;

      setFormulaInput(prev => {
        const refRegex = /([A-Z]+\d+(:[A-Z]+\d+)?)$/i;
        const nextStr = refRegex.test(prev)
          ? prev.replace(refRegex, rangeCoord)
          : `${prev}${rangeCoord}`;
        handleCellChange(formulaTarget.rowIdx, formulaTarget.colId, nextStr);
        return nextStr;
      });
      return;
    }

    // Normal multi-cell range drag
    if (isMouseDown) {
      setSelectionRange(prev => ({
        ...prev,
        endRow: rowIdx,
        endCol: colIdx
      }));
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsMouseDown(false);
      setIsDraggingFormula(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Excel Corner AutoFill Handle (drag to fill values / formulas down)
  const handleCornerHandleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCorner(true);

    const startRow = selectedCell.rowIdx;
    const colId = selectedCell.colId;
    const sourceVal = rows[startRow]?.[colId];
    let lastRow = startRow;

    const onMouseMove = (moveEvent) => {
      const el = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const cellTd = el?.closest('td[data-cell-row]');
      if (cellTd) {
        const r = parseInt(cellTd.getAttribute('data-cell-row'), 10);
        const c = parseInt(cellTd.getAttribute('data-cell-col'), 10);
        if (!isNaN(r) && !isNaN(c)) {
          lastRow = r;
          setSelectionRange(prev => ({
            ...prev,
            endRow: r,
            endCol: selectedCell.colIdx
          }));
        }
      }
    };

    const onMouseUp = () => {
      setIsDraggingCorner(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (lastRow > startRow) {
        setRows(prev => {
          const next = [...prev];
          for (let r = startRow + 1; r <= lastRow; r++) {
            if (next[r]) {
              let fillVal = sourceVal;
              // If source is formula, adjust row coordinate offset
              if (typeof sourceVal === 'string' && sourceVal.startsWith('=')) {
                const rowDiff = r - startRow;
                fillVal = sourceVal.replace(/([A-Z]+)(\d+)/g, (_, colLetters, rowNum) => {
                  const newRowNum = parseInt(rowNum, 10) + rowDiff;
                  return `${colLetters}${newRowNum}`;
                });
              }
              next[r] = { ...next[r], [colId]: fillVal };
            }
          }
          return next;
        });

        setStatusMessage({
          type: 'success',
          text: `AutoFilled ${lastRow - startRow} cells down column "${selectedCell.colId}".`
        });
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Smart Excel AutoSum Engine (SUM, AVERAGE, COUNT, MAX, MIN)
  const applyAutoSum = useCallback((funcType = 'SUM') => {
    setShowAutoSumMenu(false);
    if (!selectedCell) return;

    const { rowIdx, colIdx, colId } = selectedCell;
    const colLetter = getColLetter(colIdx);

    const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
    const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
    const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);

    let targetRow = rowIdx;
    let targetColId = colId;
    let targetColIdx = colIdx;
    let formulaStr = '';

    const isMultiRow = minR !== maxR;
    if (isMultiRow) {
      // Range is selected: e.g. user selected AD1:AD8
      const r1 = `${getColLetter(minC)}${minR + 1}`;
      const r2 = `${getColLetter(maxC)}${maxR + 1}`;
      formulaStr = `=${funcType}(${r1}:${r2})`;

      // Place sum immediately below selected range
      if (maxR + 1 < rows.length) {
        targetRow = maxR + 1;
        targetColId = columns[minC].id;
        targetColIdx = minC;
      } else {
        handleAddRow();
        targetRow = rows.length;
        targetColId = columns[minC].id;
        targetColIdx = minC;
      }
    } else {
      // Single cell selected: Scan upwards in the same column for numbers
      if (rowIdx === 0) {
        formulaStr = `=${funcType}(${colLetter}1:${colLetter}${rows.length})`;
      } else {
        let foundTop = 0;
        for (let r = rowIdx - 1; r >= 0; r--) {
          const val = rows[r][colId];
          if (val === '' || val === null || val === undefined) {
            foundTop = r + 1;
            break;
          }
        }
        formulaStr = `=${funcType}(${colLetter}${foundTop + 1}:${colLetter}${rowIdx})`;
      }
    }

    handleCellChange(targetRow, targetColId, formulaStr);
    selectCell(targetRow, targetColIdx, targetColId);
    setFormulaInput(formulaStr);
    setFormulaMode(false);
    setFormulaTarget(null);
    setFormulaRefRange(null);

    const evalResult = evaluateExcelFormula(formulaStr, rows, columns);
    const displayResult = typeof evalResult === 'number'
      ? `₹ ${evalResult.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      : evalResult;

    setStatusMessage({
      type: 'success',
      text: `Calculated Excel formula ${formulaStr} = ${displayResult} in cell ${getColLetter(targetColIdx)}${targetRow + 1}.`
    });
  }, [selectedCell, selectionRange, rows, columns, handleCellChange, selectCell]);

  // Keyboard navigation & direct typing across cells (Excel behavior)
  const handleKeyDown = useCallback((e) => {
    // If active element is an input outside the grid or search input, ignore
    if (e.target.tagName === 'INPUT' && !e.target.classList.contains('acdoca-cell-input') && !e.target.classList.contains('excel-formula-input')) {
      return;
    }

    // F11 Shortcut: Full Screen Excel Immersion Mode
    if (e.key === 'F11') {
      e.preventDefault();
      toggleFullscreen();
      return;
    }

    // Excel Shortcut: Alt + = triggers AutoSum
    if (e.altKey && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      applyAutoSum('SUM');
      return;
    }

    // If currently editing inside inline cell input:
    if (editingCell) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (formulaMode) {
          handleFormulaCommit();
        } else {
          handleCellChange(editingCell.rowIdx, editingCell.colId, editingValue);
          setEditingCell(null);
          selectCell(Math.min(rows.length - 1, selectedCell.rowIdx + 1), selectedCell.colIdx, selectedCell.colId);
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (formulaMode) {
          handleFormulaCommit();
        } else {
          handleCellChange(editingCell.rowIdx, editingCell.colId, editingValue);
          setEditingCell(null);
          const nextCol = e.shiftKey ? Math.max(0, selectedCell.colIdx - 1) : Math.min(columns.length - 1, selectedCell.colIdx + 1);
          selectCell(selectedCell.rowIdx, nextCol, columns[nextCol].id);
        }
      } else if (e.key === 'Escape') {
        if (formulaMode) {
          handleFormulaCancel();
        } else {
          setEditingCell(null);
        }
      }
      return;
    }

    const numRows = rows.length;
    const numCols = columns.length;
    let newRow = selectedCell.rowIdx;
    let newCol = selectedCell.colIdx;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      newRow = Math.max(0, newRow - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      newRow = Math.min(numRows - 1, newRow + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      newCol = Math.max(0, newCol - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      newCol = Math.min(numCols - 1, newCol + 1);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      newCol = e.shiftKey ? Math.max(0, newCol - 1) : Math.min(numCols - 1, newCol + 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (formulaMode) {
        handleFormulaCommit();
        return;
      }
      newRow = e.shiftKey ? Math.max(0, newRow - 1) : Math.min(numRows - 1, newRow + 1);
    } else if (e.key === 'Escape') {
      if (formulaMode) {
        handleFormulaCancel();
        return;
      }
      if (isFullscreen) {
        setIsFullscreen(false);
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
        return;
      }
    } else if (e.key === 'F2') {
      e.preventDefault();
      const currentVal = rows[selectedCell.rowIdx]?.[selectedCell.colId] ?? '';
      setPrevCellValue(currentVal);
      setEditingValue(String(currentVal));
      setEditingCell({ rowIdx: selectedCell.rowIdx, colId: selectedCell.colId });
      if (String(currentVal).startsWith('=')) {
        setFormulaMode(true);
        setFormulaTarget(selectedCell);
      }
      return;
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      handleCellChange(selectedCell.rowIdx, selectedCell.colId, '');
      setFormulaInput('');
      return;
    } else if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
      // Excel Direct Typing: Start typing immediately into selected cell
      const currentVal = rows[selectedCell.rowIdx]?.[selectedCell.colId] ?? '';
      setPrevCellValue(currentVal);
      setEditingValue(e.key);
      setEditingCell({ rowIdx: selectedCell.rowIdx, colId: selectedCell.colId });
      handleCellChange(selectedCell.rowIdx, selectedCell.colId, e.key);
      setFormulaInput(e.key);

      // If user typed '=', activate formula mode immediately
      if (e.key === '=') {
        setFormulaMode(true);
        setFormulaTarget({ ...selectedCell });
        setFormulaRefRange(null);
      }
      return;
    } else {
      return;
    }

    const nextColId = columns[newCol]?.id || 'debit';
    selectCell(newRow, newCol, nextColId, e.shiftKey && e.key.startsWith('Arrow'));
  }, [editingCell, editingValue, selectedCell, rows, columns, selectCell, handleCellChange, formulaMode, handleFormulaCommit, handleFormulaCancel, applyAutoSum, isFullscreen, toggleFullscreen]);

  // Global window keyboard listener for Excel shortcuts
  useEffect(() => {
    const onWindowKeyDown = (e) => {
      // Ignore if focus is in search input or parameters
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (!e.target.classList.contains('acdoca-cell-input') && !e.target.classList.contains('excel-formula-input')) {
          return;
        }
      }
      handleKeyDown(e);
    };
    window.addEventListener('keydown', onWindowKeyDown);
    return () => window.removeEventListener('keydown', onWindowKeyDown);
  }, [handleKeyDown]);

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

    columns.forEach(c => {
      if (!(c.id in newRow)) {
        newRow[c.id] = c.type === 'currency' ? 0 : '';
      }
    });

    setRows(prev => [...prev, newRow]);
    setSelectedRowIndex(rows.length);
    selectCell(rows.length, defaultColIdx, columns[defaultColIdx].id);
    setStatusMessage({ type: 'success', text: `Appended row ${rows.length + 1} with Doc ${nextDocNum}.` });
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
    setStatusMessage({ type: 'success', text: `Added column "${newCol.name}" [Col ${getColLetter(columns.length)}] to matrix.` });
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

  // Evaluated Totals with Formula Support
  const totalDebits = useMemo(() => {
    return rows.reduce((s, r) => {
      const raw = r.debit;
      const num = typeof raw === 'string' && raw.startsWith('=')
        ? parseFloat(evaluateExcelFormula(raw, rows, columns)) || 0
        : parseFloat(raw) || 0;
      return s + num;
    }, 0);
  }, [rows, columns]);

  const totalCredits = useMemo(() => {
    return rows.reduce((s, r) => {
      const raw = r.credit;
      const num = typeof raw === 'string' && raw.startsWith('=')
        ? parseFloat(evaluateExcelFormula(raw, rows, columns)) || 0
        : parseFloat(raw) || 0;
      return s + num;
    }, 0);
  }, [rows, columns]);

  const isBalanced = useMemo(() => Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0, [totalDebits, totalCredits]);
  const activeRow = displayedRows[selectedCell.rowIdx] || displayedRows[0];

  // Selection metrics calculation (Average, Count, Sum for selected range)
  const selectionMetrics = useMemo(() => {
    return getSelectionMetrics(selectionRange, rows, columns);
  }, [selectionRange, rows, columns]);

  // Active cell coordinate label e.g. "AD3"
  const activeCellCoord = useMemo(() => {
    const colLetter = getColLetter(selectedCell.colIdx);
    return `${colLetter}${selectedCell.rowIdx + 1}`;
  }, [selectedCell]);

  // Register ACDOCA module with global 30-second sync engine
  useEffect(() => {
    const unregister = registerModuleSyncProvider('finance_acdoca_spreadsheet', () => {
      return {
        rows_count: rows.length,
        total_debits: totalDebits,
        total_credits: totalCredits,
        is_balanced: isBalanced,
        draft_journal_vouchers: rows.slice(0, 50).map(r => ({
          id: r.id,
          doc_no: r.doc_no,
          gl_account: r.gl_account,
          debit: r.debit,
          credit: r.credit,
          cost_center: r.cost_center,
          text_memo: r.text_memo
        }))
      };
    });
    return () => unregister();
  }, [rows, totalDebits, totalCredits, isBalanced]);

  // Post to General Ledger (BUG-62: Atomic balanced post to /api/finance/journal-entries)
  const handlePostGeneralLedger = async () => {
    if (!isBalanced) {
      setStatusMessage({ type: 'error', text: `Cannot post: Debits (₹${totalDebits.toFixed(2)}) and Credits (₹${totalCredits.toFixed(2)}) must balance!` });
      return;
    }

    setPosting(true);
    setStatusMessage(null);

    try {
      const journalLines = [];
      const unresolvedAccounts = [];

      for (let idx = 0; idx < rows.length; idx++) {
        const r = rows[idx];
        const dVal = typeof r.debit === 'string' && r.debit.startsWith('=')
          ? evaluateExcelFormula(r.debit, rows, columns)
          : r.debit;
        const cVal = typeof r.credit === 'string' && r.credit.startsWith('=')
          ? evaluateExcelFormula(r.credit, rows, columns)
          : r.credit;

        const debitNum = Math.round((parseFloat(dVal) || 0) * 100) / 100;
        const creditNum = Math.round((parseFloat(cVal) || 0) * 100) / 100;

        if (debitNum <= 0 && creditNum <= 0) continue;

        if (!r.gl_account || !String(r.gl_account).trim()) {
          unresolvedAccounts.push(`Row ${idx + 1} (Missing GL code)`);
          continue;
        }

        const glCodeClean = String(r.gl_account).trim().toLowerCase();
        const matchedAcc = accounts.find(a => a.code.toLowerCase() === glCodeClean || String(a.id) === glCodeClean);
        if (!matchedAcc || !matchedAcc.is_active) {
          unresolvedAccounts.push(`'${r.gl_account}' (Row ${idx + 1})`);
          continue;
        }

        const memo = r.text_memo ? `[ACDOCA ${r.doc_no || 'MANUAL'}] ${r.text_memo}` : `[ACDOCA ${r.doc_no || 'MANUAL'}] Universal Journal Fast Post`;

        if (debitNum > 0) {
          journalLines.push({
            account_id: matchedAcc.id,
            debit: debitNum,
            credit: 0,
            description: memo
          });
        }
        if (creditNum > 0) {
          journalLines.push({
            account_id: matchedAcc.id,
            debit: 0,
            credit: creditNum,
            description: memo
          });
        }
      }

      if (unresolvedAccounts.length > 0) {
        throw new Error(`Cannot post: The following GL account codes were not found or are inactive in Chart of Accounts: ${unresolvedAccounts.join(', ')}`);
      }

      if (journalLines.length < 2) {
        throw new Error('Double-entry posting requires at least two balanced line items (at least one debit and one credit).');
      }

      const totalDebitsCalc = journalLines.reduce((sum, l) => sum + l.debit, 0);
      const totalCreditsCalc = journalLines.reduce((sum, l) => sum + l.credit, 0);
      if (Math.abs(totalDebitsCalc - totalCreditsCalc) > 0.01) {
        throw new Error(`Double-entry imbalance: Total Debits (₹${totalDebitsCalc.toFixed(2)}) must equal Total Credits (₹${totalCreditsCalc.toFixed(2)}).`);
      }

      const docNo = rows[0]?.doc_no || `ACDOCA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

      const res = await apiRequest('/api/finance/journal-entries', {
        method: 'POST',
        body: JSON.stringify({
          entry_date: new Date().toISOString().slice(0, 10),
          description: `ACDOCA Universal Journal Posting (${journalLines.length} lines)`,
          reference: docNo,
          lines: journalLines
        })
      });

      setStatusMessage({
        type: 'success',
        text: `Successfully posted ${journalLines.length} balanced line items to General Ledger! Entry Reference: ${res.entry_number || docNo}`
      });
      if (onEntryPosted) onEntryPosted();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Failed posting to General Ledger: ${err.message || 'Server error'}` });
    } finally {
      setPosting(false);
    }
  };

  // Export CSV
  const exportToCSV = () => {
    const headerLine = columns.map(c => `"${c.name}"`).join(',');
    const rowLines = displayedRows.map(r => columns.map(c => {
      const val = r[c.id];
      const evaluated = typeof val === 'string' && val.startsWith('=')
        ? evaluateExcelFormula(val, rows, columns)
        : (val ?? '');
      return `"${evaluated}"`;
    }).join(','));
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

  // Check if cell is in selection range
  const isCellInRange = (rIdx, cIdx) => {
    const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
    const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
    const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
    return rIdx >= minR && rIdx <= maxR && cIdx >= minC && cIdx <= maxC;
  };

  return (
    <div
      ref={gridContainerRef}
      className={`acdoca-grid-container ${isFullscreen ? 'is-fullscreen' : ''}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ outline: 'none' }}
    >
      {/* Immersive Full Screen HUD Banner */}
      {isFullscreen && (
        <div className="excel-fullscreen-hud">
          <div className="excel-fullscreen-hud-title">
            <span className="excel-hud-badge">EXCEL IMMERSION ACTIVE</span>
            <span>Dedicated Full-Screen Workspace &bull; Background ERP Paused</span>
          </div>
          <div className="excel-fullscreen-hud-actions">
            <span className="excel-hud-hint">
              Press <span className="excel-key-badge">Esc</span> or <span className="excel-key-badge">F11</span> to exit
            </span>
            <button
              onClick={toggleFullscreen}
              className="excel-fullscreen-hud-exit-btn"
              title="Exit Full Screen Mode (Esc or F11)"
            >
              <Minimize2 size={13} />
              <span>Exit Full Screen</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. TOP SAP CLASSIC TITLE & PARAMETERS BAR */}
      <div className="acdoca-header">
        <div className="acdoca-title-row">
          <div className="acdoca-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>ACDOCA: Display of Entries Found</span>
            <span style={{ fontSize: '11px', color: '#107c41', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calculator size={13} />
              Excel Engine Active
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="excel-title-fullscreen-btn"
              title={isFullscreen ? "Exit Full Screen Sheet (Esc / F11)" : "Enter Full Screen Sheet (F11)"}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{isFullscreen ? "Exit Full Screen" : "Full Screen Sheet"}</span>
              <span className="excel-key-badge">{isFullscreen ? "Esc" : "F11"}</span>
            </button>

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

      {/* 2. ALV TOOLBAR WITH AUTOSUM & ACTION ICONS */}
      <div className="acdoca-toolbar">
        <div className="acdoca-toolbar-left">
          {/* Table select icon */}
          <button
            onClick={() => {
              setSelectedRowIndex(0);
              selectCell(0, 0, columns[0].id);
            }}
            className="acdoca-icon-btn"
            title="First Cell (A1)"
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

          {/* Excel AutoSum Feature (Σ AutoSum with Dropdown) */}
          <div className="excel-autosum-container">
            <button
              onClick={() => applyAutoSum('SUM')}
              className="excel-autosum-btn"
              title="AutoSum: Automatically sum values in the column or selected range (Alt + =)"
            >
              <span>Σ AutoSum</span>
            </button>
            <button
              onClick={() => setShowAutoSumMenu(!showAutoSumMenu)}
              className="excel-autosum-btn"
              style={{ padding: '2px 4px', borderLeft: 'none', marginLeft: '-1px' }}
              title="More Excel Functions"
            >
              <ChevronDown size={12} />
            </button>

            {showAutoSumMenu && (
              <div className="excel-autosum-dropdown animate-fade-in">
                <button onClick={() => applyAutoSum('SUM')} className="excel-autosum-option">
                  <span>Sum</span>
                  <span style={{ color: '#107c41', fontWeight: 700 }}>=SUM()</span>
                </button>
                <button onClick={() => applyAutoSum('AVERAGE')} className="excel-autosum-option">
                  <span>Average</span>
                  <span style={{ color: '#107c41' }}>=AVERAGE()</span>
                </button>
                <button onClick={() => applyAutoSum('COUNT')} className="excel-autosum-option">
                  <span>Count Numbers</span>
                  <span style={{ color: '#107c41' }}>=COUNT()</span>
                </button>
                <button onClick={() => applyAutoSum('MAX')} className="excel-autosum-option">
                  <span>Max</span>
                  <span style={{ color: '#107c41' }}>=MAX()</span>
                </button>
                <button onClick={() => applyAutoSum('MIN')} className="excel-autosum-option">
                  <span>Min</span>
                  <span style={{ color: '#107c41' }}>=MIN()</span>
                </button>
              </div>
            )}
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
            onClick={() => alert(`ACDOCA Layout: Excel ALV Matrix. Visible Columns: ${columns.length}, Rows: ${rows.length}. Formulas Enabled.`)}
            className="acdoca-icon-btn"
            title="Select / Change Layout"
          >
            <SlidersHorizontal size={14} />
          </button>

          {/* Details Button */}
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
            onClick={() => handleDeleteRow(selectedCell.rowIdx)}
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

          <div className="acdoca-separator" />

          {/* Cell Sizing Controls: Extend row height & column width */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => handleExpandAllColumns(25)}
              className="excel-cell-size-btn"
              title="Extend all column widths (+25px)"
            >
              <Maximize2 size={11} style={{ color: '#0284c7' }} />
              <span>Widen Cells</span>
            </button>
            <button
              onClick={() => handleExpandAllColumns(-25)}
              className="excel-cell-size-btn"
              title="Narrow all column widths (-25px)"
            >
              <Minimize2 size={11} style={{ color: '#64748b' }} />
              <span>Narrow</span>
            </button>
            <button
              onClick={() => handleApplyRowHeightPreset(38)}
              className="excel-cell-size-btn"
              title="Extend cell row height to spacious (38px)"
            >
              <span>Expand Row</span>
            </button>
            <button
              onClick={() => {
                handleApplyRowHeightPreset(28);
                setColumnWidths({});
                try {
                  localStorage.removeItem('nexaerp_acdoca_col_widths');
                  localStorage.removeItem('nexaerp_acdoca_row_heights');
                } catch {}
              }}
              className="excel-cell-size-btn"
              title="Reset all cells to default sizes"
            >
              <span>Reset Sizes</span>
            </button>
          </div>
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

          <button
            type="button"
            onClick={toggleFullscreen}
            className={`excel-fullscreen-action-btn ${isFullscreen ? 'active' : ''}`}
            title={isFullscreen ? "Exit Full Screen Excel Mode (Esc / F11)" : "Enter Full Screen Excel Mode (F11)"}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{isFullscreen ? "Exit Full Screen" : "Full Screen"}</span>
          </button>
        </div>
      </div>

      {/* 3. MICROSOFT EXCEL FORMULA BAR (fx Bar) */}
      <div className="excel-formula-bar">
        {/* Name Box: shows active cell or range reference coordinate e.g. "AD1" or "AD1:AD8" */}
        <div
          className="excel-name-box"
          title={formulaMode && formulaTarget ? `Formula Target: ${getColLetter(formulaTarget.colIdx)}${formulaTarget.rowIdx + 1}` : `Active Cell: ${activeCellCoord}`}
        >
          {formulaMode && formulaTarget
            ? `${getColLetter(formulaTarget.colIdx)}${formulaTarget.rowIdx + 1}`
            : (selectionRange.startRow !== selectionRange.endRow || selectionRange.startCol !== selectionRange.endCol)
              ? `${getColLetter(Math.min(selectionRange.startCol, selectionRange.endCol))}${Math.min(selectionRange.startRow, selectionRange.endRow) + 1}:${getColLetter(Math.max(selectionRange.startCol, selectionRange.endCol))}${Math.max(selectionRange.startRow, selectionRange.endRow) + 1}`
              : activeCellCoord}
        </div>

        {/* Function Button (fx) */}
        <button
          onClick={() => {
            if (!selectedCell) return;
            setFormulaMode(true);
            setFormulaTarget({ ...selectedCell });
            setFormulaInput('=SUM(');
            handleCellChange(selectedCell.rowIdx, selectedCell.colId, '=SUM(');
            formulaInputRef.current?.focus();
          }}
          className="excel-fx-btn"
          title="Insert Function (fx)"
        >
          fx
        </button>

        {/* Formula Bar Input */}
        <div className="excel-formula-input-wrapper">
          <input
            ref={formulaInputRef}
            type="text"
            value={formulaInput}
            placeholder="Type value or formula (e.g. =SUM(AD1:AD12), =AD1*0.18, =AVERAGE(AD1:AD8))..."
            onFocus={() => {
              if (formulaInput.startsWith('=')) {
                setFormulaMode(true);
                setFormulaTarget({ ...selectedCell });
              }
            }}
            onChange={(e) => {
              const val = e.target.value;
              setFormulaInput(val);
              if (val.startsWith('=')) {
                setFormulaMode(true);
                setFormulaTarget({ ...selectedCell });
              } else {
                setFormulaMode(false);
                setFormulaRefRange(null);
              }
              const target = formulaTarget || selectedCell;
              if (target) {
                handleCellChange(target.rowIdx, target.colId, val);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleFormulaCommit();
                e.currentTarget.blur();
              } else if (e.key === 'Escape') {
                handleFormulaCancel();
                e.currentTarget.blur();
              }
            }}
            className="excel-formula-input"
          />

          {formulaInput.startsWith('=') && (
            <div style={{ position: 'absolute', right: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="excel-formula-preview">
                = {evaluateExcelFormula(formulaInput, rows, columns)}
              </span>
              <button
                onClick={handleFormulaCommit}
                style={{ background: 'none', border: 'none', color: '#107c41', cursor: 'pointer', padding: '1px' }}
                title="Commit Formula (Enter)"
              >
                <Check size={14} />
              </button>
              <button
                onClick={handleFormulaCancel}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '1px' }}
                title="Cancel Formula (Esc)"
              >
                <X size={14} />
              </button>
            </div>
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

      {/* 4. DENSE ENTERPRISE ACDOCA MATRIX TABLE WITH EXCEL CELL SELECTION & RESIZABLE CELLS */}
      <div className="acdoca-table-scroll">
        <table className={`acdoca-table ${isMouseDown ? 'is-selecting' : ''}`}>
          <thead className="acdoca-thead">
            <tr>
              {/* Row Selector Header */}
              <th
                className="acdoca-th acdoca-th-white"
                style={{ width: '36px', minWidth: '36px', maxWidth: '36px', textAlign: 'center', background: '#dbe2e8' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>#</span>
                </div>
              </th>

              {columns.map((col, colIdx) => {
                const isEditingHeader = editingHeaderId === col.id;
                const colLetter = getColLetter(colIdx);
                const colWidth = columnWidths[col.id] || col.width || 75;
                const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
                const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
                const isColSelected = (colIdx >= minC && colIdx <= maxC) || selectedCell.colIdx === colIdx;
                const thClass =
                  col.group === 'cyan' ? 'acdoca-th-cyan' :
                  col.group === 'yellow' ? 'acdoca-th-yellow' :
                  col.group === 'posting' ? 'acdoca-th-posting' :
                  'acdoca-th-white';

                return (
                  <th
                    key={col.id}
                    style={{
                      width: `${colWidth}px`,
                      minWidth: `${colWidth}px`,
                      maxWidth: `${colWidth}px`,
                      position: 'relative',
                      boxSizing: 'border-box'
                    }}
                    className={`acdoca-th ${thClass} ${isColSelected ? 'excel-th-selected' : ''}`}
                    onClick={() => {
                      // Select entire column on header click
                      setSelectionRange({
                        startRow: 0,
                        startCol: colIdx,
                        endRow: rows.length - 1,
                        endCol: colIdx
                      });
                      setSelectedCell({ rowIdx: 0, colIdx, colId: col.id });
                    }}
                  >
                    {/* Excel Column Letter (A, B, C... AD, AE) */}
                    <span className="excel-col-letter">{colLetter}</span>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', overflow: 'hidden' }}>
                      {isEditingHeader ? (
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
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingHeaderId(col.id);
                            setEditingHeaderName(col.name);
                          }}
                          style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            overflow: 'hidden'
                          }}
                          title={`Col ${colLetter}: ${col.label}. Double-click to rename.`}
                        >
                          <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.name}</span>
                          <Edit2 size={10} style={{ opacity: 0.35, marginLeft: '4px', flexShrink: 0 }} />
                        </div>
                      )}

                      {col.group === 'white' && columns.length > 20 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteColumn(col.id);
                          }}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 2px' }}
                          title="Remove column"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>

                    {/* Excel Column Width Resizer (Drag right edge or double-click to auto-fit) */}
                    <div
                      className={`excel-col-resizer ${activeResizingCol === col.id ? 'resizing' : ''}`}
                      onMouseDown={(e) => handleColResizeStart(col.id, e)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleColAutoFit(col.id);
                      }}
                      title="Drag to resize column width, or double-click to auto-fit"
                    />
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
              const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
              const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
              const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
              const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);

              const isFullRowSelected = selectionRange.startCol === 0 && selectionRange.endCol === columns.length - 1 && rIdx >= minR && rIdx <= maxR;
              const isRowHeaderSelected = (rIdx >= minR && rIdx <= maxR) || selectedCell.rowIdx === rIdx;
              const rowHeight = rowHeights[rIdx] || 28;

              return (
                <tr
                  key={row.id || rIdx}
                  className={`acdoca-tr ${isFullRowSelected ? 'row-header-selected' : ''}`}
                  style={{ height: `${rowHeight}px` }}
                >
                  {/* Row Number Header (Excel 1, 2, 3...) with Highlight and Height Resizer */}
                  <td
                    className={`acdoca-td ${isRowHeaderSelected ? 'excel-row-num-selected' : ''}`}
                    style={{
                      textAlign: 'center',
                      background: isRowHeaderSelected ? '#dcfce7' : '#f1f5f9',
                      width: '36px',
                      minWidth: '36px',
                      maxWidth: '36px',
                      height: `${rowHeight}px`,
                      userSelect: 'none',
                      fontWeight: 700,
                      color: isRowHeaderSelected ? '#166534' : '#64748b',
                      position: 'relative'
                    }}
                    onClick={() => {
                      // Select entire row on row header click
                      setSelectionRange({
                        startRow: rIdx,
                        startCol: 0,
                        endRow: rIdx,
                        endCol: columns.length - 1
                      });
                      setSelectedCell({ rowIdx: rIdx, colIdx: 0, colId: columns[0].id });
                      setSelectedRowIndex(rIdx);
                    }}
                  >
                    {rIdx + 1}

                    {/* Excel Row Height Resizer (Drag bottom edge) */}
                    <div
                      className={`excel-row-resizer ${activeResizingRow === rIdx ? 'resizing' : ''}`}
                      onMouseDown={(e) => handleRowResizeStart(rIdx, e)}
                      title="Drag to resize row height"
                    />
                  </td>

                  {/* Columns */}
                  {columns.map((col, colIdx) => {
                    const rawVal = row[col.id];
                    const isFormula = typeof rawVal === 'string' && rawVal.startsWith('=');
                    const evaluatedVal = isFormula ? evaluateExcelFormula(rawVal, rows, columns) : rawVal;
                    const colWidth = columnWidths[col.id] || col.width || 75;

                    const isCurrency = col.type === 'currency';
                    const isCellSelected = selectedCell.rowIdx === rIdx && selectedCell.colIdx === colIdx;
                    const inRange = isCellInRange(rIdx, colIdx);
                    const isBeingEdited = editingCell && editingCell.rowIdx === rIdx && editingCell.colId === col.id;
                    const isFormulaTarget = formulaMode && formulaTarget?.rowIdx === rIdx && formulaTarget?.colIdx === colIdx;

                    const isMultiCellRange = minR !== maxR || minC !== maxC;
                    const isRangeTop = inRange && isMultiCellRange && rIdx === minR;
                    const isRangeBottom = inRange && isMultiCellRange && rIdx === maxR;
                    const isRangeLeft = inRange && isMultiCellRange && colIdx === minC;
                    const isRangeRight = inRange && isMultiCellRange && colIdx === maxC;

                    const rangeEdgeClasses = [
                      isRangeTop ? 'excel-range-top' : '',
                      isRangeBottom ? 'excel-range-bottom' : '',
                      isRangeLeft ? 'excel-range-left' : '',
                      isRangeRight ? 'excel-range-right' : ''
                    ].filter(Boolean).join(' ');

                    const isCellInFormulaRef = formulaRefRange &&
                      rIdx >= Math.min(formulaRefRange.startRow, formulaRefRange.endRow) &&
                      rIdx <= Math.max(formulaRefRange.startRow, formulaRefRange.endRow) &&
                      colIdx >= Math.min(formulaRefRange.startCol, formulaRefRange.endCol) &&
                      colIdx <= Math.max(formulaRefRange.startCol, formulaRefRange.endCol);

                    const tdClass =
                      col.group === 'cyan' ? 'acdoca-td-cyan' :
                      col.group === 'yellow' ? 'acdoca-td-yellow' :
                      col.group === 'posting' ? 'acdoca-td-posting' :
                      'acdoca-td-white';

                    return (
                      <td
                        key={col.id}
                        data-cell-row={rIdx}
                        data-cell-col={colIdx}
                        style={{
                          width: `${colWidth}px`,
                          minWidth: `${colWidth}px`,
                          maxWidth: `${colWidth}px`,
                          height: `${rowHeight}px`,
                          boxSizing: 'border-box'
                        }}
                        onMouseDown={(e) => handleCellMouseDown(rIdx, colIdx, col.id, e)}
                        onMouseEnter={() => handleCellMouseEnter(rIdx, colIdx)}
                        onDoubleClick={() => {
                          const currentVal = rawVal ?? '';
                          setPrevCellValue(currentVal);
                          setEditingValue(String(currentVal));
                          setEditingCell({ rowIdx: rIdx, colId: col.id });
                          if (String(currentVal).startsWith('=')) {
                            setFormulaMode(true);
                            setFormulaTarget({ rowIdx: rIdx, colIdx, colId: col.id });
                          }
                        }}
                        className={`acdoca-td ${tdClass} ${isCellSelected ? 'excel-cell-active' : ''} ${isFormulaTarget ? 'excel-formula-target-cell' : ''} ${inRange && !isCellSelected ? 'excel-cell-in-range' : ''} ${rangeEdgeClasses} ${isCellInFormulaRef ? 'excel-formula-reference-cell' : ''}`}
                        title={`${getColLetter(colIdx)}${rIdx + 1} (${col.name}): ${isFormula ? `${rawVal} = ${evaluatedVal}` : rawVal}`}
                      >
                        {isBeingEdited ? (
                          <input
                            type="text"
                            autoFocus
                            value={editingValue}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingValue(val);
                              setFormulaInput(val);
                              if (val.startsWith('=')) {
                                setFormulaMode(true);
                                setFormulaTarget({ rowIdx: rIdx, colIdx, colId: col.id });
                              }
                              handleCellChange(rIdx, col.id, val);
                            }}
                            onBlur={() => {
                              if (!formulaMode) {
                                handleCellChange(rIdx, col.id, editingValue);
                                setEditingCell(null);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (formulaMode) {
                                  handleFormulaCommit();
                                } else {
                                  handleCellChange(rIdx, col.id, editingValue);
                                  setEditingCell(null);
                                  selectCell(Math.min(rows.length - 1, rIdx + 1), colIdx, col.id);
                                }
                              } else if (e.key === 'Tab') {
                                e.preventDefault();
                                if (formulaMode) {
                                  handleFormulaCommit();
                                } else {
                                  handleCellChange(rIdx, col.id, editingValue);
                                  setEditingCell(null);
                                  const nextColIdx = e.shiftKey ? Math.max(0, colIdx - 1) : Math.min(columns.length - 1, colIdx + 1);
                                  selectCell(rIdx, nextColIdx, columns[nextColIdx]?.id);
                                }
                              } else if (e.key === 'Escape') {
                                if (formulaMode) {
                                  handleFormulaCancel();
                                } else {
                                  setEditingCell(null);
                                }
                              }
                            }}
                            className="acdoca-cell-input"
                            style={{
                              textAlign: col.align || 'left',
                              backgroundColor: '#ffffff',
                              boxShadow: 'inset 0 0 0 2px #107c41',
                              height: '100%'
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start',
                              padding: '2px 6px',
                              cursor: formulaMode ? 'crosshair' : 'cell',
                              position: 'relative',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            <span style={{
                              fontWeight: isFormula ? 700 : 'inherit',
                              color: isFormula ? '#107c41' : 'inherit',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {isCurrency
                                ? (typeof evaluatedVal === 'number'
                                    ? `₹ ${evaluatedVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                    : (evaluatedVal || '0.00'))
                                : (evaluatedVal ?? '')}
                            </span>

                            {/* Excel Corner Drag Handle (extend cell/selection) */}
                            {isCellSelected && !formulaMode && (
                              <div
                                className="excel-corner-handle"
                                onMouseDown={handleCornerHandleMouseDown}
                                title="AutoFill handle: Drag down to copy/fill formulas & values"
                              />
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  <td className="acdoca-td" style={{ textAlign: 'center', width: '24px', background: '#ffffff', height: `${rowHeight}px` }}>
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

      {/* 5. FOOTER STATUS BAR (Live Excel Metrics & 30s Server Auto-Sync Indicator) */}
      <div className="acdoca-footer">
        <div className="acdoca-footer-info">
          <span>Entries: <strong style={{ color: '#0f172a' }}>{displayedRows.length}</strong></span>
          <span>Active Cell: <strong style={{ color: '#107c41' }}>{activeCellCoord}</strong></span>
          <span>Doc: <strong style={{ color: '#0284c7' }}>{activeRow?.doc_no || 'None'}</strong></span>
          <span>Account: <strong style={{ color: '#6366f1' }}>{activeRow?.gl_account || '-'} ({activeRow?.gl_title || 'Unassigned'})</strong></span>
        </div>

        {/* Live Selection Statistics (Excel Status Bar Metrics) */}
        {selectionMetrics && (
          <div className="excel-metrics-pill">
            <span style={{ color: '#64748b' }}>Range: <strong>{selectionMetrics.rangeName}</strong></span>
            {selectionMetrics.hasNumbers && (
              <>
                <span>Average: <strong style={{ color: '#0284c7' }}>₹ {selectionMetrics.average.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                <span>Sum: <strong style={{ color: '#107c41' }}>₹ {selectionMetrics.sum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
              </>
            )}
            <span>Count: <strong>{selectionMetrics.count}</strong></span>
          </div>
        )}

        {/* 30-Second Multi-Module Server Auto-Sync Status */}
        <button
          onClick={() => triggerSyncNow()}
          className="acdoca-sync-pill"
          style={{ border: 'none', cursor: 'pointer', background: 'transparent' }}
          title="Click to force immediate sync to server (Auto-syncs every 30s)"
        >
          <RefreshCw size={11} className={syncStatus.isSyncing ? "animate-spin" : ""} style={{ color: '#166534' }} />
          <span>Auto-Sync (30s): {syncStatus.isSyncing ? 'Syncing...' : syncStatus.secondsRemaining ? `in ${syncStatus.secondsRemaining}s` : 'Synced'}</span>
        </button>

        <div className="acdoca-footer-totals">
          <span>Total Dr: <strong style={{ color: '#0284c7' }}>₹ {totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
          <span>Total Cr: <strong style={{ color: '#10b981' }}>₹ {totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
        </div>
      </div>

      {/* 6. ACDOCA LINE ITEM DETAILS POPUP */}
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
                    {columns.map((c, idx) => {
                      const raw = activeRow[c.id];
                      const evaled = typeof raw === 'string' && raw.startsWith('=')
                        ? evaluateExcelFormula(raw, rows, columns)
                        : raw;

                      return (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '5px 12px', fontWeight: 700, color: '#0284c7' }}>
                            {getColLetter(idx)}: {c.name}
                          </td>
                          <td style={{ padding: '5px 12px', color: '#64748b' }}>{c.label}</td>
                          <td style={{ padding: '5px 12px', fontWeight: 600, color: '#0f172a' }}>
                            {c.type === 'currency' ? `₹ ${parseFloat(evaled || 0).toFixed(2)}` : (evaled || '-')}
                          </td>
                        </tr>
                      );
                    })}
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

      {/* 7. ADD COLUMN MODAL */}
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

      {/* 8. CSV IMPORT MODAL */}
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
