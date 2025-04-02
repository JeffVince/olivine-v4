<template>
  <div class="integrations-page">
    <header>
      <h1>Integrations & Credentials</h1>
      <div class="header-actions">
        <button @click="openAddIntegrationModal" class="btn-primary">Add Integration</button>
        <button @click="loadConfiguredIntegrations" class="btn-secondary">Refresh</button>
      </div>
    </header>

    <!-- Configured Integrations Table -->
    <h2>Configured Integrations</h2>
    <div v-if="loading" class="loading">
      <p>Loading configured integrations...</p>
    </div>
    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-else-if="configuredIntegrations.length === 0" class="empty-state">
      <p>No integrations configured yet. Click "Add Integration" to get started.</p>
    </div>
    <table v-else class="integrations-table">
      <thead>
        <tr>
          <th>Name / Service</th>
          <th>Type</th>
          <th>Status</th>
          <th>Added</th>
          <th>Last Used</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="integration in configuredIntegrations" :key="integration.id">
          <td>{{ integration.name || integration.serviceName }}</td>
          <td>
            <span class="badge type-badge">{{ integration.type }}</span>
          </td>
          <td>
            <span :class="['status-badge', integration.status]">{{ integration.status }}</span>
          </td>
          <td>{{ formatDate(integration.createdAt) }}</td>
          <td>{{ integration.lastUsed ? formatDate(integration.lastUsed) : 'Never' }}</td>
          <td class="actions-cell">
            <button v-if="integration.type === 'apikey'" @click="rotateCredential(integration)" class="btn-warning btn-small">Rotate</button>
            <button @click="revokeIntegration(integration)" class="btn-danger btn-small">Revoke</button>
            <!-- Add Edit button if needed -->
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Available Integrations (Optional - Could be part of the 'Add' modal) -->
    <!-- 
    <h2>Available Integrations</h2>
    <div class="integration-grid">
      </div> 
    -->

    <!-- Add/Edit Integration Modal -->
    <div v-if="showAddModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Add New Integration</h2>
          <button class="btn-close" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleAddIntegration">
            <div class="form-group">
              <label for="integrationType">Integration Type</label>
              <select id="integrationType" v-model="newIntegration.type" required>
                <option value="apikey">API Key</option>
                <option value="oauth">OAuth</option>
                <!-- Add other types as needed -->
              </select>
            </div>

            <!-- API Key Fields -->
            <template v-if="newIntegration.type === 'apikey'">
              <div class="form-group">
                <label for="apiKeyName">Name</label>
                <input type="text" id="apiKeyName" v-model="newIntegration.name" required placeholder="e.g., My Langflow Key">
              </div>
              <div class="form-group">
                <label for="apiKey">API Key</label>
                <input type="password" id="apiKey" v-model="newIntegration.apiKey" required placeholder="Paste your API key">
              </div>
               <div class="form-group">
                 <label for="apiKeyService">Service (Optional)</label>
                 <input type="text" id="apiKeyService" v-model="newIntegration.serviceName" placeholder="e.g., OpenAI">
               </div>
              <!-- Add permissions, description etc. if needed -->
            </template>

            <!-- OAuth Fields (Example: Service Selection) -->
            <template v-if="newIntegration.type === 'oauth'">
              <div class="form-group">
                <label for="oauthService">Service</label>
                <select id="oauthService" v-model="newIntegration.serviceName" required>
                  <option value="dropbox">Dropbox</option>
                  <option value="gdrive">Google Drive</option>
                  <option value="notion">Notion</option>
                  <!-- Add other OAuth services -->
                </select>
              </div>
              <p>Connecting via OAuth will redirect you to {{ newIntegration.serviceName }} for authorization.</p>
            </template>

            <div class="form-actions">
              <button type="button" class="btn-secondary" @click="closeModal">Cancel</button>
              <button type="submit" class="btn-primary" :disabled="!isAddFormValid">
                {{ newIntegration.type === 'oauth' ? 'Connect via OAuth' : 'Add API Key' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Display New API Key Modal (Similar to original ApiKeys.vue) -->
    <div v-if="newKeyData" class="modal">
       <div class="modal-content">
         <div class="modal-header">
           <h2>API Key Created/Rotated</h2>
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
              <!-- Add other details like permissions if applicable -->
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
import { ref, onMounted, computed } from 'vue';

// --- State ---
const loading = ref(false);
const error = ref(null);
const configuredIntegrations = ref([]); // Stores configured integrations { id, name, type, status, createdAt, lastUsed, serviceName?, ... }
const showAddModal = ref(false);
const newIntegration = ref({ // Form model for adding integrations
  type: 'apikey', // Default selection
  name: '', // For API keys
  apiKey: '', // For API keys
  serviceName: '', // For OAuth or API Key service identification
});
const newKeyData = ref(null); // To display newly created/rotated API keys

// --- Computed ---
const isAddFormValid = computed(() => {
  if (newIntegration.value.type === 'apikey') {
    return newIntegration.value.name.trim() && newIntegration.value.apiKey.trim();
  }
  if (newIntegration.value.type === 'oauth') {
    return newIntegration.value.serviceName;
  }
  return false;
});

// --- Lifecycle Hooks ---
onMounted(async () => {
  await loadConfiguredIntegrations();
});

// --- Methods ---

async function loadConfiguredIntegrations() {
  loading.value = true;
  error.value = null;
  try {
    // Simulate API call to fetch configured integrations
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock Data: Replace with actual API call
    configuredIntegrations.value = [
      {
        id: '1',
        name: 'My OpenAI Key',
        type: 'apikey',
        status: 'active', // or 'connected' / 'revoked' etc.
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsed: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        serviceName: 'OpenAI'
      },
      {
        id: '2',
        name: null, // Name might not apply to OAuth
        type: 'oauth',
        status: 'connected',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        serviceName: 'Google Drive'
      },
       {
        id: '3',
        name: 'Langflow Dev Key',
        type: 'apikey',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastUsed: null,
        serviceName: 'Langflow'
      }
    ];
  } catch (err) {
    console.error('Failed to load integrations:', err);
    error.value = 'Failed to load configured integrations.';
  } finally {
    loading.value = false;
  }
}

function openAddIntegrationModal() {
  resetNewIntegrationForm();
  showAddModal.value = true;
}

function closeModal() {
  showAddModal.value = false;
  newKeyData.value = null; // Also close the key display modal if open
}

function resetNewIntegrationForm() {
   newIntegration.value = {
    type: 'apikey',
    name: '',
    apiKey: '',
    serviceName: '',
  };
}

async function handleAddIntegration() {
  if (!isAddFormValid.value) return;

  loading.value = true; // Optional: add loading state for this action
  error.value = null;

  try {
     await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

    if (newIntegration.value.type === 'apikey') {
      // Simulate API call to save the API key
      const createdKeyData = {
        id: Date.now().toString(),
        name: newIntegration.value.name,
        type: 'apikey',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastUsed: null,
        serviceName: newIntegration.value.serviceName || 'Generic',
        // The actual key is returned ONLY once upon creation
        key: `sim_${generateRandomString(32)}` 
      };

      // Add to the list (without the full key)
      configuredIntegrations.value.unshift({
          id: createdKeyData.id,
          name: createdKeyData.name,
          type: createdKeyData.type,
          status: createdKeyData.status,
          createdAt: createdKeyData.createdAt,
          lastUsed: createdKeyData.lastUsed,
          serviceName: createdKeyData.serviceName,
      });
      
      // Show the key to the user
      newKeyData.value = createdKeyData; 
      showAddModal.value = false; // Close add modal

    } else if (newIntegration.value.type === 'oauth') {
      // 1. Initiate OAuth flow (Redirect user or open popup)
      // This would typically involve calling a backend endpoint that starts the flow
      console.log(`Initiating OAuth flow for ${newIntegration.value.serviceName}...`);
      alert(`Redirecting to ${newIntegration.value.serviceName} for authorization... (Simulation)`);
      
      // 2. After successful OAuth, the backend would notify the frontend,
      //    or the user would be redirected back with a code/token.
      // 3. Then, update the integration list.
      // For simulation, we'll just add it directly:
       configuredIntegrations.value.push({
         id: Date.now().toString(),
         name: null,
         type: 'oauth',
         status: 'connected',
         createdAt: new Date().toISOString(),
         lastUsed: null,
         serviceName: newIntegration.value.serviceName
       });
       closeModal();
    }

  } catch (err) {
     console.error('Failed to add integration:', err);
     error.value = `Failed to add integration for ${newIntegration.value.serviceName || newIntegration.value.name}.`;
     closeModal(); // Close modal even on error
  } finally {
      loading.value = false; // Reset loading state if used
      // Don't reset form here if showing the key modal
      if (!newKeyData.value) {
          resetNewIntegrationForm();
      }
  }
}

async function rotateCredential(integration) {
  if (!integration || integration.type !== 'apikey') return;
  
  if (!confirm(`Are you sure you want to rotate the API key "${integration.name || integration.serviceName}"? The current key will be invalidated.`)) {
    return;
  }

  try {
    // Simulate API call to rotate the key
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    const rotatedKey = `sim_rot_${generateRandomString(30)}`;

    // Display the new key
    newKeyData.value = {
      ...integration, // Carry over existing details
      key: rotatedKey // The new key value
    };

    // Optionally update the main list if needed (e.g., update 'lastRotated' timestamp)
    // const index = configuredIntegrations.value.findIndex(i => i.id === integration.id);
    // if (index !== -1) {
    //   configuredIntegrations.value[index].lastRotated = new Date().toISOString();
    // }

  } catch (err) {
    console.error('Failed to rotate API key:', err);
    error.value = 'Failed to rotate API key. Please try again.';
  }
}

async function revokeIntegration(integration) {
  const confirmMessage = integration.type === 'apikey' 
    ? `Are you sure you want to revoke the API key "${integration.name || integration.serviceName}"? This action cannot be undone.`
    : `Are you sure you want to disconnect from ${integration.serviceName}?`;

  if (!confirm(confirmMessage)) {
    return;
  }

  try {
     // Simulate API call to revoke/disconnect
     await new Promise(resolve => setTimeout(resolve, 1000)); 

    // Remove the integration from the list
    configuredIntegrations.value = configuredIntegrations.value.filter(i => i.id !== integration.id);
  } catch (err) {
    console.error('Failed to revoke integration:', err);
    error.value = 'Failed to revoke integration. Please try again.';
  }
}

function copyKey() {
  if (newKeyData.value && newKeyData.value.key) {
    navigator.clipboard.writeText(newKeyData.value.key)
      .then(() => {
        console.log('API key copied to clipboard');
        // Optional: Show a temporary success message
      })
      .catch((err) => {
        console.error('Failed to copy API key:', err);
        // Optional: Show an error message to the user
      });
  }
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    // Check if date is valid
    if (isNaN(date.getTime())) {
        return 'Invalid Date';
    }
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return 'Invalid Date';
  }
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

// Placeholder functions from original Integrations if needed
// function isConnected(service) { ... } 
// function connectService(service) { ... } - Replaced by Add Integration Flow
// function disconnectService(service) { ... } - Replaced by revokeIntegration

</script>

<style scoped>
.integrations-page {
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

h1, h2 {
  margin: 0;
  color: var(--primary-color);
}

h2 {
   margin-top: 2.5rem;
   margin-bottom: 1rem;
   font-size: 1.5rem;
   border-bottom: 1px solid var(--border-color);
   padding-bottom: 0.5rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.loading, .error-message, .empty-state {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 4px;
}

.error-message {
  background-color: var(--danger-bg);
  color: var(--danger-color);
  border: 1px solid var(--danger-color);
}

.empty-state {
   text-align: center;
   padding: 2rem;
   background-color: var(--bg-light);
   border: 1px dashed var(--border-color);
   color: var(--text-secondary);
}

.integrations-table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden; /* Ensures border radius is applied to table */
  margin-top: 1rem;
}

.integrations-table th,
.integrations-table td {
  padding: 0.8rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}

.integrations-table th {
  background-color: var(--bg-light);
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.integrations-table tr:last-child td {
  border-bottom: none;
}

.actions-cell {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap; /* Allow buttons to wrap on smaller screens */
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  border-radius: 12px; /* Pill shape */
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
}

.type-badge {
  background-color: var(--info-bg);
  color: var(--info-color);
}

.status-badge {
  /* Define styles for different statuses */
}
.status-badge.active,
.status-badge.connected {
  background-color: var(--success-bg);
  color: var(--success-color);
}
.status-badge.revoked,
.status-badge.disconnected,
.status-badge.error {
  background-color: var(--danger-bg);
  color: var(--danger-color);
}
.status-badge.pending {
  background-color: var(--warning-bg);
  color: var(--warning-color);
}


/* Modal styles (reuse/adapt existing) */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6); /* Darker overlay */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem; /* Add padding for smaller screens */
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  width: 95%;
  max-width: 550px; /* Slightly wider modal */
  max-height: 90vh; /* Limit height */
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.3rem; /* Adjusted size */
  color: var(--text-primary);
  border: none; /* Remove border inherited from page h2 */
  padding: 0;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 1.6rem; /* Larger close button */
  cursor: pointer;
  padding: 0;
  color: var(--text-secondary);
  line-height: 1;
}
.btn-close:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto; /* Allow scrolling if content exceeds height */
}

/* Form Styles within Modal */
/* Reusing existing form-group, label etc. assumed available globally or define here */
.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
}

.form-group input[type="text"],
.form-group input[type="password"],
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1rem;
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--primary-bg);
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem; /* Reduced top margin */
  padding-top: 1rem;
  border-top: 1px solid var(--border-color); /* Separator line */
}

.form-actions.centered {
  justify-content: center;
}

/* Key Display Styles (from original ApiKeys.vue) */
.key-created-message {
  margin-bottom: 1.5rem;
  text-align: center;
}
.key-created-message p strong {
    color: var(--danger-color);
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
  border: 1px solid var(--border-color);
}

.copy-key-btn {
  margin-top: 0.5rem;
}

.key-details {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.key-detail-item {
  display: flex;
  margin-bottom: 0.75rem; /* Reduced margin */
  font-size: 0.95rem;
}

.key-detail-label {
  font-weight: 500;
  width: 100px; /* Adjusted width */
  flex-shrink: 0;
  color: var(--text-secondary);
}

.btn-small {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}

</style> 