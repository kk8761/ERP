import React, { useState, useRef, useEffect } from 'react';
import { 
  Store, ShoppingBag, Search, ScanLine, Sun, Moon, LogOut, 
  User, DollarSign, Clock, ShieldCheck, Sparkles, Plus,
  MapPin, ChevronDown, Check, Building2, X, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRetailBranch } from '../contexts/RetailBranchContext';

export default function RetailTopNav({ 
  onNavigate, 
  currentTab, 
  onOpenScanner, 
  theme, 
  onToggleTheme 
}) {
  const { user, logout } = useAuth();
  const { branches, currentBranch, switchBranch, createBranch, toastMessage } = useRetailBranch();

  const [searchVal, setSearchVal] = useState('');
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);

  // New Branch Form State
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchCity, setBranchCity] = useState('Hyderabad');
  const [branchAddress, setBranchAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsBranchDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchVal.trim()) {
      if (onNavigate) onNavigate('pos');
    }
  };

  const handleCreateBranchSubmit = async (e) => {
    e.preventDefault();
    if (!branchName.trim() || !branchCode.trim()) return;
    setIsSubmitting(true);
    try {
      await createBranch({
        name: branchName,
        code: branchCode,
        city: branchCity,
        address: branchAddress
      });
      setBranchName('');
      setBranchCode('');
      setBranchAddress('');
      setShowAddBranchModal(false);
      setIsBranchDropdownOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <header style={{
      height: '62px',
      backgroundColor: 'var(--bg-surface, #ffffff)',
      borderBottom: '1px solid var(--border-color, #e2e8f0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#065f46',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13.5px',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease'
        }}>
          <CheckCircle2 size={17} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left: Store Brand & Active Branch Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div 
          onClick={() => onNavigate('dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Store size={20} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              NexaRetail <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700, padding: '1px 5px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '4px' }}>POS</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Cloth, Sports & Retail Store
            </div>
          </div>
        </div>

        {/* ─── BRANCH SELECTOR DROPDOWN ─── */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
            title="Choose Store Branch / Outlet"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <MapPin size={14} color="#10b981" />
            <span style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentBranch?.name || 'Main Store (Flagship)'}
            </span>
            <ChevronDown size={13} color="var(--text-secondary)" style={{ transform: isBranchDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {/* Floating Branch Switcher Menu */}
          {isBranchDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              width: '340px',
              backgroundColor: 'var(--bg-surface, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '12px',
              boxShadow: '0 15px 35px -5px rgba(0, 0, 0, 0.18)',
              zIndex: 100,
              overflow: 'hidden'
            }}>
              {/* Menu Header */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={14} color="#10b981" /> Store Branches & Outlets
                  </span>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#059669' }}>
                    {branches.length} Outlets
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Select operational branch for POS counter billing & stock
                </p>
              </div>

              {/* Branch Items List */}
              <div style={{ maxHeight: '250px', overflowY: 'auto', padding: '6px' }}>
                {branches.map((b) => {
                  const isActive = currentBranch?.id === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => {
                        switchBranch(b);
                        setIsBranchDropdownOpen(false);
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '8px',
                        backgroundColor: isActive ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                        border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.3)' : 'transparent'}`,
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '13px', fontWeight: isActive ? 700 : 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {b.name}
                          </span>
                          {b.is_hq && (
                            <span style={{ fontSize: '9.5px', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', backgroundColor: '#3b82f6', color: '#fff' }}>
                              HQ
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Code: <strong style={{ color: 'var(--text-primary)' }}>{b.code}</strong> • {b.city || 'Hyderabad'}
                        </div>
                        {b.address && (
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted, #94a3b8)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {b.address}
                          </div>
                        )}
                      </div>

                      {isActive && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#059669', fontSize: '11px', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>
                          <Check size={14} /> Active
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add New Branch Button */}
              <div style={{ padding: '8px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)' }}>
                <button
                  onClick={() => {
                    setShowAddBranchModal(true);
                    setIsBranchDropdownOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px dashed #10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.05)',
                    color: '#059669',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={14} />
                  <span>+ Add New Store Branch / Outlet</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Middle: Quick Product / Barcode Search */}
      <form onSubmit={handleSearchSubmit} style={{ flex: 1, maxWidth: '400px', margin: '0 16px' }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Scan barcode or search clothes, sports, items... (Ctrl+K)"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px 7px 34px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-subtle, #f8fafc)',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              outline: 'none'
            }}
          />
        </div>
      </form>

      {/* Right: Quick POS Action, Scanner, Theme & Operator Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => onNavigate('pos')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 13px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
          }}
        >
          <ShoppingBag size={14} />
          <span>New Bill (POS)</span>
        </button>

        {onOpenScanner && (
          <button
            onClick={onOpenScanner}
            title="Scan Barcode via Camera"
            style={{
              padding: '7px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <ScanLine size={15} />
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          style={{
            padding: '7px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-subtle)',
            color: 'var(--text-primary)',
            cursor: 'pointer'
          }}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Operator Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }}>
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '12px'
          }}>
            {user?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'R'}
          </div>
          <button
            onClick={logout}
            title="Close Register & Exit Store"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              color: '#ef4444',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <LogOut size={12} />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* ─── ADD NEW BRANCH OUTLET MODAL ─── */}
      {showAddBranchModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface, #ffffff)',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '460px',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={20} color="#10b981" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Add New Store Branch / Outlet
                  </h3>
                  <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Expand your shop with a new storefront counter or branch
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddBranchModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateBranchSubmit} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '5px' }}>
                  BRANCH / OUTLET NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inorbit Mall Branch - Counter #2"
                  value={branchName}
                  onChange={(e) => {
                    setBranchName(e.target.value);
                    if (!branchCode) {
                      setBranchCode('BR-' + e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase());
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-subtle)'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '5px' }}>
                    BRANCH CODE *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BR-INORBIT-02"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-subtle)',
                      fontWeight: 600
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '5px' }}>
                    CITY / AREA *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hyderabad"
                    value={branchCity}
                    onChange={(e) => setBranchCity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-subtle)'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '5px' }}>
                  STORE ADDRESS / LOCATION DETAILS
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ground Floor, Shop #14, Main Road"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-subtle)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'transparent',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  {isSubmitting ? 'Provisioning...' : 'Save & Activate Outlet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
