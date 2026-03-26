/**
 * adminApi.js
 * Axios instance for all admin API calls.
 * Automatically attaches the X-Admin-Key header from localStorage.
 *
 * Usage:
 *   import adminApi from '@/lib/adminApi';
 *   const { data } = await adminApi.get('/admin/stats');
 */

import axios from 'axios';

const ADMIN_KEY_STORAGE = 'foodorder_admin_key';

const adminApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://ecombackbone.wish2mart.com/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Inject admin key from localStorage on every request
adminApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const key = localStorage.getItem(ADMIN_KEY_STORAGE);
    if (key) {
      config.headers['X-Admin-Key'] = key;
    }
  }
  return config;
});

// Normalise error responses
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';
    const status = error.response?.status || 0;

    const enhancedError = new Error(message);
    enhancedError.status  = status;
    enhancedError.code    = error.response?.data?.error || 'UNKNOWN_ERROR';
    enhancedError.original = error;
    return Promise.reject(enhancedError);
  }
);

export { ADMIN_KEY_STORAGE };
export default adminApi;
