import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('nexaerp_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('nexaerp_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifySession() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const me = await apiRequest('/api/auth/me');
        setUser(me);
        localStorage.setItem('nexaerp_user', JSON.stringify(me));
      } catch (err) {
        console.warn('Session verification failed:', err);
        logout();
      } finally {
        setLoading(false);
      }
    }

    verifySession();

    const handleExpired = () => logout();
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [token]);

  const login = async (email, password) => {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('nexaerp_token', data.access_token);
    localStorage.setItem('nexaerp_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      if (token) {
        await apiRequest('/api/auth/logout', { method: 'POST' });
      }
    } catch (e) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('nexaerp_token');
      localStorage.removeItem('nexaerp_user');
      setToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const me = await apiRequest('/api/auth/me');
      setUser(me);
      localStorage.setItem('nexaerp_user', JSON.stringify(me));
      return me;
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  };

  const hasPermission = (permissionCode) => {
    if (!user) return false;
    if (user.is_superuser) return true;
    return (user.effective_permissions || []).includes(permissionCode);
  };

  const hasRole = (roleName) => {
    if (!user) return false;
    if (user.is_superuser) return true;
    return (user.roles || []).includes(roleName);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      logout,
      refreshUser,
      hasPermission,
      hasRole
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
