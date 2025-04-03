export const config = {
  runtime: 'edge'
};

export default async function handler(request) {
  return new Response(
    JSON.stringify({
      status: 'ok',
      message: 'Test API is working',
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries([...request.headers])
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
    }
  );
} 