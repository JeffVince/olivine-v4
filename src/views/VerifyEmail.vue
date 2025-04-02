<template>
  <div class="verify-container">
    <div class="form-card">
      <h1>Verify Email</h1>
      
      <div v-if="loading" class="loading">
        <p>Verifying your email...</p>
      </div>
      
      <div v-else-if="error" class="error-message">
        <p>{{ error }}</p>
        <div class="verify-actions">
          <router-link to="/signup" class="btn-secondary">Return to Sign Up</router-link>
        </div>
      </div>
      
      <div v-else-if="verified" class="success-message">
        <p>Your email has been verified successfully!</p>
        <div class="verify-actions">
          <router-link to="/login" class="btn-primary">Login to Your Account</router-link>
        </div>
      </div>
      
      <div v-else-if="!token || !email" class="form-content">
        <p>Please use the verification link from your email.</p>
        <p>If you closed your verification email, please check your inbox for an email from Olivine.</p>
        <div class="verify-actions">
          <router-link to="/signup" class="btn-secondary">Return to Sign Up</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../store/auth';

const route = useRoute();
const authStore = useAuthStore();

// Reactive state
const verified = ref(false);
const email = ref(route.query.email || '');
const token = ref(route.query.token || '');

// Computed properties
const loading = computed(() => authStore.isLoading);
const error = computed(() => authStore.getError);

// Verify email on component mount if token and email are present
onMounted(async () => {
  if (email.value && token.value) {
    try {
      await authStore.verifyEmail(email.value, token.value);
      verified.value = true;
    } catch (error) {
      // Error is handled in the auth store
    }
  }
});
</script>

<style scoped>
.verify-container {
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
  max-width: 500px;
  text-align: center;
}

h1 {
  margin-bottom: 1.5rem;
  color: var(--primary-color);
}

.loading p {
  font-size: 1.1rem;
  color: var(--text-secondary);
}

.form-content p {
  margin-bottom: 1rem;
  font-size: 1.1rem;
  color: var(--text-secondary);
}

.verify-actions {
  margin-top: 2rem;
}

.btn-primary, .btn-secondary {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  text-decoration: none;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background-color: var(--primary-dark);
}

.btn-secondary {
  background-color: var(--bg-light);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background-color: var(--border-color);
}
</style> 