export default function handler(req, res) {
  const { name = 'World' } = req.query;
  
  res.status(200).json({
    message: `Hello ${name}!`,
    date: new Date().toISOString(),
    method: req.method,
    region: process.env.VERCEL_REGION || 'unknown'
  });
} 