<template>
  <div class="dashboard">
    <h1>Your Flows</h1>
    
    <div v-if="error" class="error-message">{{ error }}</div>
    
    <div class="dashboard-actions">
      <button class="btn-primary" @click="showCreateFlowModal = true">
        Create New Flow
      </button>
    </div>
    
    <div v-if="loading" class="loading">
      <p>Loading flows...</p>
    </div>
    
    <div v-else-if="flows.length === 0" class="empty-state">
      <h2>No flows found</h2>
      <p>Create your first flow to get started</p>
    </div>
    
    <div v-else class="flow-grid">
      <div 
        v-for="flow in flows" 
        :key="flow.flow_id" 
        class="flow-card"
        @click="viewFlow(flow.flow_id)"
      >
        <div class="flow-card-header">
          <h3>{{ flow.name }}</h3>
          <span :class="['flow-permission', flow.permission]">{{ flow.permission }}</span>
        </div>
        
        <p class="flow-description">{{ flow.description || 'No description provided' }}</p>
        
        <div class="flow-card-footer">
          <div class="flow-meta">
            <span class="flow-date">Created: {{ formatDate(flow.created_at) }}</span>
          </div>
          
          <div class="flow-actions">
            <button 
              class="btn-icon" 
              @click.stop="executeFlow(flow.flow_id)"
              title="Execute flow"
            >
              ▶
            </button>
            
            <button 
              v-if="flow.permission === 'owner'" 
              class="btn-icon" 
              @click.stop="showShareModal(flow)"
              title="Share flow"
            >
              🔗
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Create Flow Modal -->
    <div v-if="showCreateFlowModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Create New Flow</h2>
          <button class="btn-close" @click="showCreateFlowModal = false">×</button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="createNewFlow">
            <div class="form-group">
              <label for="flowName">Flow Name</label>
              <input 
                type="text" 
                id="flowName" 
                v-model="newFlow.name" 
                required 
                placeholder="Enter flow name"
              />
            </div>
            
            <div class="form-group">
              <label for="langflowId">Langflow ID</label>
              <input 
                type="text" 
                id="langflowId" 
                v-model="newFlow.langflowId" 
                required 
                placeholder="Enter Langflow ID"
              />
            </div>
            
            <div class="form-group">
              <label for="description">Description</label>
              <textarea 
                id="description" 
                v-model="newFlow.description" 
                placeholder="Enter flow description"
                rows="3"
              ></textarea>
            </div>
            
            <div class="form-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="newFlow.isPublic" 
                />
                Make this flow public
              </label>
            </div>
            
            <div class="form-actions">
              <button 
                type="button" 
                class="btn-secondary" 
                @click="showCreateFlowModal = false"
              >
                Cancel
              </button>
              
              <button 
                type="submit" 
                class="btn-primary" 
                :disabled="createLoading"
              >
                {{ createLoading ? 'Creating...' : 'Create Flow' }}
              </button>
            </div>
          </form>
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
const showCreateFlowModal = ref(false);
const createLoading = ref(false);
const flows = ref([]);
const loading = ref(true);
const error = ref(null);

const newFlow = ref({
  name: '',
  langflowId: '',
  description: '',
  isPublic: false
});

// Mock data for demo purposes
onMounted(async () => {
  try {
    // Simulating API call with timeout
    setTimeout(() => {
      flows.value = [
        {
          flow_id: '1',
          name: 'Customer Support Bot',
          description: 'AI assistant that helps with customer queries',
          permission: 'owner',
          created_at: new Date().toISOString()
        },
        {
          flow_id: '2',
          name: 'Content Summarizer',
          description: 'Summarizes long articles and documents',
          permission: 'read',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      loading.value = false;
    }, 1000);
  } catch (err) {
    console.error('Failed to fetch flows:', err);
    error.value = 'Failed to load flows. Please try again.';
    loading.value = false;
  }
});

// Methods
function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

function viewFlow(flowId) {
  router.push(`/flows/${flowId}`);
}

function executeFlow(flowId) {
  console.log('Executing flow:', flowId);
  // Prevent navigation to flow detail page
  event.stopPropagation();
}

function showShareModal(flow) {
  console.log('Share modal for flow:', flow);
  // Prevent navigation to flow detail page
  event.stopPropagation();
}

async function createNewFlow() {
  createLoading.value = true;
  try {
    console.log('Creating new flow:', newFlow.value);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Add flow to list
    const newFlowObj = {
      flow_id: Date.now().toString(),
      name: newFlow.value.name,
      description: newFlow.value.description,
      permission: 'owner',
      created_at: new Date().toISOString()
    };
    
    flows.value.unshift(newFlowObj);
    
    // Reset form and close modal
    newFlow.value = {
      name: '',
      langflowId: '',
      description: '',
      isPublic: false
    };
    
    showCreateFlowModal.value = false;
  } catch (err) {
    console.error('Failed to create flow:', err);
    error.value = 'Failed to create flow. Please try again.';
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

.flow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.flow-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.flow-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.flow-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.flow-card-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.flow-permission {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background-color: var(--bg-light);
}

.flow-permission.owner {
  background-color: var(--primary-bg);
  color: var(--primary-color);
}

.flow-permission.read {
  background-color: var(--bg-light);
  color: var(--text-secondary);
}

.flow-description {
  margin-bottom: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 2.7rem;
}

.flow-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}

.flow-date {
  color: var(--text-secondary);
}

.flow-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  background-color: transparent;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
}

.btn-icon:hover {
  background-color: var(--bg-light);
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
</style> 