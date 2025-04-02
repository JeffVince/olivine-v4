import { ref } from 'vue';

class StreamingService {
  constructor() {
    this.resultsSocket = null;
    this.producerSocket = null;
    this.messageStream = ref([]);
    this.isConnected = ref(false);
    this.isConnecting = ref(false);
    this.subscriptions = new Map();
    this.connectionPromise = null;
    this.reconnectTimer = null;
    this.maxReconnectDelay = 30000; // 30 seconds max
    this.reconnectAttempts = 0;
  }

  /**
   * Connect to Astra Streaming WebSockets
   * @param {string} userId - The user ID for subscription naming
   * @param {string} token - The authentication token for Astra Streaming
   * @returns {Promise} - Resolves when connections are established
   */
  async connect(userId, token) {
    if (this.isConnecting.value) {
      return this.connectionPromise;
    }

    this.isConnecting.value = true;
    this.clearReconnectTimer();
    
    // Create a promise that will resolve when connections are ready
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // Close existing connections
        this.disconnect();
        
        // Connect to results topic (to receive flow execution updates)
        const tenant = import.meta.env.VITE_ASTRA_STREAMING_TENANT || 'default';
        const namespace = import.meta.env.VITE_ASTRA_STREAMING_NAMESPACE || 'default';
        const resultsUrl = `${import.meta.env.VITE_WS_URL}/ws/v2/consumer/persistent/${tenant}/${namespace}/flow_results/sub-${userId}?token=${token}&consumerName=web-${userId}`;
        
        this.resultsSocket = new WebSocket(resultsUrl);
        
        this.resultsSocket.onopen = () => {
          console.log('Results WebSocket connected');
          this.reconnectAttempts = 0;
        };
        
        this.resultsSocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.payload) {
              // Decode base64 payload
              const resultData = JSON.parse(atob(data.payload));
              
              // Add to message stream
              this.messageStream.value.push(resultData);
              
              // Invoke any subscribed callbacks for this flow
              if (resultData.flowId && this.subscriptions.has(resultData.flowId)) {
                this.subscriptions.get(resultData.flowId)(resultData);
              }
              
              // Acknowledge message
              if (data.messageId) {
                this.resultsSocket.send(JSON.stringify({ messageId: data.messageId, action: 'ack' }));
              }
            }
          } catch (err) {
            console.error('Error processing message:', err, event.data);
          }
        };
        
        this.resultsSocket.onerror = (error) => {
          console.error('Results WebSocket error:', error);
        };
        
        this.resultsSocket.onclose = (event) => {
          console.log('Results WebSocket closed', event.code, event.reason);
          this.isConnected.value = false;
          
          // Don't reconnect on normal closure or if intentionally disconnected
          if (event.code !== 1000 && event.code !== 1001) {
            this.scheduleReconnect(userId, token);
          }
        };
        
        // Connect to producer (to send flow execution requests)
        const producerUrl = `${import.meta.env.VITE_WS_URL}/ws/v2/producer/persistent/${tenant}/${namespace}/flow_triggers?token=${token}`;
        
        this.producerSocket = new WebSocket(producerUrl);
        
        this.producerSocket.onopen = () => {
          console.log('Producer WebSocket connected');
          this.isConnected.value = true;
          this.isConnecting.value = false;
          this.reconnectAttempts = 0;
          resolve();
        };
        
        this.producerSocket.onerror = (error) => {
          console.error('Producer WebSocket error:', error);
          this.isConnecting.value = false;
          reject(error);
        };
        
        this.producerSocket.onclose = (event) => {
          console.log('Producer WebSocket closed', event.code, event.reason);
          this.isConnected.value = false;
          
          // Don't reconnect on normal closure or if intentionally disconnected
          if (event.code !== 1000 && event.code !== 1001) {
            this.scheduleReconnect(userId, token);
          }
        };
      } catch (error) {
        console.error('Error connecting to WebSockets:', error);
        this.isConnecting.value = false;
        reject(error);
        
        // Still attempt to reconnect on error
        this.scheduleReconnect(userId, token);
      }
    });
    
    return this.connectionPromise;
  }
  
  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  scheduleReconnect(userId, token) {
    this.clearReconnectTimer();
    
    // Exponential backoff with jitter
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      this.maxReconnectDelay
    );
    
    console.log(`Scheduling reconnection attempt in ${Math.round(delay / 1000)}s`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(userId, token).catch(err => {
        console.error('Reconnection failed:', err);
      });
    }, delay);
  }
  
  /**
   * Clear any pending reconnection timer
   */
  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  
  /**
   * Disconnect WebSocket connections
   */
  disconnect() {
    this.clearReconnectTimer();
    
    if (this.resultsSocket) {
      // Only attempt a clean close if the socket is open or connecting
      if (this.resultsSocket.readyState === WebSocket.OPEN || 
          this.resultsSocket.readyState === WebSocket.CONNECTING) {
        try {
          this.resultsSocket.close(1000, 'Intentional disconnect');
        } catch (err) {
          console.error('Error closing results socket:', err);
        }
      }
      this.resultsSocket = null;
    }
    
    if (this.producerSocket) {
      // Only attempt a clean close if the socket is open or connecting
      if (this.producerSocket.readyState === WebSocket.OPEN || 
          this.producerSocket.readyState === WebSocket.CONNECTING) {
        try {
          this.producerSocket.close(1000, 'Intentional disconnect');
        } catch (err) {
          console.error('Error closing producer socket:', err);
        }
      }
      this.producerSocket = null;
    }
    
    this.isConnected.value = false;
    this.isConnecting.value = false;
  }
  
  /**
   * Execute a flow by sending a message to the flow_triggers topic
   * @param {string} flowId - The ID of the flow to execute
   * @param {Object} inputs - The inputs for the flow
   * @param {string} executionId - Optional execution ID (will be generated if not provided)
   * @returns {Promise} - Resolves when the message is sent
   */
  async executeFlow(flowId, inputs, executionId = crypto.randomUUID()) {
    if (!this.isConnected.value) {
      throw new Error('WebSocket not connected');
    }
    
    if (this.producerSocket.readyState !== WebSocket.OPEN) {
      throw new Error('Producer WebSocket not open');
    }
    
    return new Promise((resolve, reject) => {
      // Set a timeout for the operation
      const timeoutId = setTimeout(() => {
        this.producerSocket.removeEventListener('message', messageHandler);
        reject(new Error('Flow execution request timed out'));
      }, 15000); // 15s timeout
      
      // One-time handler for the response
      const messageHandler = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.result) {
            this.producerSocket.removeEventListener('message', messageHandler);
            clearTimeout(timeoutId);
            resolve(data);
          } else if (data.error) {
            this.producerSocket.removeEventListener('message', messageHandler);
            clearTimeout(timeoutId);
            reject(new Error(data.error));
          }
        } catch (err) {
          console.error('Error processing producer message:', err);
        }
      };
      
      this.producerSocket.addEventListener('message', messageHandler);
      
      // Prepare flow execution data
      const payload = JSON.stringify({
        flowId,
        inputs,
        executionId,
        timestamp: new Date().toISOString()
      });
      
      // Convert to base64 for Pulsar (browser-safe implementation)
      const base64Payload = btoa(payload);
      
      // Send message to producer
      this.producerSocket.send(JSON.stringify({
        payload: base64Payload
      }));
    });
  }
  
  /**
   * Subscribe to flow execution results
   * @param {string} flowId - The ID of the flow to subscribe to
   * @param {Function} callback - The callback to invoke with results
   */
  subscribeToFlow(flowId, callback) {
    this.subscriptions.set(flowId, callback);
    
    // Return unsubscribe function
    return () => {
      this.unsubscribeFromFlow(flowId);
    };
  }
  
  /**
   * Unsubscribe from flow execution results
   * @param {string} flowId - The ID of the flow to unsubscribe from
   */
  unsubscribeFromFlow(flowId) {
    this.subscriptions.delete(flowId);
  }
  
  /**
   * Get all messages for a specific flow
   * @param {string} flowId - The ID of the flow to get messages for
   * @returns {Array} - The messages for this flow
   */
  getFlowMessages(flowId) {
    return this.messageStream.value.filter(msg => msg.flowId === flowId);
  }
  
  /**
   * Clear all messages in the stream
   */
  clearMessages() {
    this.messageStream.value = [];
  }
}

export default new StreamingService(); 