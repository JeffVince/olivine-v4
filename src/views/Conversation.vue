<template>
  <div class="conversation-page">
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>Conversations</h2>
        <button @click="startNewConversation" title="New conversation" :disabled="agentLoading">
          +
        </button>
      </div>

      <!-- Conversations Loading/Error State -->
      <div v-if="conversationsLoading" class="sidebar-loading">
          <div class="spinner small"></div>
      </div>
      <div v-else-if="error && !conversations.length" class="sidebar-error">
         <p>{{ error }}</p> 
         <button @click="loadConversations" class="btn-secondary btn-sm">Retry</button>
      </div>

      <div class="conversation-list" :class="{ dimmed: conversationsLoading }">
        <button
          v-for="conv in conversations"
          :key="conv.id"
          @click="selectConversation(conv)"
          class="conversation-item"
          :class="{ active: currentConversation?.id === conv.id }"
          :disabled="messagesLoading || conversationsLoading" 
        >
          <div class="conv-title">{{ conv.title || 'Untitled Conversation' }}</div>
          <div class="conv-date">{{ formatDate(conv.created_at) }}</div>
        </button>
         <div v-if="!conversationsLoading && !error && conversations.length === 0" class="sidebar-empty">
             No conversations yet.
         </div>
      </div>
    </div>

    <div class="main-content">
       <!-- Agent Loading State -->
       <div v-if="agentLoading" class="loading-overlay centered">
           <div class="spinner"></div>
           <p>Loading Agent...</p>
       </div>
       
      <header class="conversation-header">
         <!-- Display general error if agent failed to load -->
         <div v-if="error && !currentAgent" class="alert alert-danger">
             {{ error }}
         </div>
         <!-- Agent Info and Settings Link -->
        <div v-else-if="currentAgent" class="agent-info-header">
          <div>
            <h1>{{ currentAgent.name }}</h1>
            <p>{{ currentAgent.description }}</p>
          </div>
          <router-link 
            :to="`/agents/${agentId}/settings`"
            class="btn-secondary btn-settings"
            title="Agent Settings"
          >
            ⚙️ Settings
          </router-link>
        </div>
        <div v-else-if="!agentLoading">
          <!-- Only show if not loading and no agent -->
          <h1>Select or Create a Conversation</h1>
        </div>
        <!-- Add Credential Selector Here -->
        <div class="credential-selector" v-if="currentAgent">
            <label for="convIntegrationSelect">Credential:</label>
            <select id="convIntegrationSelect" v-model="selectedIntegrationId" :disabled="integrationsLoading || typing">
                <option disabled value="">{{ integrationsLoading ? 'Loading...' : '-- Select --' }}</option>
                <option
                    v-for="integration in availableIntegrations"
                    :key="integration.id"
                    :value="integration.id"
                    :disabled="integration.status !== 'active' && integration.status !== 'connected'"
                >
                    {{ integration.name || integration.service_name }} ({{ integration.type }})
                    <template v-if="integration.status !== 'active' && integration.status !== 'connected'">
                        [{{ integration.status }}]
                    </template>
                </option>
            </select>
            <small v-if="!integrationsLoading && availableIntegrations.length === 0">
                <router-link to="/integrations">Add Credential</router-link>
            </small>
            <small v-if="integrationError" class="form-error">{{ integrationError }}</small>
        </div>
      </header>
      
      <!-- Display error related to message loading or sending -->
       <div v-if="error && currentConversation" class="alert alert-danger message-area-error">
           {{ error }}
       </div>

      <div ref="messagesContainer" class="messages-area">
         <!-- Messages Loading State -->
         <div v-if="messagesLoading" class="loading-overlay centered">
             <div class="spinner"></div>
             <p>Loading Messages...</p>
         </div>
         
        <template v-if="currentConversation">
          <!-- Messages loop -->
          <div v-for="message in currentMessages" :key="message.id" class="message-wrapper">
            <div
              class="message-bubble"
              :class="[
                  'message-' + message.role,
                  { 'message-error-bubble': message.role === 'error' } // Style error messages
              ]"
            >
              <div class="message-content">{{ message.content }}</div>
              <div class="message-timestamp">{{ formatTime(message.timestamp) }}</div>
            </div>
          </div>

          <!-- Typing indicator -->
          <div v-if="typing" class="message-wrapper">
            <div class="message-bubble message-assistant typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </template>

        <div v-else-if="!agentLoading && !messagesLoading" class="no-conversation">
           <p v-if="currentAgent">Select a conversation from the sidebar or start a new one.</p>
           <p v-else>Agent details could not be loaded.</p>
        </div>
      </div>

      <div class="input-area">
        <form @submit.prevent="sendMessage">
          <input
            v-model="newMessage"
            type="text"
            placeholder="Type your message..."
            :disabled="!currentConversation || typing || messagesLoading || agentLoading || !currentAgent"
          />
          <button
            type="submit"
            :disabled="!currentConversation || !newMessage.trim() || typing || messagesLoading || agentLoading || !currentAgent"
            class="btn-primary"
          >
            Send
          </button>
        </form>
      </div>
    </div>
    
    <!-- New Conversation Modal (Simplified) -->
    <div v-if="showNewConversationModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Start New Conversation</h2>
          <button class="btn-close" @click="closeNewConversationModal">×</button>
        </div>
        <div class="modal-body">
          <p>Starting a new conversation with agent: {{ currentAgent?.name }}</p>
          <div class="form-actions">
            <button @click="createConversation" class="btn-primary">Confirm</button>
            <button @click="closeNewConversationModal" class="btn-secondary">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import apiService from '@/services/api'; // Import ApiService
import { useAuthStore } from '@/store/auth'; // May need for token/user info
import axios from 'axios'; // Use axios for API calls

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore(); // Get auth store instance

// State
const messagesContainer = ref(null);
const newMessage = ref('');
const typing = ref(false); // Will be controlled by streaming later
const conversations = ref([]);
const currentConversation = ref(null);
const currentMessages = ref([]);
const showNewConversationModal = ref(false);
const currentAgent = ref(null); // Stores agent details
const agentLoading = ref(true); // Loading state for agent details
const conversationsLoading = ref(false); // Loading state for conversations list
const messagesLoading = ref(false); // Loading state for messages
const error = ref(null); // General error display
const eventSource = ref(null); // Reference to the EventSource instance
let currentExecutionId = ref(null); // Track the ID for matching SSE messages
const selectedIntegrationId = ref(''); // Credential selected for this conversation
const availableIntegrations = ref([]);
const integrationsLoading = ref(false);
const integrationError = ref(null);

// Computed
const agentId = computed(() => route.params.agentId);
const conversationIdParam = computed(() => route.params.conversationId);
const authToken = computed(() => authStore.token || localStorage.getItem('token')); // Get token from store or localStorage

// Methods
function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString();
}

function formatTime(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function loadAgentDetails() {
  agentLoading.value = true;
  error.value = null;
  currentAgent.value = null;
  console.log(`Loading agent details for ID: ${agentId.value}`);
  try {
    // Replace mock with API call
    // Assumes GET /api/flows/{id} fetches Agent details
    const agentData = await apiService.getFlow(agentId.value); 
    currentAgent.value = agentData; // Store the fetched agent data
    console.log('Agent details loaded:', currentAgent.value);
    // TODO: Ensure agentData contains the underlying langflowFlowId needed for execution
  } catch (err) {
    console.error('Failed to load agent details:', err);
    error.value = 'Failed to load agent details.';
    if (err.response?.data?.detail) {
        error.value += ` ${err.response.data.detail}`;
    }
    // Handle navigation or UI update if agent load fails
  } finally {
    agentLoading.value = false;
  }
}

async function loadConversations() {
  if (!agentId.value) return;
  conversationsLoading.value = true;
  error.value = null;
  conversations.value = []; // Clear previous list
  console.log(`Loading conversations for agent ID: ${agentId.value}`);
  try {
    // Replace mock with API call
    // Assumes GET /api/agents/{agentId}/conversations exists
    const fetchedConversations = await apiService.getAgentConversations(agentId.value); // Needs implementation in apiService
    conversations.value = fetchedConversations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Sort newest first
    console.log('Conversations loaded:', conversations.value);

    // Auto-select conversation based on URL or default
    if (conversationIdParam.value) {
      const foundConv = conversations.value.find(c => c.id === conversationIdParam.value);
      if (foundConv) {
        // Avoid infinite loop if already selected
        if (currentConversation.value?.id !== foundConv.id) {
           await selectConversation(foundConv, false); // Don't push route again if already correct
        } else if (!currentMessages.value.length) {
            // If it's the current one but messages are empty, load them
            await loadMessages(foundConv.id);
        }
      } else {
        console.warn('Conversation ID from URL not found:', conversationIdParam.value);
         // Clear conversation state if URL ID is invalid
         currentConversation.value = null;
         currentMessages.value = [];
         router.replace(`/agents/${agentId.value}/chat`); // Go back to agent base chat URL
      }
    } else {
       // No specific conversation selected, clear message area
       currentConversation.value = null;
       currentMessages.value = [];
    }
  } catch (err) {
    console.error('Failed to load conversations:', err);
    error.value = 'Failed to load conversations.';
     if (err.response?.data?.detail) {
        error.value += ` ${err.response.data.detail}`;
    }
  } finally {
    conversationsLoading.value = false;
  }
}

async function selectConversation(conv, pushRoute = true) {
  if (!conv || currentConversation.value?.id === conv.id) {
     // If clicking the already selected conversation, reload messages if needed
     if (currentConversation.value?.id === conv.id && currentMessages.value.length === 0) {
         await loadMessages(conv.id);
     }
     return; // Don't reload if already selected and messages are loaded
  }
  
  console.log('Selecting conversation:', conv.id);
  currentConversation.value = conv;
  currentMessages.value = []; // Clear messages before loading new ones
  
  if (pushRoute) {
    router.push(`/agents/${agentId.value}/chat/${conv.id}`); // Update URL only if navigating via click
  }
  
  await loadMessages(conv.id);
  scrollToBottom();
}

async function loadMessages(convId) {
  if (!convId) return;
  messagesLoading.value = true;
  error.value = null;
  console.log(`Loading messages for conversation ID: ${convId}`);
  try {
    // Replace mock with API call
    // Assumes GET /api/conversations/{conversationId}/messages exists
    const fetchedMessages = await apiService.getConversationMessages(convId); // Needs implementation in apiService
    currentMessages.value = fetchedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); // Sort oldest first
    console.log('Messages loaded:', currentMessages.value);
  } catch (err) {
    console.error('Failed to load messages:', err);
    error.value = 'Failed to load messages.';
     if (err.response?.data?.detail) {
        error.value += ` ${err.response.data.detail}`;
    }
    currentMessages.value = []; // Clear messages on error
  } finally {
    messagesLoading.value = false;
    await nextTick();
    scrollToBottom();
  }
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

// Fetch available integrations (similar to FlowDetail, maybe centralize later)
async function loadIntegrations() {
  if (!authToken.value) {
      integrationError.value = 'Authentication required to load credentials.';
      return;
  }
  integrationsLoading.value = true;
  integrationError.value = null;
  try {
    const response = await axios.get('/api/integrations', {
      headers: { 'Authorization': `Bearer ${authToken.value}` }
    });
    availableIntegrations.value = response.data;
    // TODO: Add logic to pre-select an integration if one is associated with the agent/conversation
    // Example: if (currentAgent.value?.defaultIntegrationId) { selectedIntegrationId.value = currentAgent.value.defaultIntegrationId } 
  } catch (err) {
    console.error('Failed to load integrations:', err);
    integrationError.value = err.response?.data?.message || 'Failed to load credentials.';
    availableIntegrations.value = [];
  } finally {
    integrationsLoading.value = false;
  }
}

// --- Send Message & SSE Handling ---
async function sendMessage() {
  if (!newMessage.value.trim() || !currentConversation.value || typing.value) return;
  if (!currentAgent.value?.flowId) {
      error.value = "Cannot send message: Agent's underlying Flow ID is missing.";
      return;
  }

  const userMessageContent = newMessage.value;
  newMessage.value = ''; // Clear input immediately

  const tempMessageId = `temp-${Date.now()}`;
  const userMessage = {
    id: tempMessageId,
    role: 'user',
    content: userMessageContent,
    timestamp: new Date().toISOString(),
    conversation_id: currentConversation.value.id
  };
  currentMessages.value.push(userMessage);

  await nextTick(scrollToBottom);

  typing.value = true;
  error.value = null;
  closeEventSource(); // Close any previous connection before starting new one
  currentExecutionId.value = crypto.randomUUID(); // Generate a unique ID for this request

  let assistantMessageBuffer = '';
  let currentAssistantMessageId = null;

  try {
    if (!authToken.value) {
      throw new Error('Authentication token not found.');
    }

    // *** Check if an integration is selected ***
    if (!selectedIntegrationId.value) {
        error.value = "Please select a credential to use for this agent.";
        // Maybe highlight the dropdown
        return;
    }

    // Prepare payload for the backend endpoint
    const payload = {
        flowId: currentAgent.value.flowId,
        integrationId: selectedIntegrationId.value, // *** Use selected ID ***
        inputVariables: { 
            input_value: userMessageContent, 
            conversation_id: currentConversation.value.id 
        },
        stream: true, 
        // overrideFieldName: '...' // Keep possibility if needed
    };
    
    // No longer need the check/throw for missing integrationId here

    console.log(`Calling /api/flows/execute with integration ${payload.integrationId}`);

    // --- Use EventSource for SSE --- 
    eventSource.value = new EventSource('/api/flows/execute', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken.value}`,
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
        },
        body: JSON.stringify(payload),
        // withCredentials: true // Only if needed and CORS configured
    });

    eventSource.value.onopen = () => {
      console.log(`SSE connection opened for execution ${currentExecutionId.value}`);
    };

    eventSource.value.onerror = (err) => {
      console.error(`SSE error for execution ${currentExecutionId.value}:`, err);
      let errorMessage = 'Connection error during flow execution.';
       // EventSource errors don't give HTTP status directly, need backend error events
       // We rely on the 'error' event below or the backend sending a specific message.
       if (!typing.value) return; // Avoid duplicate errors if stream already closed
       
       addErrorMessageToChat(errorMessage);
       typing.value = false;
       closeEventSource(); // Close on error
       currentExecutionId.value = null;
    };

    eventSource.value.addEventListener('message', (event) => {
        // Standard message event from SSE
        console.log("SSE Raw Data:", event.data);
        
        // 1. Ignore keepalive messages
        if (event.data === 'keepalive') {
            return;
        }

        try {
            let parsedData;
            let isLogMessage = false;
            let potentialChunk = null;

            // 2. Try parsing as JSON
            try {
                parsedData = JSON.parse(event.data);

                // 3. Check if it matches the log message format { "timestamp": "log string" }
                const keys = Object.keys(parsedData);
                if (keys.length === 1 && /^[0-9]{10,}$/.test(keys[0])) { // Check if key is a long number (timestamp)
                    isLogMessage = true;
                    console.log("SSE Log:", parsedData[keys[0]]); // Log internally
                } else {
                    // It's JSON, but not the log format. Treat as potential output.
                    // *** ASSUMPTION: Look for output in common fields ***
                    // *** Adjust these fields based on actual Langflow output format ***
                    potentialChunk = parsedData?.outputs?.output?.result || 
                                     parsedData?.result || 
                                     parsedData?.message || 
                                     parsedData?.output || 
                                     parsedData?.chunk; 
                    // If the whole object is the result (less likely for chunks)
                    if (potentialChunk === undefined && typeof parsedData === 'object') {
                         // Maybe the whole object is relevant? Unlikely for streams.
                         // potentialChunk = JSON.stringify(parsedData);
                    }
                }
            } catch (e) {
                // Parsing failed - maybe it's a plain text chunk?
                if (typeof event.data === 'string') {
                    potentialChunk = event.data;
                    console.log("SSE received non-JSON data, treating as chunk:", potentialChunk);
                } else {
                    console.warn("Received non-string, non-JSON SSE data:", event.data);
                    return; // Ignore if not string or JSON
                }
            }

            // 4. Process if it's not a log message and we found a potential chunk
            if (!isLogMessage && potentialChunk !== null && potentialChunk !== undefined) {
                 // Ensure we only process strings
                 const chunkText = (typeof potentialChunk === 'object') 
                                    ? JSON.stringify(potentialChunk) // Stringify if it's an object itself
                                    : String(potentialChunk); // Convert to string otherwise

                 typing.value = true; // Keep typing indicator on
                 if (!currentAssistantMessageId) {
                     // First chunk
                     currentAssistantMessageId = `msg-${Date.now()}-assistant`;
                     assistantMessageBuffer = chunkText;
                     currentMessages.value.push({
                         id: currentAssistantMessageId,
                         role: 'assistant',
                         content: assistantMessageBuffer,
                         timestamp: new Date().toISOString(),
                         conversation_id: currentConversation.value.id
                     });
                 } else {
                     // Append chunk
                     assistantMessageBuffer += chunkText;
                     const msgIndex = currentMessages.value.findIndex(m => m.id === currentAssistantMessageId);
                     if (msgIndex !== -1) {
                         currentMessages.value[msgIndex].content = assistantMessageBuffer;
                     }
                 }
                 nextTick(scrollToBottom);
             } else if (!isLogMessage) {
                  // Parsed as JSON, wasn't a log, but didn't find a recognized chunk field
                  console.warn("Received SSE JSON message in unknown format:", parsedData);
             }

        } catch (processingError) {
            console.error('Error processing SSE message:', processingError, 'Raw data:', event.data);
             addErrorMessageToChat('Error processing flow response.');
        }
    });

    eventSource.value.addEventListener('end', (event) => {
        // Custom event from backend signalling end of stream
        console.log(`SSE stream ended via 'end' event for execution ${currentExecutionId.value}:`, event.data);
        typing.value = false;
        closeEventSource();
        currentExecutionId.value = null;
        // Reset buffer/message ID if needed
        assistantMessageBuffer = '';
        currentAssistantMessageId = null;
    });
    
    eventSource.value.addEventListener('error_event', (event) => {
        // Custom event from backend signalling an error during stream
         let errorMessage = 'An error occurred during flow execution.';
         try {
             const errorData = JSON.parse(event.data);
             errorMessage = errorData.message || errorMessage;
         } catch { /* Use default message */ }
         
         console.error(`SSE stream error via 'error_event' for execution ${currentExecutionId.value}:`, errorMessage);
         addErrorMessageToChat(`Flow Error: ${errorMessage}`);
         typing.value = false;
         closeEventSource();
         currentExecutionId.value = null;
    });

  } catch (err) {
      // This catch block handles errors *before* the EventSource connection is established
      // or errors thrown synchronously (like auth error, credential selection error)
      console.error('Failed to initiate flow execution:', err);
      const errorMessage = err.message || 'Failed to start flow execution';
      addErrorMessageToChat(`Error: ${errorMessage}`);
      typing.value = false;
      closeEventSource(); // Ensure cleanup if error happens early
      currentExecutionId.value = null;
      await nextTick(scrollToBottom);
  }
}

function addErrorMessageToChat(message) {
    if (!currentConversation.value) return;
     currentMessages.value.push({
        id: `error-${Date.now()}`,
        role: 'error',
        content: message,
        timestamp: new Date().toISOString(),
        conversation_id: currentConversation.value.id
    });
    nextTick(scrollToBottom);
}

// --- Cleanup EventSource --- 
function closeEventSource() {
  if (eventSource.value) {
    console.log('Closing existing SSE connection.');
    eventSource.value.close();
    eventSource.value = null;
  }
}

// Lifecycle and watchers
onMounted(async () => {
  console.log('Conversation component mounted.');
  console.log('Route params:', route.params);
  await loadAgentDetails();
  if (currentAgent.value) { 
     await loadConversations();
     await loadIntegrations(); // Load integrations after agent details
  }
});

watch(agentId, async (newAgentId, oldAgentId) => {
  if (newAgentId && newAgentId !== oldAgentId) {
    console.log(`Agent ID changed. Reloading.`);
    closeEventSource(); // Close SSE connection if agent changes
    currentConversation.value = null;
    currentMessages.value = [];
    error.value = null;
    await loadAgentDetails();
     if (currentAgent.value) {
        await loadConversations();
        await loadIntegrations(); // Reload integrations for new agent
        selectedIntegrationId.value = ''; // Reset selection
    }
  }
});

watch(currentConversation, (newConv, oldConv) => {
    if (newConv?.id !== oldConv?.id) {
        console.log(`Conversation changed.`);
        closeEventSource(); // Close SSE connection if conversation changes
        currentExecutionId.value = null; 
        typing.value = false; 
    }
});

// Watch route changes for conversation ID specifically
watch(conversationIdParam, async (newConvId, oldConvId) => {
    if (newConvId && newConvId !== oldConvId && newConvId !== currentConversation.value?.id) {
        console.log(`Conversation ID param changed to: ${newConvId}. Selecting conversation.`);
        const foundConv = conversations.value.find(c => c.id === newConvId);
        if (foundConv) {
            await selectConversation(foundConv, false); // Select without pushing route again
        } else {
            console.warn(`Conversation ID ${newConvId} not found in list after param change.`);
            // Maybe reload conversations? Or handle as error?
            await loadConversations(); // Reload conversations if URL changes to an unknown ID
        }
    } else if (!newConvId && oldConvId) {
        // Navigated away from a specific conversation URL back to the base agent chat URL
        console.log("Conversation ID removed from URL.");
        currentConversation.value = null;
        currentMessages.value = [];
        // unsubscribeFromCurrentFlow(); // Maybe keep subscription if agent is the same? TBD.
    }
});


watch(currentMessages, () => {
  // Ensure scroll stays at bottom when messages are added/updated
  nextTick(scrollToBottom);
}, { deep: true }); // Use deep watch if message objects might be modified internally

// Cleanup on unmount
import { onBeforeUnmount } from 'vue';
onBeforeUnmount(() => {
    console.log("Conversation component unmounting. Closing SSE connection.");
    closeEventSource(); 
});

</script>

<style scoped>
.conversation-page {
  display: flex;
  height: calc(100vh - 70px); /* Adjust for navbar height */
}

.sidebar {
  width: 280px;
  background-color: var(--bg-light);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-header h2 {
  font-size: 1.1rem;
  font-weight: 600;
}

.sidebar-header button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.conversation-item {
  width: 100%;
  text-align: left;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  background: none;
  border: none;
  cursor: pointer;
  margin-bottom: 0.25rem;
}

.conversation-item:hover {
  background-color: var(--border-color);
}

.conversation-item.active {
  background-color: var(--primary-bg);
}

.conv-title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-date {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: white;
}

.conversation-header {
  /* Update header to allow space for button */
  display: flex;
  justify-content: space-between; /* Push items to ends */
  align-items: center; /* Align items vertically */
  /* Existing padding/border */
  height: 60px;
  padding: 0 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.agent-info-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%; /* Take full width */
}

.agent-info-header h1 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.agent-info-header p {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
}

.btn-settings {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    text-decoration: none; /* Remove underline from router-link */
    white-space: nowrap; /* Prevent wrapping */
}

/* Ensure alerts in header don't mess up layout */
.conversation-header .alert {
    width: 100%; /* Make alert take full width if shown alone */
    margin-left: 0;
    margin-right: 0;
}

.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.message-wrapper {
  display: flex;
  margin-bottom: 1rem;
}

.message-wrapper:has(.message-user) {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 70%;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  position: relative;
}

.message-user {
  background-color: var(--primary-color);
  color: white;
  border-bottom-right-radius: 4px;
}

.message-assistant {
  background-color: var(--bg-light);
  color: var(--text-primary);
  border-bottom-left-radius: 4px;
}

.message-error {
  background-color: #ffebee; /* Light red background */
  color: #c62828; /* Darker red text */
  border: 1px solid #e57373; /* Red border */
  border-radius: 4px;
  padding: 0.5rem 1rem;
  margin-top: 0.5rem;
}

.message-bubble.message-error {
    /* Reuse bubble style but adjust colors */
    background-color: var(--error-bg, #ffebee); 
    color: var(--error-color, #c62828);
    border: 1px solid var(--error-color, #e57373);
}

.message-content {
  word-wrap: break-word;
}

.message-timestamp {
  font-size: 0.75rem;
  margin-top: 0.5rem;
  text-align: right;
  opacity: 0.7;
}

.typing-indicator span {
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: var(--text-secondary);
  border-radius: 50%;
  margin: 0 2px;
  animation: bounce 1s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.1s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.2s;
}

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1.0); }
}

.no-conversation {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
}

.input-area {
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  background-color: white;
}

.input-area form {
  display: flex;
  gap: 0.75rem;
}

.input-area input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 1rem;
}

.input-area button {
  padding: 0.75rem 1.5rem;
  border-radius: 20px;
  font-weight: 500;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
  border: none;
  cursor: pointer;
}

.btn-primary:disabled {
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
  max-width: 400px;
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
  font-size: 1.25rem;
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
  margin-top: 1.5rem;
}

.btn-secondary {
  background-color: var(--bg-light);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 4px;
}

/* Loading indicators (optional) */
.loading-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10;
}
.spinner { /* Add a simple spinner style */
    border: 4px solid rgba(0,0,0,.1);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border-left-color: var(--primary-color);
    animation: spin 1s ease infinite;
}
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Add styles for alert */
.alert {
  padding: 0.75rem 1.25rem; /* Slightly smaller padding */
  margin-bottom: 1rem;
  border: 1px solid transparent;
  border-radius: 4px;
  width: calc(100% - 3rem); /* Adjust width based on parent padding */
  margin-left: 1.5rem;
  margin-right: 1.5rem;
}

.alert-danger {
  color: #842029;
  background-color: #f8d7da;
  border-color: #f5c2c7;
}

.message-area-error {
    margin: 0.5rem 1rem;
}

/* Loading indicators */
.loading-overlay {
    position: absolute; /* Position relative to parent */
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(255, 255, 255, 0.9); /* More opaque */
    display: flex;
    flex-direction: column; /* Stack spinner and text */
    justify-content: center;
    align-items: center;
    z-index: 10;
    color: var(--text-secondary);
    border-radius: inherit; /* Inherit border radius if parent has one */
}

.centered p {
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
     width: 24px;
     height: 24px;
     border-width: 3px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Sidebar specific loading/error */
.sidebar-loading, .sidebar-error, .sidebar-empty {
    padding: 1rem;
    text-align: center;
    color: var(--text-secondary);
}
.sidebar-error p {
    margin-bottom: 0.5rem;
}
.btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
}

.dimmed {
    opacity: 0.5;
    pointer-events: none;
}

/* Style for error message bubble */
.message-error-bubble {
    background-color: var(--danger-bg);
    color: var(--danger-color);
    border: 1px solid var(--danger-color);
}

/* Typing indicator styles */
.typing-indicator span {
  height: 8px;
  width: 8px;
  background-color: var(--text-secondary);
  border-radius: 50%;
  display: inline-block;
  margin: 0 1px;
  animation: typing 1s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1.0);
  }
}

.credential-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: 2rem; /* Add some space */
}

.credential-selector label {
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.credential-selector select {
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    border: 1px solid var(--border-color);
    background-color: white;
    min-width: 150px; /* Adjust as needed */
}

.credential-selector small {
    font-size: 0.8rem;
    color: var(--text-secondary);
}
.credential-selector small a {
    color: var(--primary-color);
    text-decoration: underline;
}
.credential-selector .form-error {
     color: var(--danger-color);
     margin-left: 0.5rem;
}

</style> 