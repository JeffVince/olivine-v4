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
 * @param {Request} req The incoming request object.
 * @returns {Promise<object>} The decoded user payload.
 */
export async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
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
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()); 
    return payload;

  } catch (error) {
    // Log the specific error for debugging if needed
    console.error("Auth verification error:", error.message); 
    // Throw a more generic error message to the client
    throw new Error('Authentication failed: Invalid or expired token.');
  }
}

/**
 * Adds standard security headers to a response object.
 * @param {Response} res The Express response object.
 */
export function addStandardHeaders(res) {
  // Add all configured standard headers
  for (const [key, value] of Object.entries(standardHeadersConfig)) {
    res.setHeader(key, value);
  }
}

/**
 * Creates a standard JSON error response with appropriate headers.
 * @param {Response} res The Express response object.
 * @param {string} message Error message.
 * @param {number} status HTTP status code.
 */
export function sendErrorResponse(res, message, status) {
  addStandardHeaders(res);
  return res.status(status).json({ status: 'error', message });
} 