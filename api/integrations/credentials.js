import { getConnectedClient } from '../_utils/astraClient.js';
import { types } from '@datastax/cassandra-driver';
import { verifyAuth, addStandardHeaders, createErrorResponse } from '../auth_handler.js';

// export const config = { runtime: 'edge' }; // Remove edge config

// Handles GET /api/integrations/credentials
export default async function handler(request) {

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const optionsResponse = new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization',
        'Access-Control-Max-Age': '86400' 
      }
    });
    return addStandardHeaders(optionsResponse);
  }

  if (request.method !== 'GET') {
     const methodNotAllowedResponse = new Response(JSON.stringify({ status: 'error', message: 'Method not allowed' }), {
        status: 405,
        headers: { 'Allow': 'GET', 'Content-Type': 'application/json' } 
     });
     return addStandardHeaders(methodNotAllowedResponse);
  }

  try {
    // --- Authentication --- 
    const user = await verifyAuth(request);
    let userId;
    try {
        userId = types.Uuid.fromString(user.id);
    } catch (e) {
         console.error("Invalid user ID format in JWT payload:", user.id);
         return createErrorResponse('Invalid user identifier', 400);
    }

    // --- Database Fetch --- 
    const client = await getConnectedClient();
    
    // Fetch credentials (integrations) for the user
    const query = `SELECT id, name, type, service_name, status, created_at 
                     FROM integrations 
                     WHERE user_id = ?`; 
                     
    const params = [userId];
    const result = await client.execute(query, params, { prepare: true });
    
    const credentials = result.rows.map(row => ({
      id: row.id.toString(),
      name: row.name,
      type: row.type,
      service_name: row.service_name,
      status: row.status,
      created_at: row.created_at ? row.created_at.toISOString() : null,
    }));

    const successResponse = new Response(JSON.stringify(credentials), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    return addStandardHeaders(successResponse);

  } catch (error) {
    // --- Error Handling --- 
    if (error.message.startsWith('Authentication')) {
        return createErrorResponse(error.message, 401);
    }
    console.error(`Error fetching credentials for user ${user?.id}:`, error);
    return createErrorResponse('Failed to fetch credentials', 500);
  }
} 