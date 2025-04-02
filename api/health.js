export const config = {
  runtime: 'edge'
};

export default async function handler(request) {
  return new Response(
    JSON.stringify({
      status: 'ok',
      message: 'API is running',
      timestamp: new Date().toISOString()
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    }
  );
} 