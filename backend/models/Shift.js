const mongoose = require('mongoose');

const pickupSchema = new mongoose.Schema({
  distance: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

const shiftSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Owner of this shift (driver's owner). Ensures data is scoped to a specific owner.
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: Date, default: Date.now },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  pickups: [pickupSchema],
  totalDistance: { type: Number, default: 0 },
  returnDistance: { type: Number, default: 0 },
  earnings: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('Shift', shiftSchema);