<template>
  <div class="integrations-page">
    <header>
      <h1>Integrations</h1>
      <button @click="refreshIntegrations" class="btn-secondary">Refresh</button>
    </header>

    <div v-if="loading" class="loading">
      <p>Loading integrations...</p>
    </div>

    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>
    
    <div v-else class="integration-grid">
      <!-- Example Integration Card -->
      <div class="integration-card">
        <div class="integration-logo" style="background-color: #007ee5;">
          <!-- Dropbox logo placeholder -->
        </div>
        <div class="integration-info">
          <h3>Dropbox</h3>
          <p>Connect your Dropbox account to access files.</p>
        </div>
        <div class="integration-action">
          <button 
            v-if="isConnected('dropbox')"
            @click="disconnectService('dropbox')" 
            class="btn-danger"
          >
            Disconnect
          </button>
          <button 
            v-else
            @click="connectService('dropbox')" 
            class="btn-primary"
          >
            Connect
          </button>
        </div>
      </div>

      <!-- Example Integration Card -->
      <div class="integration-card">
        <div class="integration-logo" style="background-color: #ea4335;">
          <!-- Google Drive logo placeholder -->
        </div>
        <div class="integration-info">
          <h3>Google Drive</h3>
          <p>Connect your Google Drive account.</p>
        </div>
        <div class="integration-action">
          <button 
            v-if="isConnected('gdrive')"
            @click="disconnectService('gdrive')" 
            class="btn-danger"
          >
            Disconnect
          </button>
          <button 
            v-else
            @click="connectService('gdrive')" 
            class="btn-primary"
          >
            Connect
          </button>
        </div>
      </div>

      <!-- Example Integration Card -->
      <div class="integration-card">
        <div class="integration-logo" style="background-color: #000000;">
          <!-- Notion logo placeholder -->
        </div>
        <div class="integration-info">
          <h3>Notion</h3>
          <p>Connect your Notion workspace.</p>
        </div>
        <div class="integration-action">
          <button 
            v-if="isConnected('notion')"
            @click="disconnectService('notion')" 
            class="btn-danger"
          >
            Disconnect
          </button>
          <button 
            v-else
            @click="connectService('notion')" 
            class="btn-primary"
          >
            Connect
          </button>
        </div>
      </div>

      <!-- Add more integration cards here -->
    </div>

    <!-- Setup Modal Placeholder -->
    <div v-if="showSetupModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Connect {{ selectedService }}</h2>
          <button class="btn-close" @click="showSetupModal = false">×</button>
        </div>
        <div class="modal-body">
          <p>Integration setup for {{ selectedService }} will go here.</p>
          <p>(OAuth flow or API key input)</p>
          <div class="form-actions">
            <button @click="showSetupModal = false" class="btn-secondary">Cancel</button>
            <button @click="handleConnect" class="btn-primary">Connect</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

// Reactive state
const loading = ref(false);
const error = ref(null);
const integrations = ref({}); // Store connection status, e.g., { dropbox: true, notion: false }
const showSetupModal = ref(false);
const selectedService = ref(null);

// Lifecycle hooks
onMounted(async () => {
  await loadIntegrations();
});

// Methods
async function loadIntegrations() {
  loading.value = true;
  error.value = null;
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    integrations.value = {
      dropbox: false,
      gdrive: true, // Example: GDrive is already connected
      notion: false,
    };
  } catch (err) {
    console.error('Failed to load integrations:', err);
    error.value = 'Failed to load integration statuses.';
  } finally {
    loading.value = false;
  }
}

function isConnected(service) {
  return integrations.value[service] === true;
}

function connectService(service) {
  selectedService.value = service;
  showSetupModal.value = true;
}

function disconnectService(service) {
  if (confirm(`Are you sure you want to disconnect ${service}?`)) {
    // Simulate API call
    integrations.value[service] = false;
    console.log(`Disconnected ${service}`);
  }
}

function handleConnect() {
  // Simulate connecting the service (OAuth or saving API key)
  console.log(`Connecting ${selectedService.value}...`);
  integrations.value[selectedService.value] = true;
  showSetupModal.value = false;
}

function refreshIntegrations() {
  loadIntegrations();
}
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

h1 {
  margin: 0;
  color: var(--primary-color);
}

.integration-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.integration-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  padding: 1.5rem;
  gap: 1rem;
}

.integration-logo {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  flex-shrink: 0;
  /* Basic placeholder style */
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
}

.integration-info {
  flex-grow: 1;
}

.integration-info h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
}

.integration-info p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.integration-action {
  flex-shrink: 0;
}

.btn-primary, .btn-secondary, .btn-danger {
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

.btn-danger {
  background-color: var(--error-bg);
  color: var(--error-color);
  border: 1px solid var(--error-color);
}

.btn-danger:hover {
  background-color: var(--error-color);
  color: white;
}

/* Modal styles - reuse from other components */
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
  max-width: 450px;
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
</style> 