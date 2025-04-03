// Simple Vercel serverless function
module.exports = (req, res) => {
  console.log('Hello API called');
  
  res.json({
    message: 'Hello from Vercel API serverless function',
    timestamp: new Date().toISOString(),
    vercel_region: process.env.VERCEL_REGION || 'unknown'
  });
}; 