import { Client } from "@datastax/cassandra-driver";

// Global client singleton
let client = null;

function getClient() {
  if (client) {
    return client;
  }

  console.log("Initializing AstraDB Client...");

  // Get connection details from environment variables
  const ASTRA_DB_ID = process.env.ASTRA_DB_ID;
  const ASTRA_DB_REGION = process.env.ASTRA_DB_REGION;
  const ASTRA_DB_CLIENT_ID = process.env.ASTRA_DB_CLIENT_ID;
  const ASTRA_DB_CLIENT_SECRET = process.env.ASTRA_DB_CLIENT_SECRET;
  const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE;

  // Check required variables
  if (!ASTRA_DB_ID || !ASTRA_DB_REGION || !ASTRA_DB_CLIENT_ID || !ASTRA_DB_CLIENT_SECRET || !ASTRA_DB_KEYSPACE) {
    throw new Error(
      "Missing required Astra DB environment variables. Please set ASTRA_DB_ID, ASTRA_DB_REGION, ASTRA_DB_CLIENT_ID, ASTRA_DB_CLIENT_SECRET, and ASTRA_DB_KEYSPACE."
    );
  }

  try {
    // Construct secure connect bundle URL from ID and region
    const secureConnectBundleUrl = `https://datastax-cluster-config-prod.s3.us-east-2.amazonaws.com/${ASTRA_DB_ID}-${ASTRA_DB_REGION}/secure-connect-${ASTRA_DB_ID}.zip`;

    // Initialize the client
    client = new Client({
      cloud: {
        secureConnectBundle: secureConnectBundleUrl
      },
      credentials: {
        username: ASTRA_DB_CLIENT_ID,
        password: ASTRA_DB_CLIENT_SECRET,
      },
      keyspace: ASTRA_DB_KEYSPACE,
    });

    console.log("AstraDB Client initialized successfully");
    return client;
  } catch (error) {
    console.error("Failed to initialize AstraDB Client:", error);
    throw error;
  }
}

// Function to connect to Astra DB
async function connectClient() {
  const dbClient = getClient();
  try {
    await dbClient.connect();
    console.log("Successfully connected to AstraDB");
    return dbClient;
  } catch (error) {
    console.error("Failed to connect to AstraDB:", error);
    client = null; // Reset client so next attempt will create a new one
    throw error;
  }
}

// Export a function that gets the client and ensures connection
export async function getConnectedClient() {
  if (!client || client.isShuttingDown) {
    return await connectClient();
  }
  return client;
}

// Optional: Graceful shutdown (may not be needed in serverless functions)
export async function shutdownClient() {
  if (client && !client.isShuttingDown) {
    console.log("Shutting down AstraDB client...");
    await client.shutdown();
    client = null;
    console.log("AstraDB client shut down");
  }
} 