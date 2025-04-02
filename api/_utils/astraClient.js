import { Client, auth } from "@datastax/cassandra-driver";
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Derive __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let client = null;

function getClient() {
  if (client) {
    return client;
  }

  console.log("Initializing AstraDB Client...");

  const ASTRA_DB_SECURE_CONNECT_BUNDLE_PATH = process.env.ASTRA_DB_SECURE_CONNECT_BUNDLE_PATH;
  const ASTRA_DB_CLIENT_ID = process.env.ASTRA_DB_CLIENT_ID;
  const ASTRA_DB_CLIENT_SECRET = process.env.ASTRA_DB_CLIENT_SECRET;
  const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE;

  if (!ASTRA_DB_SECURE_CONNECT_BUNDLE_PATH || !ASTRA_DB_CLIENT_ID || !ASTRA_DB_CLIENT_SECRET || !ASTRA_DB_KEYSPACE) {
    throw new Error(
      "Missing Astra DB connection environment variables (ASTRA_DB_SECURE_CONNECT_BUNDLE_PATH, ASTRA_DB_CLIENT_ID, ASTRA_DB_CLIENT_SECRET, ASTRA_DB_KEYSPACE)"
    );
  }

  // Resolve the path relative to the current file if it's not absolute
  const resolvedBundlePath = path.isAbsolute(ASTRA_DB_SECURE_CONNECT_BUNDLE_PATH)
    ? ASTRA_DB_SECURE_CONNECT_BUNDLE_PATH
    : path.resolve(__dirname, '..', ASTRA_DB_SECURE_CONNECT_BUNDLE_PATH); // Assumes bundle path is relative to the root `api` dir

  // Check if the Secure Connect Bundle file exists
  if (!fs.existsSync(resolvedBundlePath)) {
      console.error(`Secure Connect Bundle not found at path: ${resolvedBundlePath}`);
      console.error(`Original path env var was: ${ASTRA_DB_SECURE_CONNECT_BUNDLE_PATH}`);
      console.error(`Current working directory: ${process.cwd()}`);
      console.error(`__dirname: ${__dirname}`);
      throw new Error(`Astra DB Secure Connect Bundle not found at the specified path: ${resolvedBundlePath}`);
  }

  try {
    client = new Client({
      cloud: {
        secureConnectBundle: resolvedBundlePath,
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
// This pattern helps manage the singleton instance.
export async function getConnectedClient() {
    if (!client || client.isShuttingDown) {
        // If the client isn't initialized or is shutting down, attempt to connect.
        return await connectClient();
    }
    // If client exists and isn't shutting down, assume it's connected or connection is pending.
    // The driver handles internal reconnections.
    // You could add a health check here if needed: `await client.execute('SELECT now() FROM system.local');`
    return client;
}

// Optional: Graceful shutdown (useful if running in a non-serverless context)
// For Vercel functions, explicit shutdown might not be strictly necessary
// as the function execution ends, but it's good practice.
export async function shutdownClient() {
  if (client && !client.isShuttingDown) {
    console.log("Shutting down AstraDB client...");
    await client.shutdown();
    client = null;
    console.log("AstraDB client shut down.");
  }
} 