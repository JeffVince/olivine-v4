import { getConnectedClient } from '../_utils/astraClient.js';
import { types } from '@datastax/cassandra-driver';

export const config = {
  runtime: 'edge'
};

// Handles GET /api/integrations/credentials
export default async function handler(request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), {
      status: 405,
      headers: { 'Allow': 'GET', 'Content-Type': 'application/json' },
    });
  }

  const user = request.user;

  // Middleware should guarantee user object
  if (!user || !user.id) {
    return new Response(JSON.stringify({ message: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  let userId;
  try {
      userId = types.Uuid.fromString(user.id);
  } catch (e) {
       console.error("Invalid user ID format in JWT payload:", user.id);
       return new Response(JSON.stringify({ message: 'Invalid user identifier' }), { status: 400 });
  }

  try {
    const client = await getConnectedClient();
    
    // Fetch credentials (integrations) for the user, excluding sensitive data
    const query = `SELECT id, name, type, service_name, status, created_at 
                     FROM integrations 
                     WHERE user_id = ? 
                     ALLOW FILTERING`; // Use ALLOW FILTERING if user_id is not the partition key
                     // TODO: Review table schema - ensure efficient querying by user_id
                     
    const params = [userId];
    const result = await client.execute(query, params, { prepare: true });
    
    const credentials = result.rows.map(row => ({
      id: row.id.toString(), // Keep ID as string for frontend compatibility
      name: row.name,
      type: row.type, // e.g., 'apikey', 'oauth2'
      service_name: row.service_name, // e.g., 'OpenAI', 'Google Drive'
      status: row.status, // e.g., 'active', 'expired'?
      created_at: row.created_at ? row.created_at.toISOString() : null,
    }));

    return new Response(JSON.stringify(credentials), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`Error fetching credentials for user ${user.id}:`, error);
    return new Response(JSON.stringify({ message: 'Failed to fetch credentials' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 