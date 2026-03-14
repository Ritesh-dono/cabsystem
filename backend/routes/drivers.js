const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Create a new driver under the logged-in owner
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Access denied' });

  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already taken' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const driver = new User({
      name,
      email,
      password: hashedPassword,
      role: 'driver',
      ownerId: req.user.id,
    });
    await driver.save();

    res.status(201).json({
      id: driver._id,
      name: driver.name,
      email: driver.email,
      role: driver.role,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List drivers for this owner
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Access denied' });

  try {
    const drivers = await User.find({ ownerId: req.user.id, role: 'driver' }).select('name email createdAt');
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a driver (and their shifts)
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Access denied' });

  try {
    const driver = await User.findOne({ _id: req.params.id, ownerId: req.user.id, role: 'driver' });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    await driver.deleteOne();
    res.json({ message: 'Driver removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
