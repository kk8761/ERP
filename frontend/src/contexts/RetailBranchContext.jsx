import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from './AuthContext';

const RetailBranchContext = createContext(null);

export function RetailBranchProvider({ children }) {
  const { user } = useAuth();

  // Default fallback branches for retail
  const defaultBranches = [
    {
      id: 1,
      name: 'Main Store (Flagship Outlet)',
      code: 'BR-MAIN',
      city: 'Hyderabad',
      address: 'Abids Commercial High Street, Counter #1',
      is_active: true,
      is_hq: true
    },
    {
      id: 2,
      name: 'City Mall Retail Outlet (Floor 2)',
      code: 'BR-MALL-01',
      city: 'Hyderabad',
      address: 'GVK One Mall, Level 2, Retail Counter #1',
      is_active: true,
      is_hq: false
    },
    {
      id: 3,
      name: 'Downtown Express Store & Sports',
      code: 'BR-EXPRESS-02',
      city: 'Hyderabad',
      address: 'Banjara Hills Main Road, Counter #2',
      is_active: true,
      is_hq: false
    }
  ];

  const [branches, setBranches] = useState(() => {
    try {
      const saved = localStorage.getItem('retail_branches_list');
      return saved ? JSON.parse(saved) : defaultBranches;
    } catch {
      return defaultBranches;
    }
  });

  const [currentBranch, setCurrentBranch] = useState(() => {
    try {
      const saved = localStorage.getItem('retail_active_branch');
      if (saved) return JSON.parse(saved);
      return defaultBranches[0];
    } catch {
      return defaultBranches[0];
    }
  });

  const [loadingBranches, setLoadingBranches] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadBranches = async () => {
    try {
      setLoadingBranches(true);
      const data = await apiRequest('/api/branches');
      if (Array.isArray(data) && data.length > 0) {
        setBranches(data);
        localStorage.setItem('retail_branches_list', JSON.stringify(data));
        
        // If currentBranch not set or not in list, pick user assigned or first
        setCurrentBranch(prev => {
          if (prev && data.some(b => b.id === prev.id)) {
            const updated = data.find(b => b.id === prev.id);
            localStorage.setItem('retail_active_branch', JSON.stringify(updated));
            return updated;
          }
          const userBranch = data.find(b => b.id === user?.branch_id) || data[0];
          localStorage.setItem('retail_active_branch', JSON.stringify(userBranch));
          return userBranch;
        });
      }
    } catch (err) {
      console.warn('Could not load branches from API, using cached/default retail branches:', err);
    } finally {
      setLoadingBranches(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, [user?.id]);

  const switchBranch = async (branch) => {
    if (!branch || branch.id === currentBranch?.id) return;
    try {
      // Optional backend context sync
      await apiRequest('/api/branches/switch-context', {
        method: 'POST',
        body: JSON.stringify({ branch_id: branch.id })
      }).catch(err => console.warn('Backend context switch notice:', err));

      setCurrentBranch(branch);
      localStorage.setItem('retail_active_branch', JSON.stringify(branch));
      showToast(`✓ Switched operational branch to "${branch.name}"`);
    } catch (err) {
      console.error('Failed to switch branch:', err);
      setCurrentBranch(branch);
      localStorage.setItem('retail_active_branch', JSON.stringify(branch));
      showToast(`✓ Active branch set to "${branch.name}"`);
    }
  };

  const createBranch = async ({ name, code, city, address }) => {
    try {
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        city: city?.trim() || 'Hyderabad',
        address: address?.trim() || `Store Outlet, ${city || 'Hyderabad'}`,
        country: 'IN',
        currency: 'INR'
      };

      const res = await apiRequest('/api/branches', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const newB = res.branch || {
        id: Date.now(),
        ...payload,
        is_active: true
      };

      const updatedList = [...branches, newB];
      setBranches(updatedList);
      localStorage.setItem('retail_branches_list', JSON.stringify(updatedList));
      setCurrentBranch(newB);
      localStorage.setItem('retail_active_branch', JSON.stringify(newB));
      showToast(`✓ New retail branch "${newB.name}" provisioned and activated!`);
      return newB;
    } catch (err) {
      console.error('Failed to create branch on backend, saving locally:', err);
      const newB = {
        id: Date.now(),
        name: name.trim(),
        code: code.trim().toUpperCase(),
        city: city?.trim() || 'Hyderabad',
        address: address?.trim() || `Store Outlet, ${city || 'Hyderabad'}`,
        country: 'IN',
        currency: 'INR',
        is_active: true
      };
      const updatedList = [...branches, newB];
      setBranches(updatedList);
      localStorage.setItem('retail_branches_list', JSON.stringify(updatedList));
      setCurrentBranch(newB);
      localStorage.setItem('retail_active_branch', JSON.stringify(newB));
      showToast(`✓ New retail branch "${newB.name}" activated!`);
      return newB;
    }
  };

  return (
    <RetailBranchContext.Provider value={{
      branches,
      currentBranch,
      switchBranch,
      createBranch,
      loadingBranches,
      refreshBranches: loadBranches,
      toastMessage
    }}>
      {children}
    </RetailBranchContext.Provider>
  );
}

export function useRetailBranch() {
  const ctx = useContext(RetailBranchContext);
  if (!ctx) {
    throw new Error('useRetailBranch must be used within a RetailBranchProvider');
  }
  return ctx;
}
