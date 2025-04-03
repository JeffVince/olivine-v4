import { verify } from '@tsndr/cloudflare-worker-jwt';

// Shared security and base CORS headers
const standardHeadersConfig = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Consider refining CSP further based on specific needs
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';", 
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*', // Use environment variable
  'Access-Control-Allow-Credentials': 'true'
};

/**
 * Verifies the JWT token from the Authorization header.
 * Returns the decoded user payload if valid.
 * Throws an error if the token is missing, invalid, or expired.
 * @param {Request} request The incoming request object.
 * @returns {Promise<object>} The decoded user payload.
 */
export async function verifyAuth(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required: Missing or invalid Authorization header.');
  }

  const token = authHeader.split(' ')[1];
  try {
    const isValid = await verify(token, process.env.JWT_SECRET);
    if (!isValid) {
      throw new Error('Invalid token'); // Or specific verification error
    }

    // Decode payload (assuming standard JWT structure)
    const payload = JSON.parse(atob(token.split('.')[1])); 
    return payload;

  } catch (error) {
    // Log the specific error for debugging if needed
    console.error("Auth verification error:", error.message); 
    // Throw a more generic error message to the client
    throw new Error('Authentication failed: Invalid or expired token.');
  }
}

/**
 * Adds standard security and CORS headers to a Response object.
 * @param {Response} response The original Response object.
 * @returns {Response} A new Response object with added headers.
 */
export function addStandardHeaders(response) {
  const headers = new Headers(response.headers);

  // Add all configured standard headers
  for (const [key, value] of Object.entries(standardHeadersConfig)) {
    headers.set(key, value);
  }

  // Ensure Content-Type is present if not already set (important for JSON responses)
  if (!headers.has('Content-Type') && response.body) {
      try {
        // Basic check if body might be JSON
        JSON.parse(response.body); // This is inefficient, ideally set Content-Type when creating Response
        headers.set('Content-Type', 'application/json');
      } catch (e) {
        // Body is not JSON or parsing failed, leave Content-Type as is or set default
      }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}

/**
 * Creates a standard JSON error response with appropriate headers.
 * @param {string} message Error message.
 * @param {number} status HTTP status code.
 * @returns {Response} A Response object.
 */
export function createErrorResponse(message, status) {
    const errorResponse = new Response(JSON.stringify({ status: 'error', message }), {
        status: status,
        headers: { 'Content-Type': 'application/json' } // Ensure Content-Type for JSON
    });
    // Add standard headers to the error response
    return addStandardHeaders(errorResponse);
}

// --- Removed original middleware default export and edge config ---
// export const config = { runtime: 'edge' }; // Removed
// export default async function middleware(request) { ... } // Removed
// async function addCorsHeaders(request, baseHeaders) { ... } // Removed
// const publicPaths = [...] // Removed (handled by applying verifyAuth selectively) 