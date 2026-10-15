import React, { useState, useEffect } from 'react';
import {
  DollarSign, BookOpen, Wallet, Plus, CheckCircle2,
  AlertCircle, X, ArrowRightLeft
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function FinancePage() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts', 'expenses', 'journal'
  const [accounts, setAccounts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');

  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

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
      account_id: parseInt(l.account_id),
      debit: parseFloat(l.debit || 0),
      credit: parseFloat(l.credit || 0),
      description: l.description || journalDesc
    }));

    const totalDebit = linesPayload.reduce((acc, l) => acc + l.debit, 0);
    const totalCredit = linesPayload.reduce((acc, l) => acc + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      setJournalError(`Double-entry imbalance! Total Debit (₹ ${totalDebit.toFixed(2)}) must equal Total Credit (₹ ${totalCredit.toFixed(2)})`);
      return;
    }

    try {
      await apiRequest('/api/finance/journal-entries', {
        method: 'POST',
        body: JSON.stringify({
          description: journalDesc,
          lines: linesPayload
        })
      });
      setShowJournalModal(false);
      setStatusMsg('Journal entry balanced and posted.');
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
        body: JSON.stringify(newAcc)
      });
      setShowAccountModal(false);
      setStatusMsg('Chart of Accounts updated.');
      setNewAcc({ code: '', name: '', account_type: 'ASSET', balance: 0 });
      loadFinanceData();
    } catch (err) {
      alert(err.message);
    }
  };

  const totalExpensesSum = expenses.reduce((acc, e) => acc + parseFloat(e.amount), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-brand)' }}>
            Finance & Accounting
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            General ledger, double-entry bookkeeping, operational expenses, and chart of accounts.
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
              <span>Post Journal Entry</span>
            </button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div style={{ padding: '10px 14px', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--success-border)', fontSize: '13px' }}>
          {statusMsg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
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
          <span>Operating Expenses (₹ {totalExpensesSum.toLocaleString('en-IN')})</span>
        </button>

        <button
          onClick={() => setActiveTab('journal')}
          className={`btn ${activeTab === 'journal' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '7px 16px', fontSize: '13px' }}
        >
          <ArrowRightLeft size={16} />
          <span>General Ledger / Journal Entries ({journalEntries.length})</span>
        </button>
      </div>

      {/* Tab 1: Chart of Accounts */}
      {activeTab === 'accounts' && (
        <div className="nexa-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>General Ledger Accounts</span>
            {hasPermission('finance.post') && (
              <button onClick={() => setShowAccountModal(true)} className="btn btn-ghost" style={{ fontSize: '12px', color: 'var(--primary)' }}>
                + Add Account
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

      {/* Tab 2: Expenses */}
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

      {/* Tab 3: Journal Entries */}
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

      {/* Record Expense Modal */}
      {showExpenseModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Record Operational Expense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}><X size={16} /></button>
            </div>

            <form onSubmit={handleRecordExpense} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Category *</label>
                  <select
                    value={newExp.category}
                    onChange={(e) => setNewExp({ ...newExp, category: e.target.value })}
                    className="form-input"
                  >
                    <option>Inventory</option>
                    <option>Staff & Payroll</option>
                    <option>Rent & Utilities</option>
                    <option>Marketing</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newExp.amount}
                    onChange={(e) => setNewExp({ ...newExp, amount: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Description *</label>
                <textarea
                  rows="2"
                  required
                  placeholder="Detail regarding expense purpose..."
                  value={newExp.description}
                  onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowExpenseModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Record Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Journal Entry Modal */}
      {showJournalModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '24px', maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Double-Entry Journal Posting</h3>
              <button onClick={() => setShowJournalModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}><X size={16} /></button>
            </div>

            {journalError && (
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-sm)', marginBottom: '12px', fontSize: '13px' }}>
                {journalError}
              </div>
            )}

            <form onSubmit={handleCreateJournal} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Entry Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Month-end depreciation adjustment"
                  value={journalDesc}
                  onChange={(e) => setJournalDesc(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Double-Entry Lines (Debit = Credit)</label>
                {journalLines.map((line, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <select
                      required
                      value={line.account_id}
                      onChange={(e) => {
                        const next = [...journalLines];
                        next[idx].account_id = e.target.value;
                        setJournalLines(next);
                      }}
                      className="form-input"
                    >
                      <option value="">Select Account...</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name} ({a.account_type})</option>)}
                    </select>

                    <input
                      type="number"
                      step="0.01"
                      placeholder="Debit (₹)"
                      value={line.debit}
                      onChange={(e) => {
                        const next = [...journalLines];
                        next[idx].debit = e.target.value;
                        setJournalLines(next);
                      }}
                      className="form-input"
                    />

                    <input
                      type="number"
                      step="0.01"
                      placeholder="Credit (₹)"
                      value={line.credit}
                      onChange={(e) => {
                        const next = [...journalLines];
                        next[idx].credit = e.target.value;
                        setJournalLines(next);
                      }}
                      className="form-input"
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setJournalLines([...journalLines, { account_id: '', debit: '', credit: '', description: '' }])}
                  className="btn btn-ghost"
                  style={{ fontSize: '12px', color: 'var(--primary)', padding: '4px 8px' }}
                >
                  + Add line
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowJournalModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Post Balanced Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAccountModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Create Chart of Accounts Record</h3>
              <button onClick={() => setShowAccountModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1040"
                    value={newAcc.code}
                    onChange={(e) => setNewAcc({ ...newAcc, code: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Account Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Petty Cash Register"
                    value={newAcc.name}
                    onChange={(e) => setNewAcc({ ...newAcc, name: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Account Type</label>
                <select
                  value={newAcc.account_type}
                  onChange={(e) => setNewAcc({ ...newAcc, account_type: e.target.value })}
                  className="form-input"
                >
                  <option value="ASSET">ASSET</option>
                  <option value="LIABILITY">LIABILITY</option>
                  <option value="EQUITY">EQUITY</option>
                  <option value="REVENUE">REVENUE</option>
                  <option value="EXPENSE">EXPENSE</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAccountModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
