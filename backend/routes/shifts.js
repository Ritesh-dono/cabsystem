const express = require('express');
const Shift = require('../models/Shift');
const auth = require('../middleware/auth');

const router = express.Router();

// Start shift
router.post('/start', auth, async (req, res) => {
  try {
    const shift = new Shift({
      driver: req.user.id,
      ownerId: req.user.ownerId || req.user.id,
    });
    await shift.save();
    res.json(shift);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add pickup
router.post('/:id/pickup', auth, async (req, res) => {
  const { distance } = req.body;
  try {
    const shift = await Shift.findOne({
      _id: req.params.id,
      ownerId: req.user.ownerId || req.user.id,
    });
    if (!shift || shift.driver.toString() !== req.user.id) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    shift.pickups.push({ distance });
    shift.totalDistance += distance;
    shift.returnDistance = shift.totalDistance * 2;
    shift.earnings = shift.returnDistance * (process.env.RATE_PER_KM || 10);
    await shift.save();
    res.json(shift);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// End shift
router.put('/:id/end', auth, async (req, res) => {
  try {
    const shift = await Shift.findOne({
      _id: req.params.id,
      ownerId: req.user.ownerId || req.user.id,
    });
    if (!shift || shift.driver.toString() !== req.user.id) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    console.log('Before ending shift:', shift._id, 'status:', shift.status, 'endTime:', shift.endTime);
    shift.status = 'completed';
    shift.endTime = new Date();
    await shift.save();
    console.log('After ending shift:', shift._id, 'status:', shift.status, 'endTime:', shift.endTime);
    const savedShift = await Shift.findById(shift._id);
    console.log('Saved shift from DB:', savedShift._id, 'status:', savedShift.status, 'endTime:', savedShift.endTime);
    res.json(savedShift);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get shifts for driver
router.get('/', auth, async (req, res) => {
  try {
    const shifts = await Shift.find({
      driver: req.user.id,
      ownerId: req.user.ownerId || req.user.id,
    }).populate('driver', 'name');
    console.log('Shifts returned:', shifts.map(s => ({ id: s._id, status: s.status, endTime: s.endTime })));
    res.json(shifts);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all shifts (for owner)
router.get('/all', auth, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Access denied' });
  try {
    const shifts = await Shift.find({ ownerId: req.user.id }).populate('driver', 'name');
    res.json(shifts);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;