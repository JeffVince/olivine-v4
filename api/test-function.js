// Basic test function to verify Vercel function detection
module.exports = (req, res) => {
  console.log('Test function called', {
    method: req.method,
    path: req.url,
    headers: req.headers,
    vercelRegion: process.env.VERCEL_REGION
  });
  
  res.status(200).json({
    status: 'success',
    message: 'Test function is working',
    timestamp: new Date().toISOString(),
    nodejs_version: process.version
  });
}; 