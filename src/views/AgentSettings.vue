<template>
  <div class="agent-settings-page">
    <div v-if="loading" class="loading-overlay centered">
        <div class="spinner"></div>
        <p>Loading Agent Settings...</p>
    </div>
    <div v-else-if="error" class="alert alert-danger">
      {{ error }}
    </div>
    
    <div v-else-if="agent" class="settings-container">
      <h1>{{ agent.name }} - Settings</h1>
      
      <form @submit.prevent="saveSettings">
          <!-- Basic Info -->
          <section class="settings-section">
              <h2>Basic Information</h2>
              <div class="form-group">
                  <label for="agentName">Agent Name</label>
                  <input id="agentName" v-model="editableAgent.name" type="text" required>
              </div>
              <div class="form-group">
                  <label for="agentDescription">Description</label>
                  <textarea id="agentDescription" v-model="editableAgent.description" rows="3"></textarea>
              </div>
              <div class="form-group">
                  <label>Agent ID</label>
                  <input :value="agent.flow_id || agent.id" type="text" disabled>
              </div>
              <div class="form-group">
                  <label>Base Flow Template ID</label>
                   <!-- TODO: Make this potentially editable or just display -->
                  <input :value="agent.template_id || 'N/A'" type="text" disabled>
              </div>
          </section>
          
          <!-- Credentials -->
          <section class="settings-section">
              <h2>Associated Credentials</h2>
              <div v-if="credentialsLoading" class="loading-indicator small">
                  <div class="spinner small"></div> Loading credentials...
              </div>
              <div v-else-if="credentialsError" class="form-error">
                   {{ credentialsError }}
              </div>
              <div v-else-if="availableCredentials.length === 0" class="empty-state small">
                   No credentials found. <router-link to="/integrations">Add credentials</router-link>.
              </div>
              <div v-else class="credentials-list">
                   <p>Select the credentials this agent should have access to:</p>
                   <div v-for="cred in availableCredentials" :key="cred.id" class="credential-item">
                       <label>
                           <input 
                               type="checkbox" 
                               :value="cred.id" 
                               v-model="editableAgent.associated_credential_ids"
                           >
                           {{ cred.name }} ({{ cred.type }})
                           <span class="cred-date">Added: {{ formatDate(cred.created_at) }}</span>
                       </label>
                   </div>
              </div>
          </section>

          <!-- Actions -->
          <div class="form-actions">
               <button 
                   type="button" 
                   @click="goBack" 
                   class="btn-secondary"
                   :disabled="saving"
                >
                   Cancel
                </button>
                <button 
                    type="submit" 
                    class="btn-primary"
                    :disabled="saving || !isChanged"
                >
                    {{ saving ? 'Saving...' : 'Save Changes' }}
                </button>
          </div>
      </form>
      
      <!-- Delete Zone -->
      <section class="settings-section danger-zone">
          <h2>Danger Zone</h2>
          <p>Deleting an agent cannot be undone. All associated conversation history may also be lost.</p>
          <button 
            @click="confirmDeleteAgent" 
            class="btn-danger"
            :disabled="deleting"
        >
            {{ deleting ? 'Deleting...' : 'Delete Agent' }}
        </button>
        <p v-if="deleteError" class="form-error">{{ deleteError }}</p>
      </section>
      
    </div>
    <div v-else class="not-found">
        Agent not found.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import apiService from '@/services/api';

const props = defineProps({
  agentId: {
    type: String,
    required: true
  }
});

const router = useRouter();
const route = useRoute();

// State
const agent = ref(null);
const editableAgent = ref({});
const availableCredentials = ref([]);
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);
const credentialsLoading = ref(false);
const error = ref(null);
const credentialsError = ref(null);
const deleteError = ref(null);

// Computed
const isChanged = computed(() => {
    if (!agent.value || !editableAgent.value) return false;
    // Simple JSON stringify comparison for changes
    // Note: Order of keys might matter depending on JS engine if not careful
    // Comparing credentials array requires sorting or set comparison for robustness
    const originalCreds = agent.value.associated_credential_ids?.slice().sort() || [];
    const editedCreds = editableAgent.value.associated_credential_ids?.slice().sort() || [];
    
    return agent.value.name !== editableAgent.value.name || 
           agent.value.description !== editableAgent.value.description ||
           JSON.stringify(originalCreds) !== JSON.stringify(editedCreds);
});

// Methods
// TODO: Implement a user-friendly notification system (e.g., vue-toastification)
// and replace the placeholder showToast calls below.
function showToast(message, type = 'success') {
    console.log(`[Toast - ${type}]: ${message}`); 
    // Placeholder implementation using console.log
    // Replace with actual toast library call, e.g.:
    // import { useToast } from 'vue-toastification';
    // const toast = useToast();
    // if (type === 'success') { toast.success(message); }
    // else if (type === 'error') { toast.error(message); }
    // else { toast.info(message); }
}

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString();
}

async function loadAgentDetails() {
  loading.value = true;
  error.value = null;
  try {
    const data = await apiService.getFlow(props.agentId);
    agent.value = data;
    // Initialize editable copy - ensure associated_credential_ids is an array
    editableAgent.value = { 
        ...data, 
        associated_credential_ids: Array.isArray(data.associated_credential_ids) 
            ? [...data.associated_credential_ids] 
            : [] 
    };
  } catch (err) {
    console.error('Failed to load agent details:', err);
    error.value = `Failed to load agent: ${err.response?.data?.detail || err.message}`;
    agent.value = null;
  } finally {
    loading.value = false;
  }
}

async function loadCredentials() {
  credentialsLoading.value = true;
  credentialsError.value = null;
  try {
    // Assuming getCredentials returns an array of credential objects { id, name, type, created_at }
    availableCredentials.value = await apiService.getCredentials(); 
  } catch (err) {
    console.error('Failed to load credentials:', err);
    credentialsError.value = `Failed to load credentials: ${err.response?.data?.detail || err.message}`;
  } finally {
    credentialsLoading.value = false;
  }
}

async function saveSettings() {
  if (!isChanged.value) return;
  saving.value = true;
  error.value = null; // Clear previous errors
  deleteError.value = null;
  
  try {
    const updateData = {
        name: editableAgent.value.name,
        description: editableAgent.value.description,
        associated_credential_ids: editableAgent.value.associated_credential_ids
        // Add other editable fields if necessary
    };
    // Assuming updateFlow corresponds to PATCH /api/flows/{id}
    const updatedAgent = await apiService.updateFlow(props.agentId, updateData);
    agent.value = updatedAgent; // Update local state with response
    // Re-sync editable state
    editableAgent.value = { 
        ...updatedAgent, 
        associated_credential_ids: Array.isArray(updatedAgent.associated_credential_ids) 
            ? [...updatedAgent.associated_credential_ids] 
            : [] 
    };
    
    showToast('Agent settings saved successfully!', 'success'); // Use toast notification

  } catch (err) {
     console.error('Failed to save agent settings:', err);
     const errorMessage = `Failed to save settings: ${err.response?.data?.detail || err.message}`;
     error.value = errorMessage;
     showToast(errorMessage, 'error'); // Show error toast
  } finally {
      saving.value = false;
  }
}

function confirmDeleteAgent() {
    if (window.confirm(`Are you sure you want to delete agent "${agent.value?.name}"? This action cannot be undone.`)) {
        deleteAgent();
    }
}

async function deleteAgent() {
    deleting.value = true;
    deleteError.value = null;
    error.value = null;
    try {
        await apiService.deleteFlow(props.agentId);
        showToast('Agent deleted successfully.', 'success'); // Use toast notification
        router.push('/dashboard'); // Redirect to dashboard after deletion
    } catch (err) {
        console.error('Failed to delete agent:', err);
        const errorMessage = `Failed to delete agent: ${err.response?.data?.detail || err.message}`;
        deleteError.value = errorMessage;
        showToast(errorMessage, 'error'); // Show error toast
    } finally {
        deleting.value = false;
    }
}

function goBack() {
    // Navigate back to conversation view or dashboard
    // Check if coming from conversation view?
    // For simplicity, just go to dashboard
    router.push('/dashboard'); 
}

// Load data on mount
onMounted(() => {
  loadAgentDetails();
  loadCredentials();
});

// Watch for changes in editableAgent to provide feedback or enable save button
// (Using isChanged computed property now)

</script>

<style scoped>
.agent-settings-page {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.settings-container h1 {
    margin-bottom: 2rem;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 1rem;
}

.settings-section {
    margin-bottom: 2.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--border-color-light, #eee);
}
.settings-section:last-of-type {
    border-bottom: none;
}

.settings-section h2 {
    margin-bottom: 1.5rem;
    font-size: 1.4rem;
    font-weight: 600;
    color: var(--text-primary);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input[type="text"],
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1rem;
}

.form-group input:disabled {
    background-color: var(--bg-light);
    cursor: not-allowed;
    color: var(--text-secondary);
}

.credentials-list {
    margin-top: 1rem;
}
.credentials-list p {
    margin-bottom: 1rem;
    color: var(--text-secondary);
}

.credential-item {
    margin-bottom: 0.75rem;
    padding: 0.5rem;
    border-radius: 4px;
    background-color: var(--bg-light);
}

.credential-item label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: normal;
    cursor: pointer;
}
.credential-item input[type="checkbox"] {
    width: auto; /* Override default */
    margin: 0;
}

.cred-date {
    margin-left: auto;
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color-light, #eee);
}

.danger-zone {
    margin-top: 3rem;
    border: 1px solid var(--error-color, #d9534f);
    border-radius: 4px;
    padding: 1.5rem;
    background-color: #fdf7f7;
}
.danger-zone h2 {
    color: var(--error-color, #d9534f);
    margin-top: 0;
}
.danger-zone p {
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
}

.btn-primary,
.btn-secondary,
.btn-danger {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s ease;
}

.btn-primary {
    background-color: var(--primary-color);
    color: white;
}
.btn-primary:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.btn-secondary {
    background-color: var(--bg-light);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
}
.btn-secondary:hover {
    background-color: var(--border-color);
}
.btn-secondary:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.btn-danger {
    background-color: var(--error-color, #d9534f);
    color: white;
}
.btn-danger:hover {
    background-color: #c9302c; /* Darker red */
}
.btn-danger:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.alert {
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid transparent;
  border-radius: 4px;
}

.alert-danger {
  color: #842029;
  background-color: #f8d7da;
  border-color: #f5c2c7;
}

.form-error {
  color: var(--error-color, red);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.loading-indicator.small {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.empty-state.small {
    font-size: 0.9rem;
    color: var(--text-secondary);
    padding: 1rem 0;
}

.loading-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 10;
    color: var(--text-secondary);
}

.loading-overlay.centered p {
    margin-top: 0.5rem;
}

.spinner {
  border: 4px solid rgba(0,0,0,.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: var(--primary-color);
  animation: spin 1s ease infinite;
}
.spinner.small {
     width: 20px;
     height: 20px;
     border-width: 3px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

</style> 