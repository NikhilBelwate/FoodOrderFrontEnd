import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach Supabase JWT on every request ────────────────
api.interceptors.request.use(async (config) => {
  try {
    // Dynamically import to avoid SSR issues
    const { getSupabaseClient } = await import('@/lib/supabase');
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (_) {
    // Not authenticated or SSR — continue without token
  }
  return config;
});

// ─── Response interceptor for consistent error handling ───────────────────────
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status  = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    // Surface auth errors clearly
    if (status === 401) {
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }
    if (status === 403) {
      return Promise.reject(new Error('You do not have permission to perform this action.'));
    }
    return Promise.reject(new Error(message));
  }
);

// ─── Categories API ───────────────────────────────────────────────────────────
export const categoriesApi = {
  // Public: active categories only (used by menu page for filter tabs)
  getAll: () => api.get('/categories'),
};

// ─── Food Items API ───────────────────────────────────────────────────────────
export const foodItemsApi = {
  // Accepts optional filters: { category, is_veg }
  getAll:      (params)   => api.get('/food-items', { params: params || {} }),
  getById:     (id)       => api.get(`/food-items/${id}`),
  create:      (data)     => api.post('/food-items', data),
  update:      (id, data) => api.put(`/food-items/${id}`, data),
  delete:      (id)       => api.delete(`/food-items/${id}`),
};

// ─── Orders API ───────────────────────────────────────────────────────────────
export const ordersApi = {
  create:       (data)          => api.post('/orders', data),
  getAll:       (params)        => api.get('/orders', { params }),
  getById:      (orderId)       => api.get(`/orders/${orderId}`),
  updateStatus: (orderId, status) => api.put(`/orders/${orderId}/status`, { status }),
  cancel:       (orderId)       => api.delete(`/orders/${orderId}`),
};

export default api;
