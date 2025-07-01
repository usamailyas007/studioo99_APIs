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
});

module.exports = mongoose.model('User', userSchema);
