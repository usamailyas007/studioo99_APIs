const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  channelName: {
    type: String,
    default: null,
  },
  region: {
    type: String,
    default: null,
  },
  country: {
    type: String,
    default: null,
  },
  role: {
    type: String,
    required: true,
    enum: ['Viewer', 'Content Creator'],
  },
  otp: { type: String },
otpExpiry: { type: Date },
isVerified: { type: Boolean, default: false },
activeStatus: { type: Boolean, default: true },
profileImage: { type: String, default: null },
verificationStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
suspended: { type: Boolean, default: false },
subscriptionPlan: { type: String, default: "Free" },
subscriptionStatus: { type: String, defaultValue: "inactive"  },
stripeCustomerId: {  type: String },


});

module.exports = mongoose.model('User', userSchema);
