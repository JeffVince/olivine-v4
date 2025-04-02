import { getConnectedClient } from '../../_utils/astraClient.js';
import { encrypt, decrypt } from '../../_utils/encryption.js';
import { types } from '@datastax/cassandra-driver';
import crypto from 'crypto'; // Needed for generating new key

export const config = {
  runtime: 'edge'
};

// Generate a reasonably secure random API key
function generateApiKey(prefix = 'olv_sk_', length = 32) {
  // Use more secure random bytes
  const randomBytes = crypto.randomBytes(length);
  // Encode bytes to a URL-safe base64 string, remove padding
  const keyBody = randomBytes.toString('base64url').slice(0, length);
  return prefix + keyBody;
}

// Handles POST /api/integrations/{id}/rotate
export default async function handler(request) {
  const user = request.user;

  if (!user || !user.id) {
    return new Response(JSON.stringify({ message: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Extract integration ID from the path
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  // Path is like /api/integrations/{id}/rotate, so id is 3rd from end
  const integrationIdStr = pathSegments[pathSegments.length - 2]; 

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

  if (request.method === 'POST') {
    try {
      const client = await getConnectedClient();

      // 1. Fetch the existing integration to verify ownership and type
      const selectQuery = 'SELECT type, encrypted_credentials, metadata FROM integrations WHERE user_id = ? AND id = ?';
      const selectResult = await client.execute(selectQuery, [userId, integrationId], { prepare: true });
      const integration = selectResult.first();

      if (!integration) {
        return new Response(JSON.stringify({ message: 'Integration not found or not owned by user' }), { status: 404 });
      }

      // 2. Check if it's an API key type
      if (integration.type !== 'apikey') {
        return new Response(JSON.stringify({ message: 'Rotation is only supported for API keys' }), { status: 400 });
      }

      // 3. Generate a new API key
      const newApiKey = generateApiKey(); // Use our helper function

      // 4. Encrypt the new API key
      const newCredentialsToEncrypt = { apiKey: newApiKey };
      const newEncryptedCreds = encrypt(newCredentialsToEncrypt);
      if (!newEncryptedCreds) {
        console.error(`Encryption failed during rotation for user ${user.id}, integration ${integrationIdStr}`);
        return new Response(JSON.stringify({ message: 'Failed to encrypt new credentials' }), { status: 500 });
      }

      // 5. Update the database record with the new encrypted key and update timestamp
      const newUpdatedAt = new Date();
      // Update metadata with new prefix
      const newMetadata = { 
          ...(integration.metadata || {}), 
          key_prefix: newApiKey.substring(0, Math.min(4, newApiKey.length)) + '...' 
      }; 

      const updateQuery = `
        UPDATE integrations 
        SET encrypted_credentials = ?, updated_at = ?, metadata = ?
        WHERE user_id = ? AND id = ? 
        IF EXISTS // Ensure it still exists before updating
      `;
      const updateParams = [
        newEncryptedCreds,
        newUpdatedAt,
        newMetadata,
        userId,
        integrationId
      ];

      const updateResult = await client.execute(updateQuery, updateParams, { prepare: true });

      // Check if the update was applied
       if (!updateResult.rows[0]['[applied]']) {
           console.warn(`Integration ${integrationIdStr} not found during rotation update for user ${user.id}`);
           // This might happen if deleted between the read and write - treat as not found
           return new Response(JSON.stringify({ message: 'Integration not found' }), { status: 404 });
       }

      // 6. Return the *new* raw API key (only time it's exposed)
      console.log(`Successfully rotated API key ${integrationIdStr} for user ${user.id}`);
      return new Response(JSON.stringify({ 
          id: integrationIdStr, // Return the ID for reference
          newApiKey: newApiKey 
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
      console.error(`Error rotating API key ${integrationIdStr} for user ${user.id}:`, error);
      // Add specific error checks if needed (e.g., DB errors)
      return new Response(JSON.stringify({ message: 'Internal Server Error during rotation' }), { status: 500 });
    }
  } else {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), {
      status: 405,
      headers: { 'Allow': 'POST' },
    });
  }
} 