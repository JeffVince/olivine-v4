// Simple root API function for testing Vercel function detection
module.exports = (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API root is functioning correctly',
    timestamp: new Date().toISOString(),
    region: process.env.VERCEL_REGION || 'unknown',
    nodejs_version: process.version
  });
}; 