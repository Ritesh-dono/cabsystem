const express = require('express');
const Shift = require('../models/Shift');
const auth = require('../middleware/auth');

const router = express.Router();

// Daily analytics
router.get('/daily', auth, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Access denied' });
  try {
    const ownerId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedShifts = await Shift.find({ ownerId, date: { $gte: today }, status: 'completed' });
    const activeShifts = await Shift.find({ ownerId, date: { $gte: today }, status: 'active' });
    
    const totalCompletedDistance = completedShifts.reduce((sum, s) => sum + s.returnDistance, 0);
    const totalCompletedEarnings = completedShifts.reduce((sum, s) => sum + s.earnings, 0);
    const totalActiveDistance = activeShifts.reduce((sum, s) => sum + s.returnDistance, 0);
    const totalActiveEarnings = activeShifts.reduce((sum, s) => sum + s.earnings, 0);
    
    res.json({ 
      totalDistance: totalCompletedDistance + totalActiveDistance, 
      totalEarnings: totalCompletedEarnings + totalActiveEarnings, 
      shifts: completedShifts.length + activeShifts.length,
      completedShifts: completedShifts.length,
      activeShifts: activeShifts.length
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Weekly analytics (per-day breakdown)
router.get('/weekly', auth, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Access denied' });
  try {
    const ownerId = req.user.id;
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 6); // last 7 days inclusive

    const shifts = await Shift.find({ ownerId, date: { $gte: startDate } });

    // Initialize day buckets
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const label = date.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({
        date: date.toISOString().slice(0, 10),
        day: label,
        distance: 0,
        earnings: 0,
        shifts: 0,
      });
    }

    // Aggregate shifts into days
    shifts.forEach((shift) => {
      const dateKey = shift.date.toISOString().slice(0, 10);
      const bucket = days.find((d) => d.date === dateKey);
      if (bucket) {
        bucket.distance += shift.returnDistance || 0;
        bucket.earnings += shift.earnings || 0;
        bucket.shifts += 1;
      }
    });

    const totals = days.reduce(
      (acc, day) => {
        acc.totalDistance += day.distance;
        acc.totalEarnings += day.earnings;
        acc.shifts += day.shifts;
        return acc;
      },
      { totalDistance: 0, totalEarnings: 0, shifts: 0 }
    );

    res.json({ ...totals, days });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Monthly analytics
router.get('/monthly', auth, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Access denied' });
  try {
    const ownerId = req.user.id;
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const completedShifts = await Shift.find({ ownerId, date: { $gte: monthAgo }, status: 'completed' });
    const activeShifts = await Shift.find({ ownerId, date: { $gte: monthAgo }, status: 'active' });
    
    const totalCompletedDistance = completedShifts.reduce((sum, s) => sum + s.returnDistance, 0);
    const totalCompletedEarnings = completedShifts.reduce((sum, s) => sum + s.earnings, 0);
    const totalActiveDistance = activeShifts.reduce((sum, s) => sum + s.returnDistance, 0);
    const totalActiveEarnings = activeShifts.reduce((sum, s) => sum + s.earnings, 0);
    
    res.json({ 
      totalDistance: totalCompletedDistance + totalActiveDistance, 
      totalEarnings: totalCompletedEarnings + totalActiveEarnings, 
      shifts: completedShifts.length + activeShifts.length,
      completedShifts: completedShifts.length,
      activeShifts: activeShifts.length
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Export data to CSV for easy Excel import
// Optional query params: start=YYYY-MM-DD, end=YYYY-MM-DD
// If omitted, defaults to today's data.
router.get('/export', auth, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Access denied' });

  try {
    const ownerId = req.user.id;

    const startParam = req.query.start;
    const endParam = req.query.end;

    const start = startParam ? new Date(startParam) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = endParam ? new Date(endParam) : new Date(start);
    end.setHours(23, 59, 59, 999);

    const filenameDate = start.toISOString().slice(0, 10);

    const shifts = await Shift.find({
      ownerId,
      date: { $gte: start, $lte: end },
    }).populate('driver', 'name');

    // Build CSV rows
    const headers = ['Date', 'Driver Name', 'Car Number', 'Pickup Name', 'Distance', 'Total Distance', 'Earnings', 'Status'];
    const rows = [headers.join(',')];

    shifts.forEach((shift) => {
      const date = shift.date.toISOString().slice(0, 10);
      const driverName = shift.driver?.name || '';
      const totalDistance = shift.totalDistance || 0;
      const earnings = shift.earnings || 0;
      const status = shift.status || '';
      const carNumber = shift.carNumber || '';

      if (shift.pickups && shift.pickups.length > 0) {
        shift.pickups.forEach((pickup, idx) => {
          const pickupName = `Pickup ${idx + 1}`;
          const distance = pickup.distance || 0;
          rows.push([date, driverName, carNumber, pickupName, distance, totalDistance, earnings, status].join(','));
        });
      } else {
        rows.push([date, driverName, carNumber, '', 0, totalDistance, earnings, status].join(','));
      }
    });

    const csvContent = rows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-${filenameDate}.csv"`);
    res.send(csvContent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;