// Basic serverless function in root of API directory
module.exports = (req, res) => {
  console.log('Hello function called');
  
  res.status(200).json({
    message: 'Hello from Vercel Serverless Function!',
    date: new Date().toISOString(),
    path: req.url,
    method: req.method,
    region: process.env.VERCEL_REGION || 'unknown'
  });
}; 