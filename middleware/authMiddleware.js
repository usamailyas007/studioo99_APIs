const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'failed', message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY); 
    const user = await User.findById(decoded.userId); 

    if (!user) {
      return res.status(401).json({ status: 'failed', message: 'Unauthorized: User not found' });
    }

    req.user = user; 
    next();
  } catch (error) {
    console.error(`Error authenticating JWT: ${error.message}`);
    return res.status(401).json({ status: 'failed', message: 'Unauthorized: Invalid token' });
  }
};

module.exports = authenticateJWT;