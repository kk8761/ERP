export function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    if (window.location.port === '5174') {
      return 'http://localhost:8001';
    }
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
  }
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== '') {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
    return 'https://nexaerp-backend-mlae.onrender.com';
  }
  return import.meta.env.PROD ? '' : 'http://localhost:8000';
}

export const API_BASE_URL = getApiBaseUrl();

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('nexaerp_token');
  const headers = {
    'Content-Type': 'application/json',
    'x-nexa-timestamp': Date.now().toString(),
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
    credentials: 'include'
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (response.status === 401) {
    localStorage.removeItem('nexaerp_token');
    localStorage.removeItem('nexaerp_user');
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }

  if (!response.ok) {
    let errorDetail = 'An unexpected error occurred';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch (e) {
      errorDetail = response.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  return response;
}

export async function downloadCsv(endpoint, filename) {
  const token = localStorage.getItem('nexaerp_token');
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'x-nexa-timestamp': Date.now().toString(),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to export CSV file');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
