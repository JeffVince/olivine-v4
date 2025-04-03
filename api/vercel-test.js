// Standard Vercel serverless function (not Edge Runtime)
export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    message: 'Vercel API is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    region: process.env.VERCEL_REGION || 'unknown'
  });
} 