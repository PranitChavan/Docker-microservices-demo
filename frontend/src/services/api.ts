import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Don't redirect for login/register endpoints - they can return 401 for invalid credentials
      const isAuthEndpoint = error.config?.url?.includes('/api/users/login') || 
                            error.config?.url?.includes('/api/users/register');
      
      if (!isAuthEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Only redirect if not already on login/register page
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: async (data: { email: string; password: string; name: string }) => {
    const response = await api.post('/api/users/register', data);
    return response.data;
  },
  login: async (data: { email: string; password: string }) => {
    const response = await api.post('/api/users/login', data);
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/api/users/profile');
    return response.data;
  },
};

// Products API
export const productsAPI = {
  getAll: async (params?: { category?: string; search?: string }) => {
    const response = await api.get('/api/products', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/api/products/${id}`);
    return response.data;
  },
  create: async (data: {
    name: string;
    description?: string;
    price: number;
    category: string;
    stock?: number;
  }) => {
    const response = await api.post('/api/products', data);
    return response.data;
  },
  update: async (id: string, data: {
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    stock?: number;
  }) => {
    const response = await api.put(`/api/products/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/api/products/${id}`);
    return response.data;
  },
  checkStock: async (id: string) => {
    const response = await api.get(`/api/products/${id}/stock`);
    return response.data;
  },
};

// Cart API
export const cartAPI = {
  get: async () => {
    const response = await api.get('/api/cart');
    return response.data;
  },
  addItem: async (data: { productId: string; quantity: number }) => {
    const response = await api.post('/api/cart/items', data);
    return response.data;
  },
  updateItem: async (productId: string, quantity: number) => {
    const response = await api.put(`/api/cart/items/${productId}`, { quantity });
    return response.data;
  },
  removeItem: async (productId: string) => {
    const response = await api.delete(`/api/cart/items/${productId}`);
    return response.data;
  },
  clear: async () => {
    const response = await api.delete('/api/cart');
    return response.data;
  },
};

// Orders API
export const ordersAPI = {
  create: async (data: {
    shippingAddress: {
      street: string;
      city: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
    paymentMethod: string;
  }) => {
    const response = await api.post('/api/orders', data);
    return response.data;
  },
  getAll: async () => {
    const response = await api.get('/api/orders');
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/api/orders/${id}`);
    return response.data;
  },
  cancel: async (id: string) => {
    const response = await api.post(`/api/orders/${id}/cancel`);
    return response.data;
  },
};

export default api;

