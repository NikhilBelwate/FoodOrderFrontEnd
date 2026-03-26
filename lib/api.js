import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ecombackbone.wish2mart.com/api';

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

// ─── Items API ────────────────────────────────────────────────────────────────
// Generic catalog — ecom-backbone uses /items (was /food-items in FoodOrderApp)
export const itemsApi = {
  // Accepts optional filters: { category, in_stock }
  getAll:      (params)   => api.get('/items', { params: params || {} }),
  getById:     (id)       => api.get(`/items/${id}`),
  create:      (data)     => api.post('/items', data),
  update:      (id, data) => api.put(`/items/${id}`, data),
  delete:      (id)       => api.delete(`/items/${id}`),
};

// Backward-compat alias — allows gradual migration without breaking other imports
export const foodItemsApi = itemsApi;

// ─── Orders API ───────────────────────────────────────────────────────────────
export const ordersApi = {
  create:       (data)          => api.post('/orders', data),
  getAll:       (params)        => api.get('/orders', { params }),
  getById:      (orderId)       => api.get(`/orders/${orderId}`),
  updateStatus: (orderId, status) => api.put(`/orders/${orderId}/status`, { status }),
  cancel:       (orderId)       => api.delete(`/orders/${orderId}`),
};

// ─── Payments API ─────────────────────────────────────────────────────────────
export const paymentsApi = {
  // Auth — get payment record for one of the caller's orders (by order UUID)
  getByOrderId:  (orderId)                 => api.get(`/payments/order/${orderId}`),
  // Auth — called after stripe.confirmCardPayment() succeeds; notifies backend
  stripeConfirm: (id, paymentIntentId)     => api.put(`/payments/${id}/stripe-confirm`, { paymentIntentId }),
};

export default api;
