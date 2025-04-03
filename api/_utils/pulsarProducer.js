import Pulsar from 'pulsar-client';

const ASTRA_STREAMING_URL = process.env.ASTRA_STREAMING_URL; // e.g., pulsar+ssl://pulsar-gcp-uscentral1.streaming.datastax.com:6651
const ASTRA_STREAMING_TOKEN = process.env.ASTRA_STREAMING_TOKEN;
const PRODUCER_TOPIC = process.env.ASTRA_PRODUCER_TOPIC || 'persistent://your_tenant/your_namespace/flow_triggers'; 
// TODO: Ensure tenant/namespace are correctly set in ASTRA_PRODUCER_TOPIC or separate env vars

let client = null;
let producer = null;
let connectionPromise = null;

async function getProducer() {
  if (!ASTRA_STREAMING_URL || !ASTRA_STREAMING_TOKEN) {
    throw new Error('Astra Streaming URL or Token not configured in environment variables.');
  }

  if (producer) {
    return producer;
  }

  // Use a promise to handle concurrent connection attempts
  if (!connectionPromise) {
      connectionPromise = (async () => {
          try {
              console.log('Initializing Pulsar Client for Producer...');
              client = new Pulsar.Client({
                  serviceUrl: ASTRA_STREAMING_URL,
                  authentication: new Pulsar.AuthenticationToken({ token: ASTRA_STREAMING_TOKEN }),
                  operationTimeoutSeconds: 30,
                  // tlsTrustCertsFilePath: // Optional: Path to trust certs if needed
                  // tlsValidateHostname: true, // Recommended for production
              });
              console.log(`Creating Pulsar Producer for topic: ${PRODUCER_TOPIC}`);
              producer = await client.createProducer({
                  topic: PRODUCER_TOPIC,
                  sendTimeoutMs: 30000,
                  batchingEnabled: true,
                  batchingMaxPublishDelayMs: 10,
              });
              console.log('Pulsar Producer created successfully.');
              return producer;
          } catch (error) {
              console.error('Failed to initialize Pulsar client or producer:', error);
              // Reset for potential retry
              client = null;
              producer = null;
              connectionPromise = null; 
              throw error; // Re-throw
          }
      })();
  }

  return connectionPromise;
}

/**
 * Sends a message payload to the configured Pulsar topic.
 * @param {object} payload The JSON payload to send.
 */
export async function sendMessage(payload) {
  try {
    const currentProducer = await getProducer();
    
    console.log('Sending message to Pulsar:', payload); 
    
    await currentProducer.send({
      data: Buffer.from(JSON.stringify(payload)),
      // Optional: Add properties or keys if needed for routing/filtering by consumers
      // properties: { executionId: payload.executionId }, 
      // eventTimestamp: Date.now(), 
    });
    
    console.log('Message sent successfully.');
  } catch (error) {
    console.error('Failed to send message via Pulsar:', error);
    // TODO: Implement retry logic or dead-letter queue if needed for reliability
    throw error; // Re-throw for the caller to handle
  }
}

// Optional: Graceful shutdown (call this if your function runtime allows)
export async function closeProducer() {
  if (producer) {
    try {
      console.log('Closing Pulsar producer...');
      await producer.close();
      producer = null;
      console.log('Pulsar producer closed.');
    } catch (error) {
      console.error('Error closing Pulsar producer:', error);
    }
  }
  if (client) {
    try {
      console.log('Closing Pulsar client...');
      await client.close();
      client = null;
      connectionPromise = null;
      console.log('Pulsar client closed.');
    } catch (error) {
      console.error('Error closing Pulsar client:', error);
    }
  }
} 