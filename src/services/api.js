import axios from 'axios';

// Get the API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL;

// Log the API URL to help with debugging
console.log('API URL:', API_URL);

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      withCredentials: false
    });
    // Add interceptor to automatically add Authorization header
    this.api.interceptors.request.use(config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    }, error => {
        return Promise.reject(error);
    });
    
    // NOTE: The WebSocket connection logic previously here might be better handled 
    //       by streamingService.js directly, or needs careful state management 
    //       if kept within ApiService alongside REST calls.
    //       Removing WS properties from here for now to avoid confusion.
    // this.ws = null; 
    // this.flowSubscriptions = new Map();
  }

  // Auth methods
  setAuthToken(token) {
    if (token) {
      // Header is now set via interceptor, just store token
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    // Re-initialize Axios instance or clear defaults if needed upon logout,
    // although interceptor handles adding header based on localStorage presence.
  }

  // Alias for backward compatibility
  setAuthHeader(token) {
    this.setAuthToken(token);
  }

  // Alias for backward compatibility
  clearAuthHeader() {
    this.setAuthToken(null);
  }

  async login(email, password) {
    console.log('Login request to:', `${API_URL}/api/auth/login`);
    const response = await this.api.post('/api/auth/login', { email, password });
    this.setAuthToken(response.data.token);
    return response.data;
  }

  async signup(email, password) {
    console.log('Signup request to:', `${API_URL}/api/auth/signup`);
    const response = await this.api.post('/api/auth/signup', { email, password });
    return response.data;
  }

  async directSignup(email, password) {
    console.log('Direct signup request to:', `${API_URL}/api/direct-signup`);
    const response = await this.api.post('/api/direct-signup', { email, password });
    return response.data;
  }

  async verifyEmail(token) {
    const response = await this.api.post('/api/auth/verify-email', { token });
    return response.data;
  }

  logout() {
    this.setAuthToken(null);
    // Disconnect WebSocket if managed elsewhere (e.g., streamingService)
    // streamingService.disconnect(); 
  }

  // Agent/Flow methods (Now pointing to actual Agent API endpoints)
  async getFlows() { // Fetches Agents
    // TODO: Update route name if needed (currently GET /api/flows -> frontend GET /api/agents)
    const response = await this.api.get('/api/agents'); 
    return response.data;
  }

  async getFlow(agentId) { // Fetches specific Agent details
    // TODO: Update route name if needed (currently GET /api/flows/{id} -> frontend GET /api/agents/{id})
    const response = await this.api.get(`/api/agents/${agentId}`);
    return response.data;
  }

  async createFlow(flowData) { // Generic Agent creation - Less likely used?
    // TODO: Update route name if needed 
    const response = await this.api.post('/api/agents', flowData); 
    return response.data;
  }

  async updateFlow(agentId, agentData) { // Updates Agent
    // TODO: Update route name if needed
    const response = await this.api.put(`/api/agents/${agentId}`, agentData);
    return response.data;
  }

  async deleteFlow(agentId) { // Deletes Agent
    // TODO: Update route name if needed
    await this.api.delete(`/api/agents/${agentId}`);
    // Return status or confirmation if needed
  }

  // Agent & Conversation methods (Now using actual API calls)
  async getAgentConversations(agentId) {
    // TODO: Verify this endpoint exists on the backend
    const response = await this.api.get(`/api/agents/${agentId}/conversations`);
    return response.data;
  }

  async createAgentConversation(agentId, conversationData) {
    // TODO: Verify this endpoint exists on the backend
    const response = await this.api.post(`/api/agents/${agentId}/conversations`, conversationData);
    return response.data;
  }

  async getConversationMessages(conversationId) {
    // TODO: Verify this endpoint exists on the backend
    const response = await this.api.get(`/api/conversations/${conversationId}/messages`);
    return response.data;
  }

  async createMessage(conversationId, messageData) {
    // TODO: Verify this endpoint exists on the backend (and if it's needed)
     // This might not be needed if the backend/flow execution handles message persistence.
     const response = await this.api.post(`/api/conversations/${conversationId}/messages`, messageData);
     return response.data;
  }

  // Flow templates (Now using actual API calls)
  async getFlowTemplates() {
    // Call the endpoint to get available Langflow templates
    console.log('Fetching flow templates from:', `${API_URL}/api/flows/templates`);
    const response = await this.api.get('/api/flows/templates');
    return response.data;
  }

  async createFlowFromTemplate(templateId, customization) {
    // Create an agent from a Langflow template
    console.log('Creating agent from template:', templateId, customization);
    const requestBody = {
      templateId: templateId,
      ...customization
    };
    // Use the proper endpoint for creating an agent from a template
    const response = await this.api.post(`/api/agents/fromTemplate`, requestBody);
    return response.data;
  }
  
   // Integrations / Credentials (Implement as needed)
   async getCredentials() {
       // TODO: Verify this endpoint exists on the backend
       // console.warn("API CALL [PLACEHOLDER]: GET /api/integrations/credentials");
       // await new Promise(resolve => setTimeout(resolve, 300));
       // return [{id: 'cred1', type: 'API Key', name: 'Mock OpenAI Key', created_at: new Date().toISOString()}];
       const response = await this.api.get('/api/integrations/credentials');
       return response.data;
   }
   
   async createApiKey(keyData) {
       // TODO: Replace with actual API call: POST /api/integrations/api-keys
       console.warn("API CALL [PLACEHOLDER]: POST /api/integrations/api-keys", keyData);
       await new Promise(resolve => setTimeout(resolve, 500));
       return {id: `key-${Date.now()}`, type: 'API Key', ...keyData, created_at: new Date().toISOString()};
   }
   
   async deleteCredential(credentialId) {
       // TODO: Replace with actual API call: DELETE /api/integrations/credentials/{credentialId}
       console.warn(`API CALL [PLACEHOLDER]: DELETE /api/integrations/credentials/${credentialId}`);
       await new Promise(resolve => setTimeout(resolve, 200));
       return { success: true };
   }
   
   async startOAuthFlow(provider) {
        // TODO: Replace with actual API call: GET /api/integrations/oauth/start?provider={provider}
        // This endpoint should return the redirect URL
        console.warn(`API CALL [PLACEHOLDER]: GET /api/integrations/oauth/start?provider=${provider}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        // Simulate redirect URL - in reality, the backend provides this
        return { redirectUrl: `/login?mock_oauth_provider=${provider}` }; 
   }

}

export default new ApiService(); 