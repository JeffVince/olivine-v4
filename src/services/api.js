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
    this.ws = null;
    this.flowSubscriptions = new Map();
  }

  // Auth methods
  setAuthToken(token) {
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete this.api.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
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
    this.disconnectWebSocket();
  }

  // Flow methods
  async getFlows() {
    const response = await this.api.get('/api/flows');
    return response.data;
  }

  async getFlow(flowId) {
    const response = await this.api.get(`/api/flows/${flowId}`);
    return response.data;
  }

  async createFlow(flowData) {
    const response = await this.api.post('/api/flows', flowData);
    return response.data;
  }

  async updateFlow(flowId, flowData) {
    const response = await this.api.put(`/api/flows/${flowId}`, flowData);
    return response.data;
  }

  async deleteFlow(flowId) {
    await this.api.delete(`/api/flows/${flowId}`);
  }

  // WebSocket methods
  connectWebSocket() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.ws = new WebSocket(`${WS_URL}?token=${token}`);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      // Resubscribe to flows
      this.flowSubscriptions.forEach((callback, flowId) => {
        this.subscribeToFlow(flowId, callback);
      });
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'flow_result') {
        const callback = this.flowSubscriptions.get(data.flowId);
        if (callback) {
          callback(data.data);
        }
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after delay
      setTimeout(() => this.connectWebSocket(), 5000);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.flowSubscriptions.clear();
  }

  subscribeToFlow(flowId, callback) {
    this.flowSubscriptions.set(flowId, callback);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe_flow',
        flowId
      }));
    }
  }

  unsubscribeFromFlow(flowId) {
    this.flowSubscriptions.delete(flowId);
  }

  // Flow execution
  async triggerFlow(flowId, inputs) {
    const response = await this.api.post(`/api/flows/${flowId}/trigger`, { inputs });
    return response.data;
  }

  // Flow templates
  async getFlowTemplates() {
    const response = await this.api.get('/api/flows/templates');
    return response.data;
  }

  async createFlowFromTemplate(templateId, customization) {
    const response = await this.api.post(`/api/flows/templates/${templateId}`, customization);
    return response.data;
  }
}

export default new ApiService(); 