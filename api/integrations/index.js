import { v4 as uuidv4 } from 'uuid';
import { getConnectedClient } from '../_utils/astraClient.js';
import { encrypt, decrypt } from '../_utils/encryption.js';
import { types } from '@datastax/cassandra-driver';
import { sign } from '@tsndr/cloudflare-worker-jwt';
import { verifyAuth, addStandardHeaders, createErrorResponse } from '../auth_handler.js';

// export const config = { runtime: 'edge' }; // Remove edge config

// --- Helper for OAuth URL Construction (keep as is) --- 
function constructOAuthUrl(serviceName, state) {
    // Ensure VERCEL_URL is correctly set in environment (includes https://)
    const vercelUrl = process.env.VERCEL_URL;
    const baseUrl = vercelUrl ? `https://${vercelUrl}` : 'http://localhost:5173'; // Default to localhost for local dev
    const redirectUri = `${baseUrl}/api/integrations/oauth/callback`;
    
    console.log(`Constructing OAuth URL for ${serviceName} with redirect URI: ${redirectUri}`);

    // Example for Google:
    if (serviceName.toLowerCase() === 'google_drive' || serviceName.toLowerCase() === 'gdrive') {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) {
            console.error('GOOGLE_CLIENT_ID environment variable is not set.');
            return null;
        }
        const scopes = [
          'https://www.googleapis.com/auth/drive.readonly',
          'https://www.googleapis.com/auth/userinfo.email', // Request email scope to potentially link back to user
          'https://www.googleapis.com/auth/userinfo.profile'
        ].join(' ');
        
        try {
            const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
            url.searchParams.set('client_id', clientId);
            url.searchParams.set('redirect_uri', redirectUri);
            url.searchParams.set('response_type', 'code');
            url.searchParams.set('scope', scopes);
            url.searchParams.set('state', state);
            url.searchParams.set('access_type', 'offline');
            url.searchParams.set('prompt', 'consent');
            return url.toString();
        } catch (e) {
             console.error("Error constructing Google OAuth URL:", e);
             return null;
        }
    }

    // Add other providers here...

    console.warn(`OAuth URL construction not implemented for service: ${serviceName}`);
    return null;
}

// Handles GET /api/integrations and POST /api/integrations
export default async function handler(request) {

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const optionsResponse = new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400' 
      }
    });
    return addStandardHeaders(optionsResponse);
  }

  try {
    // --- Authentication --- 
    const user = await verifyAuth(request);
    let userId;
    try {
        userId = types.Uuid.fromString(user.id);
    } catch (e) {
         console.error("Invalid user ID format in JWT payload:", user.id);
         return createErrorResponse('Invalid user identifier', 400);
    }

    // --- DB Connection --- 
    const client = await getConnectedClient();

    if (request.method === 'GET') {
      // --- GET /api/integrations --- 
      const query = `SELECT id, name, type, service_name, status, created_at, last_used_at, metadata 
                       FROM integrations 
                       WHERE user_id = ?`;
      const params = [userId];
      const result = await client.execute(query, params, { prepare: true });
      
      const integrations = result.rows.map(row => ({
        id: row.id.toString(),
        name: row.name,
        type: row.type,
        service_name: row.service_name,
        status: row.status,
        created_at: row.created_at ? row.created_at.toISOString() : null,
        last_used_at: row.last_used_at ? row.last_used_at.toISOString() : null,
        metadata: row.metadata || {} 
      }));

      const successGetResponse = new Response(JSON.stringify(integrations), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      return addStandardHeaders(successGetResponse);

    } else if (request.method === 'POST') {
      // --- POST /api/integrations --- 
      let body;
      try {
          body = await request.json();
      } catch (e) {
          return createErrorResponse('Invalid JSON body', 400);
      }
      
      if (!body || !body.type || !body.service_name) {
          return createErrorResponse('Missing required fields: type and service_name', 400);
      }

      const integrationId = types.Uuid.random();
      const createdAt = new Date();
      let name = body.name || null;
      let status = 'pending';
      let encryptedCreds = null;
      let metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};
      let userIdString = user.id;

      if (body.type === 'apikey') {
        if (!name || !body.apiKey) {
          return createErrorResponse('API Key type requires name and apiKey fields', 400);
        }
        try {
            const keyToEncrypt = { apiKey: body.apiKey };
            encryptedCreds = encrypt(keyToEncrypt);
            if (!encryptedCreds) {
                throw new Error('Encryption failed'); // Trigger catch block
            }
        } catch (encError) {
            console.error(`Encryption failed for user ${userIdString}, service ${body.service_name}:`, encError);
            return createErrorResponse('Failed to process credentials', 500);
        }
        status = 'active'; 
        const keyPrefix = body.apiKey.substring(0, Math.min(4, body.apiKey.length)) + '...';
        metadata = { ...metadata, key_prefix: keyPrefix }; 

        // --- Save API Key Integration to DB --- 
        const insertQuery = `
          INSERT INTO integrations (user_id, id, name, type, service_name, status, encrypted_credentials, created_at, updated_at, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const insertParams = [
          userId,
          integrationId,
          name,
          body.type,
          body.service_name,
          status,
          encryptedCreds,
          createdAt,
          createdAt, 
          metadata
        ];

        await client.execute(insertQuery, insertParams, { prepare: true });

        const newIntegrationData = {
          id: integrationId.toString(),
          name: name,
          type: body.type,
          service_name: body.service_name,
          status: status,
          created_at: createdAt.toISOString(),
          last_used_at: null,
          metadata: metadata
        };

        const apiKeyCreatedResponse = new Response(JSON.stringify(newIntegrationData), {
          status: 201, 
          headers: { 'Content-Type': 'application/json' },
        });
        return addStandardHeaders(apiKeyCreatedResponse);

      } else if (body.type === 'oauth2') {
        // --- Secure OAuth Initiation --- 
        const serviceName = body.service_name;
        if (!serviceName) {
             return createErrorResponse('Missing service_name for OAuth2 integration', 400);
        }
        
        const statePayload = {
          userId: userIdString,
          serviceName: serviceName,
          jti: uuidv4(),
          exp: Math.floor(Date.now() / 1000) + (5 * 60) 
        };

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
             console.error('FATAL: JWT_SECRET environment variable is not set for signing OAuth state.');
             return createErrorResponse('OAuth service configuration error', 503);
        }
        let stateJwt;
        try {
            stateJwt = await sign(statePayload, jwtSecret);
        } catch (signError) {
            console.error('Failed to sign OAuth state JWT:', signError);
            return createErrorResponse('Failed to initiate OAuth connection', 500);
        }

        const authorizationUrl = constructOAuthUrl(serviceName, stateJwt);
        if (!authorizationUrl) {
            return createErrorResponse(`OAuth for ${serviceName} not supported or configured`, 400);
        }

        const oauthInitiateResponse = new Response(JSON.stringify({ authorization_url: authorizationUrl }), {
          status: 200, 
          headers: { 'Content-Type': 'application/json' },
        });
        return addStandardHeaders(oauthInitiateResponse);

      } else {
        return createErrorResponse(`Unsupported integration type: ${body.type}`, 400);
      }

    } else {
      const methodNotAllowedResponse = new Response(JSON.stringify({ status: 'error', message: 'Method not allowed' }), {
        status: 405,
        headers: { 'Allow': 'GET, POST, OPTIONS', 'Content-Type': 'application/json' },
      });
      return addStandardHeaders(methodNotAllowedResponse);
    }

  } catch (error) {
    // --- Global Error Handling --- 
    if (error.message.startsWith('Authentication')) {
        return createErrorResponse(error.message, 401);
    }
    if (error instanceof SyntaxError) { 
        return createErrorResponse('Invalid JSON body', 400);
    } 
    // Log the detailed error for server-side debugging
    console.error(`Error in /api/integrations (${request.method}) for user ${user?.id}:`, error);
    // Return a generic error to the client
    return createErrorResponse('Internal Server Error', 500);
  }
} 