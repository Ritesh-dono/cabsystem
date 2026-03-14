const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const shiftRoutes = require('./routes/shifts');
const analyticsRoutes = require('./routes/analytics');
const driverRoutes = require('./routes/drivers');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/drivers', driverRoutes);

module.exports = app;
