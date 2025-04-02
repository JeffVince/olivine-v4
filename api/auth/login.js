export const config = {
  runtime: 'edge'
};

import { sign } from '@tsndr/cloudflare-worker-jwt';
import { sha256 } from '@tsndr/cloudflare-worker-jwt';

export default async function handler(request) {
  // Only allow POST
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        'Allow': 'POST',
        'Content-Type': 'text/plain'
      }
    });
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          message: 'Email and password are required' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Call Astra DB through Pulsar function for user verification
    const verifyResponse = await fetch(`${process.env.PULSAR_API_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.PULSAR_API_KEY
      },
      body: JSON.stringify({ email, password })
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          message: error.message || 'Authentication failed' 
        }),
        {
          status: verifyResponse.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const userData = await verifyResponse.json();

    // Generate JWT token using edge-compatible JWT library
    const token = await sign(
      {
        userId: encodeURIComponent(email),
        email: userData.email,
        role: userData.role || 'user',
        isVerified: userData.isVerified
      },
      process.env.JWT_SECRET
    );

    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'Login successful',
        token,
        user: {
          email: userData.email,
          role: userData.role || 'user',
          isVerified: userData.isVerified,
          createdAt: userData.createdAt
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        message: 'Failed to process login' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 