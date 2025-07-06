const mongoose = require('mongoose');

const myListSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  createdAt: { type: Date, default: Date.now }
});

myListSchema.index({ user: 1, video: 1 }, { unique: true });

module.exports = mongoose.model('MyList', myListSchema);
