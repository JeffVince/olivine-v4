import { defineStore } from 'pinia';
// import api from '../services/api';

/**
 * Auth store for managing user authentication state
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    loading: false,
    error: null
  }),
  
  getters: {
    isAuthenticated: (state) => !!state.token,
    getUser: (state) => state.user,
    getToken: (state) => state.token,
    isLoading: (state) => state.loading,
    getError: (state) => state.error
  },
  
  actions: {
    /**
     * Initialize auth state from localStorage
     */
    initAuth() {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (token && user) {
        this.token = token;
        this.user = JSON.parse(user);
      }
    },
    
    /**
     * Login user with mock implementation
     * @param {string} email - User email
     * @param {string} password - User password
     */
    async login(email, password) {
      this.loading = true;
      this.error = null;
      
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock validation
        if (!email || !password) {
          throw new Error('Email and password are required');
        }
        
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        
        // Mock successful response
        const response = {
          data: {
            user: {
              id: '1',
              email: email,
              name: email.split('@')[0]
            },
            token: 'mock-token-' + Date.now()
          }
        };
        
        this.user = response.data.user;
        this.token = response.data.token;
        
        // Save to localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Set default auth header for API calls when we have real API
        // api.setAuthHeader(response.data.token);
        
        return response;
      } catch (error) {
        this.error = error.message || 'Login failed';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Sign up a new user with mock implementation
     * @param {string} email - User email
     * @param {string} password - User password
     */
    async signup(email, password) {
      this.loading = true;
      this.error = null;
      
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock validation
        if (!email || !password) {
          throw new Error('Email and password are required');
        }
        
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        
        // Mock successful response
        return {
          data: {
            message: 'Signup successful. Please check your email for verification.'
          }
        };
      } catch (error) {
        this.error = error.message || 'Signup failed';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Direct signup with mock implementation
     * @param {string} email - User email
     * @param {string} password - User password
     */
    async directSignup(email, password) {
      this.loading = true;
      this.error = null;
      
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock validation
        if (!email || !password) {
          throw new Error('Email and password are required');
        }
        
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        
        // Mock successful response with auto-login
        const response = {
          data: {
            user: {
              id: '1',
              email: email,
              name: email.split('@')[0]
            },
            token: 'mock-token-' + Date.now()
          }
        };
        
        this.user = response.data.user;
        this.token = response.data.token;
        
        // Save to localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        return response;
      } catch (error) {
        this.error = error.message || 'Direct signup failed';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Verify user email with mock implementation
     * @param {string} email - User email
     * @param {string} token - Verification token
     */
    async verifyEmail(email, token) {
      this.loading = true;
      this.error = null;
      
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock validation
        if (!email || !token) {
          throw new Error('Email and token are required');
        }
        
        // Mock successful response
        return {
          data: {
            message: 'Email verification successful'
          }
        };
      } catch (error) {
        this.error = error.message || 'Email verification failed';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Request password reset with mock implementation
     * @param {string} email - User email
     */
    async requestPasswordReset(email) {
      this.loading = true;
      this.error = null;
      
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock validation
        if (!email) {
          throw new Error('Email is required');
        }
        
        // Mock successful response
        return {
          data: {
            message: 'Password reset instructions sent to your email'
          }
        };
      } catch (error) {
        this.error = error.message || 'Password reset request failed';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Reset password with mock implementation
     * @param {string} token - Reset token
     * @param {string} password - New password
     */
    async resetPassword(token, password) {
      this.loading = true;
      this.error = null;
      
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock validation
        if (!token || !password) {
          throw new Error('Token and password are required');
        }
        
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        
        // Mock successful response
        return {
          data: {
            message: 'Password reset successful'
          }
        };
      } catch (error) {
        this.error = error.message || 'Password reset failed';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Logout user
     */
    logout() {
      this.user = null;
      this.token = null;
      
      // Remove from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Clear auth header when we have real API
      // api.clearAuthHeader();
    }
  }
}); 