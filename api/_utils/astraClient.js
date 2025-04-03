import { Client } from "@datastax/cassandra-driver";

let client = null;

function getClient() {
  if (client) {
    return client;
  }

  console.log("Initializing AstraDB Client...");

  // Get credentials directly from environment variables
  const ASTRA_DB_ID = process.env.ASTRA_DB_ID;
  const ASTRA_DB_REGION = process.env.ASTRA_DB_REGION;
  const ASTRA_DB_CLIENT_ID = process.env.ASTRA_DB_CLIENT_ID;
  const ASTRA_DB_CLIENT_SECRET = process.env.ASTRA_DB_CLIENT_SECRET;
  const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE;

  if (!ASTRA_DB_ID || !ASTRA_DB_REGION || !ASTRA_DB_CLIENT_ID || !ASTRA_DB_CLIENT_SECRET || !ASTRA_DB_KEYSPACE) {
    throw new Error(
      "Missing Astra DB connection environment variables (ASTRA_DB_ID, ASTRA_DB_REGION, ASTRA_DB_CLIENT_ID, ASTRA_DB_CLIENT_SECRET, ASTRA_DB_KEYSPACE)"
    );
  }

  try {
    // Connect using token authentication
    client = new Client({
      cloud: {
        secureConnectBundle: `https://datastax-cluster-config-prod.s3.us-east-2.amazonaws.com/${ASTRA_DB_ID}-${ASTRA_DB_REGION}/secure-connect-${ASTRA_DB_ID}.zip`
      },
      credentials: {
        username: ASTRA_DB_CLIENT_ID,
        password: ASTRA_DB_CLIENT_SECRET,
      },
      keyspace: ASTRA_DB_KEYSPACE,
    });

    console.log("AstraDB Client Initialized Successfully.");
    return client;
  } catch (error) {
    console.error("Failed to initialize AstraDB Client:", error);
    throw error; // Re-throw the error after logging
  }
}

// Function to explicitly connect and test the connection
async function connectClient() {
    const dbClient = getClient();
    try {
        await dbClient.connect();
        console.log("Successfully connected to AstraDB.");
        return dbClient;
    } catch (error) {
        console.error("Failed to connect to AstraDB:", error);
        // Reset client on connection failure so next attempt tries again
        client = null;
        throw error;
    }
}

// Export a function that gets the client, ensuring connection
export async function getConnectedClient() {
    if (!client || client.isShuttingDown) {
        // If the client isn't initialized or is shutting down, attempt to connect.
        return await connectClient();
    }
    // If client exists and isn't shutting down, assume it's connected or connection is pending.
    return client;
}

// Optional: Graceful shutdown
export async function shutdownClient() {
  if (client && !client.isShuttingDown) {
    console.log("Shutting down AstraDB client...");
    await client.shutdown();
    client = null;
    console.log("AstraDB client shut down.");
  }
} 