const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

module.exports = async function(req, res, next) {
  // Get token from header
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  // Token format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Token format invalid' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Some old tokens might only have userId, some might have companyCode.
    // To be perfectly safe, let's fetch the user from DB to guarantee companyCode is present!
    const user = await User.findById(decoded.userId || decoded);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = {
      userId: user._id.toString(),
      companyCode: user.companyCode
    };
    
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};
