// Next.js API route format
export function GET(req) {
  return new Response(JSON.stringify({
    message: 'Hello from Next.js-style API route',
    timestamp: new Date().toISOString(),
    region: process.env.VERCEL_REGION || 'unknown'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
} 