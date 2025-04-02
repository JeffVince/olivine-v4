import { verify } from '@tsndr/cloudflare-worker-jwt';

export const config = {
  runtime: 'edge'
};

// List of paths that don't require authentication
const publicPaths = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/verify-email',
  '/api/health'
];

export default async function middleware(request) {
  const url = new URL(request.url);
  
  // Add security headers to all responses
  const responseHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  };

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...responseHeaders,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // Skip auth for public paths
  if (publicPaths.some(path => url.pathname.startsWith(path))) {
    return await addCorsHeaders(request, responseHeaders);
  }

  // Verify authentication for protected routes
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        message: 'Authentication required' 
      }),
      {
        status: 401,
        headers: {
          ...responseHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  const token = authHeader.split(' ')[1];
  try {
    const isValid = await verify(token, process.env.JWT_SECRET);
    if (!isValid) {
      throw new Error('Invalid token');
    }

    // Add user info to request for downstream handlers
    const decoded = JSON.parse(atob(token.split('.')[1]));
    request.user = decoded;

    return await addCorsHeaders(request, responseHeaders);

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        message: 'Invalid or expired token' 
      }),
      {
        status: 401,
        headers: {
          ...responseHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

async function addCorsHeaders(request, baseHeaders) {
  const response = await fetch(request);
  const headers = new Headers(response.headers);
  
  // Add all base security headers
  Object.entries(baseHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  // Add CORS headers
  headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  headers.set('Access-Control-Allow-Credentials', 'true');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
} 