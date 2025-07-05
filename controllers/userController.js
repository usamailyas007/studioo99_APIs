const User = require('../models/User');
const bcrypt = require('bcryptjs');

const Video = require('../models/Video');
const getBlobSasUrl = require('../utils/getBlobSasUrl');

// Creator Request to upload video===============
exports.requestVideoUpload = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(userId);
    const { title, category, description, videoOriginalName, thumbnailOriginalName } = req.body;

    if (!title || !category || !videoOriginalName || !thumbnailOriginalName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

     if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No user in request' });
    }

    const videoDoc = new Video({
      user: userId,
      title,
      category,
      description,
      status: 'uploading'
    });
    await videoDoc.save();

    const videoBlobName = `videos/${userId}/${videoDoc._id}_${videoOriginalName}`;
    const thumbnailBlobName = `thumbnails/${userId}/${videoDoc._id}_${thumbnailOriginalName}`;

    const videoUploadUrl = getBlobSasUrl('videos', videoBlobName, 60, 'cw');
    const thumbnailUploadUrl = getBlobSasUrl('thumbnails', thumbnailBlobName, 60, 'cw');


    videoDoc.videoBlobName = videoBlobName;
    videoDoc.thumbnailBlobName = thumbnailBlobName;
    await videoDoc.save();

    res.json({
      videoId: videoDoc._id,
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

