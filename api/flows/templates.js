import { getConnectedClient } from '../_utils/astraClient.js';
import { types } from '@datastax/cassandra-driver';
import { verifyAuth, addStandardHeaders, createErrorResponse } from '../auth_handler.js';

// export const config = { runtime: 'edge' }; // Remove edge config

// Handles GET /api/flows/templates
export default async function handler(request) {

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const optionsResponse = new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'GET, OPTIONS', 
        'Access-Control-Allow-Headers': 'Authorization', // Only auth needed?
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
    // This route might be partially public (fetch public templates without auth)
    // Let's try verifying auth, but allow it to fail gracefully for public access
    let user = null;
    let userId = null;
    try {
        user = await verifyAuth(request);
        userId = types.Uuid.fromString(user.id); 
    } catch (authError) {
        console.log("Auth verification failed or missing for /api/flows/templates, fetching public only.");
        // Allow request to proceed without user context
    }

    // --- Fetching Logic --- 
    const client = await getConnectedClient();
    const tableName = 'flow_app_prod.flow_templates'; // TODO: Move to env var?

    // Query 1: Always fetch public templates
    const publicQuery = `SELECT template_id, name, description, tags, created_at FROM ${tableName} WHERE is_public = true ALLOW FILTERING`;
    const queries = [{ query: publicQuery, params: [] }];

    // Query 2: Fetch user-owned templates ONLY if user is authenticated
    if (userId) {
        const userQuery = `SELECT template_id, name, description, tags, created_at FROM ${tableName} WHERE owner_user_id = ?`;
        queries.push({ query: userQuery, params: [userId] });
    }

    // Execute queries concurrently
    const results = await Promise.all(queries.map(q => client.execute(q.query, q.params, { prepare: true })));

    const templatesMap = new Map(); // Use map to deduplicate

    results.forEach(resultSet => {
        resultSet.rows.forEach(row => {
            const templateIdStr = row.template_id.toString();
            if (!templatesMap.has(templateIdStr)) {
                templatesMap.set(templateIdStr, {
                    id: templateIdStr,
                    template_id: templateIdStr,
                    name: row.name,
                    description: row.description,
                    tags: row.tags || [],
                    created_at: row.created_at ? row.created_at.toISOString() : null,
                    // TODO: Add is_owner based on whether userId was present and matched owner_user_id if fetched?
                });
            }
        });
    });

    const templates = Array.from(templatesMap.values());
    templates.sort((a, b) => (a.name || '').localeCompare(b.name || '')); 

    // Create successful response
    const successResponse = new Response(JSON.stringify(templates), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    // Add standard headers and return
    return addStandardHeaders(successResponse); 

  } catch (error) {
    console.error(`Error fetching flow templates:`, error);
    // Return standard error response
    return createErrorResponse('Failed to fetch flow templates', 500);
  }
} 