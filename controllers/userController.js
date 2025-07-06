const User = require('../models/User');
const bcrypt = require('bcryptjs');
const Video = require('../models/Video');
const MyList = require('../models/myList');
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

    const videoUploadUrl =  await getBlobSasUrl('videos', videoBlobName, 60, 'cw');
    const thumbnailUploadUrl = await getBlobSasUrl('thumbnails', thumbnailBlobName, 60, 'cw');

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

    const videoUrl = await getBlobSasUrl('videos', video.videoBlobName, 1440, 'r');
    const thumbnailUrl = await getBlobSasUrl('thumbnails', video.thumbnailBlobName, 1440, 'r');

    video.status = 'ready';
    video.videoUrl = videoUrl;
    video.thumbnailUrl = thumbnailUrl;
    await video.save();

    res.json({ message: 'Upload confirmed', video });
  } catch (error) {
    res.status(500).json({ error: 'Could not confirm upload', details: error.message });
  }
};

//Add Video To List=======================
exports.addToMyList = async (req, res) => {
  const { videoId, userId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        status: 'error',
        message: 'Video not found',
      });
    }

    let myListEntry = await MyList.findOne({ user: userId, video: videoId });
    if (myListEntry) {
      return res.status(400).json({
        status: 'failed',
        message: 'Video is already in My List',
      });
    }

    myListEntry = new MyList({ user: userId, video: videoId });
    await myListEntry.save();

    return res.status(200).json({
      status: 'success',
      message: 'Video added to My List',
      data: myListEntry,
    });
  } catch (error) {
    console.error('Error adding to My List:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong while adding to My List',
      error: error.message,
    });
  }
};

//Remove Video To List=======================
exports.removeFromMyList = async (req, res) => {
  const { userId, videoId } = req.body;

  try {
    const deleted = await MyList.findOneAndDelete({ user: userId, video: videoId });
    if (deleted) {
      res.status(200).json({
        status: 'success',
        message: 'Video removed from My List',
      });
    } else {
      res.status(404).json({
        status: 'failed',
        message: 'My List entry not found',
      });
    }
  } catch (err) {
    console.error("Error removing from My List:", err);
    res.status(500).json({
      status: 'failed',
      data: err.message,
    });
  }
};

