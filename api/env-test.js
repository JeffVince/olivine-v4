// Test endpoint to check environment variables
export default function handler(req, res) {
  // List of environment variables to check
  const envVars = [
    'ASTRA_DB_ID',
    'ASTRA_DB_REGION',
    'ASTRA_DB_KEYSPACE',
    'JWT_SECRET',
    'NODE_ENV',
    'VERCEL_REGION',
    'VERCEL_ENV'
  ];
  
  // Build response without showing actual values
  const envStatus = {};
  envVars.forEach(varName => {
    // Check if environment variable exists
    if (process.env[varName] !== undefined) {
      // Mask secrets but show they exist
      if (varName.includes('SECRET') || varName.includes('KEY') || varName === 'JWT_SECRET') {
        envStatus[varName] = '✓ [secured]';
      } else {
        // For non-secrets, show the actual value
        envStatus[varName] = process.env[varName];
      }
    } else {
      envStatus[varName] = '✗ missing';
    }
  });
  
  // Return environment status
  res.status(200).json({
    status: 'ok',
    message: 'Environment variables status',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    region: process.env.VERCEL_REGION || 'unknown',
    environment_variables: envStatus
  });
} 