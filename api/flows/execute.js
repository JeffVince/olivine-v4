import { getConnectedClient } from '../_utils/astraClient.js';
import { decrypt, encrypt } from '../_utils/encryption.js';
import { verifyAuth, addStandardHeaders, createErrorResponse } from '../auth_handler.js';
import { types } from '@datastax/cassandra-driver';
import { sendMessage as sendPulsarMessage } from '../_utils/pulsarProducer.js';

// Import ReadableStream and TextEncoder if needed (standard in edge runtime)
// const { ReadableStream, WritableStream } = require('node:stream/web'); // Not needed for edge
// const { TextEncoder, TextDecoder } = require('node:util'); // Not needed for edge

// export const config = { ... }; // <-- REMOVED runtime config

// --- Helper Function for OAuth Token Refresh --- 
async function refreshOAuthToken(userId, integrationId, serviceName, refreshToken) {
  console.log(`Attempting to refresh OAuth token for integration ${integrationId}, service ${serviceName}, user ${userId}`);
  let tokenUrl = '';
  let clientId = '';
  let clientSecret = '';
  let body = {};

  // --- Google Example --- 
  if (serviceName.toLowerCase() === 'google_drive' || serviceName.toLowerCase() === 'gdrive') {
    tokenUrl = 'https://oauth2.googleapis.com/token';
    clientId = process.env.GOOGLE_CLIENT_ID;
    clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        console.error('Missing Google Client ID or Secret for token refresh.');
        return null;
    }
    body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });
  } 
  // --- Add other providers here --- 
  else {
    console.error(`Token refresh not implemented for service: ${serviceName}`);
    return null;
  }

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Token refresh failed for ${serviceName} (${response.status}):`, data);
      // IMPORTANT: If refresh fails (e.g., invalid_grant), the integration might need manual re-authentication.
      // Consider updating the integration status to 'error' or 'reauth_required' in the DB here.
      // await updateIntegrationStatus(userId, integrationId, 'error', 'Token refresh failed');
      return null;
    }

    console.log(`Token refresh successful for ${serviceName}, integration ${integrationId}`);
    
    // --- Update stored credentials with new token --- 
    const newAccessToken = data.access_token;
    // Note: Google might not return a new refresh token on every refresh
    const newRefreshToken = data.refresh_token || refreshToken; // Keep old one if new one isn't provided
    const newExpiresAt = data.expires_in ? Date.now() + (data.expires_in * 1000) : null;
    const newScope = data.scope;

    const credentialsToEncrypt = {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_at: newExpiresAt,
      scope: newScope,
    };
    const newEncryptedCreds = encrypt(credentialsToEncrypt);

    if (!newEncryptedCreds) {
         console.error(`Encryption failed after token refresh for integration ${integrationId}`);
         // Return the new token for this execution, but log the failure to update storage
         return newAccessToken; 
    }

    // Update DB
    const client = await getConnectedClient();
    const integrationsTable = 'flow_app_prod.integrations';
    const updateQuery = `
        UPDATE ${integrationsTable} 
        SET encrypted_credentials = ?, updated_at = ?, status = ?
        WHERE user_id = ? AND id = ? 
        IF EXISTS
    `;
    const updateParams = [
        newEncryptedCreds,
        new Date(),
        'connected', // Reset status to connected
        userId,
        integrationId
    ];
    await client.execute(updateQuery, updateParams, { prepare: true });
    console.log(`Successfully updated stored tokens for integration ${integrationId}`);

    return newAccessToken;

  } catch (error) {
    console.error(`Error during token refresh fetch for ${serviceName}:`, error);
    return null;
  }
}

// Helper to update integration status in DB (can be moved to a utils file)
async function updateIntegrationStatus(userId, integrationId, newStatus, statusMessage = null) {
    try {
        const client = await getConnectedClient();
        // Update status and add a message to metadata
        let metadataUpdate = statusMessage ? { status_message: statusMessage } : {};
        const query = `
            UPDATE integrations 
            SET status = ?, updated_at = ?, metadata = metadata + ?
            WHERE user_id = ? AND id = ? 
            IF EXISTS
        `;
        await client.execute(query, [newStatus, new Date(), metadataUpdate, userId, integrationId], { prepare: true });
        console.log(`Updated status to ${newStatus} for integration ${integrationId}`);
    } catch (dbError) {
        console.error(`Failed to update status for integration ${integrationId}:`, dbError);
        // Log error but don't block the main flow if status update fails
    }
}

// Handles POST /api/flows/execute -> Triggers flow via Pulsar
export default async function handler(request) {

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    // Basic response allowing common methods and headers
    // Adjust Allowed Methods/Headers if needed for this specific endpoint
    const optionsResponse = new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'POST, OPTIONS', 
        'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Add other headers if needed
        'Access-Control-Max-Age': '86400' // 24 hours
      }
    });
    // Add standard security/CORS headers to the preflight response
    return addStandardHeaders(optionsResponse); 
  }

  // --- Main logic wrapped in try/catch --- 
  try {
    // --- 1. Authentication --- 
    // Verify auth token and get user payload
    const user = await verifyAuth(request); 
    // User ID is now available via user.id (assuming JWT payload has 'id')

    // --- Basic Setup/Validation (keeping existing checks) ---
    if (!LANGFLOW_API_URL || !LANGFLOW_API_TOKEN) {
      console.error('FATAL: Langflow API URL or Token not configured.');
      // Use createErrorResponse for consistency
      return createErrorResponse('Flow execution service not configured.', 503);
    }

    if (request.method !== 'POST') {
       // Should ideally not be reached if OPTIONS is handled, but keep as safeguard
       const methodNotAllowedResponse = new Response(JSON.stringify({ status: 'error', message: 'Method not allowed' }), {
          status: 405,
          headers: { 'Allow': 'POST', 'Content-Type': 'application/json' } 
       });
       return addStandardHeaders(methodNotAllowedResponse);
    }

    let userId;
    try {
        // Use the id from the verified JWT payload
        userId = types.Uuid.fromString(user.id); 
    } catch (e) {
        console.error(`Invalid user ID format in JWT: ${user.id}`);
        return createErrorResponse('Invalid user identifier', 400);
    }

    // --- 2. Validation & Payload Setup (using createErrorResponse) --- 
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return createErrorResponse('Invalid JSON body', 400);
    }

    const { agentId, inputs = {}, executionId } = body; 

    if (!agentId) {
        return createErrorResponse('Missing required field: agentId', 400);
    }
    if (!executionId) {
         console.warn("Missing executionId from frontend request.");
         // Decide if this is critical. Let's allow it for now but log.
         // return createErrorResponse('Missing required field: executionId', 400);
    }
    if (!inputs || typeof inputs !== 'object') {
         return createErrorResponse('Invalid inputs format', 400);
    }

    let agentUuid;
    try {
        agentUuid = types.Uuid.fromString(agentId);
    } catch (e) {
         return createErrorResponse('Invalid agentId format', 400);
    }

    // --- 3. Fetch Agent Config & Credentials --- 
    const client = await getConnectedClient();
    const agentsTable = 'flow_app_prod.agents';
    const integrationsTable = 'flow_app_prod.integrations';

    // Fetch agent details including the Langflow flow ID and associated credential IDs
    const agentQuery = `SELECT langflow_flow_id, associated_credential_ids 
                        FROM ${agentsTable} 
                        WHERE owner_user_id = ? AND agent_id = ? LIMIT 1`;
    const agentResult = await client.execute(agentQuery, [userId, agentUuid], { prepare: true });
    const agentConfig = agentResult.first();

    if (!agentConfig) {
        return createErrorResponse('Agent not found or access denied.', 404);
    }
    if (!agentConfig.langflow_flow_id) {
        console.error(`Agent ${agentId} for user ${user.id} is missing the underlying Langflow flow ID.`);
        return createErrorResponse('Agent configuration incomplete (missing flow ID).', 500);
    }

    const langflowFlowId = agentConfig.langflow_flow_id;
    const credentialIds = agentConfig.associated_credential_ids || []; // Array of string UUIDs
    const decryptedCredentialsMap = {}; // Store decrypted credentials { integrationId: value }

    // Fetch and decrypt all associated credentials
    if (credentialIds.length > 0) {
        // Convert string UUIDs to driver type for the IN clause
        const credentialUuids = credentialIds.map(id => types.Uuid.fromString(id)); 
        
        const credQuery = `SELECT id, type, service_name, status, encrypted_credentials 
                           FROM ${integrationsTable} 
                           WHERE user_id = ? AND id IN ?`;
        const credResult = await client.execute(credQuery, [userId, credentialUuids], { prepare: true });

        for (const row of credResult.rows) {
            const integrationId = row.id.toString();
            if (row.status !== 'active' && row.status !== 'connected') {
                console.warn(`Associated credential ${integrationId} has status ${row.status} and will be skipped for agent ${agentId}.`);
                continue; // Skip inactive credentials
            }

            const decrypted = decrypt(row.encrypted_credentials);
            if (!decrypted) {
                 console.error(`Decryption failed for credential ${integrationId} associated with agent ${agentId}`);
                 // Decide how to handle: fail execution? proceed without it? Let's fail for safety.
                 return createErrorResponse(`Failed to decrypt associated credential ${integrationId}.`, 500);
            }

            let secretValue;
            if (row.type === 'apikey') {
                secretValue = decrypted.apiKey;
            } else if (row.type === 'oauth2') {
                const expiryBufferMs = 5 * 60 * 1000; 
                if (decrypted.expires_at && (Date.now() + expiryBufferMs) >= decrypted.expires_at) {
                    if (decrypted.refresh_token) {
                        // Attempt refresh - Note: refreshOAuthToken needs encrypt import if DB update is kept
                        secretValue = await refreshOAuthToken(userId, row.id, row.service_name, decrypted.refresh_token);
                        if (!secretValue) {
                             await updateIntegrationStatus(userId, row.id, 'reauth_required', 'Token refresh failed during agent execution.');
                             return createErrorResponse(`Credential ${integrationId} expired and refresh failed.`, 401); 
                        }
                    } else {
                         await updateIntegrationStatus(userId, row.id, 'reauth_required', 'Token expired, no refresh token.');
                        return createErrorResponse(`Credential ${integrationId} expired, re-authentication required.`, 401); 
                    }
                } else {
                    secretValue = decrypted.access_token;
                }
            } else {
                 console.warn(`Skipping unsupported credential type ${row.type} for id ${integrationId}`);
                 continue;
            }
            
            if (secretValue) {
                // Determine field name (e.g., openai_api_key, google_drive_access_token)
                let secretFieldName;
                 if (row.type === 'apikey') {
                    secretFieldName = row.service_name ? `${row.service_name.toLowerCase()}_api_key` : 'api_key';
                } else if (row.type === 'oauth2') {
                    secretFieldName = row.service_name ? `${row.service_name.toLowerCase()}_access_token` : 'access_token';
                } else { secretFieldName = 'credential_value'; }
                secretFieldName = secretFieldName.replace(/[^a-zA-Z0-9_]/g, '_');
                
                decryptedCredentialsMap[secretFieldName] = secretValue;
            } else {
                console.error(`Failed to retrieve secret value for integration ${integrationId} after checks.`);
                return createErrorResponse(`Failed to retrieve secret value for credential ${integrationId}.`, 500);
            }
        }
    }

    // --- 4. Construct Pulsar Message Payload --- 
    const pulsarPayload = {
      executionId: executionId || types.TimeUuid.now().toString(), // Use provided or generate one
      userId: user.id, // Pass user ID (string UUID)
      agentId: agentId, // Pass agent ID (string UUID)
      langflowFlowId: langflowFlowId, // The actual Langflow flow to run
      inputs: inputs, // Inputs from the frontend (e.g., { input_value: '...', conversation_id: '...' })
      credentials: decryptedCredentialsMap, // Map of { field_name: secret_value }
      // Add any other context needed by the worker/Langflow flow
    };

    // --- 5. Send Message to Pulsar --- 
    await sendPulsarMessage(pulsarPayload);
    
    console.log(`Successfully queued execution request ${pulsarPayload.executionId} for agent ${agentId}, user ${user.id}`);

    // --- 6. Return Accepted Response --- 
    const acceptedResponse = new Response(JSON.stringify({ 
        message: 'Flow execution request accepted', 
        executionId: pulsarPayload.executionId 
    }), { status: 202 }); // 202 Accepted
    return addStandardHeaders(acceptedResponse);

  } catch (error) {
    // --- Catch errors from verifyAuth or other unexpected errors ---
    console.error(`Unhandled error in /api/flows/execute for user ${user?.id || 'unknown'}:`, error);
    
    // Check if it's an auth error from verifyAuth
    if (error.message.startsWith('Authentication required') || error.message.startsWith('Authentication failed')) {
      return createErrorResponse(error.message, 401);
    } 
    // Handle other specific errors if needed
    // else if (error instanceof SpecificCustomError) { ... }
    
    // Generic fallback error
    return createErrorResponse('Internal Server Error', 500);
  }
} 