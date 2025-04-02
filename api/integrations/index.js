import { v4 as uuidv4 } from 'uuid';
import { getConnectedClient } from '../_utils/astraClient.js';
import { encrypt, decrypt } from '../_utils/encryption.js';
import { types } from '@datastax/cassandra-driver';
import { sign } from '@tsndr/cloudflare-worker-jwt';

export const config = {
  runtime: 'edge' // Use edge runtime for Vercel functions
};

// Handles GET /api/integrations and POST /api/integrations
export default async function handler(request) {
  const user = request.user;

  // Middleware should guarantee user object, but double-check
  if (!user || !user.id) {
    return new Response(JSON.stringify({ message: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // Ensure userId is parsed correctly (assuming JWT stores it as string, convert to UUID for query)
  let userId;
  try {
      userId = types.Uuid.fromString(user.id);
  } catch (e) {
       console.error("Invalid user ID format in JWT payload:", user.id);
       return new Response(JSON.stringify({ message: 'Invalid user identifier' }), { status: 400 });
  }

  try {
    const client = await getConnectedClient();

    if (request.method === 'GET') {
      // --- GET /api/integrations --- 
      const query = `SELECT id, name, type, service_name, status, created_at, last_used_at, metadata 
                       FROM integrations 
                       WHERE user_id = ?`;
      const params = [userId];
      const result = await client.execute(query, params, { prepare: true });
      
      const integrations = result.rows.map(row => ({
        id: row.id.toString(), // Keep as string for frontend
        name: row.name,
        type: row.type,
        service_name: row.service_name,
        status: row.status,
        // Use toLocaleString for better date representation or keep ISO
        created_at: row.created_at ? row.created_at.toISOString() : null,
        last_used_at: row.last_used_at ? row.last_used_at.toISOString() : null,
        metadata: row.metadata || {} 
      }));

      return new Response(JSON.stringify(integrations), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } else if (request.method === 'POST') {
      // --- POST /api/integrations --- 
      const body = await request.json();
      
      if (!body || !body.type || !body.service_name) {
          return new Response(JSON.stringify({ message: 'Missing required fields: type and service_name' }), { 
              status: 400, 
              headers: { 'Content-Type': 'application/json' } 
            });
      }

      const integrationId = types.Uuid.random(); // Generate Cassandra UUID
      const createdAt = new Date();
      let name = body.name || null;
      let status = 'pending';
      let encryptedCreds = null;
      let metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {}; // Ensure metadata is object

      let userIdString = user.id; // Get user ID as string from JWT payload

      if (body.type === 'apikey') {
        if (!name || !body.apiKey) {
          return new Response(JSON.stringify({ message: 'API Key type requires name and apiKey fields' }), { 
              status: 400, 
              headers: { 'Content-Type': 'application/json' } 
            });
        }
        const keyToEncrypt = { apiKey: body.apiKey };
        encryptedCreds = encrypt(keyToEncrypt);
        if (!encryptedCreds) {
             console.error(`Encryption failed for user ${user.id}, service ${body.service_name}`);
             return new Response(JSON.stringify({ message: 'Failed to encrypt credentials' }), { 
                 status: 500, 
                 headers: { 'Content-Type': 'application/json' } 
                });
        }
        status = 'active'; 
        // Use Map for metadata in Cassandra
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
          id: integrationId.toString(), // Convert UUID back to string for response
          name: name,
          type: body.type,
          service_name: body.service_name,
          status: status,
          created_at: createdAt.toISOString(),
          last_used_at: null,
          metadata: metadata
        };

        return new Response(JSON.stringify(newIntegrationData), {
          status: 201, 
          headers: { 'Content-Type': 'application/json' },
        });

      } else if (body.type === 'oauth2') {
        // --- Secure OAuth Initiation with JWT State --- 
        const serviceName = body.service_name;
        if (!serviceName) {
             return new Response(JSON.stringify({ message: 'Missing service_name for OAuth2 integration' }), { status: 400 });
        }
        
        // 1. Define JWT payload for state
        const statePayload = {
          userId: userIdString, // Include user ID
          serviceName: serviceName, // Include service name
          jti: uuidv4(), // Unique nonce for this request (prevents replay)
          exp: Math.floor(Date.now() / 1000) + (5 * 60) // Expiry in 5 minutes
        };

        // 2. Sign the state JWT
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
             console.error('FATAL: JWT_SECRET environment variable is not set for signing OAuth state.');
             return new Response(JSON.stringify({ message: 'OAuth service configuration error.' }), { status: 503 });
        }
        let stateJwt;
        try {
            stateJwt = await sign(statePayload, jwtSecret);
        } catch (signError) {
            console.error('Failed to sign OAuth state JWT:', signError);
            return new Response(JSON.stringify({ message: 'Failed to initiate OAuth connection.' }), { status: 500 });
        }

        // 3. Construct the Provider's Authorization URL using the JWT as state
        const authorizationUrl = constructOAuthUrl(serviceName, stateJwt);
        if (!authorizationUrl) {
            return new Response(JSON.stringify({ message: `OAuth for ${serviceName} not supported or configured` }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
                });
        }

        // 4. Return URL for frontend to redirect user
        // Note: We are NOT saving anything to the DB at this initiation stage for OAuth
        return new Response(JSON.stringify({ authorization_url: authorizationUrl }), {
          status: 200, 
          headers: { 'Content-Type': 'application/json' },
        });
        // --- End Secure OAuth Initiation --- 

      } else {
        return new Response(JSON.stringify({ message: `Unsupported integration type: ${body.type}` }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
            });
      }

    } else {
      return new Response(JSON.stringify({ message: 'Method not allowed' }), {
        status: 405,
        headers: { 'Allow': 'GET, POST', 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error(`Error in /api/integrations (${request.method}) for user ${user.id}:`, error);
    const responseBody = { message: 'Internal Server Error' };
    let status = 500;

    // Specific error handling
    if (error.name === 'UnauthorizedError') { 
        responseBody.message = 'Invalid token';
        status = 401;
    } else if (error.message?.includes('Invalid user ID format') || error.message?.includes('Invalid user identifier')) {
        responseBody.message = 'Invalid user identifier';
        status = 400;
    } else if (error.code && typeof error.code === 'string' && error.message?.includes('unavailable')) { // Check for specific DB unavailable errors
         responseBody.message = 'Database service temporarily unavailable';
         status = 503; // Service Unavailable
    } else if (error.info?.includes('consistency')) { // Check for consistency level errors
         responseBody.message = 'Database consistency error';
         status = 500;
    }
    
    return new Response(JSON.stringify(responseBody), { 
        status: status,
        headers: { 'Content-Type': 'application/json' } 
        });
  }
}

// --- Helper for OAuth URL Construction --- 
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