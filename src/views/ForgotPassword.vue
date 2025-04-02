<template>
  <div class="forgot-password">
    <div class="form-card">
      <h1>Forgot Password</h1>
      
      <div v-if="error" class="error-message">{{ error }}</div>
      <div v-if="success" class="success-message">{{ success }}</div>
      
      <form v-if="!success" @submit.prevent="handleForgotPassword">
        <div class="form-group">
          <label for="email">Email</label>
          <input 
            type="email" 
            id="email" 
            v-model="email" 
            placeholder="Enter your email address"
            required
          />
        </div>
        
        <div class="form-actions">
          <button 
            type="submit" 
            class="btn-primary" 
            :disabled="loading || !email"
          >
            {{ loading ? 'Sending...' : 'Reset Password' }}
          </button>
        </div>
      </form>
      
      <div class="form-links">
        <router-link to="/login">Return to login</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// Reactive state
const email = ref('');
const loading = ref(false);
const error = ref(null);
const success = ref(null);

// Methods
async function handleForgotPassword() {
  if (!email.value) return;
  
  loading.value = true;
  error.value = null;
  success.value = null;
  
  try {
    // Simulate API call with delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In a real app, you would make an API call to request a password reset
    
    success.value = `Password reset instructions have been sent to ${email.value}. Please check your email.`;
    email.value = '';
  } catch (err) {
    console.error('Failed to request password reset:', err);
    error.value = 'Failed to request password reset. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.forgot-password {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 2rem;
  background-color: var(--bg-light);
}

.form-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  width: 100%;
  max-width: 450px;
}

h1 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--primary-color);
  text-align: center;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1rem;
}

.form-actions {
  margin-top: 1.5rem;
}

.btn-primary {
  width: 100%;
  padding: 0.75rem;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-message {
  background-color: var(--error-bg);
  color: var(--error-color);
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.success-message {
  background-color: var(--success-bg);
  color: var(--success-color);
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.form-links {
  margin-top: 1.5rem;
  text-align: center;
}

.form-links a {
  color: var(--primary-color);
  text-decoration: none;
}

.form-links a:hover {
  text-decoration: underline;
}
</style> 