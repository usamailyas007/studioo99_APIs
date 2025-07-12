const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String },
  videoBlobName: { type: String, required: true },     
  videoUrl: { type: String },
  thumbnailBlobName: { type: String, required: true },   
  thumbnailUrl: { type: String },
  status: { type: String, enum: ['uploading', 'processing', 'ready', 'failed'], default: 'uploading' },
  approvalStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now },
    views: { type: Number, default: 0 } 
});

module.exports = mongoose.model('Video', videoSchema);
