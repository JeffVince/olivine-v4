<template>
  <div class="flow-detail">
    <div v-if="loading" class="loading">
      <p>Loading flow...</p>
    </div>
    
    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="$router.push('/dashboard')" class="btn-secondary">
        Back to Dashboard
      </button>
    </div>
    
    <div v-else-if="!flow" class="not-found">
      <h2>Flow Not Found</h2>
      <p>The requested flow does not exist or you don't have access to it.</p>
      <button @click="$router.push('/dashboard')" class="btn-secondary">
        Back to Dashboard
      </button>
    </div>
    
    <div v-else class="flow-container">
      <div class="flow-header">
        <div>
          <h1>{{ flow.name }}</h1>
          <p class="flow-description">{{ flow.description || 'No description provided' }}</p>
        </div>
        
        <div class="flow-actions">
          <button 
            class="btn-secondary" 
            @click="$router.push('/dashboard')"
          >
            Back to Dashboard
          </button>
          
          <button 
            v-if="flow.permission === 'owner'" 
            class="btn-secondary"
            @click="showShareModal = true"
          >
            Share
          </button>
          
          <button 
            class="btn-primary"
            @click="showExecuteModal = true"
            :disabled="executionLoading"
          >
            {{ executionLoading ? 'Running...' : 'Execute Flow' }}
          </button>
        </div>
      </div>
      
      <div class="flow-info">
        <div class="info-item">
          <span class="info-label">ID:</span>
          <span class="info-value">{{ flow.flow_id }}</span>
        </div>
        
        <div class="info-item">
          <span class="info-label">Permission:</span>
          <span class="info-value permission" :class="flow.permission">
            {{ flow.permission }}
          </span>
        </div>
        
        <div class="info-item">
          <span class="info-label">Created:</span>
          <span class="info-value">{{ formatDate(flow.created_at) }}</span>
        </div>
        
        <div class="info-item" v-if="flow.tags && flow.tags.length > 0">
          <span class="info-label">Tags:</span>
          <span class="info-value">
            <span v-for="tag in flow.tags" :key="tag" class="flow-tag">{{ tag }}</span>
          </span>
        </div>
      </div>
      
      <!-- Results Section -->
      <div v-if="executionResults.length > 0" class="results-section">
        <h2>Execution Results</h2>
        
        <div v-for="(result, index) in executionResults" :key="index" class="result-card">
          <div class="result-header">
            <h3>Execution #{{ executionResults.length - index }}</h3>
            <span class="result-status" :class="result.status">{{ result.status }}</span>
          </div>
          
          <div class="result-timestamp">
            {{ formatDateTime(result.timestamp) }}
          </div>
          
          <div v-if="result.status === 'completed'" class="result-content">
            <pre>{{ JSON.stringify(result.result, null, 2) }}</pre>
          </div>
          
          <div v-else-if="result.status === 'failed'" class="result-error">
            <p>{{ result.error || 'An unknown error occurred' }}</p>
          </div>
          
          <div v-else class="result-pending">
            <p>Waiting for results...</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Execute Flow Modal -->
    <div v-if="showExecuteModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Execute Flow</h2>
          <button class="btn-close" @click="showExecuteModal = false">×</button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="executeFlow">
            <div class="form-group">
              <label for="flowInput">Input</label>
              <textarea 
                id="flowInput" 
                v-model="flowInput" 
                placeholder="Enter input as JSON, e.g. { &quot;query&quot;: &quot;What is AI?&quot; }"
                rows="5"
              ></textarea>
              <p v-if="inputError" class="form-error">{{ inputError }}</p>
            </div>
            
            <div class="form-actions">
              <button 
                type="button" 
                class="btn-secondary" 
                @click="showExecuteModal = false"
              >
                Cancel
              </button>
              
              <button 
                type="submit" 
                class="btn-primary" 
                :disabled="executionLoading"
              >
                {{ executionLoading ? 'Running...' : 'Execute' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    
    <!-- Share Flow Modal -->
    <div v-if="showShareModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Share "{{ flow?.name }}"</h2>
          <button class="btn-close" @click="showShareModal = false">×</button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="shareFlow">
            <div class="form-group">
              <label for="shareEmail">Email</label>
              <input 
                type="email" 
                id="shareEmail" 
                v-model="shareEmail" 
                required 
                placeholder="Enter email to share with"
              />
            </div>
            
            <div class="form-group">
              <label>Permission</label>
              <div class="radio-group">
                <label class="radio-label">
                  <input 
                    type="radio" 
                    v-model="sharePermission" 
                    value="read" 
                  />
                  Read only
                </label>
                
                <label class="radio-label">
                  <input 
                    type="radio" 
                    v-model="sharePermission" 
                    value="write" 
                  />
                  Can edit
                </label>
              </div>
            </div>
            
            <div class="form-actions">
              <button 
                type="button" 
                class="btn-secondary" 
                @click="showShareModal = false"
              >
                Cancel
              </button>
              
              <button 
                type="submit" 
                class="btn-primary" 
                :disabled="shareLoading"
              >
                {{ shareLoading ? 'Sharing...' : 'Share Flow' }}
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
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

// Reactive state
const flow = ref(null);
const loading = ref(true);
const error = ref(null);
const showExecuteModal = ref(false);
const showShareModal = ref(false);
const flowInput = ref('{}');
const inputError = ref('');
const executionLoading = ref(false);
const executionResults = ref([]);
const shareEmail = ref('');
const sharePermission = ref('read');
const shareLoading = ref(false);

// Lifecycle hooks
onMounted(async () => {
  const flowId = route.params.id;
  
  if (!flowId) {
    error.value = 'Invalid flow ID';
    loading.value = false;
    return;
  }
  
  await loadFlow(flowId);
});

// Methods
async function loadFlow(flowId) {
  loading.value = true;
  error.value = null;
  
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock data for demo
    flow.value = {
      flow_id: flowId,
      name: 'Sample Flow ' + flowId,
      description: 'This is a sample flow for demonstration purposes.',
      permission: 'owner',
      created_at: new Date().toISOString(),
      tags: ['demo', 'ai', 'sample']
    };
  } catch (err) {
    console.error('Failed to load flow:', err);
    error.value = 'Failed to load flow. Please try again.';
  } finally {
    loading.value = false;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  return date.toLocaleString();
}

async function executeFlow() {
  // Validate JSON input
  try {
    JSON.parse(flowInput.value);
  } catch (e) {
    inputError.value = 'Invalid JSON input';
    return;
  }
  
  inputError.value = '';
  executionLoading.value = true;
  
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Add result to the list
    executionResults.value.unshift({
      status: 'completed',
      timestamp: new Date().toISOString(),
      result: {
        message: 'Flow executed successfully',
        data: JSON.parse(flowInput.value)
      }
    });
    
    // Close modal
    showExecuteModal.value = false;
  } catch (err) {
    console.error('Failed to execute flow:', err);
    
    executionResults.value.unshift({
      status: 'failed',
      timestamp: new Date().toISOString(),
      error: err.message || 'Failed to execute flow'
    });
  } finally {
    executionLoading.value = false;
  }
}

async function shareFlow() {
  if (!shareEmail.value) return;
  
  shareLoading.value = true;
  
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock success
    console.log(`Shared with ${shareEmail.value} (${sharePermission.value})`);
    
    // Close modal and reset form
    showShareModal.value = false;
    shareEmail.value = '';
    sharePermission.value = 'read';
  } catch (err) {
    console.error('Failed to share flow:', err);
  } finally {
    shareLoading.value = false;
  }
}
</script>

<style scoped>
.flow-detail {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.flow-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.flow-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
}

.flow-header h1 {
  margin: 0 0 0.5rem 0;
  color: var(--primary-color);
}

.flow-description {
  color: var(--text-secondary);
  max-width: 600px;
}

.flow-actions {
  display: flex;
  gap: 1rem;
}

.flow-info {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-label {
  font-weight: 500;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.info-value {
  font-size: 1rem;
}

.permission {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  text-transform: capitalize;
}

.permission.owner {
  background-color: var(--primary-bg);
  color: var(--primary-color);
}

.permission.read, .permission.write {
  background-color: var(--bg-light);
  color: var(--text-secondary);
}

.flow-tag {
  display: inline-block;
  background-color: var(--bg-light);
  color: var(--text-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
}

.loading, .not-found, .error-message {
  text-align: center;
  padding: 3rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.error-message {
  background-color: var(--error-bg);
  color: var(--error-color);
}

.results-section {
  margin-top: 1rem;
}

.results-section h2 {
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.result-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.result-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.result-status {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.result-status.completed {
  background-color: var(--success-bg);
  color: var(--success-color);
}

.result-status.failed {
  background-color: var(--error-bg);
  color: var(--error-color);
}

.result-status.running {
  background-color: #FFF8E1;
  color: #FFA000;
}

.result-timestamp {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.result-content {
  background-color: var(--bg-light);
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}

.result-content pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: monospace;
}

.result-error {
  color: var(--error-color);
  padding: 1rem;
  background-color: var(--error-bg);
  border-radius: 4px;
}

.btn-primary, .btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
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
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

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

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1rem;
}

.form-error {
  color: var(--error-color);
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

.radio-group {
  display: flex;
  gap: 1.5rem;
  margin-top: 0.5rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}
</style> 