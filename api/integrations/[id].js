import { getConnectedClient } from '../_utils/astraClient.js';
import { types } from '@datastax/cassandra-driver';
import { verifyAuth, addStandardHeaders, createErrorResponse } from '../auth_handler.js';

// export const config = { runtime: 'edge' }; // Remove edge config

// Handles DELETE /api/integrations/{id}
export default async function handler(request) {

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const optionsResponse = new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization',
        'Access-Control-Max-Age': '86400' 
      }
    });
    return addStandardHeaders(optionsResponse);
  }
  
  // Extract integration ID from the path parameter early for errors
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const integrationIdStr = pathSegments[pathSegments.length - 1];

  if (!integrationIdStr) {
      return createErrorResponse('Missing integration ID in path', 400);
  }

  if (request.method !== 'DELETE') {
    const methodNotAllowedResponse = new Response(JSON.stringify({ status: 'error', message: 'Method not allowed' }), {
      status: 405,
      headers: { 'Allow': 'DELETE, OPTIONS', 'Content-Type': 'application/json' },
    });
    return addStandardHeaders(methodNotAllowedResponse);
  }

  try {
    // --- Authentication & ID Parsing ---
    const user = await verifyAuth(request);
    let userId;
    let integrationId;
    try {
        userId = types.Uuid.fromString(user.id);
        integrationId = types.Uuid.fromString(integrationIdStr);
    } catch (e) {
         console.error("Invalid user ID or integration ID format:", { userId: user.id, integrationId: integrationIdStr, error: e });
         return createErrorResponse('Invalid ID format', 400);
    }

    // --- Database Delete Operation ---
    const client = await getConnectedClient();

    // Optional: Fetch the integration first to check ownership and type (e.g., for OAuth revocation)
    // const selectQuery = 'SELECT type, service_name FROM integrations WHERE user_id = ? AND id = ?';
    // const selectResult = await client.execute(selectQuery, [userId, integrationId], { prepare: true });
    // const integration = selectResult.first();
    // if (!integration) {
    //     return new Response(JSON.stringify({ message: 'Integration not found or not owned by user' }), { status: 404 });
    // }
    // if (integration.type === 'oauth2') { 
    //    // TODO: Call provider's token revocation endpoint if applicable/required
    //    // await revokeOAuthToken(integration.service_name, encryptedCredentials);
    // }

    // Perform the delete operation using IF EXISTS for idempotency and ownership check
    const deleteQuery = 'DELETE FROM integrations WHERE user_id = ? AND id = ? IF EXISTS';
    const params = [userId, integrationId];
    const result = await client.execute(deleteQuery, params, { prepare: true });

    const wasApplied = result.rows[0]['[applied]'];

    if (wasApplied) {
        console.log(`Successfully deleted integration ${integrationIdStr} for user ${user.id}`);
        const successResponse = new Response(null, { status: 204 }); // 204 No Content
        return addStandardHeaders(successResponse);
    } else {
        // If not applied, it means the record didn't exist for this user.
        console.warn(`Integration ${integrationIdStr} not found for deletion or user mismatch for user ${user.id}`);
        return createErrorResponse('Integration not found', 404);
    }

  } catch (error) {
    // --- Global Error Handling ---
    if (error.message.startsWith('Authentication')) {
        return createErrorResponse(error.message, 401);
    }
    console.error(`Error deleting integration ${integrationIdStr} for user ${user?.id}:`, error);
    return createErrorResponse('Internal Server Error', 500);
  }
} 