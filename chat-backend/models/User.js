const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  active: { type: Boolean, default: false }, // <-- active status
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
