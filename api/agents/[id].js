import { getConnectedClient } from '../_utils/astraClient.js';
import { types } from '@datastax/cassandra-driver';
import { verifyAuth, addStandardHeaders, createErrorResponse } from '../auth_handler.js';

// export const config = { runtime: 'edge' }; // Remove edge config

// Handles GET, PUT, DELETE /api/agents/[id]
// (Previously /api/flows/[id])
export default async function handler(request) {
  
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const optionsResponse = new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400' 
      }
    });
    return addStandardHeaders(optionsResponse);
  }
  
  // Extract agentId from URL early for error messages
  const url = new URL(request.url);
  const agentIdParam = url.pathname.split('/').pop(); 

  if (!agentIdParam) {
    return createErrorResponse('Agent ID is required in the URL path', 400);
  }

  try {
    // --- Authentication & ID Parsing --- 
    const user = await verifyAuth(request);
    let userId;
    let agentId;
    try {
        userId = types.Uuid.fromString(user.id);
        agentId = types.Uuid.fromString(agentIdParam);
    } catch (e) {
         console.error("Invalid user ID or agent ID format:", user.id, agentIdParam);
         return createErrorResponse('Invalid user or agent identifier format', 400);
    }

    // --- DB Connection --- 
    const client = await getConnectedClient();
    const tableName = 'flow_app_prod.agents'; 

    // --- Method Handling --- 
    if (request.method === 'GET') {
      // --- GET /api/agents/[id] --- 
      const query = `SELECT agent_id, name, description, langflow_flow_id, associated_credential_ids, config, created_at, updated_at 
                       FROM ${tableName} 
                       WHERE owner_user_id = ? AND agent_id = ? LIMIT 1`;
      const params = [userId, agentId];
      const result = await client.execute(query, params, { prepare: true });
      const agent = result.first();

      if (!agent) {
        return createErrorResponse('Agent not found or access denied', 404);
      }

      // Format response
      const responseData = {
        id: agent.agent_id.toString(), 
        agent_id: agent.agent_id.toString(),
        owner_user_id: userId.toString(),
        name: agent.name,
        description: agent.description,
        langflow_flow_id: agent.langflow_flow_id, 
        associated_credential_ids: (agent.associated_credential_ids || []).map(id => id.toString()), 
        config: agent.config || {}, 
        created_at: agent.created_at ? agent.created_at.toISOString() : null,
        updated_at: agent.updated_at ? agent.updated_at.toISOString() : null,
      };

      const successGetResponse = new Response(JSON.stringify(responseData), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' }
      });
      return addStandardHeaders(successGetResponse);

    } else if (request.method === 'PUT') {
      // --- PUT /api/agents/[id] --- 
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return createErrorResponse('Invalid JSON body for update', 400);
      }
      
      if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
          return createErrorResponse('Update request body cannot be empty', 400);
      }
      // Allow updating specific fields even if others are missing
      if (body.name === undefined && body.description === undefined && body.associated_credential_ids === undefined && body.config === undefined && body.langflow_flow_id === undefined) {
           return createErrorResponse('No updatable fields provided (name, description, langflow_flow_id, associated_credential_ids, config)', 400);
      }
      
      const fieldsToUpdate = [];
      const paramsForUpdate = []; 
      const now = new Date();

      // Build dynamic update query
      if (body.name !== undefined) {
          fieldsToUpdate.push('name = ?');
          paramsForUpdate.push(body.name);
      }
      if (body.description !== undefined) {
          fieldsToUpdate.push('description = ?');
          paramsForUpdate.push(body.description !== null ? body.description : ''); 
      }
       if (body.langflow_flow_id !== undefined) {
          fieldsToUpdate.push('langflow_flow_id = ?');
          paramsForUpdate.push(body.langflow_flow_id);
      }
      if (body.associated_credential_ids !== undefined) {
           if (!Array.isArray(body.associated_credential_ids)) {
               return createErrorResponse('associated_credential_ids must be an array of strings', 400);
           }
           // Validate UUID format within the array
           const credentialUuids = [];
           for (const idStr of body.associated_credential_ids) {
               try {
                   credentialUuids.push(types.Uuid.fromString(idStr));
               } catch (e) {
                   console.warn(`Invalid UUID format in associated_credential_ids for user ${user.id}: ${idStr}`);
                   return createErrorResponse(`Invalid UUID format in associated_credential_ids: ${idStr}`, 400);
               }
           }
           fieldsToUpdate.push('associated_credential_ids = ?');
           // Store as list<uuid> in Cassandra
           paramsForUpdate.push(credentialUuids); 
      }
      if (body.config !== undefined) {
          if (typeof body.config !== 'object' || body.config === null) {
              return createErrorResponse('config must be an object', 400);
          }
          fieldsToUpdate.push('config = ?');
          paramsForUpdate.push(body.config); 
      }
      
      // Always update the timestamp
      fieldsToUpdate.push('updated_at = ?');
      paramsForUpdate.push(now);

      // Add WHERE clause parameters
      paramsForUpdate.push(userId);
      paramsForUpdate.push(agentId);

      const setClause = fieldsToUpdate.join(', ');
      const updateQuery = `UPDATE ${tableName} SET ${setClause} WHERE owner_user_id = ? AND agent_id = ? IF EXISTS`;

      const updateResult = await client.execute(updateQuery, paramsForUpdate, { prepare: true });

      const wasApplied = updateResult.first()['[applied]'];
      if (!wasApplied) {
           // Check if the record actually exists for this user before returning 404 vs 403
           const checkQuery = `SELECT owner_user_id FROM ${tableName} WHERE owner_user_id = ? AND agent_id = ? LIMIT 1`;
           const checkResult = await client.execute(checkQuery, [userId, agentId], { prepare: true });
           if (!checkResult.first()) {
                return createErrorResponse('Agent not found', 404);
           } else {
                 // This case should be rare with IF EXISTS if the user ID matches
                 console.warn(`Update condition failed for agent ${agentIdParam}, user ${userId}`);
                 return createErrorResponse('Update failed (condition not met or access denied)', 403);
           }
      }
      
      // Fetch and return the updated record
      const fetchQuery = `SELECT agent_id, name, description, langflow_flow_id, associated_credential_ids, config, created_at, updated_at 
                       FROM ${tableName} 
                       WHERE owner_user_id = ? AND agent_id = ? LIMIT 1`;
      const updatedResult = await client.execute(fetchQuery, [userId, agentId], { prepare: true });
      const updatedAgent = updatedResult.first(); // Should exist after successful update
      
      if (!updatedAgent) { 
           console.error(`Failed to fetch agent ${agentIdParam} immediately after confirmed update for user ${userId}.`);
           return createErrorResponse('Failed to retrieve updated agent data.', 500);
      }
      
      const updatedResponseData = { 
        id: updatedAgent.agent_id.toString(),
        agent_id: updatedAgent.agent_id.toString(),
        owner_user_id: userId.toString(),
        name: updatedAgent.name,
        description: updatedAgent.description,
        langflow_flow_id: updatedAgent.langflow_flow_id,
        associated_credential_ids: (updatedAgent.associated_credential_ids || []).map(id => id.toString()),
        config: updatedAgent.config || {},
        created_at: updatedAgent.created_at ? updatedAgent.created_at.toISOString() : null,
        updated_at: updatedAgent.updated_at ? updatedAgent.updated_at.toISOString() : null,
      };

      const successPutResponse = new Response(JSON.stringify(updatedResponseData), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' }
      });
      return addStandardHeaders(successPutResponse);

    } else if (request.method === 'DELETE') {
      // --- DELETE /api/agents/[id] --- 
      const query = `DELETE FROM ${tableName} WHERE owner_user_id = ? AND agent_id = ? IF EXISTS`;
      const params = [userId, agentId];
      const deleteResult = await client.execute(query, params, { prepare: true });
      const wasApplied = deleteResult.first()['[applied]'];

      if (!wasApplied) {
           const checkQuery = `SELECT owner_user_id FROM ${tableName} WHERE owner_user_id = ? AND agent_id = ? LIMIT 1`;
           const checkResult = await client.execute(checkQuery, [userId, agentId], { prepare: true });
           if (!checkResult.first()) {
                return createErrorResponse('Agent not found', 404);
           } else {
                console.warn(`Delete condition failed for agent ${agentIdParam}, user ${userId}`);
                return createErrorResponse('Delete failed (condition not met or access denied)', 403);
           }
      }

      const successDeleteResponse = new Response(null, { status: 204 });
      return addStandardHeaders(successDeleteResponse); 

    } else {
      // --- Method Not Allowed --- 
      const methodNotAllowedResponse = new Response(JSON.stringify({ status: 'error', message: 'Method not allowed' }), {
        status: 405,
        headers: { 'Allow': 'GET, PUT, DELETE, OPTIONS', 'Content-Type': 'application/json' },
      });
       return addStandardHeaders(methodNotAllowedResponse);
    }

  } catch (error) {
    // --- Global Error Handling --- 
    if (error.message.startsWith('Authentication')) {
        return createErrorResponse(error.message, 401);
    }
    if (error instanceof SyntaxError) { // Catch JSON parsing errors if any slipped through
        return createErrorResponse('Invalid JSON body', 400);
    } 
    console.error(`Error in /api/agents/[id] (${request.method}) for agent ${agentIdParam}, user ${user?.id}:`, error);
    return createErrorResponse('Internal Server Error', 500);
  }
} 