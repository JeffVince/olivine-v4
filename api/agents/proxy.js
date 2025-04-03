import axios from 'axios';
import { verifyAuth, addStandardHeaders, createErrorResponse } from '../auth_handler.js';

// API proxy to handle CORS issues with Astra Streaming API
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
    
    // Get the Astra API URL from environment variables
    const ASTRA_API_URL = process.env.ASTRA_STREAMING_URL;
    if (!ASTRA_API_URL) {
      return createErrorResponse('ASTRA_STREAMING_URL environment variable is not set', 500);
    }

    // Get the Astra API token
    const ASTRA_TOKEN = process.env.ASTRA_STREAMING_TOKEN;
    if (!ASTRA_TOKEN) {
      return createErrorResponse('ASTRA_STREAMING_TOKEN environment variable is not set', 500);
    }

    // Get the path and query parameters
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    
    // Remove '/api/agents/proxy' from the path
    const targetPath = pathSegments.slice(4).join('/');
    
    // Build the target URL
    const targetUrl = `${ASTRA_API_URL}/${targetPath}${url.search}`;
    
    // Forward the request to Astra
    const response = await axios({
      method: request.method,
      url: targetUrl,
      headers: {
        'Authorization': `Bearer ${ASTRA_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: request.method !== 'GET' ? await request.json() : undefined
    });

    // Return the response
    const successResponse = new Response(JSON.stringify(response.data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
    return addStandardHeaders(successResponse);

  } catch (error) {
    console.error('Proxy error:', error);
    
    // Handle Axios error responses
    if (error.response) {
      return createErrorResponse(
        error.response.data?.message || 'Error from Astra API', 
        error.response.status || 500
      );
    }
    
    // Handle other errors
    return createErrorResponse('Internal Server Error', 500);
  }
} 