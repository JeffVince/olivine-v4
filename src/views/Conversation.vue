<template>
  <div class="conversation-page">
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>Conversations</h2>
        <button @click="startNewConversation" title="New conversation">
          +
        </button>
      </div>

      <div class="conversation-list">
        <button
          v-for="conv in conversations"
          :key="conv.id"
          @click="selectConversation(conv)"
          class="conversation-item"
          :class="{ active: currentConversation?.id === conv.id }"
        >
          <div class="conv-title">{{ conv.title || 'Untitled Conversation' }}</div>
          <div class="conv-date">{{ formatDate(conv.created_at) }}</div>
        </button>
      </div>
    </div>

    <div class="main-content">
      <header class="conversation-header">
        <div v-if="currentAgent">
          <h1>{{ currentAgent.name }}</h1>
          <p>{{ currentAgent.description }}</p>
        </div>
        <div v-else>
          <h1>Select or Create a Conversation</h1>
        </div>
      </header>

      <div ref="messagesContainer" class="messages-area">
        <template v-if="currentConversation">
          <div v-for="message in currentMessages" :key="message.id" class="message-wrapper">
            <div
              class="message-bubble"
              :class="['message-' + message.role]"
            >
              <div class="message-content">{{ message.content }}</div>
              <div class="message-timestamp">{{ formatTime(message.timestamp) }}</div>
            </div>
          </div>

          <div v-if="typing" class="message-wrapper">
            <div class="message-bubble message-assistant typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </template>

        <div v-else class="no-conversation">
          <p>Select a conversation from the sidebar or start a new one.</p>
        </div>
      </div>

      <div class="input-area">
        <form @submit.prevent="sendMessage">
          <input
            v-model="newMessage"
            type="text"
            placeholder="Type your message..."
            :disabled="!currentConversation || typing"
          />
          <button
            type="submit"
            :disabled="!currentConversation || !newMessage.trim() || typing"
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

const route = useRoute();
const router = useRouter();

// State
const messagesContainer = ref(null);
const newMessage = ref('');
const typing = ref(false);
const conversations = ref([]);
const currentConversation = ref(null);
const currentMessages = ref([]);
const showNewConversationModal = ref(false);
const currentAgent = ref(null);

// Computed
const agentId = computed(() => route.params.agentId);
const conversationIdParam = computed(() => route.params.conversationId);

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
  // Mock agent details based on route param
  await new Promise(resolve => setTimeout(resolve, 200));
  currentAgent.value = {
    id: agentId.value,
    name: `Agent ${agentId.value}`,
    description: `Details for agent ${agentId.value}`,
    flowId: agentId.value === 'agent1' ? '1' : '2'
  };
}

async function loadConversations() {
  // Mock conversations for this agent
  await new Promise(resolve => setTimeout(resolve, 500));
  conversations.value = [
    { id: `conv1-${agentId.value}`, title: 'First Chat', created_at: new Date(Date.now() - 2*60*60*1000).toISOString() },
    { id: `conv2-${agentId.value}`, title: 'Support Request', created_at: new Date(Date.now() - 1*60*60*1000).toISOString() }
  ];
  
  // If a conversation ID is in the URL, select it
  if (conversationIdParam.value) {
    const foundConv = conversations.value.find(c => c.id === conversationIdParam.value);
    if (foundConv) {
      selectConversation(foundConv);
    } else {
      console.warn('Conversation ID from URL not found');
    }
  } else if (conversations.value.length > 0) {
    // Select the first conversation by default if none specified
    // selectConversation(conversations.value[0]);
  }
}

async function selectConversation(conv) {
  currentConversation.value = conv;
  router.push(`/agents/${agentId.value}/chat/${conv.id}`); // Update URL
  await loadMessages(conv.id);
  scrollToBottom();
}

async function loadMessages(convId) {
  // Mock messages for the selected conversation
  typing.value = true;
  await new Promise(resolve => setTimeout(resolve, 700));
  currentMessages.value = [
    { id: `msg1-${convId}`, role: 'user', content: 'Hello agent!', timestamp: new Date(Date.now() - 5*60*1000).toISOString() },
    { id: `msg2-${convId}`, role: 'assistant', content: 'Hello! How can I help you today?', timestamp: new Date(Date.now() - 4*60*1000).toISOString() }
  ];
  typing.value = false;
  await nextTick();
  scrollToBottom();
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

async function sendMessage() {
  if (!newMessage.value.trim() || !currentConversation.value) return;

  const userMessage = {
    id: `msg${Date.now()}-user`,
    role: 'user',
    content: newMessage.value,
    timestamp: new Date().toISOString()
  };
  currentMessages.value.push(userMessage);
  newMessage.value = '';
  typing.value = true;
  
  await nextTick();
  scrollToBottom();

  // Simulate agent response
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const agentResponse = {
    id: `msg${Date.now()}-assistant`,
    role: 'assistant',
    content: `This is a mock response to: "${userMessage.content}"`, // Mock response
    timestamp: new Date().toISOString()
  };
  currentMessages.value.push(agentResponse);
  typing.value = false;
  
  await nextTick();
  scrollToBottom();
}

function startNewConversation() {
  showNewConversationModal.value = true;
}

function closeNewConversationModal() {
  showNewConversationModal.value = false;
}

async function createConversation() {
  // Simulate creating a new conversation
  closeNewConversationModal();
  const newConvId = `conv${Date.now()}-${agentId.value}`;
  const newConv = {
    id: newConvId,
    title: `Chat ${conversations.value.length + 1}`,
    created_at: new Date().toISOString()
  };
  conversations.value.unshift(newConv);
  selectConversation(newConv);
}

// Lifecycle and watchers
onMounted(async () => {
  await loadAgentDetails();
  await loadConversations();
});

watch(agentId, async (newAgentId, oldAgentId) => {
  if (newAgentId && newAgentId !== oldAgentId) {
    currentConversation.value = null;
    currentMessages.value = [];
    await loadAgentDetails();
    await loadConversations();
  }
});

watch(currentMessages, () => {
  // Ensure scroll stays at bottom when messages are added
  nextTick(scrollToBottom);
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
  height: 60px;
  padding: 0 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
}

.conversation-header h1 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.conversation-header p {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
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
  background-color: var(--error-bg);
  color: var(--error-color);
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
</style> 