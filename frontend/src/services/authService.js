import axios from 'axios';

// Create axios instance with base URL
const API = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include JWT token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token expiration
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      authService.logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication state management
let authState = {
  user: null,
  isAuthenticated: false,
  loading: false
};

// Authentication listeners for state changes
const authListeners = [];

const notifyAuthListeners = () => {
  authListeners.forEach(listener => listener(authState));
};

// Authentication API calls and state management
export const authService = {
  // Subscribe to auth state changes
  subscribe: (listener) => {
    authListeners.push(listener);
    // Return unsubscribe function
    return () => {
      const index = authListeners.indexOf(listener);
      if (index > -1) {
        authListeners.splice(index, 1);
      }
    };
  },

  // Get current auth state
  getAuthState: () => ({ ...authState }),

  // Initialize authentication on app load
  initialize: async () => {
    authState.loading = true;
    notifyAuthListeners();

    try {
      const token = localStorage.getItem('token');
      if (token) {
        const userData = JSON.parse(localStorage.getItem('user') || 'null');
        if (userData) {
          authState.user = userData;
          authState.isAuthenticated = true;
        } else {
          // If token exists but no user data, fetch from API
          const currentUser = await authService.getCurrentUser();
          authState.user = currentUser;
          authState.isAuthenticated = true;
          localStorage.setItem('user', JSON.stringify(currentUser));
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      authService.logout();
    } finally {
      authState.loading = false;
      notifyAuthListeners();
    }
  },

  // Login user
  login: async (username, password) => {
    authState.loading = true;
    notifyAuthListeners();

    try {
      const response = await API.post('/auth/login', {
        username,
        password,
      });

      if (response.data.token && response.data.user) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        authState.user = response.data.user;
        authState.isAuthenticated = true;
        authState.loading = false;
        notifyAuthListeners();
        return { success: true };
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      authState.loading = false;
      notifyAuthListeners();
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Login failed. Please check your credentials.' 
      };
    }
  },

  // Register user
  register: async (username, email, password) => {
    authState.loading = true;
    notifyAuthListeners();

    try {
      const response = await API.post('/auth/register', {
        username,
        email,
        password,
      });
      authState.loading = false;
      notifyAuthListeners();
      return { success: true, data: response.data };
    } catch (error) {
      authState.loading = false;
      notifyAuthListeners();
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Registration failed. Please try again.' 
      };
    }
  },

  // Get current user profile
  getCurrentUser: async () => {
    try {
      const response = await API.get('/auth/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    authState.user = null;
    authState.isAuthenticated = false;
    authState.loading = false;
    notifyAuthListeners();
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return authState.isAuthenticated;
  },

  // Get stored token
  getToken: () => {
    return localStorage.getItem('token');
  },

  // Get stored user
  getUser: () => {
    return authState.user;
  }
};

export default API;
