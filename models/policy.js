const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['privacy', 'terms', 'ssl']
  },
  content: {
    type: String,
    required: true
  },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Policy', policySchema);
