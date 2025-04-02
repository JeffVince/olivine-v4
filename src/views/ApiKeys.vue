<template>
  <div class="api-keys-page">
    <header>
      <h1>API Keys</h1>
      <div class="header-actions">
        <button @click="openCreateModal" class="btn-primary">Create API Key</button>
        <button @click="refreshKeys" class="btn-secondary">Refresh</button>
      </div>
    </header>

    <div v-if="error" class="error-message">{{ error }}</div>
    
    <div v-if="loading" class="loading">
      <p>Loading API keys...</p>
    </div>
    
    <div v-else-if="apiKeys.length === 0" class="empty-state">
      <h2>No API keys found</h2>
      <p>Create your first API key to get started with programmatic access.</p>
    </div>
    
    <div v-else>
      <!-- API Keys table -->
      <table class="api-keys-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Created</th>
            <th>Last Used</th>
            <th>Permissions</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="key in apiKeys" :key="key.id">
            <td>{{ key.name }}</td>
            <td>{{ formatDate(key.created_at) }}</td>
            <td>{{ key.last_used ? formatDate(key.last_used) : 'Never' }}</td>
            <td>
              <span 
                v-for="perm in key.permissions" 
                :key="perm" 
                class="permission-badge"
              >
                {{ perm }}
              </span>
            </td>
            <td class="actions-cell">
              <button @click="rotateKey(key)" class="btn-warning">Rotate</button>
              <button @click="revokeKey(key)" class="btn-danger">Revoke</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Create API Key Modal -->
    <div v-if="showCreateModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Create API Key</h2>
          <button class="btn-close" @click="showCreateModal = false">×</button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="createApiKey">
            <div class="form-group">
              <label for="name">Name</label>
              <input 
                type="text" 
                id="name" 
                v-model="newKey.name" 
                required 
                placeholder="Enter a name for this API key"
              />
              <small>A descriptive name to identify this key's purpose.</small>
            </div>
            
            <div class="form-group">
              <label>Permissions</label>
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    value="read" 
                    v-model="newKey.permissions"
                  />
                  Read
                </label>
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    value="write" 
                    v-model="newKey.permissions"
                  />
                  Write
                </label>
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    value="delete" 
                    v-model="newKey.permissions"
                  />
                  Delete
                </label>
              </div>
            </div>
            
            <div class="form-group">
              <label for="description">Description (Optional)</label>
              <textarea 
                id="description" 
                v-model="newKey.description" 
                placeholder="Enter a description for this API key"
                rows="3"
              ></textarea>
            </div>
            
            <div class="form-actions">
              <button 
                type="button" 
                class="btn-secondary" 
                @click="showCreateModal = false"
              >
                Cancel
              </button>
              
              <button 
                type="submit" 
                class="btn-primary" 
                :disabled="!isValidForm"
              >
                Create API Key
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    
    <!-- API Key Created Modal -->
    <div v-if="newKeyData" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>API Key Created</h2>
          <button class="btn-close" @click="newKeyData = null">×</button>
        </div>
        
        <div class="modal-body">
          <div class="key-created-message">
            <p><strong>Important:</strong> Copy your API key now. You won't be able to see it again!</p>
            <div class="key-display">
              {{ newKeyData.key }}
            </div>
            
            <button @click="copyKey" class="btn-primary copy-key-btn">
              Copy to Clipboard
            </button>
          </div>
          
          <div class="key-details">
            <div class="key-detail-item">
              <span class="key-detail-label">Name:</span>
              <span>{{ newKeyData.name }}</span>
            </div>
            
            <div class="key-detail-item">
              <span class="key-detail-label">Permissions:</span>
              <span>
                <span 
                  v-for="perm in newKeyData.permissions" 
                  :key="perm" 
                  class="permission-badge"
                >
                  {{ perm }}
                </span>
              </span>
            </div>
          </div>
          
          <div class="form-actions centered">
            <button @click="newKeyData = null" class="btn-primary">
              I've Copied My Key
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

// Reactive state
const loading = ref(false);
const error = ref(null);
const apiKeys = ref([]);
const showCreateModal = ref(false);
const newKeyData = ref(null);

const newKey = ref({
  name: '',
  description: '',
  permissions: ['read']
});

// Computed properties
const isValidForm = computed(() => {
  return newKey.value.name.trim() && newKey.value.permissions.length > 0;
});

// Lifecycle hooks
onMounted(async () => {
  await loadApiKeys();
});

// Methods
async function loadApiKeys() {
  loading.value = true;
  error.value = null;

  try {
    // Mock data for demo purposes
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    apiKeys.value = [
      {
        id: '1',
        name: 'Development Key',
        created_at: new Date().toISOString(),
        last_used: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        permissions: ['read', 'write']
      },
      {
        id: '2',
        name: 'Production Key',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        last_used: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        permissions: ['read']
      }
    ];
  } catch (err) {
    console.error('Failed to load API keys:', err);
    error.value = 'Failed to load API keys. Please try again.';
  } finally {
    loading.value = false;
  }
}

async function createApiKey() {
  if (!isValidForm.value) return;

  try {
    // Simulate API call with delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create a mock API key response
    newKeyData.value = {
      id: Date.now().toString(),
      name: newKey.value.name,
      description: newKey.value.description,
      permissions: [...newKey.value.permissions],
      created_at: new Date().toISOString(),
      key: `olv_${generateRandomString(32)}`
    };
    
    // Close the create modal
    showCreateModal.value = false;
    
    // Add the new key to the list (without the actual key value)
    apiKeys.value.unshift({
      id: newKeyData.value.id,
      name: newKeyData.value.name,
      created_at: newKeyData.value.created_at,
      last_used: null,
      permissions: newKeyData.value.permissions
    });
    
    // Reset form
    newKey.value = {
      name: '',
      description: '',
      permissions: ['read']
    };
  } catch (err) {
    console.error('Failed to create API key:', err);
    error.value = 'Failed to create API key. Please try again.';
  }
}

function rotateKey(key) {
  if (!confirm(`Are you sure you want to rotate the API key "${key.name}"? The current key will be revoked.`)) {
    return;
  }

  try {
    // Simulate API call with a new key
    const rotatedKey = `olv_${generateRandomString(32)}`;
    
    // Display the new key
    newKeyData.value = {
      ...key,
      key: rotatedKey
    };
  } catch (err) {
    console.error('Failed to rotate API key:', err);
    error.value = 'Failed to rotate API key. Please try again.';
  }
}

function revokeKey(key) {
  if (!confirm(`Are you sure you want to revoke the API key "${key.name}"? This action cannot be undone.`)) {
    return;
  }

  try {
    // Remove the key from the list
    apiKeys.value = apiKeys.value.filter(k => k.id !== key.id);
  } catch (err) {
    console.error('Failed to revoke API key:', err);
    error.value = 'Failed to revoke API key. Please try again.';
  }
}

function copyKey() {
  if (newKeyData.value) {
    navigator.clipboard.writeText(newKeyData.value.key)
      .then(() => {
        console.log('API key copied to clipboard');
      })
      .catch((err) => {
        console.error('Failed to copy API key:', err);
      });
  }
}

function openCreateModal() {
  showCreateModal.value = true;
}

function refreshKeys() {
  loadApiKeys();
}

function formatDate(dateStr) {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function generateRandomString(length) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    result += charset[randomIndex];
  }
  
  return result;
}
</script>

<style scoped>
.api-keys-page {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

h1 {
  margin: 0;
  color: var(--primary-color);
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.api-keys-table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.api-keys-table th,
.api-keys-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.api-keys-table th {
  background-color: var(--bg-light);
  font-weight: 600;
  color: var(--text-primary);
}

.api-keys-table tr:last-child td {
  border-bottom: none;
}

.actions-cell {
  display: flex;
  gap: 0.5rem;
}

.permission-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background-color: var(--primary-bg);
  color: var(--primary-color);
  font-size: 0.85rem;
  margin-right: 0.5rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.empty-state h2 {
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.empty-state p {
  color: var(--text-secondary);
}

/* Modal styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  width: 90%;
  max-width: 500px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  color: var(--text-secondary);
}

.modal-body {
  padding: 1.5rem;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input {
  width: auto;
}

.key-created-message {
  margin-bottom: 1.5rem;
  text-align: center;
}

.key-display {
  background-color: var(--bg-light);
  padding: 1rem;
  border-radius: 4px;
  font-family: monospace;
  font-size: 1rem;
  margin: 1rem 0;
  word-break: break-all;
  color: var(--text-primary);
}

.copy-key-btn {
  margin: 0.5rem 0 1.5rem;
}

.key-details {
  margin-bottom: 1.5rem;
  border-top: 1px solid var(--border-color);
  padding-top: 1.5rem;
}

.key-detail-item {
  display: flex;
  margin-bottom: 1rem;
}

.key-detail-label {
  font-weight: 500;
  width: 120px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.form-actions.centered {
  justify-content: center;
}
</style> 