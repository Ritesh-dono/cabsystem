const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).lean();
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    // Normalize ownerId so that every request knows which owner owns the data
    const ownerId = user.ownerId ? user.ownerId.toString() : user._id.toString();

    req.user = {
      id: user._id.toString(),
      role: user.role,
      ownerId,
    };

    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

module.exports = auth;