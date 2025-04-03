import { getConnectedClient } from '../../../_utils/astraClient.js';
import { types } from '@datastax/cassandra-driver';

export const config = {
  runtime: 'edge'
};

// Handles GET, POST /api/conversations/[conversationId]/messages
export default async function handler(request) {
  const user = request.user;
  const url = new URL(request.url);
  // Extract conversationId from the dynamic path segment
  const pathSegments = url.pathname.split('/'); // e.g., ['', 'api', 'conversations', 'uuid', 'messages']
  const conversationIdParam = pathSegments[3];

  if (!conversationIdParam) {
    return new Response(JSON.stringify({ message: 'Conversation ID is required' }), { status: 400 });
  }

  if (!user || !user.id) {
    return new Response(JSON.stringify({ message: 'Authentication required' }), { status: 401 });
  }

  let userId;
  let conversationId;
  try {
      userId = types.Uuid.fromString(user.id);
      conversationId = types.Uuid.fromString(conversationIdParam);
  } catch (e) {
       console.error("Invalid user ID or conversation ID format:", user.id, conversationIdParam);
       return new Response(JSON.stringify({ message: 'Invalid identifier format' }), { status: 400 });
  }

  try {
    const client = await getConnectedClient();
    const messagesTable = 'flow_app_prod.messages';
    const convTable = 'flow_app_prod.conversations'; // Needed to verify conversation ownership

    // Verify conversation exists and belongs to the user before proceeding
    // This requires knowing the agent_id, which isn't directly in this URL.
    // Option 1: Assume middleware or context provides agent_id (less likely)
    // Option 2: Query conversations table first (less efficient but necessary for security)
    const convCheckQuery = `SELECT owner_user_id, agent_id FROM ${convTable} WHERE conversation_id = ? LIMIT 1 ALLOW FILTERING`; 
    // ALLOW FILTERING needed as conversation_id is not the full partition key.
    // Consider if security model requires stricter check (e.g., knowing agent_id beforehand)
    const convCheckResult = await client.execute(convCheckQuery, [conversationId], { prepare: true });
    const conversationMeta = convCheckResult.first();

    if (!conversationMeta || !conversationMeta.owner_user_id.equals(userId)) {
        // If conversation doesn't exist OR doesn't belong to the user
        return new Response(JSON.stringify({ message: 'Conversation not found or access denied' }), { status: 404 });
    }
    // We now have conversationMeta.agent_id if needed later

    if (request.method === 'GET') {
      // --- GET /api/conversations/[conversationId]/messages --- 
      const query = `SELECT message_id, role, content, metadata, timestamp 
                       FROM ${messagesTable} 
                       WHERE conversation_id = ?`;
                       // Order is handled by CLUSTERING ORDER BY message_id ASC
      const params = [conversationId];
      const result = await client.execute(query, params, { prepare: true });

      const messages = result.rows.map(row => ({
        id: row.message_id.toString(), // TimeUUID -> String
        message_id: row.message_id.toString(),
        conversation_id: conversationId.toString(),
        role: row.role,
        content: row.content,
        metadata: row.metadata || {},
        // Use timestamp field directly if preferred, otherwise derive from timeuuid
        timestamp: row.timestamp ? row.timestamp.toISOString() : types.TimeUuid.fromDate(row.message_id.getDate()).toISOString(), 
      }));

      return new Response(JSON.stringify(messages), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } else if (request.method === 'POST') {
      // --- POST /api/conversations/[conversationId]/messages --- 
      // NOTE: This endpoint might only be needed for explicitly saving USER messages 
      // if the flow execution/streaming process doesn't handle saving assistant/system messages.
      // If the backend streaming handler saves messages, this POST might be redundant.
      
      const body = await request.json();
      if (!body || !body.role || !body.content) {
          return new Response(JSON.stringify({ message: 'Missing required fields: role and content' }), { status: 400 });
      }
      
      // Basic validation
      const allowedRoles = ['user', 'assistant', 'system', 'error'];
      if (!allowedRoles.includes(body.role)) {
          return new Response(JSON.stringify({ message: `Invalid role: ${body.role}` }), { status: 400 });
      }

      const messageId = types.TimeUuid.now(); // Generate time-based UUID
      const timestamp = messageId.getDate(); // Get Date object from TimeUuid
      const metadata = body.metadata || {}; // Optional metadata from request

      const insertQuery = `INSERT INTO ${messagesTable} 
                           (conversation_id, message_id, role, content, metadata, timestamp) 
                           VALUES (?, ?, ?, ?, ?, ?)`;
      const params = [
          conversationId,
          messageId,
          body.role,
          body.content,
          metadata,
          timestamp
      ];

      await client.execute(insertQuery, params, { prepare: true });

      // Also update the conversation's updated_at timestamp
      const updateConvQuery = `UPDATE ${convTable} SET updated_at = ? 
                               WHERE owner_user_id = ? AND agent_id = ? AND conversation_id = ?`;
      await client.execute(updateConvQuery, [
          timestamp, 
          conversationMeta.owner_user_id, 
          conversationMeta.agent_id, 
          conversationId
        ], { prepare: true });

      // Return the newly created message data
      const newMessage = {
        id: messageId.toString(),
        message_id: messageId.toString(),
        conversation_id: conversationId.toString(),
        role: body.role,
        content: body.content,
        metadata: metadata,
        timestamp: timestamp.toISOString(),
      };

      return new Response(JSON.stringify(newMessage), {
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
    console.error(`Error in /api/conversations/[conversationId]/messages (${request.method}) for conv ${conversationIdParam}, user ${user.id}:`, error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 