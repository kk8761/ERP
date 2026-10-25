import React, { useState, useEffect } from 'react';
import { 
  X, RotateCcw, DollarSign, Globe, Landmark, 
  Upload, Camera, CheckCircle2, AlertTriangle, ShieldCheck, 
  Package, Info, Image as ImageIcon, Sliders
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function RefundModal({ isOpen, onClose, order, onSuccess, user }) {
  if (!isOpen || !order) return null;

  const [refundMethod, setRefundMethod] = useState('CASH'); // CASH, ONLINE_WALLET, SOURCE_ACCOUNT
  const [reason, setReason] = useState('Customer Return / Exchange');
  const [customReason, setCustomReason] = useState('');
  const [restockInventory, setRestockInventory] = useState(true);
  const [proofImage, setProofImage] = useState(null);
  const [proofFileName, setProofFileName] = useState('');
  const [isProofCompulsory, setIsProofCompulsory] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = user?.is_superuser || user?.role === 'admin' || user?.email?.includes('admin');

  // Load current Admin Refund Policy
  useEffect(() => {
    let isMounted = true;
    const fetchPolicy = async () => {
      try {
        const res = await apiRequest('/api/sales/refund-policy');
        if (isMounted && typeof res.proof_required === 'boolean') {
          setIsProofCompulsory(res.proof_required);
        }
      } catch (err) {
        console.warn('Could not fetch refund policy, using default optional:', err);
      }
    };
    fetchPolicy();
    return () => { isMounted = false; };
  }, []);

  // Admin Toggle: Change Policy between Compulsory and Optional
  const handleToggleAdminPolicy = async () => {
    if (!isAdmin) return;
    setPolicyLoading(true);
    try {
      const updated = !isProofCompulsory;
      await apiRequest('/api/sales/refund-policy', {
        method: 'POST',
        body: JSON.stringify({ proof_required: updated })
      });
      setIsProofCompulsory(updated);
    } catch (err) {
      alert('Failed to update refund policy: ' + err.message);
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Proof image exceeds 5MB limit. Please upload a smaller image.');
      return;
    }
    setProofFileName(file.name);
    setError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      setProofImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isProofCompulsory && !proofImage) {
      setError('Proof image or document is compulsory per Admin Policy before this refund can be authorized.');
      return;
    }

    setSubmitting(true);
    try {
      const finalReason = reason === 'Other' && customReason ? customReason : reason;
      const res = await apiRequest(`/api/sales/orders/${order.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({
          refund_method: refundMethod,
          reason: finalReason,
          proof_image: proofImage,
          restock_inventory: restockInventory
        })
      });

      window.dispatchEvent(new CustomEvent('inventory-updated'));
      if (onSuccess) onSuccess(res.message || 'Refund successfully processed and stock replenished.');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to process refund. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = parseFloat(order.total_amount || 0).toFixed(2);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-surface, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-subtle, #f8fafc)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <RotateCcw size={20} />
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                Process Return & Refund
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary, #64748b)' }}>
                Invoice <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary, #0064d2)' }}>{order.invoice_number}</span> • Total: <strong>₹{totalAmount}</strong>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '6px', borderRadius: '50%', color: 'var(--text-secondary, #64748b)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Refund Method Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main, #0f172a)', marginBottom: '8px' }}>
              Select Refund Payout Channel:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {/* Option 1: Cash */}
              <div
                onClick={() => setRefundMethod('CASH')}
                style={{
                  border: refundMethod === 'CASH' ? '2px solid #0064d2' : '1px solid var(--border-color, #cbd5e1)',
                  backgroundColor: refundMethod === 'CASH' ? 'rgba(0, 100, 210, 0.08)' : 'var(--bg-subtle, #f8fafc)',
                  borderRadius: '10px',
                  padding: '14px 10px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px', color: refundMethod === 'CASH' ? '#0064d2' : 'var(--text-secondary)' }}>
                  <DollarSign size={22} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Refund by Cash</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Physical Drawer</div>
              </div>

              {/* Option 2: Online Deposit */}
              <div
                onClick={() => setRefundMethod('ONLINE_WALLET')}
                style={{
                  border: refundMethod === 'ONLINE_WALLET' ? '2px solid #059669' : '1px solid var(--border-color, #cbd5e1)',
                  backgroundColor: refundMethod === 'ONLINE_WALLET' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-subtle, #f8fafc)',
                  borderRadius: '10px',
                  padding: '14px 10px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px', color: refundMethod === 'ONLINE_WALLET' ? '#059669' : 'var(--text-secondary)' }}>
                  <Globe size={22} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Deposit in Online</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Store Wallet / UPI</div>
              </div>

              {/* Option 3: Source Account */}
              <div
                onClick={() => setRefundMethod('SOURCE_ACCOUNT')}
                style={{
                  border: refundMethod === 'SOURCE_ACCOUNT' ? '2px solid #7c3aed' : '1px solid var(--border-color, #cbd5e1)',
                  backgroundColor: refundMethod === 'SOURCE_ACCOUNT' ? 'rgba(124, 58, 237, 0.08)' : 'var(--bg-subtle, #f8fafc)',
                  borderRadius: '10px',
                  padding: '14px 10px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px', color: refundMethod === 'SOURCE_ACCOUNT' ? '#7c3aed' : 'var(--text-secondary)' }}>
                  <Landmark size={22} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Deposit to Source</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Original {order.payment_method || 'A/C'}</div>
              </div>
            </div>
          </div>

          {/* Inventory Restock Checkbox */}
          <div style={{
            padding: '14px 16px',
            borderRadius: '10px',
            backgroundColor: restockInventory ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-subtle, #f8fafc)',
            border: restockInventory ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color, #cbd5e1)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <input
              type="checkbox"
              id="restockInventory"
              checked={restockInventory}
              onChange={(e) => setRestockInventory(e.target.checked)}
              style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer', accentColor: '#10b981' }}
            />
            <label htmlFor="restockInventory" style={{ cursor: 'pointer', fontSize: '13px', lineHeight: 1.4 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                Add item(s) back to inventory stock (Automatic Replenishment)
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', marginTop: '2px' }}>
                When selected, all items and quantities from invoice {order.invoice_number} are instantly restored to available warehouse stock.
              </div>
            </label>
          </div>

          {/* Reason for Return */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main, #0f172a)', marginBottom: '6px' }}>
              Reason for Return / Refund:
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #cbd5e1)',
                backgroundColor: 'var(--bg-surface, #ffffff)',
                color: 'var(--text-main, #0f172a)',
                fontSize: '13.5px'
              }}
            >
              <option value="Customer Return / Exchange">Customer Return / Exchange</option>
              <option value="Defective / Damaged Item">Defective / Damaged Item</option>
              <option value="Wrong Size / Fit (Cloth / Shoes)">Wrong Size / Fit (Cloth / Shoes)</option>
              <option value="Unopened / Customer Changed Mind">Unopened / Customer Changed Mind</option>
              <option value="Billing Discrepancy / Overcharge">Billing Discrepancy / Overcharge</option>
              <option value="Other">Other (Specify Below)</option>
            </select>

            {reason === 'Other' && (
              <input
                type="text"
                placeholder="Enter specific return reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '13px'
                }}
              />
            )}
          </div>

          {/* Image / Proof Upload Section */}
          <div style={{
            border: '1px solid var(--border-color, #cbd5e1)',
            borderRadius: '10px',
            padding: '16px',
            backgroundColor: 'var(--bg-subtle, #f8fafc)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                <Camera size={16} />
                <span>Return Proof / Condition Image</span>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: isProofCompulsory ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                color: isProofCompulsory ? '#dc2626' : '#059669'
              }}>
                {isProofCompulsory ? 'Compulsory (Admin Policy)' : 'Optional (Admin Policy)'}
              </span>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Upload photographic evidence of item condition, returned packaging, or customer signed refund slip.
            </div>

            <input
              type="file"
              accept="image/*"
              id="proofUpload"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {!proofImage ? (
              <label
                htmlFor="proofUpload"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  border: '2px dashed var(--border-color, #cbd5e1)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-surface, #ffffff)',
                  transition: 'background 0.15s ease'
                }}
              >
                <Upload size={22} color="var(--primary, #0064d2)" style={{ marginBottom: '6px' }} />
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--primary, #0064d2)' }}>
                  Click to choose file or capture photo
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  PNG, JPG, or WEBP up to 5MB
                </div>
              </label>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={proofImage} alt="Proof" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {proofFileName || 'Proof Image Attached'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} />
                      <span>Ready to submit</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setProofImage(null); setProofFileName(''); }}
                  className="btn btn-ghost"
                  style={{ color: 'var(--danger)', fontSize: '12px', padding: '4px 8px' }}
                >
                  Remove
                </button>
              </div>
            )}

            {/* Admin Policy Switcher: In hands of Admin */}
            {isAdmin && (
              <div style={{
                marginTop: '12px',
                paddingTop: '10px',
                borderTop: '1px solid var(--border-color, #cbd5e1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  <ShieldCheck size={14} color="#0064d2" />
                  <span>Admin Setting: Proof Requirement</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAdminPolicy}
                  disabled={policyLoading}
                  style={{
                    border: '1px solid var(--border-color)',
                    backgroundColor: isProofCompulsory ? '#ef4444' : '#10b981',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                  title="Click to toggle whether proof is optional or compulsory for all cashiers/users"
                >
                  {isProofCompulsory ? 'Switch to Optional' : 'Switch to Compulsory'}
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn btn-secondary"
              style={{ padding: '10px 16px', fontSize: '13px', borderRadius: '8px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <RotateCcw size={15} />
              <span>{submitting ? 'Processing Refund...' : `Confirm Refund ₹${totalAmount}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
