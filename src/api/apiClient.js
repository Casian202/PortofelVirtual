import axios from 'axios';

// In production (Docker), use relative URL so nginx can proxy to backend
// In development, use localhost:3001
const API_URL = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// WebSocket connection for real-time updates
let ws = null;
let wsReconnectTimer = null;
const wsListeners = new Set();

const connectWebSocket = (userId) => {
  if (ws?.readyState === WebSocket.OPEN) return;

  // In production, use relative WebSocket URL (nginx will handle it)
  // In development, use ws://localhost:3001
  const wsUrl = import.meta.env.PROD
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
    : (import.meta.env.VITE_WS_URL || 'ws://localhost:3001');

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      // Authenticate with user ID
      if (userId) {
        ws.send(JSON.stringify({ type: 'auth', userId }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        wsListeners.forEach((listener) => listener(data));
      } catch (err) {
        console.error('WebSocket message parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 3 seconds
      if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
      wsReconnectTimer = setTimeout(() => {
        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('user');
        if (token && userStr) {
          const user = JSON.parse(userStr);
          connectWebSocket(user.id);
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  } catch (error) {
    console.error('WebSocket connection error:', error);
  }
};

const disconnectWebSocket = () => {
  if (ws) {
    ws.close();
    ws = null;
  }
  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer);
    wsReconnectTimer = null;
  }
};

const subscribeToUpdates = (callback) => {
  wsListeners.add(callback);
  return () => wsListeners.delete(callback);
};

// Auth API
const auth = {
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { token, user } = response.data;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    connectWebSocket(user.id);
    return response.data;
  },

  me: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  forceChangePassword: async (newPassword) => {
    const response = await apiClient.post('/auth/force-change-password', {
      new_password: newPassword,
    });
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    user.must_change_password = false;
    localStorage.setItem('user', JSON.stringify(user));
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    disconnectWebSocket();
  },

  getToken: () => localStorage.getItem('auth_token'),
  getUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

// Transactions API
const Transaction = {
  list: async (sort = '-date', filters = {}) => {
    const params = new URLSearchParams();
    params.append('sort', sort);
    if (filters.type) params.append('type', filters.type);
    if (filters.month) params.append('month', filters.month);
    const response = await apiClient.get(`/transactions?${params.toString()}`);
    return response.data;
  },

  get: async (id) => {
    const response = await apiClient.get(`/transactions/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/transactions', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/transactions/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/transactions/${id}`);
    return response.data;
  },
};

// BudgetCategory API
const BudgetCategory = {
  list: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    const response = await apiClient.get(`/categories?${params.toString()}`);
    return response.data;
  },

  get: async (id) => {
    const response = await apiClient.get(`/categories/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/categories', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/categories/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/categories/${id}`);
    return response.data;
  },
};

// Investment API
const Investment = {
  list: async (sort = '-purchase_date') => {
    const response = await apiClient.get(`/investments?sort=${sort}`);
    return response.data;
  },

  get: async (id) => {
    const response = await apiClient.get(`/investments/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/investments', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/investments/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/investments/${id}`);
    return response.data;
  },
};

// SavingsGoal API
const SavingsGoal = {
  list: async (sort = '-created_date') => {
    const response = await apiClient.get(`/goals?sort=${sort}`);
    return response.data;
  },

  get: async (id) => {
    const response = await apiClient.get(`/goals/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/goals', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/goals/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/goals/${id}`);
    return response.data;
  },
};

export const api = {
  auth,
  Transaction,
  BudgetCategory,
  Investment,
  SavingsGoal,
  connectWebSocket,
  disconnectWebSocket,
  subscribeToUpdates,
};

export default api;