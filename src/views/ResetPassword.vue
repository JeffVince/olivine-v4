<template>
  <div class="reset-password">
    <div class="form-card">
      <h1>Reset Password</h1>
      
      <div v-if="error" class="error-message">{{ error }}</div>
      <div v-if="success" class="success-message">{{ success }}</div>
      
      <form v-if="!success" @submit.prevent="handleResetPassword">
        <div class="form-group">
          <label for="password">New Password</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            placeholder="Enter your new password"
            required
            minlength="8"
          />
          <small>Password must be at least 8 characters</small>
        </div>
        
        <div class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <input 
            type="password" 
            id="confirmPassword" 
            v-model="confirmPassword" 
            placeholder="Confirm your new password"
            required
          />
          <div v-if="passwordMismatch" class="form-error">
            Passwords do not match
          </div>
        </div>
        
        <div class="form-actions">
          <button 
            type="submit" 
            class="btn-primary" 
            :disabled="loading || !isValidForm"
          >
            {{ loading ? 'Resetting...' : 'Set New Password' }}
          </button>
        </div>
      </form>
      
      <div v-if="success" class="form-links">
        <router-link to="/login" class="btn-primary">Go to Login</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

// Reactive state
const token = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref(null);
const success = ref(null);
const tokenValid = ref(true);

// Computed properties
const passwordMismatch = computed(() => {
  return password.value && confirmPassword.value && password.value !== confirmPassword.value;
});

const isValidForm = computed(() => {
  return password.value.length >= 8 && 
         confirmPassword.value === password.value &&
         tokenValid.value;
});

// Lifecycle hooks
onMounted(() => {
  // Get token from route query params
  token.value = route.query.token || '';
  
  if (!token.value) {
    error.value = 'Invalid or missing reset token. Please request a new password reset.';
    tokenValid.value = false;
  } else {
    // In a real app, we would validate the token with the server
    validateToken();
  }
});

// Methods
async function validateToken() {
  loading.value = true;
  error.value = null;
  
  try {
    // Simulate API call with delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For demo purposes, we're considering all tokens valid
    tokenValid.value = true;
  } catch (err) {
    console.error('Failed to validate token:', err);
    error.value = 'This password reset link is invalid or has expired. Please request a new one.';
    tokenValid.value = false;
  } finally {
    loading.value = false;
  }
}

async function handleResetPassword() {
  if (!isValidForm.value) return;
  
  loading.value = true;
  error.value = null;
  success.value = null;
  
  try {
    // Simulate API call with delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In a real app, you would make an API call to reset the password
    
    success.value = 'Your password has been reset successfully. You can now log in with your new password.';
    password.value = '';
    confirmPassword.value = '';
  } catch (err) {
    console.error('Failed to reset password:', err);
    error.value = 'Failed to reset password. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.reset-password {
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

.form-group small {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.form-error {
  color: var(--error-color);
  font-size: 0.85rem;
  margin-top: 0.5rem;
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
  text-align: center;
  display: inline-block;
  text-decoration: none;
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
</style> 