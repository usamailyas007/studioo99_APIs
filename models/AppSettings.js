const mongoose = require('mongoose');

const subscriptionPackageSchema = new mongoose.Schema({
  name: String, 
  monthly: Number,
  annual: Number,  
});

const appSettingsSchema = new mongoose.Schema({
  appName: { type: String, required: true },
  stripeKey: { type: String, required: true },
  videoCategories: [{ type: String }],
  subscriptionPackages: [subscriptionPackageSchema],
  appLogo: { type: String, default: null }, 
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AppSettings', appSettingsSchema);
