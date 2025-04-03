import { getConnectedClient } from '../../_utils/astraClient.js';
import { types } from '@datastax/cassandra-driver';

export const config = {
  runtime: 'edge'
};

// Handles GET, POST /api/agents/[agentId]/conversations
export default async function handler(request) {
  const user = request.user;
  const url = new URL(request.url);
  // Extract agentId from the dynamic path segment
  const pathSegments = url.pathname.split('/'); // e.g., ['', 'api', 'agents', 'uuid', 'conversations']
  const agentIdParam = pathSegments[3]; 

  if (!agentIdParam) {
    return new Response(JSON.stringify({ message: 'Agent ID is required' }), { status: 400 });
  }

  if (!user || !user.id) {
    return new Response(JSON.stringify({ message: 'Authentication required' }), { status: 401 });
  }

  let userId;
  let agentId;
  try {
      userId = types.Uuid.fromString(user.id);
      agentId = types.Uuid.fromString(agentIdParam);
  } catch (e) {
       console.error("Invalid user ID or agent ID format:", user.id, agentIdParam);
       return new Response(JSON.stringify({ message: 'Invalid identifier format' }), { status: 400 });
  }

  try {
    const client = await getConnectedClient();
    const convTable = 'flow_app_prod.conversations';
    const agentsTable = 'flow_app_prod.agents'; // Needed to verify agent exists/belongs to user

    // Verify agent exists and belongs to the user before proceeding
    const agentCheckQuery = `SELECT agent_id FROM ${agentsTable} WHERE owner_user_id = ? AND agent_id = ? LIMIT 1`;
    const agentCheckResult = await client.execute(agentCheckQuery, [userId, agentId], { prepare: true });
    if (!agentCheckResult.first()) {
        return new Response(JSON.stringify({ message: 'Agent not found or access denied' }), { status: 404 });
    }

    if (request.method === 'GET') {
      // --- GET /api/agents/[agentId]/conversations --- 
      const query = `SELECT conversation_id, title, created_at, updated_at 
                       FROM ${convTable} 
                       WHERE owner_user_id = ? AND agent_id = ?`;
                       // Order is handled by CLUSTERING ORDER BY conversation_id DESC
      const params = [userId, agentId];
      const result = await client.execute(query, params, { prepare: true });

      const conversations = result.rows.map(row => ({
        id: row.conversation_id.toString(),
        conversation_id: row.conversation_id.toString(),
        owner_user_id: userId.toString(), // From context
        agent_id: agentId.toString(), // From context
        title: row.title,
        created_at: row.created_at ? row.created_at.toISOString() : null,
        updated_at: row.updated_at ? row.updated_at.toISOString() : null,
      }));

      return new Response(JSON.stringify(conversations), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } else if (request.method === 'POST') {
      // --- POST /api/agents/[agentId]/conversations --- 
      const body = await request.json().catch(() => ({})); // Handle empty/invalid body
      const title = body.title || `Chat ${new Date().toLocaleString()}`; // Default title
      const now = new Date();
      const conversationId = types.Uuid.random(); // Generate new UUID for conversation

      const insertQuery = `INSERT INTO ${convTable} 
                           (owner_user_id, agent_id, conversation_id, title, created_at, updated_at) 
                           VALUES (?, ?, ?, ?, ?, ?)`;
      const params = [
          userId,
          agentId,
          conversationId,
          title,
          now,
          now
      ];

      await client.execute(insertQuery, params, { prepare: true });

      // Return the newly created conversation data
      const newConversation = {
        id: conversationId.toString(),
        conversation_id: conversationId.toString(),
        owner_user_id: userId.toString(),
        agent_id: agentId.toString(),
        title: title,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      return new Response(JSON.stringify(newConversation), {
        status: 201, // Created
        headers: { 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ message: 'Method not allowed' }), {
        status: 405,
        headers: { 'Allow': 'GET, POST', 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error(`Error in /api/agents/[agentId]/conversations (${request.method}) for agent ${agentIdParam}, user ${user.id}:`, error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 