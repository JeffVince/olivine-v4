import { getConnectedClient } from '../_utils/astraClient.js';
import { types } from '@datastax/cassandra-driver';
import { verifyAuth, addStandardHeaders, createErrorResponse } from '../auth_handler.js';

export const config = { runtime: 'edge' };

// Handles GET /api/agents (List Agents for user)
// Might handle POST /api/agents (Create Agent directly - less likely used if using templates)
export default async function handler(request) {

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const optionsResponse = new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'GET, OPTIONS', // Add POST if implemented
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400' 
      }
    });
    return addStandardHeaders(optionsResponse);
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

    // --- DB Connection --- 
    const client = await getConnectedClient();
    const tableName = 'flow_app_prod.agents'; // TODO: Env Var

    if (request.method === 'GET') {
        // --- GET /api/agents --- 
        const query = `SELECT agent_id, name, description, langflow_flow_id, created_at, updated_at 
                       FROM ${tableName} 
                       WHERE owner_user_id = ?`;
        const params = [userId];
        const result = await client.execute(query, params, { prepare: true });

        const agents = result.rows.map(row => ({
            id: row.agent_id.toString(),
            agent_id: row.agent_id.toString(), // Keep both for potential compatibility?
            owner_user_id: userId.toString(),
            name: row.name,
            description: row.description,
            langflow_flow_id: row.langflow_flow_id,
            created_at: row.created_at ? row.created_at.toISOString() : null,
            updated_at: row.updated_at ? row.updated_at.toISOString() : null,
        }));

        // TODO: The frontend currently calls GET /api/flows which maps to apiService.getFlows().
        // Need to update frontend apiService.js to call GET /api/agents instead.
        // Or, rename this backend route/file to api/flows/index.js if preferred.

        const successResponse = new Response(JSON.stringify(agents), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' }
        });
        return addStandardHeaders(successResponse);

    } else if (request.method === 'POST') {
         // --- POST /api/agents --- (Direct Agent Creation - Less likely path?)
         // This assumes creating an agent directly, NOT from a template.
         // The frontend currently uses createFlowFromTemplate -> POST /api/flows/templates/{id}
         // Need to implement that specific endpoint if it's the primary creation method.
         return createErrorResponse('Direct agent creation not implemented. Use POST /api/agents/fromTemplate', 501);

    } else {
        // Handle other methods
        const methodNotAllowedResponse = new Response(JSON.stringify({ status: 'error', message: 'Method not allowed' }), {
            status: 405,
            headers: { 'Allow': 'GET', 'Content-Type': 'application/json' }, 
        });
        return addStandardHeaders(methodNotAllowedResponse);
    }

  } catch (error) {
    // --- Error Handling --- 
    if (error.message.startsWith('Authentication')) {
        return createErrorResponse(error.message, 401);
    }
    console.error(`Error in /api/agents (${request.method}) for user ${user?.id}:`, error);
    return createErrorResponse('Internal Server Error', 500);
  }
} 