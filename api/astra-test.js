import { getConnectedClient } from './_utils/astraClient.js';
import { addStandardHeaders, createErrorResponse } from './auth_handler.js';

export default async function handler(request) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const optionsResponse = new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400' 
      }
    });
    return addStandardHeaders(optionsResponse);
  }

  if (request.method !== 'GET') {
    return createErrorResponse('Method not allowed', 405);
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
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error("Error connecting to Astra DB:", error);
    return createErrorResponse(`Failed to connect to Astra DB: ${error.message}`, 500);
  }
} 