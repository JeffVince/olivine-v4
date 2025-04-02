import { getConnectedClient } from '../_utils/astraClient.js';
import { types } from '@datastax/cassandra-driver';

export const config = {
  runtime: 'edge'
};

// Handles GET, PUT, DELETE /api/flows/[id]
export default async function handler(request) {
  const user = request.user;
  const { searchParams } = new URL(request.url);
  const flowIdParam = searchParams.get('id'); // Vercel edge uses searchParams for dynamic routes

  if (!flowIdParam) {
    return new Response(JSON.stringify({ message: 'Flow ID is required' }), { status: 400 });
  }

  // Middleware should guarantee user object
  if (!user || !user.id) {
    return new Response(JSON.stringify({ message: 'Authentication required' }), { status: 401 });
  }

  let userId;
  let flowId; // Use correct type for DB (likely UUID)
  try {
      userId = types.Uuid.fromString(user.id);
      flowId = types.Uuid.fromString(flowIdParam);
  } catch (e) {
       console.error("Invalid user ID or flow ID format:", user.id, flowIdParam);
       return new Response(JSON.stringify({ message: 'Invalid identifier format' }), { status: 400 });
  }

  try {
    const client = await getConnectedClient();
    const keyspace = client.keyspace; // Assuming client is connected to the correct keyspace
    const tableName = 'flows'; // Assuming agents are stored in the 'flows' table/collection

    if (request.method === 'GET') {
      // --- GET /api/flows/[id] --- 
      const query = `SELECT flow_id, owner_user_id, name, description, template_id, associated_credential_ids, created_at, updated_at 
                       FROM ${tableName} 
                       WHERE flow_id = ? AND owner_user_id = ? LIMIT 1`;
      const params = [flowId, userId];
      const result = await client.execute(query, params, { prepare: true });
      const agent = result.first();

      if (!agent) {
        return new Response(JSON.stringify({ message: 'Agent not found or access denied' }), { status: 404 });
      }

      // Format response for frontend
      const responseData = {
        id: agent.flow_id.toString(), // Use flow_id as the primary ID
        flow_id: agent.flow_id.toString(),
        owner_user_id: agent.owner_user_id.toString(),
        name: agent.name,
        description: agent.description,
        template_id: agent.template_id ? agent.template_id.toString() : null, // Assuming template_id might be UUID
        // Ensure associated_credential_ids are strings for frontend
        associated_credential_ids: (agent.associated_credential_ids || []).map(id => id.toString()), 
        created_at: agent.created_at ? agent.created_at.toISOString() : null,
        updated_at: agent.updated_at ? agent.updated_at.toISOString() : null,
      };
      // TODO: Ensure associated_credential_ids are returned in the format expected by frontend (likely string IDs)

      return new Response(JSON.stringify(responseData), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' }
      });

    } else if (request.method === 'PUT') {
      // --- PUT /api/flows/[id] --- 
      const body = await request.json();
      
      // Validate required fields for update (at least one editable field should be present)
      if (!body || (body.name === undefined && body.description === undefined && body.associated_credential_ids === undefined)) {
          return new Response(JSON.stringify({ message: 'No update data provided' }), { status: 400 });
      }
      
      // Prepare fields and parameters for the UPDATE query
      const fieldsToUpdate = [];
      const params = [];
      const now = new Date();

      if (body.name !== undefined) {
          fieldsToUpdate.push('name = ?');
          params.push(body.name);
      }
      if (body.description !== undefined) {
          fieldsToUpdate.push('description = ?');
          params.push(body.description !== null ? body.description : ''); // Handle null description
      }
      if (body.associated_credential_ids !== undefined) {
           // Validate that it's an array (of strings, assumed)
           if (!Array.isArray(body.associated_credential_ids)) {
               return new Response(JSON.stringify({ message: 'associated_credential_ids must be an array' }), { status: 400 });
           }
           // Validate each ID in the array is a valid UUID string format
           const invalidIds = body.associated_credential_ids.filter(id => {
               try {
                   types.Uuid.fromString(id);
                   return false; // It's a valid UUID string
               } catch (e) {
                   return true; // Invalid format
               }
           });
           if (invalidIds.length > 0) {
                console.warn(`Invalid UUID format found in associated_credential_ids for user ${user.id}:`, invalidIds);
                return new Response(JSON.stringify({ message: `Invalid format found in associated credential IDs: ${invalidIds.join(', ')}` }), { status: 400 });
           }
           // TODO: Potentially validate that IDs in the array actually exist in the integrations table for this user?
           // (Skipping this expensive check for now, but consider adding later if needed)
           fieldsToUpdate.push('associated_credential_ids = ?');
           // Send the array of strings directly, matching list<text>
           params.push(body.associated_credential_ids); 
      }
      
      fieldsToUpdate.push('updated_at = ?');
      params.push(now);

      // Add WHERE clause parameters
      params.push(flowId);
      params.push(userId);

      const setClause = fieldsToUpdate.join(', ');
      const updateQuery = `UPDATE ${tableName} SET ${setClause} WHERE flow_id = ? AND owner_user_id = ? IF EXISTS`;

      const result = await client.execute(updateQuery, params, { prepare: true });

      // Check if the update was applied (IF EXISTS condition)
      const wasApplied = result.first()? '[applied]': false;
      if (!wasApplied) {
           // If not applied, it means the record didn't exist or owner didn't match
           // Fetch to double-check why
           const checkQuery = `SELECT owner_user_id FROM ${tableName} WHERE flow_id = ? LIMIT 1`;
           const checkResult = await client.execute(checkQuery, [flowId], { prepare: true });
           if (!checkResult.first()) {
                return new Response(JSON.stringify({ message: 'Agent not found' }), { status: 404 });
           } else {
                // Agent exists but owner doesn't match (middleware should prevent this, but belt-and-suspenders)
                 return new Response(JSON.stringify({ message: 'Access denied' }), { status: 403 });
           }
      }
      
      // Fetch the updated record to return it
      // (Alternatively, construct response from input body and known fields)
      const fetchQuery = `SELECT flow_id, owner_user_id, name, description, template_id, associated_credential_ids, created_at, updated_at 
                       FROM ${tableName} 
                       WHERE flow_id = ? AND owner_user_id = ? LIMIT 1`;
      const updatedResult = await client.execute(fetchQuery, [flowId, userId], { prepare: true });
      const updatedAgent = updatedResult.first();
      
       // Format response for frontend
      const responseData = {
        id: updatedAgent.flow_id.toString(),
        flow_id: updatedAgent.flow_id.toString(),
        owner_user_id: updatedAgent.owner_user_id.toString(),
        name: updatedAgent.name,
        description: updatedAgent.description,
        template_id: updatedAgent.template_id ? updatedAgent.template_id.toString() : null,
        // Ensure associated_credential_ids are strings for frontend
        associated_credential_ids: (updatedAgent.associated_credential_ids || []).map(id => id.toString()), 
        created_at: updatedAgent.created_at ? updatedAgent.created_at.toISOString() : null,
        updated_at: updatedAgent.updated_at ? updatedAgent.updated_at.toISOString() : null,
      };

      return new Response(JSON.stringify(responseData), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' }
      });

    } else if (request.method === 'DELETE') {
      // --- DELETE /api/flows/[id] --- 
      // Use IF EXISTS to ensure we only attempt deletion if the row matches
      const query = `DELETE FROM ${tableName} WHERE flow_id = ? AND owner_user_id = ? IF EXISTS`;
      const params = [flowId, userId];
      
      const result = await client.execute(query, params, { prepare: true });

      const wasApplied = result.first()? '[applied]': false;

      if (!wasApplied) {
           // Check if it ever existed or if owner mismatch
           const checkQuery = `SELECT owner_user_id FROM ${tableName} WHERE flow_id = ? LIMIT 1`;
           const checkResult = await client.execute(checkQuery, [flowId], { prepare: true });
           if (!checkResult.first()) {
                return new Response(JSON.stringify({ message: 'Agent not found' }), { status: 404 });
           } else {
                 return new Response(JSON.stringify({ message: 'Access denied' }), { status: 403 });
           }
      }

      // Successfully deleted (or didn't exist for this user)
      return new Response(null, { status: 204 }); // No Content success status

    } else {
      return new Response(JSON.stringify({ message: 'Method not allowed' }), {
        status: 405,
        headers: { 'Allow': 'GET, PUT, DELETE', 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error(`Error in /api/flows/[id] (${request.method}) for flow ${flowIdParam}, user ${user.id}:`, error);
    // Add specific DB error checks if needed
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 