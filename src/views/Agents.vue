<template>
  <div class="agents-page">
    <header>
      <h1>My Agents</h1>
      <button @click="openNewAgentModal" class="btn-primary">New Agent</button>
    </header>

    <div v-if="error" class="error-message">{{ error }}</div>
    
    <div v-if="loading" class="loading">
      <p>Loading agents...</p>
    </div>
    
    <div v-else-if="agents.length === 0" class="empty-state">
      <h2>No agents found</h2>
      <p>Create your first agent to get started.</p>
      <button @click="openNewAgentModal" class="btn-primary">
        Create Agent
      </button>
    </div>
    
    <div v-else class="agent-grid">
      <div v-for="agent in agents" :key="agent.id" class="agent-card">
        <div class="agent-card-header">
          <h3 class="agent-name">{{ agent.name }}</h3>
        </div>
        
        <p class="agent-description">{{ agent.description || 'No description provided' }}</p>
        
        <div class="agent-card-footer">
          <div class="agent-flow">
            <span>Flow: </span>
            <router-link :to="`/flows/${agent.flowId}`">{{ agent.flowName }}</router-link>
          </div>
          
          <div class="agent-actions">
            <button @click="openSettings(agent)" class="btn-secondary">Settings</button>
            <button @click="startChat(agent)" class="btn-primary">Chat</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- New Agent Modal -->
    <div v-if="showNewAgentModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Create New Agent</h2>
          <button class="btn-close" @click="closeNewAgentModal">×</button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="createAgent">
            <div class="form-group">
              <label for="name">Name</label>
              <input 
                type="text" 
                id="name" 
                v-model="newAgent.name" 
                required 
                placeholder="Enter agent name"
              />
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
            
            <div class="form-group">
              <label for="flow">Select Flow</label>
              <select id="flow" v-model="newAgent.flowId" required>
                <option value="">Select a flow</option>
                <option 
                  v-for="flow in availableFlows" 
                  :key="flow.flow_id" 
                  :value="flow.flow_id"
                >
                  {{ flow.name }}
                </option>
              </select>
            </div>
            
            <div class="form-actions">
              <button 
                type="button" 
                class="btn-secondary" 
                @click="closeNewAgentModal"
              >
                Cancel
              </button>
              
              <button 
                type="submit" 
                class="btn-primary" 
                :disabled="creating"
              >
                {{ creating ? 'Creating...' : 'Create Agent' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    
    <!-- Settings Modal (Simplified) -->
    <div v-if="showSettingsModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Agent Settings</h2>
          <button class="btn-close" @click="closeSettingsModal">×</button>
        </div>
        
        <div class="modal-body">
          <p>Settings for agent: {{ editingAgent?.name }}</p>
          <p>Editing options will be added here.</p>
          
          <div class="form-actions">
            <button 
              type="button" 
              class="btn-secondary" 
              @click="closeSettingsModal"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// Reactive state
const loading = ref(false);
const error = ref(null);
const agents = ref([]);
const availableFlows = ref([]);
const showNewAgentModal = ref(false);
const showSettingsModal = ref(false);
const editingAgent = ref(null);
const creating = ref(false);

const newAgent = ref({
  name: '',
  description: '',
  flowId: ''
});

// Lifecycle hooks
onMounted(async () => {
  await loadAgents();
  await loadAvailableFlows();
});

// Methods
async function loadAgents() {
  loading.value = true;
  error.value = null;

  try {
    // Mock data for demo purposes
    await new Promise(resolve => setTimeout(resolve, 1000));
    agents.value = [
      {
        id: 'agent1',
        name: 'Support Agent',
        description: 'Handles customer support queries.',
        flowId: '1',
        flowName: 'Customer Support Bot'
      },
      {
        id: 'agent2',
        name: 'Research Assistant',
        description: 'Helps with summarizing articles.',
        flowId: '2',
        flowName: 'Content Summarizer'
      }
    ];
  } catch (err) {
    console.error('Failed to load agents:', err);
    error.value = 'Failed to load agents. Please try again.';
  } finally {
    loading.value = false;
  }
}

async function loadAvailableFlows() {
  // Mock available flows for the dropdown
  try {
    await new Promise(resolve => setTimeout(resolve, 500));
    availableFlows.value = [
      { flow_id: '1', name: 'Customer Support Bot' },
      { flow_id: '2', name: 'Content Summarizer' },
      { flow_id: '3', name: 'Data Entry Assistant' },
    ];
  } catch (err) {
    console.error('Failed to load flows for dropdown');
  }
}

function openNewAgentModal() {
  newAgent.value = { name: '', description: '', flowId: '' };
  showNewAgentModal.value = true;
}

function closeNewAgentModal() {
  showNewAgentModal.value = false;
}

async function createAgent() {
  if (!newAgent.value.name || !newAgent.value.flowId) return;
  
  creating.value = true;
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const createdAgent = {
      id: `agent${Date.now()}`,
      name: newAgent.value.name,
      description: newAgent.value.description,
      flowId: newAgent.value.flowId,
      flowName: availableFlows.value.find(f => f.flow_id === newAgent.value.flowId)?.name || 'Unknown Flow'
    };
    
    agents.value.push(createdAgent);
    closeNewAgentModal();
  } catch (err) {
    console.error('Failed to create agent:', err);
    error.value = 'Failed to create agent.';
  } finally {
    creating.value = false;
  }
}

function openSettings(agent) {
  editingAgent.value = { ...agent };
  showSettingsModal.value = true;
}

function closeSettingsModal() {
  showSettingsModal.value = false;
  editingAgent.value = null;
}

function startChat(agent) {
  console.log('Starting chat with agent:', agent);
  // In a real app, navigate to the conversation view
  // router.push(`/agents/${agent.id}/chat`);
  // For now, just log a message or navigate to a placeholder if it exists
  router.push('/conversation-placeholder'); // Example placeholder route
}
</script>

<style scoped>
.agents-page {
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

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.agent-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.agent-card-header {
  padding: 1.5rem 1.5rem 0.5rem;
}

.agent-name {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.agent-description {
  padding: 0 1.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  flex-grow: 1;
  margin-bottom: 1rem;
}

.agent-card-footer {
  padding: 1rem 1.5rem;
  background-color: var(--bg-light);
  border-top: 1px solid var(--border-color);
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.agent-flow {
  font-size: 0.9rem;
  margin-bottom: 1rem;
  color: var(--text-secondary);
}

.agent-flow a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
}

.agent-flow a:hover {
  text-decoration: underline;
}

.agent-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-primary, .btn-secondary {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
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

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
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
  margin-bottom: 1.5rem;
}

/* Modal styles - reuse styles from other components */
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

select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1rem;
}
</style> 