<template>
  <div class="login-container">
    <div class="login-card">
      <h1 class="login-title">Login</h1>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input 
            type="email" 
            id="email" 
            v-model="email" 
            required
            autocomplete="email"
          />
        </div>
        
        <div class="form-group">
          <label for="password">Password</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            required
            autocomplete="current-password"
          />
        </div>
        
        <div class="form-actions">
          <button 
            type="submit" 
            class="btn-primary" 
            :disabled="isLoading"
          >
            {{ isLoading ? 'Logging in...' : 'Login' }}
          </button>
        </div>
      </form>
      
      <div class="login-footer">
        <p>
          Don't have an account? 
          <router-link to="/signup">Sign up</router-link>
        </p>
        <p>
          <router-link to="/forgot-password">Forgot password?</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/auth';

export default {
  name: 'LoginView',
  setup() {
    const email = ref('');
    const password = ref('');
    const error = ref(null);
    const isLoading = ref(false);
    
    const router = useRouter();
    const authStore = useAuthStore();
    
    const handleLogin = async () => {
      error.value = null;
      isLoading.value = true;
      
      try {
        await authStore.login(email.value, password.value);
        router.push('/dashboard');
      } catch (err) {
        error.value = err.response?.data?.message || 'Login failed. Please check your credentials.';
      } finally {
        isLoading.value = false;
      }
    };
    
    return {
      email,
      password,
      error,
      isLoading,
      handleLogin
    };
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background-color: var(--bg-light);
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 2rem;
  background-color: var(--white);
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.login-title {
  margin-bottom: 1.5rem;
  color: var(--primary-color);
  text-align: center;
}

.login-form {
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-actions {
  margin-top: 1.5rem;
}

.btn-primary {
  width: 100%;
  padding: 0.75rem;
  font-weight: 600;
}

.login-footer {
  text-align: center;
  font-size: 0.9rem;
}

.login-footer p {
  margin-bottom: 0.5rem;
}
</style> 