import { getConnectedClient } from '../_utils/astraClient.js';
import { types } from '@datastax/cassandra-driver';

export const config = {
  runtime: 'edge'
};

// Handles DELETE /api/integrations/{id}
export default async function handler(request) {
  const user = request.user;

  if (!user || !user.id) {
    return new Response(JSON.stringify({ message: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Extract integration ID from the path parameter
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const integrationIdStr = pathSegments[pathSegments.length - 1]; // Get the last part of the path

  if (!integrationIdStr) {
      return new Response(JSON.stringify({ message: 'Missing integration ID in path' }), { status: 400 });
  }

  let userId;
  let integrationId;
  try {
      userId = types.Uuid.fromString(user.id);
      integrationId = types.Uuid.fromString(integrationIdStr);
  } catch (e) {
       console.error("Invalid user ID or integration ID format:", { userId: user.id, integrationId: integrationIdStr, error: e });
       return new Response(JSON.stringify({ message: 'Invalid ID format' }), { status: 400 });
  }

  if (request.method === 'DELETE') {
    try {
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

      // Perform the delete operation
      // Using a lightweight transaction (Compare-and-Set) ensures we only delete if it exists and belongs to the user
      const deleteQuery = 'DELETE FROM integrations WHERE user_id = ? AND id = ? IF EXISTS';
      const params = [userId, integrationId];
      const result = await client.execute(deleteQuery, params, { prepare: true });

      // Check if the deletion was applied
      // The result for a conditional delete contains an '[applied]' column
      if (result.rows[0]['[applied]']) {
            console.log(`Successfully deleted integration ${integrationIdStr} for user ${user.id}`);
            return new Response(null, { status: 204 }); // 204 No Content for successful deletion
      } else {
            // If not applied, it means the record didn't exist or the condition (user_id match) failed.
            console.warn(`Integration ${integrationIdStr} not found for deletion or user mismatch for user ${user.id}`);
            // Return 404 Not Found, as the resource to be deleted doesn't exist for this user.
            return new Response(JSON.stringify({ message: 'Integration not found' }), { 
                status: 404, 
                headers: { 'Content-Type': 'application/json' } 
            }); 
      }

    } catch (error) {
      console.error(`Error deleting integration ${integrationIdStr} for user ${user.id}:`, error);
      return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
    }
  } else {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), {
      status: 405,
      headers: { 'Allow': 'DELETE' },
    });
  }
} 