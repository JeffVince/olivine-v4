<template>
  <div class="signup-container">
    <div class="form-card">
      <h1>Create Account</h1>
      <div v-if="error" class="error-message">{{ error }}</div>
      <div v-if="success" class="success-message">{{ success }}</div>
      
      <form @submit.prevent="handleSignup" v-if="!success">
        <div class="form-group">
          <label for="email">Email</label>
          <input 
            type="email" 
            id="email" 
            v-model="email" 
            required 
            placeholder="Enter your email"
          />
        </div>
        
        <div class="form-group">
          <label for="password">Password</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            required 
            placeholder="Enter your password (min 8 characters)"
            minlength="8"
            autocomplete="new-password"
          />
        </div>
        
        <div class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <input 
            type="password" 
            id="confirmPassword" 
            v-model="confirmPassword" 
            required 
            placeholder="Confirm your password"
            minlength="8"
            autocomplete="new-password"
          />
          <p v-if="passwordMismatch" class="form-error">Passwords do not match</p>
        </div>
        
        <div class="form-actions">
          <button 
            type="submit" 
            class="btn-primary" 
            :disabled="loading || passwordMismatch"
          >
            {{ loading ? 'Creating account...' : 'Sign Up' }}
          </button>
        </div>
      </form>
      
      <div class="form-footer">
        <p>Already have an account? <router-link to="/login">Log in</router-link></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/auth';

const router = useRouter();
const authStore = useAuthStore();

// Reactive state
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const success = ref('');

// Computed properties
const loading = computed(() => authStore.isLoading);
const error = computed(() => authStore.getError);
const passwordMismatch = computed(() => 
  confirmPassword.value && password.value !== confirmPassword.value
);

// Methods
async function handleSignup() {
  if (passwordMismatch.value) {
    return;
  }
  
  try {
    // Try the direct signup method as a test
    try {
      console.log('Attempting direct signup first as a test');
      const directResponse = await authStore.directSignup(email.value, password.value);
      console.log('Direct signup response:', directResponse);
    } catch (directError) {
      console.error('Direct signup failed:', directError);
    }
    
    // Then try the regular signup
    const response = await authStore.signup(email.value, password.value);
    success.value = 'Account created successfully! Please check your email to verify your account.';
    
    // Reset form
    email.value = '';
    password.value = '';
    confirmPassword.value = '';
  } catch (error) {
    // Error is handled in the auth store
  }
}
</script>

<style scoped>
.signup-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}

.form-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  width: 100%;
  max-width: 400px;
}

h1 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: var(--primary-color);
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1rem;
}

.form-actions {
  margin-top: 2rem;
}

.btn-primary {
  width: 100%;
  padding: 0.75rem;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: var(--primary-dark);
}

.btn-primary:disabled {
  background-color: var(--text-disabled);
  cursor: not-allowed;
}

.form-footer {
  margin-top: 1.5rem;
  text-align: center;
}

.form-footer a {
  color: var(--primary-color);
  text-decoration: none;
}

.form-footer a:hover {
  text-decoration: underline;
}

.form-error {
  color: var(--error-color);
  font-size: 0.875rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}
</style> 