const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  // If an owner is creating this user, tie the created account to the owner.
  let ownerId;
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const requestingUser = await User.findById(decoded.id);
      if (requestingUser && requestingUser.role === 'owner') {
        ownerId = requestingUser._id;
      }
    }
  } catch (err) {
    // ignore token errors; registration should still work without a token
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = { name, email, password: hashedPassword, role };
    if (ownerId) {
      userData.ownerId = ownerId;
    }
    const user = new User(userData);
    await user.save();
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;