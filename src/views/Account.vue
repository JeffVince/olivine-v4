<template>
  <div class="account-page">
    <h1>Account Settings</h1>
    
    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="success" class="success-message">{{ success }}</div>
    
    <div class="settings-container">
      <!-- Profile section -->
      <section class="settings-section">
        <h2>Profile Information</h2>
        <form @submit.prevent="updateProfile">
          <div class="form-group">
            <label for="name">Name</label>
            <input 
              type="text" 
              id="name" 
              v-model="profile.name" 
              placeholder="Your name"
            />
          </div>
          
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              type="email" 
              id="email" 
              v-model="profile.email" 
              placeholder="Your email"
              disabled
            />
            <small>Email cannot be changed. Contact support for assistance.</small>
          </div>
          
          <div class="form-actions">
            <button 
              type="submit" 
              class="btn-primary" 
              :disabled="!profileChanged || profileLoading"
            >
              {{ profileLoading ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </section>
      
      <!-- Password section -->
      <section class="settings-section">
        <h2>Change Password</h2>
        <form @submit.prevent="updatePassword">
          <div class="form-group">
            <label for="currentPassword">Current Password</label>
            <input 
              type="password" 
              id="currentPassword" 
              v-model="passwordForm.currentPassword" 
              placeholder="Enter current password"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="newPassword">New Password</label>
            <input 
              type="password" 
              id="newPassword" 
              v-model="passwordForm.newPassword" 
              placeholder="Enter new password"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="confirmPassword">Confirm New Password</label>
            <input 
              type="password" 
              id="confirmPassword" 
              v-model="passwordForm.confirmPassword" 
              placeholder="Confirm new password"
              required
            />
          </div>
          
          <div v-if="passwordError" class="error-message">{{ passwordError }}</div>
          
          <div class="form-actions">
            <button 
              type="submit" 
              class="btn-primary" 
              :disabled="!canUpdatePassword || passwordLoading"
            >
              {{ passwordLoading ? 'Updating...' : 'Update Password' }}
            </button>
          </div>
        </form>
      </section>
      
      <!-- API Keys section -->
      <section class="settings-section">
        <h2>API Keys</h2>
        <p>Manage your API keys for programmatic access to Olivine.</p>
        <router-link to="/integrations" class="btn-primary">Manage Integrations</router-link>
      </section>
      
      <!-- Danger Zone -->
      <section class="settings-section danger-zone">
        <h2>Danger Zone</h2>
        <div class="danger-action">
          <div>
            <h3>Delete Account</h3>
            <p>Permanently delete your account and all data. This action cannot be undone.</p>
          </div>
          <button @click="confirmDeleteAccount" class="btn-danger">Delete Account</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// Reactive state
const error = ref(null);
const success = ref(null);
const profileLoading = ref(false);
const passwordLoading = ref(false);
const passwordError = ref(null);
const originalProfile = ref({});

const profile = ref({
  name: '',
  email: '',
});

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

// Computed properties
const profileChanged = computed(() => {
  return profile.value.name !== originalProfile.value.name;
});

const canUpdatePassword = computed(() => {
  if (!passwordForm.value.currentPassword || 
      !passwordForm.value.newPassword || 
      !passwordForm.value.confirmPassword) {
    return false;
  }

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = 'New passwords do not match';
    return false;
  }

  if (passwordForm.value.newPassword.length < 8) {
    passwordError.value = 'Password must be at least 8 characters';
    return false;
  }

  passwordError.value = null;
  return true;
});

// Lifecycle hooks
onMounted(async () => {
  // Mock data for demo purposes
  setTimeout(() => {
    profile.value = {
      name: 'John Doe',
      email: 'john.doe@example.com',
    };
    
    // Store original values for comparison
    originalProfile.value = { ...profile.value };
  }, 500);
});

// Methods
async function updateProfile() {
  if (!profileChanged.value) return;
  
  profileLoading.value = true;
  error.value = null;
  success.value = null;
  
  try {
    // Simulate API call with delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update the original profile after a successful save
    originalProfile.value = { ...profile.value };
    success.value = 'Profile updated successfully';
  } catch (err) {
    console.error('Failed to update profile:', err);
    error.value = 'Failed to update profile. Please try again.';
  } finally {
    profileLoading.value = false;
  }
}

async function updatePassword() {
  if (!canUpdatePassword.value) return;
  
  passwordLoading.value = true;
  error.value = null;
  success.value = null;
  
  try {
    // Simulate API call with delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reset password form
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };
    
    success.value = 'Password updated successfully';
  } catch (err) {
    console.error('Failed to update password:', err);
    error.value = 'Failed to update password. Please check your current password and try again.';
  } finally {
    passwordLoading.value = false;
  }
}

function confirmDeleteAccount() {
  if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
    console.log('Account deletion confirmed');
    
    // In a real app, this would make an API call to delete the account
    // For now, let's just log out and redirect to home
    router.push('/');
  }
}
</script>

<style scoped>
.account-page {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 2rem;
  color: var(--primary-color);
}

.settings-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.settings-section {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.settings-section h2 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.form-group {
  margin-bottom: 1.25rem;
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

.form-group input:disabled {
  background-color: var(--bg-light);
  cursor: not-allowed;
}

.form-group small {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.error-message, .password-error {
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

.danger-zone {
  border: 1px solid var(--error-color);
  border-radius: 8px;
}

.danger-zone h2 {
  color: var(--error-color);
}

.danger-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.danger-action h3 {
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.danger-action p {
  color: var(--text-secondary);
  margin: 0;
  max-width: 80%;
}

.btn-danger {
  background-color: var(--error-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-danger:hover {
  background-color: var(--error-dark);
}
</style> 