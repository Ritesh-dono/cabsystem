/**
 * Run this script to backfill missing ownerId fields on existing data.
 *
 * Usage: node scripts/migrate-ownerid.js
 * Make sure .env is configured with MONGO_URI.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Shift = require('../models/Shift');

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('Missing MONGO_URI in environment');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Ensure all users have ownerId (owners point to themselves)
  const users = await User.find({ ownerId: { $exists: false } });
  console.log(`Found ${users.length} users without ownerId`);
  for (const user of users) {
    user.ownerId = user._id;
    await user.save();
  }

  // Ensure all shifts have ownerId
  const shifts = await Shift.find({ ownerId: { $exists: false } });
  console.log(`Found ${shifts.length} shifts without ownerId`);
  for (const shift of shifts) {
    const driver = await User.findById(shift.driver);
    if (!driver) continue;
    const ownerId = driver.ownerId || driver._id;
    shift.ownerId = ownerId;
    await shift.save();
  }

  console.log('Migration complete');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
