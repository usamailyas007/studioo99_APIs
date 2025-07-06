const User = require('../models/User');
const bcrypt = require('bcryptjs');
const Video = require('../models/Video');
const MyList = require('../models/myList');
const mongoose = require('mongoose');
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

//Get All List 

// exports.getMyList = async (req, res) => {
//   try {
//     const { userId } = req.body;
//     const page = parseInt(req.query.page) || 1;
//     const limit = 10;
//     const skip = (page - 1) * limit;

//     // Fetch paginated MyList entries for this user
//     const [myListEntries, total] = await Promise.all([
//       MyList.find({ user: userId })
//         .skip(skip)
//         .limit(limit)
//         .sort({ createdAt: -1 })
//         .populate('video'),
//       MyList.countDocuments({ user: userId })
//     ]);

//     const data = myListEntries.map(entry => {
//       const ListEntry = {
//         id: entry._id,
//         videoId: entry.video._id,
//         userId: entry.user,
//         createdAt: entry.createdAt,
//         updatedAt: entry.updatedAt,
//       };

//       const videoData = {
//         ...entry.video.toObject(),
//         id: entry.video._id,
//         myList: [ListEntry]
//       };

//       return {
//         ...ListEntry,
//         Video: videoData
//       };
//     });

//     return res.json({
//       message: "My List videos fetched successfully",
//       data,
//       currentPage: page,
//       totalPages: Math.ceil(total / limit),
//       totalMyList: total
//     });
//   } catch (error) {
//     console.error("Error fetching my list:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };
exports.getMyList = async (req, res) => {
  try {
    const { userId } = req.body;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const pipeline = [
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'videos',
          localField: 'video',
          foreignField: '_id',
          as: 'video'
        }
      },
      { $unwind: '$video' },
      // {
      //   $project: {
      //     id: '$_id',
      //     videoId: '$video._id',
      //     userId: '$user',
      //     createdAt: 1,
      //     updatedAt: 1,
      //     Video: {
      //       id: '$video._id',
      //       title: '$video.title',
      //       description: '$video.description',
      //       category: '$video.category',
      //       status: '$video.status',
      //       createdAt: '$video.createdAt',
      //       updatedAt: '$video.updatedAt',
      //       videoBlobName: '$video.videoBlobName',
      //       videoUrl: '$video.videoUrl',
      //       thumbnailBlobName: '$video.thumbnailBlobName',
      //       thumbnailUrl: '$video.thumbnailUrl',
      //       myList: [{
      //         id: '$_id',
      //         videoId: '$video._id',
      //         userId: '$user',
      //         createdAt: '$createdAt',
      //         updatedAt: '$updatedAt'
      //       }]
      //     }
      //   }
        
      // },
      {
  $project: {
    id: "$_id",
    videoId: "$video._id",
    userId: "$user",
    createdAt: 1,
    updatedAt: 1,
    Video: {
      $mergeObjects: [
        {
          myList: [{
            id: "$_id",
            videoId: "$video._id",
            userId: "$user",
            createdAt: "$createdAt",
            updatedAt: "$updatedAt"
          }]
        },
        "$video"
      ]
    }
  }
},
      { $skip: skip },
      { $limit: limit }
    ];

    
    const data = await MyList.aggregate(pipeline);

   
    const total = await MyList.countDocuments({ user: userId });

    return res.json({
      message: 'My List videos fetched successfully',
      data,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalMyList: total
    });
  } catch (error) {
    console.error('Error fetching my list:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


//Get All Videos===========================
exports.getAllVideos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

  const pipeline = [
  { $sort: { createdAt: -1 } },
  { $skip: skip },
  { $limit: limit },
  {
    $lookup: {
      from: 'mylists',
      localField: '_id',
      foreignField: 'video',
      as: 'myList'
    }
  },
  {
    $addFields: {
      myList: {
        $map: {
          input: "$myList",
          as: "item",
          in: {
            id: "$$item._id",
            videoId: "$$item.video",
            userId: "$$item.user",
            createdAt: "$$item.createdAt",
            updatedAt: "$$item.updatedAt"
          }
        }
      }
    }
  },
  {
    $replaceRoot: {
      newRoot: "$$ROOT"
    }
  }
];


    const data = await Video.aggregate(pipeline);
    const total = await Video.countDocuments();

    res.json({
      message: 'Videos fetched successfully',
      data,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalVideos: total
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


