<template>
  <div class="dashboard">
    <h1>Your Agents</h1>
    
    <div v-if="error" class="alert alert-danger">
      {{ error }}
    </div>
    
    <div class="dashboard-actions">
      <button class="btn-primary" @click="openCreateAgentModal">
        Create New Agent
      </button>
    </div>
    
    <div v-if="loading" class="loading-indicator">
      <div class="spinner"></div> 
      <p>Loading agents...</p>
    </div>
    
    <div v-else-if="!error && agents.length === 0" class="empty-state">
      <h2>No agents found</h2>
      <p>Create your first agent to get started</p>
    </div>
    
    <div v-else class="agent-grid">
      <div 
        v-for="agent in agents" 
        :key="agent.flow_id" 
        class="agent-card"
        @click="viewAgent(agent.flow_id)"
      >
        <div class="agent-card-header">
          <h3>{{ agent.name }}</h3>
          <span :class="['agent-permission', agent.permission]">{{ agent.permission }}</span>
        </div>
        
        <p class="agent-description">{{ agent.description || 'No description provided' }}</p>
        
        <div class="agent-card-footer">
          <div class="agent-meta">
            <span class="agent-date">Created: {{ formatDate(agent.created_at) }}</span>
          </div>
          
          <!-- Actions removed for now, will be added to agent chat view -->
          <!-- <div class="agent-actions"> ... </div> -->
        </div>
      </div>
    </div>
    
    <!-- Create Agent Modal -->
    <div v-if="showCreateAgentModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Create New Agent</h2>
          <button class="btn-close" @click="showCreateAgentModal = false">×</button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="createNewAgent">
            <div class="form-group">
              <label for="agentName">Agent Name</label>
              <input 
                type="text" 
                id="agentName" 
                v-model="newAgent.name" 
                required 
                placeholder="Enter agent name"
              />
            </div>

            <div class="form-group">
              <label for="flowTemplate">Base Flow Template</label>
              <select 
                id="flowTemplate" 
                v-model="newAgent.templateId" 
                required
                :disabled="templateLoading"
              >
                <option disabled value="">{{ templateLoading ? 'Loading templates...' : 'Select a flow template' }}</option>
                <option v-if="templateError">Error loading templates</option>
                <option v-for="template in flowTemplates" :key="template.id" :value="template.id">
                  {{ template.name }}
                </option>
              </select>
              <p v-if="templateError" class="form-error">{{ templateError }}</p>
            </div>
            
            <div class="form-group">
              <label for="description">Description (Optional)</label>
              <textarea 
                id="description" 
                v-model="newAgent.description" 
                placeholder="Enter agent description"
                rows="3"
              ></textarea>
            </div>
            
            <!-- Removed public checkbox for simplicity for now -->
            <!-- <div class="form-group"> ... </div> -->
            
            <div class="form-actions">
              <button 
                type="button" 
                class="btn-secondary" 
                @click="showCreateAgentModal = false"
              >
                Cancel
              </button>
              
              <button 
                type="submit" 
                class="btn-primary" 
                :disabled="createLoading || templateLoading || !newAgent.templateId"
              >
                {{ createLoading ? 'Creating...' : 'Create Agent' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import apiService from '@/services/api'; // Import the api service

const router = useRouter();

// Reactive state
const showCreateAgentModal = ref(false);
const createLoading = ref(false);
const agents = ref([]); // Renamed from flows
const loading = ref(true);
const error = ref(null);
const flowTemplates = ref([]);
const templateLoading = ref(false);
const templateError = ref(null);

const newAgent = ref({ // Renamed from newFlow
  name: '',
  templateId: '', // Changed from langflowId to templateId
  description: '',
  // isPublic: false // Removed for now
});

// Fetch agents on mount
onMounted(async () => {
  await fetchAgents();
});

async function fetchAgents() {
  loading.value = true;
  error.value = null;
  try {
    console.log('Fetching agents...');
    // Get agents from the API
    const fetchedAgents = await apiService.getFlows(); 
    console.log('Agents fetched:', fetchedAgents);
    agents.value = fetchedAgents;
  } catch (err) {
    console.error('Failed to fetch agents:', err);
    error.value = 'Failed to load agents. Please try again.';
    // Handle specific error messages if available
    if (err.response && err.response.data && err.response.data.detail) {
      error.value = `Failed to load agents: ${err.response.data.detail}`;
    } else if (err.message) {
       error.value = `Failed to load agents: ${err.message}`;
    }
  } finally {
    loading.value = false;
  }
}

async function fetchFlowTemplates() {
  templateLoading.value = true;
  templateError.value = null;
  flowTemplates.value = []; // Clear previous templates
  try {
    console.log('Fetching flow templates...');
    // Fetch flow templates from the API
    const templates = await apiService.getFlowTemplates();
    console.log('Templates fetched:', templates);
    // Map the templates to the expected format
    flowTemplates.value = templates.map(t => ({ id: t.id, name: t.name }));
    if (!flowTemplates.value || flowTemplates.value.length === 0) {
        templateError.value = "No flow templates found.";
    }
  } catch (err) {
    console.error('Failed to fetch flow templates:', err);
    templateError.value = 'Failed to load flow templates.';
     if (err.response && err.response.data && err.response.data.detail) {
      templateError.value = `Failed to load templates: ${err.response.data.detail}`;
    } else if (err.message) {
       templateError.value = `Failed to load templates: ${err.message}`;
    }
  } finally {
    templateLoading.value = false;
  }
}

function openCreateAgentModal() {
  // Reset form
  newAgent.value = { name: '', templateId: '', description: '' };
  showCreateAgentModal.value = true;
  // Fetch templates when modal is opened
  fetchFlowTemplates();
}

// Methods
function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

function viewAgent(agentId) { // Renamed from viewFlow
  // Navigate to agent detail/chat view
  router.push(`/agents/${agentId}/chat`); // Updated path
}

// Removed executeFlow and showShareModal as they are not relevant here anymore

async function createNewAgent() {
  if (!newAgent.value.templateId) {
    // Should be caught by disabled button, but check anyway
    console.error("No template selected");
    return; 
  }
  createLoading.value = true;
  error.value = null; // Clear previous errors
  try {
    console.log('Creating new agent from template:', newAgent.value.templateId);
    
    // Prepare customization data
    const customization = {
      name: newAgent.value.name,
      description: newAgent.value.description || 'Created from template'
    };

    // Call the API to create agent from template
    const createdAgent = await apiService.createFlowFromTemplate(
      newAgent.value.templateId, 
      customization
    );

    console.log('Agent created successfully:', createdAgent);

    // Add the new agent to the beginning of the list
    agents.value.unshift(createdAgent);
    
    // Reset form and close modal
    showCreateAgentModal.value = false;
    
    // Show a success message or redirect to the new agent
    // This could be implemented with a toast notification
    
  } catch (err) {
    console.error('Failed to create agent:', err);
    // Display error to the user
    if (err.response && err.response.data && err.response.data.detail) {
      error.value = `Failed to create agent: ${err.response.data.detail}`;
    } else if (err.message) {
      error.value = `Failed to create agent: ${err.message}`;
    } else {
      error.value = 'An unexpected error occurred while creating the agent.';
    }
  } finally {
    createLoading.value = false;
  }
}
</script>

<style scoped>
.dashboard {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 1.5rem;
  color: var(--primary-color);
}

.dashboard-actions {
  margin-bottom: 2rem;
  display: flex;
  justify-content: flex-end;
}

.agent-grid { /* Renamed */
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.agent-card { /* Renamed */
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.agent-card:hover { /* Renamed */
  transform: translateY(-4px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.agent-card-header { /* Renamed */
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.agent-card-header h3 { /* Renamed */
  margin: 0;
  font-size: 1.25rem;
}

.agent-permission { /* Renamed */
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background-color: var(--bg-light);
}

.agent-permission.owner { /* Renamed */
  background-color: var(--primary-bg);
  color: var(--primary-color);
}

.agent-permission.read { /* Renamed */
  background-color: var(--bg-light);
  color: var(--text-secondary);
}

.agent-description { /* Renamed */
  margin-bottom: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 2.7rem;
}

.agent-card-footer { /* Renamed */
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}

.agent-meta { /* Added for structure */
  /* styles if needed */
}

.agent-date { /* Renamed */
  color: var(--text-secondary);
}

/* Removed .flow-actions styles */

/* Styles for form-error */
.form-error {
  color: var(--error-color); /* Make sure --error-color is defined in your CSS vars */
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

/* Add styles for select dropdown if needed */
select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: white;
  font-size: 1rem;
  margin-top: 0.5rem;
}

select:disabled {
  background-color: var(--bg-light);
  cursor: not-allowed;
}

/* Ensure modal styles are present */
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

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
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

/* Add styles for alert */
.alert {
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid transparent;
  border-radius: 4px;
}

.alert-danger {
  color: #842029; /* Darker red text */
  background-color: #f8d7da; /* Light red background */
  border-color: #f5c2c7; /* Red border */
}

/* Add styles for loading indicator */
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: var(--text-secondary);
}

.spinner {
  border: 4px solid rgba(0,0,0,.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: var(--primary-color);
  animation: spin 1s ease infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Adjust modal error display */
.modal-body .form-error {
  margin-top: 0.5rem;
  margin-bottom: 1rem; /* Add space below error */
}
</style> 