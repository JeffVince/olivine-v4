const jwt = require('jsonwebtoken');
const { addStandardHeaders, sendErrorResponse } = require('./_utils');

// In a real app, you would use bcrypt to compare passwords
// and fetch user data from your database
export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return sendErrorResponse(res, 'Method not allowed', 405);
  }

  addStandardHeaders(res);
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return sendErrorResponse(res, 'Email and password are required', 400);
    }
    
    // Here you would fetch the user from your database (e.g., Astra DB)
    // and verify the password hash
    
    // For demo purposes, we're just checking for a demo account
    if (email === 'demo@example.com' && password === 'password123') {
      // Create a JWT token
      const token = jwt.sign(
        { 
          sub: 'user123', 
          email,
          // Add other user data as needed
        },
        process.env.JWT_SECRET, 
        { expiresIn: '1h' }
      );
      
      // Return the token and user info
      return res.status(200).json({
        status: 'success',
        token,
        user: {
          id: 'user123',
          email,
          name: 'Demo User'
        }
      });
    }
    
    // Invalid credentials
    return sendErrorResponse(res, 'Invalid email or password', 401);
    
  } catch (error) {
    console.error('Login error:', error);
    return sendErrorResponse(res, 'Authentication failed', 500);
  }
} 