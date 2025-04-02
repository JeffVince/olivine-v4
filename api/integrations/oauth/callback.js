import { getConnectedClient } from '../../_utils/astraClient.js';
import { encrypt } from '../../_utils/encryption.js';
import { types } from '@datastax/cassandra-driver';
import { v4 as uuidv4 } from 'uuid'; // For generating new integration ID
import fetch from 'node-fetch'; // Make sure node-fetch is installed or use native fetch if available
import { verify } from '@tsndr/cloudflare-worker-jwt'; // Use the same library

export const config = {
  runtime: 'edge' // Or nodejs if fetch/crypto require it
};

// Handles GET /api/integrations/oauth/callback?code=...&state=...
export default async function handler(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateJwt = url.searchParams.get('state'); // The state parameter is now a JWT
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  // --- Basic Validation & Error Handling ---
  if (error) {
    console.error(`OAuth callback error from provider: ${error} - ${errorDescription}`);
    // Redirect user back to frontend with error state
    return redirectWithError('OAuth provider returned an error.');
  }

  if (!code || !stateJwt) {
    console.error('OAuth callback missing code or state JWT parameter.');
    return redirectWithError('Invalid callback request from OAuth provider.');
  }

  // --- State JWT Verification --- 
  let statePayload;
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
       console.error('FATAL: JWT_SECRET environment variable is not set for verifying OAuth state.');
       return redirectWithError('OAuth service configuration error.');
  }
  try {
      const isValid = await verify(stateJwt, jwtSecret);
      if (!isValid) {
          throw new Error('JWT validation failed');
      }
      // Decode the payload (assuming base64url encoding for payload part)
      const payloadString = Buffer.from(stateJwt.split('.')[1], 'base64url').toString('utf8');
      statePayload = JSON.parse(payloadString);
      
      // Additional checks (optional but recommended)
      if (!statePayload || !statePayload.userId || !statePayload.serviceName || !statePayload.jti || !statePayload.exp) {
           throw new Error('Incomplete state payload');
      }
      // Check expiry already handled by verify(), but explicit check doesn't hurt
      if (statePayload.exp * 1000 < Date.now()) {
          throw new Error('State JWT expired');
      }
      // TODO: Optional - Add nonce (jti) checking against a short-lived cache/store 
      // to prevent replay attacks if the same state JWT is somehow intercepted and reused quickly.

  } catch (jwtError) {
      console.error('Invalid or expired OAuth state JWT received:', jwtError.message, { stateJwt });
      let userMessage = 'OAuth session expired or invalid. Please try connecting again.';
      if (jwtError.message?.includes('expired')) {
          userMessage = 'OAuth connection link expired. Please try connecting again.';
      }
      return redirectWithError(userMessage);
  }

  // Successfully verified state - extract user ID and service name
  let userId;
  const serviceName = statePayload.serviceName;
  try {
      userId = types.Uuid.fromString(statePayload.userId); 
  } catch (e) {
       console.error('Invalid user ID format in state JWT payload:', statePayload.userId);
       return redirectWithError('Invalid user identifier in OAuth state.');
  }
  // --- End State JWT Verification --- 
  
  try {
    // --- Token Exchange --- 
    const tokenData = await exchangeCodeForTokens(serviceName, code);
    if (!tokenData || !tokenData.access_token) {
      console.error(`Failed to exchange code for tokens for service ${serviceName}, user ${userId.toString()}`);
      return redirectWithError(`Failed to connect to ${serviceName}. Could not obtain access token.`);
    }

    // --- Encrypt Credentials --- 
    // Store access_token, refresh_token (if present), expires_in, and potentially scope
    const credentialsToEncrypt = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token, // May be null
      expires_at: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : null,
      scope: tokenData.scope, // Scopes granted
    };
    const encryptedCreds = encrypt(credentialsToEncrypt);
    if (!encryptedCreds) {
      console.error(`Encryption failed for OAuth tokens for user ${userId.toString()}, service ${serviceName}`);
      return redirectWithError(`Failed to secure connection details for ${serviceName}.`);
    }

    // --- Save/Update Integration in DB --- 
    const client = await getConnectedClient();
    const integrationId = types.Uuid.random(); // Generate a new ID for this connection
    const createdAt = new Date();
    const status = 'connected';
    const metadata = { 
        scopes: tokenData.scope || '', // Store granted scopes
        // Add other relevant non-sensitive info if needed
    };

    // Using INSERT with JSON syntax for map - adjust if needed based on driver version
    const upsertQuery = `
      INSERT INTO integrations (user_id, id, type, service_name, status, encrypted_credentials, created_at, updated_at, metadata, name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
    `; // We use INSERT because each OAuth connection gets a new row/ID
    
    const params = [
      userId,
      integrationId,
      'oauth2', // type
      serviceName,
      status,
      encryptedCreds,
      createdAt,
      createdAt, // updated_at
      metadata,
      null // name is typically null for OAuth
    ];

    await client.execute(upsertQuery, params, { prepare: true });
    console.log(`Successfully saved OAuth integration ${integrationId.toString()} for service ${serviceName}, user ${userId.toString()}`);

    // --- Redirect to Frontend Success --- 
    const successRedirectUrl = new URL('/integrations', getBaseFrontendUrl()); // Redirect to integrations page
    successRedirectUrl.searchParams.set('status', 'success');
    successRedirectUrl.searchParams.set('service', serviceName);
    successRedirectUrl.searchParams.set('id', integrationId.toString()); // Pass new ID back

    return Response.redirect(successRedirectUrl.toString(), 302);

  } catch (error) {
    console.error(`Error processing OAuth callback for service ${serviceName}, user ${userId?.toString()}:`, error);
    return redirectWithError(`An unexpected error occurred while connecting to ${serviceName}.`);
  }
}

// --- Helper to Exchange Code for Tokens --- 
async function exchangeCodeForTokens(serviceName, code) {
  const redirectUri = `${getBaseApiUrl()}/api/integrations/oauth/callback`;
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
        console.error('Missing Google Client ID or Secret for token exchange.');
        return null;
    }
    body = new URLSearchParams({
      code: code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });
  } 
  // --- Add other providers here --- 
  // else if (serviceName.toLowerCase() === 'dropbox') { ... }
  else {
    console.error(`Token exchange not implemented for service: ${serviceName}`);
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
      console.error(`Token exchange failed for ${serviceName}: ${response.status}`, data);
      return null;
    }

    console.log(`Token exchange successful for ${serviceName}`);
    return data; // Should contain access_token, refresh_token, expires_in, scope etc.

  } catch (error) {
    console.error(`Error during token exchange fetch for ${serviceName}:`, error);
    return null;
  }
}

// --- Helper to get Base URLs --- 
function getBaseApiUrl() {
  const vercelUrl = process.env.VERCEL_URL;
  // Vercel URL doesn't include protocol, API routes are usually relative or use this base
  return vercelUrl ? `https://${vercelUrl}` : 'http://localhost:5173'; 
}

function getBaseFrontendUrl() {
   // Assuming frontend runs on the same domain or use a specific env var like VITE_APP_URL
   return process.env.VITE_APP_URL || getBaseApiUrl(); 
}

// --- Helper to Redirect with Error --- 
function redirectWithError(errorMessage) {
  const errorRedirectUrl = new URL('/integrations', getBaseFrontendUrl());
  errorRedirectUrl.searchParams.set('status', 'error');
  errorRedirectUrl.searchParams.set('message', errorMessage);
  return Response.redirect(errorRedirectUrl.toString(), 302);
} 