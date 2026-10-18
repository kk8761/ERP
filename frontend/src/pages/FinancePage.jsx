import React, { useState, useEffect } from 'react';
import {
  DollarSign, BookOpen, Wallet, Plus, CheckCircle2,
  AlertCircle, X, ArrowRightLeft, FileSpreadsheet, PieChart,
  BarChart2, Landmark, Scale
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import FinancialSpreadsheetGrid from '../components/FinancialSpreadsheetGrid';

export default function FinancePage({ initialTab = 'overview', initialAction = '' }) {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState(
    ['overview', 'spreadsheet', 'accounts', 'expenses', 'journal', 'reports'].includes(initialTab) ? initialTab : 'overview'
  );
  const [accounts, setAccounts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (['overview', 'spreadsheet', 'accounts', 'expenses', 'journal', 'reports'].includes(initialTab)) {
      setActiveTab(initialTab);
    } else if (initialTab === 'chart_of_accounts') {
      setActiveTab('accounts');
    } else if (initialTab === 'accounting') {
      setActiveTab('overview');
    } else if (initialTab === 'spreadsheet' || initialTab === 'excel') {
      setActiveTab('spreadsheet');
    } else if (initialTab === 'financial_reports') {
      setActiveTab('reports');
    } else {
      setActiveTab('overview');
    }
  }, [initialTab]);

  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(initialAction === 'create');
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  useEffect(() => {
    if (initialAction === 'create') {
      setActiveTab('expenses');
      setShowExpenseModal(true);
    }
  }, [initialAction]);

  // Expense form
  const [newExp, setNewExp] = useState({
    category: 'Inventory',
    amount: '',
    payment_method: 'BANK_TRANSFER',
    description: '',
    receipt_reference: ''
  });

  // Journal Entry form (Double Entry)
  const [journalDesc, setJournalDesc] = useState('');
  const [journalLines, setJournalLines] = useState([
    { account_id: '', debit: '', credit: 0, description: '' },
    { account_id: '', debit: 0, credit: '', description: '' }
  ]);
  const [journalError, setJournalError] = useState('');

  // New Account form
  const [newAcc, setNewAcc] = useState({
    code: '', name: '', account_type: 'ASSET', balance: 0
  });

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      const [accs, exps, jnl] = await Promise.all([
        apiRequest('/api/finance/accounts'),
        apiRequest('/api/finance/expenses'),
        apiRequest('/api/finance/journal-entries')
      ]);
      setAccounts(accs);
      setExpenses(exps);
      setJournalEntries(jnl);
    } catch (e) {
      console.error('Failed to load finance data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, []);

  const handleRecordExpense = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/finance/expenses', {
        method: 'POST',
        body: JSON.stringify({
          ...newExp,
          amount: parseFloat(newExp.amount)
        })
      });
      setShowExpenseModal(false);
      setStatusMsg('Expense recorded successfully.');
      setNewExp({ category: 'Inventory', amount: '', payment_method: 'BANK_TRANSFER', description: '', receipt_reference: '' });
      loadFinanceData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateJournal = async (e) => {
    e.preventDefault();
    setJournalError('');

    const linesPayload = journalLines.map(l => ({
      account_id: l.account_id,
      debit: parseFloat(l.debit || 0),
      credit: parseFloat(l.credit || 0),
      description: l.description || journalDesc
    }));

    const totalDebit = linesPayload.reduce((s, x) => s + x.debit, 0);
    const totalCredit = linesPayload.reduce((s, x) => s + x.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      setJournalError(`Unbalanced entry: Debits (₹${totalDebit.toFixed(2)}) must equal Credits (₹${totalCredit.toFixed(2)})`);
      return;
    }

    try {
      await apiRequest('/api/finance/journal-entries', {
        method: 'POST',
        body: JSON.stringify({
          description: journalDesc,
          entry_date: new Date().toISOString().split('T')[0],
          lines: linesPayload
        })
      });
      setShowJournalModal(false);
      setStatusMsg('Journal entry committed and posted to general ledger.');
      setJournalDesc('');
      setJournalLines([
        { account_id: '', debit: '', credit: 0, description: '' },
        { account_id: '', debit: 0, credit: '', description: '' }
      ]);
      loadFinanceData();
    } catch (err) {
      setJournalError(err.message);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/finance/accounts', {
        method: 'POST',
        body: JSON.stringify({
          ...newAcc,
          balance: parseFloat(newAcc.balance || 0)
        })
      });
      setShowAccountModal(false);
      setStatusMsg('GL Account created successfully.');
      setNewAcc({ code: '', name: '', account_type: 'ASSET', balance: 0 });
      loadFinanceData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Calculations
  const totalAssets = accounts
    .filter(a => a.account_type === 'ASSET')
    .reduce((s, a) => s + parseFloat(a.balance || 0), 0);

  const totalLiabilities = accounts
    .filter(a => a.account_type === 'LIABILITY')
    .reduce((s, a) => s + parseFloat(a.balance || 0), 0);

  const totalEquity = accounts
    .filter(a => a.account_type === 'EQUITY')
    .reduce((s, a) => s + parseFloat(a.balance || 0), 0);

  const totalExpensesSum = expenses.reduce((s, x) => s + parseFloat(x.amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-brand)' }}>
            Financial Management & Accounting
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Double-entry general ledger, chart of accounts, operational expenses, and trial balance reconciliation
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {hasPermission('expenses.record') && (
            <button onClick={() => setShowExpenseModal(true)} className="btn btn-secondary">
              <Wallet size={15} />
              <span>Record Expense</span>
            </button>
          )}

          {hasPermission('finance.post') && (
            <button onClick={() => setShowJournalModal(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>New Journal Entry</span>
            </button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div style={{ padding: '10px 14px', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--success-border)', fontSize: '13px' }}>
          {statusMsg}
        </div>
      )}

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('overview')}
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <Scale size={16} />
          <span>Accounting & Trial Balance</span>
        </button>

        <button
          onClick={() => setActiveTab('spreadsheet')}
          className={`btn ${activeTab === 'spreadsheet' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <FileSpreadsheet size={16} className={activeTab === 'spreadsheet' ? 'text-white' : 'text-emerald-400'} />
          <span>Excel Spreadsheet Grid</span>
          <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 600 }}>Fast Entry</span>
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`btn ${activeTab === 'accounts' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <BookOpen size={16} />
          <span>Chart of Accounts ({accounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`btn ${activeTab === 'expenses' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <Wallet size={16} />
          <span>Operational Expenses ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('journal')}
          className={`btn ${activeTab === 'journal' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <ArrowRightLeft size={16} />
          <span>Journal Entries ({journalEntries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <PieChart size={16} />
          <span>Financial Statements (P&L)</span>
        </button>
      </div>

      {/* SUBTAB SPREADSHEET: EXCEL-STYLE FINANCIAL GRID */}
      {activeTab === 'spreadsheet' && (
        <FinancialSpreadsheetGrid
          accounts={accounts}
          onEntryPosted={() => {
            loadFinanceData();
            setStatusMsg('Journal Entry successfully posted from Spreadsheet Grid to General Ledger!');
          }}
        />
      )}

      {/* SUBTAB 1: ACCOUNTING & TRIAL BALANCE OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* KPI Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="nexa-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px' }}>
                Total Current Assets
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0064d2', marginBottom: '8px' }}>
                ₹ {totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>
                Cash, Bank & Inventory
              </div>
            </div>

            <div className="nexa-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px' }}>
                Total Liabilities
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginBottom: '8px' }}>
                ₹ {totalLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                Accounts Payable to Vendors
              </div>
            </div>

            <div className="nexa-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px' }}>
                Operating Expenses
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', marginBottom: '8px' }}>
                ₹ {totalExpensesSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                Logged in General Ledger
              </div>
            </div>

            <div className="nexa-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px' }}>
                Net Working Capital
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginBottom: '8px' }}>
                ₹ {(totalAssets - totalLiabilities).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>
                Healthy Liquidity Ratio
              </div>
            </div>
          </div>

          {/* Trial Balance Table */}
          <div className="nexa-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Trial Balance Summary (General Ledger Reconciliation)
                </span>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Total Debits must equal Total Credits across all balance sheet and nominal accounts
                </p>
              </div>
              <span className="badge badge-success">Balanced Ledger</span>
            </div>

            <div className="nexa-table-wrapper">
              <table className="nexa-table">
                <thead>
                  <tr>
                    <th>Account Code</th>
                    <th>Account Title</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Debit Balance (₹)</th>
                    <th style={{ textAlign: 'right' }}>Credit Balance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(acc => {
                    const isDebit = ['ASSET', 'EXPENSE'].includes(acc.account_type);
                    const bal = parseFloat(acc.balance || 0);
                    return (
                      <tr key={acc.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>{acc.code}</td>
                        <td style={{ fontWeight: 600 }}>{acc.name}</td>
                        <td><span className="badge badge-info">{acc.account_type}</span></td>
                        <td style={{ textAlign: 'right', fontWeight: isDebit ? 700 : 400 }}>
                          {isDebit ? `₹ ${bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: !isDebit ? 700 : 400 }}>
                          {!isDebit ? `₹ ${bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: CHART OF ACCOUNTS */}
      {activeTab === 'accounts' && (
        <div className="nexa-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>Hierarchical Chart of Accounts (COA)</span>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Standard 4-digit chart: 1000 Assets, 2000 Liabilities, 3000 Equity, 4000 Revenue, 5000 Expenses
              </div>
            </div>
            {hasPermission('finance.post') && (
              <button onClick={() => setShowAccountModal(true)} className="btn btn-primary" style={{ fontSize: '12.5px' }}>
                + Add GL Account
              </button>
            )}
          </div>
          <div className="nexa-table-wrapper">
            <table className="nexa-table">
              <thead>
                <tr>
                  <th>Account Code</th>
                  <th>Account Name</th>
                  <th>Classification</th>
                  <th>Account Type</th>
                  <th style={{ textAlign: 'right' }}>Current Balance</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(acc => {
                  const typeColors = {
                    ASSET: 'badge-info',
                    LIABILITY: 'badge-warning',
                    EQUITY: 'badge-primary',
                    REVENUE: 'badge-success',
                    EXPENSE: 'badge-danger'
                  }[acc.account_type] || 'badge-info';

                  return (
                    <tr key={acc.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{acc.code}</td>
                      <td style={{ fontWeight: 600 }}>{acc.name}</td>
                      <td>General Ledger</td>
                      <td><span className={`badge ${typeColors}`}>{acc.account_type}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                        ₹ {parseFloat(acc.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: OPERATING EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="nexa-card" style={{ overflow: 'hidden' }}>
          <div className="nexa-table-wrapper">
            <table className="nexa-table">
              <thead>
                <tr>
                  <th>Expense ID</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Date</th>
                  <th>Payment Mode</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                      {exp.expense_number}
                    </td>
                    <td><span className="badge badge-info">{exp.category}</span></td>
                    <td style={{ fontWeight: 500 }}>{exp.description}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{exp.expense_date}</td>
                    <td>{exp.payment_method}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger-text)', fontSize: '14px' }}>
                      ₹ {parseFloat(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: JOURNAL ENTRIES */}
      {activeTab === 'journal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {journalEntries.map(entry => (
            <div key={entry.id} className="nexa-card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace', marginRight: '10px' }}>
                    {entry.entry_number}
                  </span>
                  <span style={{ fontWeight: 600 }}>{entry.description}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>Date: {entry.entry_date}</span>
                  <span className="badge badge-success">POSTED</span>
                </div>
              </div>

              <div className="nexa-table-wrapper">
                <table className="nexa-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Line Note</th>
                      <th style={{ textAlign: 'right' }}>Debit (₹)</th>
                      <th style={{ textAlign: 'right' }}>Credit (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.lines.map((l, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{l.account_name} ({l.account_code})</td>
                        <td>{l.description}</td>
                        <td style={{ textAlign: 'right', fontWeight: parseFloat(l.debit) > 0 ? 700 : 400 }}>
                          {parseFloat(l.debit) > 0 ? `₹ ${parseFloat(l.debit).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: parseFloat(l.credit) > 0 ? 700 : 400 }}>
                          {parseFloat(l.credit) > 0 ? `₹ ${parseFloat(l.credit).toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUBTAB 5: FINANCIAL STATEMENTS */}
      {activeTab === 'reports' && (
        <div className="nexa-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>
                Financial Statement: Balance Sheet Summary
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                As of today &bull; Accounting Equation: Assets = Liabilities + Equity
              </div>
            </div>
            <span className="badge badge-success">In Equilibrium</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Left: Assets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                ASSETS
              </div>
              {accounts.filter(a => a.account_type === 'ASSET').map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>{a.name} ({a.code})</span>
                  <span style={{ fontWeight: 600 }}>₹ {parseFloat(a.balance).toFixed(2)}</span>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between', fontWeight: 800,
                fontSize: '15px', borderTop: '2px solid var(--border-color)', paddingTop: '8px', marginTop: '12px', color: '#0064d2'
              }}>
                <span>Total Assets:</span>
                <span>₹ {totalAssets.toFixed(2)}</span>
              </div>
            </div>

            {/* Right: Liabilities & Equity */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                LIABILITIES & SHAREHOLDER EQUITY
              </div>
              {accounts.filter(a => ['LIABILITY', 'EQUITY'].includes(a.account_type)).map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>{a.name} ({a.code})</span>
                  <span style={{ fontWeight: 600 }}>₹ {parseFloat(a.balance).toFixed(2)}</span>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between', fontWeight: 800,
                fontSize: '15px', borderTop: '2px solid var(--border-color)', paddingTop: '8px', marginTop: '12px', color: '#10b981'
              }}>
                <span>Total Liabilities + Equity:</span>
                <span>₹ {(totalLiabilities + totalEquity).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '24px', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Record Operational Expense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRecordExpense} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Category</label>
                <select
                  value={newExp.category}
                  onChange={(e) => setNewExp({ ...newExp, category: e.target.value })}
                  className="form-input"
                >
                  <option value="Inventory">Inventory Purchases</option>
                  <option value="Rent">Store Rent & Lease</option>
                  <option value="Utilities">Electricity & Internet</option>
                  <option value="Salaries">Staff Advance & Wages</option>
                  <option value="Logistics">Freight & Courier</option>
                  <option value="Marketing">Signage & Promotion</option>
                </select>
              </div>

              <div>
                <label className="form-label">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="2500.00"
                  value={newExp.amount}
                  onChange={(e) => setNewExp({ ...newExp, amount: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Payment Mode</label>
                <select
                  value={newExp.payment_method}
                  onChange={(e) => setNewExp({ ...newExp, payment_method: e.target.value })}
                  className="form-input"
                >
                  <option value="BANK_TRANSFER">Bank NEFT / RTGS</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="CASH">Cash Drawer</option>
                  <option value="CHEQUE">Bank Cheque</option>
                </select>
              </div>

              <div>
                <label className="form-label">Description / Purpose</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly broadband & store electricity bill"
                  value={newExp.description}
                  onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Receipt / Voucher Reference #</label>
                <input
                  type="text"
                  placeholder="VOUCH-2026-098"
                  value={newExp.receipt_reference}
                  onChange={(e) => setNewExp({ ...newExp, receipt_reference: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowExpenseModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Journal Modal */}
      {showJournalModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '24px', maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Create General Ledger Journal Entry</h3>
              <button onClick={() => setShowJournalModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            {journalError && (
              <div style={{ padding: '10px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-sm)', marginBottom: '14px', fontSize: '13px' }}>
                {journalError}
              </div>
            )}

            <form onSubmit={handleCreateJournal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Entry Memo / Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Month-end depreciation adjustment"
                  value={journalDesc}
                  onChange={(e) => setJournalDesc(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                Journal Lines (Balanced Double Entry)
              </div>

              {journalLines.map((line, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', alignItems: 'center' }}>
                  <select
                    required
                    value={line.account_id}
                    onChange={(e) => {
                      const updated = [...journalLines];
                      updated[idx].account_id = e.target.value;
                      setJournalLines(updated);
                    }}
                    className="form-input"
                  >
                    <option value="">Select GL Account...</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.code} - {a.name} ({a.account_type})</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.01"
                    placeholder="Debit (₹)"
                    value={line.debit || ''}
                    onChange={(e) => {
                      const updated = [...journalLines];
                      updated[idx].debit = e.target.value;
                      if (e.target.value) updated[idx].credit = 0;
                      setJournalLines(updated);
                    }}
                    className="form-input"
                  />

                  <input
                    type="number"
                    step="0.01"
                    placeholder="Credit (₹)"
                    value={line.credit || ''}
                    onChange={(e) => {
                      const updated = [...journalLines];
                      updated[idx].credit = e.target.value;
                      if (e.target.value) updated[idx].debit = 0;
                      setJournalLines(updated);
                    }}
                    className="form-input"
                  />
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowJournalModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">Post to Ledger</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Modal */}
      {showAccountModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '24px', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Add New GL Account</h3>
              <button onClick={() => setShowAccountModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Account Code (e.g. 1010, 2020)</label>
                <input
                  type="text"
                  required
                  placeholder="1050"
                  value={newAcc.code}
                  onChange={(e) => setNewAcc({ ...newAcc, code: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Petty Cash / Digital Wallet"
                  value={newAcc.name}
                  onChange={(e) => setNewAcc({ ...newAcc, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Account Type</label>
                <select
                  value={newAcc.account_type}
                  onChange={(e) => setNewAcc({ ...newAcc, account_type: e.target.value })}
                  className="form-input"
                >
                  <option value="ASSET">ASSET (1000s)</option>
                  <option value="LIABILITY">LIABILITY (2000s)</option>
                  <option value="EQUITY">EQUITY (3000s)</option>
                  <option value="REVENUE">REVENUE (4000s)</option>
                  <option value="EXPENSE">EXPENSE (5000s)</option>
                </select>
              </div>

              <div>
                <label className="form-label">Opening Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newAcc.balance}
                  onChange={(e) => setNewAcc({ ...newAcc, balance: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAccountModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
