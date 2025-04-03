// Next.js API Route
export default function handler(req, res) {
  res.status(200).json({
    message: 'Hello from Next.js API Route',
    timestamp: new Date().toISOString(),
    vercel_region: process.env.VERCEL_REGION || 'unknown'
  });
} 