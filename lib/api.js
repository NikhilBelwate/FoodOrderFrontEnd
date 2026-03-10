import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Response interceptor for consistent error handling ───────────────────────
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

// ─── Food Items API ───────────────────────────────────────────────────────────
export const foodItemsApi = {
  getAll:      (category) => api.get('/food-items', { params: category ? { category } : {} }),
  getById:     (id)       => api.get(`/food-items/${id}`),
  create:      (data)     => api.post('/food-items', data),
  update:      (id, data) => api.put(`/food-items/${id}`, data),
  delete:      (id)       => api.delete(`/food-items/${id}`),
};

// ─── Orders API ───────────────────────────────────────────────────────────────
export const ordersApi = {
  create:       (data)     => api.post('/orders', data),
  getAll:       (params)   => api.get('/orders', { params }),
  getById:      (orderId)  => api.get(`/orders/${orderId}`),
  updateStatus: (orderId, status) => api.put(`/orders/${orderId}/status`, { status }),
  cancel:       (orderId)  => api.delete(`/orders/${orderId}`),
};

export default api;
