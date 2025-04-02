import { getConnectedClient } from '../_utils/astraClient.js';
import { decrypt, encrypt } from '../_utils/encryption.js';
import { types } from '@datastax/cassandra-driver';
import fetch from 'node-fetch';

// Import ReadableStream and TextEncoder if needed (standard in edge runtime)
// const { ReadableStream, WritableStream } = require('node:stream/web'); // Not needed for edge
// const { TextEncoder, TextDecoder } = require('node:util'); // Not needed for edge

export const config = {
  runtime: 'edge' // SSE works well in edge
};

const LANGFLOW_API_URL = process.env.LANGFLOW_API_URL;
const LANGFLOW_API_TOKEN = process.env.LANGFLOW_API_TOKEN;

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
    const updateQuery = `
        UPDATE integrations 
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

// Handles POST /api/flows/execute
export default async function handler(request) {
  // --- 1. Authentication & Basic Setup ---
  if (!LANGFLOW_API_URL || !LANGFLOW_API_TOKEN) {
    console.error('FATAL: Langflow API URL or Token not configured.');
    return new Response(JSON.stringify({ message: 'Flow execution service not configured.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), { status: 405, headers: { 'Allow': 'POST', 'Content-Type': 'application/json' } });
  }

  const user = request.user;
  if (!user || !user.id) {
    return new Response(JSON.stringify({ message: 'Authentication required' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  let userId;
  try {
      userId = types.Uuid.fromString(user.id);
  } catch (e) {
       return new Response(JSON.stringify({ message: 'Invalid user identifier' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // --- 2. Validation & Payload Setup --- 
  let body;
  try {
      body = await request.json();
  } catch (e) {
      return new Response(JSON.stringify({ message: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { flowId, integrationId, inputVariables = {}, overrideFieldName, stream = true } = body; // Default to streaming

  if (!flowId || !integrationId) {
      return new Response(JSON.stringify({ message: 'Missing required fields: flowId and integrationId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  let integrationUuid;
  try {
      integrationUuid = types.Uuid.fromString(integrationId);
  } catch (e) {
       return new Response(JSON.stringify({ message: 'Invalid integrationId format' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (typeof flowId !== 'string' || flowId.length < 10) {
       return new Response(JSON.stringify({ message: 'Invalid flowId format' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    // --- 3. Fetch & Decrypt Integration --- 
    const client = await getConnectedClient();
    const query = 'SELECT type, service_name, status, encrypted_credentials FROM integrations WHERE user_id = ? AND id = ?';
    const params = [userId, integrationUuid];
    const result = await client.execute(query, params, { prepare: true });
    const integration = result.first();
    if (!integration) {
      return new Response(JSON.stringify({ message: 'Integration not found or access denied.' }), { status: 404 });
    }
    if (integration.status !== 'active' && integration.status !== 'connected') {
       return new Response(JSON.stringify({ message: `Integration status is '${integration.status}', cannot use for execution.` }), { status: 403 });
    }
    const decryptedCredentials = decrypt(integration.encrypted_credentials);
    if (!decryptedCredentials) {
      return new Response(JSON.stringify({ message: 'Failed to access integration credentials.' }), { status: 500 });
    }
    let secretValue;
    if (integration.type === 'apikey') {
      secretValue = decryptedCredentials.apiKey;
    } else if (integration.type === 'oauth2') {
        if (decryptedCredentials.expires_at && Date.now() >= decryptedCredentials.expires_at) {
            if (decryptedCredentials.refresh_token) {
                secretValue = await refreshOAuthToken(userId, integrationUuid, integration.service_name, decryptedCredentials.refresh_token);
                if (!secretValue) {
                    await updateIntegrationStatus(userId, integrationUuid, 'reauth_required', 'Token refresh failed. Re-authentication needed.');
                    return new Response(JSON.stringify({ message: 'Connection token expired and refresh failed.' }), { status: 401 });
                }
            } else {
                await updateIntegrationStatus(userId, integrationUuid, 'reauth_required', 'Token expired, no refresh token.');
                return new Response(JSON.stringify({ message: 'Connection token expired.' }), { status: 401 });
            }
        } else {
            secretValue = decryptedCredentials.access_token;
        }
    } else {
       return new Response(JSON.stringify({ message: `Unsupported integration type '${integration.type}'.` }), { status: 400 });
    }
    if (!secretValue) {
        return new Response(JSON.stringify({ message: 'Failed to retrieve secret value.' }), { status: 500 });
    }

    // --- 4. Determine Secret Field Name --- 
    let secretFieldName = overrideFieldName;
    if (!secretFieldName) {
        if (integration.type === 'apikey') {
            secretFieldName = integration.service_name ? `${integration.service_name.toLowerCase()}_api_key` : 'api_key';
        } else if (integration.type === 'oauth2') {
            secretFieldName = integration.service_name ? `${integration.service_name.toLowerCase()}_access_token` : 'access_token';
        } else { secretFieldName = 'credential_value'; }
        secretFieldName = secretFieldName.replace(/[^a-zA-Z0-9_]/g, '_');
    }

    // --- 5. Construct Langflow Payload --- 
    const langflowPayload = {
        input_value: { ...inputVariables, [secretFieldName]: secretValue },
        // stream: true // Langflow API path will include stream=true
    };

    // --- 6. Call Langflow API & Handle Response (SSE or Normal) --- 
    const runUrl = `${LANGFLOW_API_URL}/run/${flowId}?stream=${stream}`; // Use stream flag
    console.log(`Executing Langflow flow: ${flowId} (stream=${stream})`);

    const langflowResponse = await fetch(runUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LANGFLOW_API_TOKEN}`,
            'Accept': stream ? 'text/event-stream' : 'application/json' // Tell Langflow we accept SSE if streaming
        },
        body: JSON.stringify(langflowPayload)
    });

    if (!langflowResponse.ok) {
        // Handle Langflow API errors (same as before)
        const responseBody = await langflowResponse.text();
        console.error(`Langflow API error (${langflowResponse.status}): ${responseBody}`);
        let errorDetail = 'Langflow execution failed.';
        try { errorDetail = JSON.parse(responseBody).detail || errorDetail; } catch {} 
        let clientStatus = 502;
        if (langflowResponse.status === 404) clientStatus = 404; 
        if (langflowResponse.status === 401) clientStatus = 500;
        if (langflowResponse.status === 422) clientStatus = 400;
        return new Response(JSON.stringify({ message: errorDetail }), { status: clientStatus, headers: { 'Content-Type': 'application/json' } });
    }

    // --- Handle Streaming Response (SSE) --- 
    if (stream && langflowResponse.body) {
      // Check if Langflow actually responded with SSE
      const contentType = langflowResponse.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream')) {
           console.warn(`Requested stream but Langflow responded with ${contentType}. Returning full response.`);
            // Fallback to returning the full body if Langflow didn't stream
            const fullBody = await langflowResponse.text();
            return new Response(fullBody, { 
                status: 200, 
                headers: { 'Content-Type': contentType || 'application/json' } 
            });
      }

      console.log('Returning SSE stream from Langflow.');
      // Use TextEncoderStream if available, otherwise basic ReadableStream piping
      // Edge runtime provides ReadableStream and TextEncoder directly.
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          const reader = langflowResponse.body.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                console.log('Langflow stream ended. Sending end event.');
                // Send custom 'end' event before closing
                controller.enqueue(encoder.encode('event: end\ndata: { "status": "completed" }\n\n'));
                break; // Exit the loop
              }
              // Pass through the data chunk from Langflow
              // Assuming Langflow sends SSE-formatted chunks already (data: ...\n\n)
              // If Langflow just sends raw JSON chunks, we need to format them:
              // controller.enqueue(encoder.encode(`data: ${new TextDecoder().decode(value)}\n\n`)); 
              // For now, assume Langflow sends valid SSE chunks and pass through:
              controller.enqueue(value); 
            }
          } catch (error) {
            console.error('Error reading Langflow stream:', error);
            // Send custom 'error_event' before closing on error
            const errorPayload = JSON.stringify({ message: 'Error reading upstream flow results.' });
            controller.enqueue(encoder.encode(`event: error_event\ndata: ${errorPayload}\n\n`));
            controller.error(error); // Signal error to the stream
          } finally {
            console.log('Closing SSE controller.');
            controller.close(); // Close the stream when done or on error
            reader.releaseLock(); // Ensure the lock is released
          }
        }
        // Optional: Handle cancellation if the client closes the connection
        // cancel(reason) {
        //   console.log('SSE stream cancelled by client:', reason);
        //   // Perform any necessary cleanup
        // }
      });

      return new Response(readableStream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });

    } else {
        // --- Handle Non-Streaming Response --- 
        console.log(`Returning non-streaming response from Langflow.`);
        const responseBody = await langflowResponse.text(); 
        return new Response(responseBody, { 
            status: 200, 
            headers: { 
                'Content-Type': langflowResponse.headers.get('Content-Type') || 'application/json'
            }
         });
    }

  } catch (error) {
    // ... General error handling (same as before) ...
    console.error(`Error in /api/flows/execute for user ${user.id}:`, error);
    let errorMessage = 'Internal Server Error during flow execution.';
    if (error.message?.includes('expired')) errorMessage = 'Connection token expired or refresh failed.';
    // Add other specific error checks if needed
    return new Response(JSON.stringify({ message: errorMessage }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' } 
        });
  }
} 