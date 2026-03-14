const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['driver', 'owner'], default: 'driver' },
  ratePerKm: { type: Number, default: 10 },
  // Every user (driver or owner) is tied to an owner. For owner accounts, this points to themselves.
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Ensure ownerId is always set (defaults to self for owner accounts)
userSchema.pre('save', function (next) {
  if (!this.ownerId) {
    this.ownerId = this._id;
  }
  next();
});

// Cascade delete related data when a user is removed (owner or driver)
userSchema.pre('remove', async function (next) {
  const Shift = mongoose.model('Shift');
  // Remove shifts owned by this user (owner or self-owned driver)
  await Shift.deleteMany({ ownerId: this._id });
  // If this user is an owner, also remove any drivers created under them
  await mongoose.model('User').deleteMany({ ownerId: this._id, _id: { $ne: this._id } });
  next();
});

// Also cascade delete when using deleteOne
userSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  const Shift = mongoose.model('Shift');
  await Shift.deleteMany({ ownerId: this._id });
  await mongoose.model('User').deleteMany({ ownerId: this._id, _id: { $ne: this._id } });
  next();
});

// Also cascade delete when using findOneAndDelete
userSchema.pre('findOneAndDelete', async function (next) {
  const doc = await this.model.findOne(this.getFilter());
  if (doc) {
    const Shift = mongoose.model('Shift');
    await Shift.deleteMany({ ownerId: doc._id });
    await this.model.deleteMany({ ownerId: doc._id, _id: { $ne: doc._id } });
  }
  next();
});

module.exports = mongoose.model('User', userSchema);