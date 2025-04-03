import { getConnectedClient } from './_utils/astraClient.js';

export default async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      status: 'error',
      message: 'Method not allowed'
    });
  }

  try {
    // Try to connect to Astra DB
    const client = await getConnectedClient();
    
    // Get database info for verification
    const query = "SELECT cluster_name, data_center FROM system.local";
    const result = await client.execute(query);
    
    const response = {
      message: "Successfully connected to Astra DB",
      database_info: result.first(),
      client_info: {
        baseUrl: client.baseUrl || "Not available",
        keyspace: client.keyspace || "Not available"
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error connecting to Astra DB:", error);
    return res.status(500).json({
      status: 'error',
      message: `Failed to connect to Astra DB: ${error.message}`
    });
  }
} 