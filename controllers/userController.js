const User = require('../models/User');
const bcrypt = require('bcryptjs');

const Video = require('../models/Video');
const getBlobSasUrl = require('../utils/getBlobSasUrl');

// Creator Request to upload video===============
exports.requestVideoUpload = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No user in request' });
    }

    const userId = req.user._id;
    const { title, category, description, videoOriginalName, thumbnailOriginalName } = req.body;

    if (!title || !category || !videoOriginalName || !thumbnailOriginalName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Prepare blob names FIRST, generate a temp videoDoc to get the _id
    const tempVideoDoc = new Video({
      user: userId,
      title,
      category,
      description,
      status: 'uploading'
    });

    // Generate blob names using tempVideoDoc._id before saving
    const videoBlobName = `videos/${userId}/${tempVideoDoc._id}_${videoOriginalName}`;
    const thumbnailBlobName = `thumbnails/${userId}/${tempVideoDoc._id}_${thumbnailOriginalName}`;

    // Now set them on the doc
    tempVideoDoc.videoBlobName = videoBlobName;
    tempVideoDoc.thumbnailBlobName = thumbnailBlobName;

    // Save doc with all required fields present
    await tempVideoDoc.save();

    const videoUploadUrl = getBlobSasUrl('videos', videoBlobName, 60, 'cw');
    const thumbnailUploadUrl = getBlobSasUrl('thumbnails', thumbnailBlobName, 60, 'cw');

    res.json({
      videoId: tempVideoDoc._id,
      videoUploadUrl,
      thumbnailUploadUrl
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get SAS URLs', details: error.message });
  }
};

// Cretor confirm the video Upload===============
exports.confirmVideoUpload = async (req, res) => {
  try {
    const { videoId } = req.body;
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });

    const getBlobSasUrl = require('../utils/getBlobSasUrl');
    const videoUrl = getBlobSasUrl('videos', video.videoBlobName, 1440, 'r');
    const thumbnailUrl = getBlobSasUrl('thumbnails', video.thumbnailBlobName, 1440, 'r');

    video.status = 'ready';
    video.videoUrl = videoUrl;
    video.thumbnailUrl = thumbnailUrl;
    await video.save();

    res.json({ message: 'Upload confirmed', video });
  } catch (error) {
    res.status(500).json({ error: 'Could not confirm upload', details: error.message });
  }
};

