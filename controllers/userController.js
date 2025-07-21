const User = require('../models/User');
const Subscription = require('../models/subscription');
const bcrypt = require('bcryptjs');
const Video = require('../models/Video');
const MyList = require('../models/myList');
const mongoose = require('mongoose');
const { BlobServiceClient } = require('@azure/storage-blob');
const getBlobSasUrl = require('../utils/getBlobSasUrl');
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'studio99';
require('dotenv').config(); 

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


// Creator Request to upload video===============
// exports.requestVideoUpload = async (req, res) => {
//   try {
//     if (!req.user) {
//       return res.status(401).json({ error: 'Unauthorized: No user in request' });
//     }

//     const userId = req.user._id;
//     const { title, category, description, videoOriginalName, thumbnailOriginalName } = req.body;

//     if (!title || !category || !videoOriginalName || !thumbnailOriginalName) {
//       return res.status(400).json({ error: 'Missing required fields' });
//     }

//     // Prepare blob names FIRST, generate a temp videoDoc to get the _id
//     const tempVideoDoc = new Video({
//       user: userId,
//       title,
//       category,
//       description,
//       status: 'uploading'
//     });

//     // Generate blob names using tempVideoDoc._id before saving
//     const videoBlobName = `videos/${userId}/${tempVideoDoc._id}_${videoOriginalName}`;
//     const thumbnailBlobName = `thumbnails/${userId}/${tempVideoDoc._id}_${thumbnailOriginalName}`;

//     // Now set them on the doc
//     tempVideoDoc.videoBlobName = videoBlobName;
//     tempVideoDoc.thumbnailBlobName = thumbnailBlobName;

//     // Save doc with all required fields present
//     await tempVideoDoc.save();

//     const videoUploadUrl =  await getBlobSasUrl('videos', videoBlobName, 60, 'cw');
//     const thumbnailUploadUrl = await getBlobSasUrl('thumbnails', thumbnailBlobName, 60, 'cw');

//     res.json({
//       videoId: tempVideoDoc._id,
//       videoUploadUrl,
//       thumbnailUploadUrl
//     });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to get SAS URLs', details: error.message });
//   }
// };
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

    // Create DB record for video
    const tempVideoDoc = new Video({
      user: userId,
      title,
      category,
      description,
      status: 'uploading'
    });

    // Prepare blob names
    const videoBlobName = `videos/${userId}/${tempVideoDoc._id}_${videoOriginalName}`;
    const thumbnailBlobName = `thumbnails/${userId}/${tempVideoDoc._id}_${thumbnailOriginalName}`;

    tempVideoDoc.videoBlobName = videoBlobName;
    tempVideoDoc.thumbnailBlobName = thumbnailBlobName;

    await tempVideoDoc.save();

    // Generate SAS upload URLs
    const videoUploadUrl = await getBlobSasUrl('videos', videoBlobName, 60, 'cw');
    const thumbnailUploadUrl = await getBlobSasUrl('thumbnails', thumbnailBlobName, 60, 'cw');

    // The playback (read) URL will be public, so no need to save SAS here
    res.json({
      videoId: tempVideoDoc._id,
      videoUploadUrl,
      thumbnailUploadUrl,
      // The client can construct the playback URL after upload (see below)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get SAS URLs', details: error.message });
  }
};
exports.confirmVideoUpload = async (req, res) => {
  try {
    const { videoId } = req.body;
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });

    // Use your real storage account name below
    const account = "studio99";
    const videoUrl = `https://${account}.blob.core.windows.net/videos/${video.videoBlobName}`;
    const thumbnailUrl = `https://${account}.blob.core.windows.net/thumbnails/${video.thumbnailBlobName}`;

    video.status = 'ready';
    video.videoUrl = videoUrl;
    video.thumbnailUrl = thumbnailUrl;
    await video.save();

    res.json({ message: 'Upload confirmed', video });
  } catch (error) {
    res.status(500).json({ error: 'Could not confirm upload', details: error.message });
  }
};


// exports.confirmVideoUpload = async (req, res) => {
//   try {
//     const { videoId } = req.body;
//     const video = await Video.findById(videoId);
//     if (!video) return res.status(404).json({ error: 'Video not found' });

//     const videoUrl = await getBlobSasUrl('videos', video.videoBlobName, 1440, 'r');
//     const thumbnailUrl = await getBlobSasUrl('thumbnails', video.thumbnailBlobName, 1440, 'r');

//     video.status = 'ready';
//     video.videoUrl = videoUrl;
//     video.thumbnailUrl = thumbnailUrl;
//     await video.save();

//     res.json({ message: 'Upload confirmed', video });
//   } catch (error) {
//     res.status(500).json({ error: 'Could not confirm upload', details: error.message });
//   }
// };
// Creator confirm the video upload
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
    const userId = req.body.userId; 
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const pipeline = [
      { $match: { status: "ready" } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',             
          localField: 'user',
          foreignField: '_id',
          as: 'uploader'
        }
      },
      { $unwind: { path: "$uploader", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'mylists',
          let: { videoId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$video', '$$videoId'] },
                    { $eq: ['$user', new mongoose.Types.ObjectId(userId)] }
                  ]
                }
              }
            },
            {
              $project: {
                id: '$_id',
                videoId: '$video',
                userId: '$user',
                createdAt: 1,
                updatedAt: 1
              }
            }
          ],
          as: 'myList'
        }
      },
      {
        $addFields: {
          id: '$_id',
          uploaderProfile: {
            name: '$uploader.name',
            channelName: '$uploader.channelName',
            profileImage: {
              $cond: {
                if: { $ifNull: ["$uploader.profileImage", false] },
                then: {
                  $concat: [
                    "https://studio99.blob.core.windows.net/",
                    "$uploader.profileImage"
                  ]
                },
                else: null
              }
            }
          }
        }
      },
      {
        $project: {
          uploader: 0
        }
      }
    ];

    const data = await Video.aggregate(pipeline);
    const total = await Video.countDocuments({ status: "ready" });

    res.json({
      message: 'Videos fetched successfully',
      data,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalVideos: total
    });
  } catch (error) {
    console.error('Error fetching videos by user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

//Search videos============================
exports.searchVideos = async (req, res) => {
  try {
    const search = req.query.search?.trim();
    const userId = req.query.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    if (!search) {
      return res.status(400).json({ message: "Search term is required." });
    }

    const regex = new RegExp(search, 'i');

    const pipeline = [
      {
        $match: {
          status: "ready",
          $or: [
            { title: { $regex: regex } },
            { category: { $regex: regex } }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Lookup uploader details
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'uploader'
        }
      },
      { $unwind: { path: "$uploader", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'mylists',
          let: { videoId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$video', '$$videoId'] },
                    { $eq: ['$user', new mongoose.Types.ObjectId(userId)] }
                  ]
                }
              }
            },
            {
              $project: {
                id: '$_id',
                videoId: '$video',
                userId: '$user',
                createdAt: 1,
                updatedAt: 1
              }
            }
          ],
          as: 'myList'
        }
      },
      {
        $addFields: {
          id: "$_id",
          uploaderProfile: {
            name: '$uploader.name',
            channelName: '$uploader.channelName',
            profileImage: {
              $cond: {
                if: { $ifNull: ["$uploader.profileImage", false] },
                then: {
                  $concat: [
                    "https://studio99.blob.core.windows.net/",
                    "$uploader.profileImage"
                  ]
                },
                else: null
              }
            }
          }
        }
      },
      {
        $project: {
          uploader: 0
        }
      }
    ];

    const data = await Video.aggregate(pipeline);
    const countPipeline = [
      {
        $match: {
          status: "ready",
          $or: [
            { title: { $regex: regex } },
            { category: { $regex: regex } }
          ]
        }
      },
      { $count: "total" }
    ];
    const countResult = await Video.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    if (!data.length) {
      return res.status(404).json({ message: "No videos found matching your search." });
    }

    return res.status(200).json({
      message: 'Videos retrieved successfully',
      data,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalVideos: total
    });
  } catch (error) {
    console.error("Error searching videos:", error);
    return res.status(500).json({
      message: 'Something went wrong',
      error: error.message
    });
  }
};

//Incremnent View================================
exports.incrementViewCount = async (req, res) => {
  try {
    const { videoId } = req.body;
    if (!videoId) {
      return res.status(400).json({ error: "videoId is required" });
    }

    const video = await Video.findByIdAndUpdate(
      videoId,
      { $inc: { views: 1 } },  
      { new: true }
    );

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    res.json({
      message: "View count incremented",
      views: video.views,
      videoId: video._id
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};


//Get Video by ID===============================
exports.getVideosByUserId = async (req, res) => {
  try {
    const { userId } = req.body; 
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const [videos, total] = await Promise.all([
      Video.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Video.countDocuments({ user: userId })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      message: "Videos fetched successfully",
      data: videos,      
      currentPage: page,
      totalPages,
      totalVideos: total
    });
  } catch (error) {
    console.error('Error fetching videos by user:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};


//Delete Video by userID and videoID=================
exports.deleteVideoByUserAndId = async (req, res) => {
  try {
    const { userId, videoId } = req.body;

    if (!userId || !videoId) {
      return res.status(400).json({ error: 'userId and videoId are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ error: 'Invalid userId or videoId' });
    }

    const video = await Video.findOne({ _id: videoId, user: userId });
    if (!video) {
      return res.status(404).json({ error: 'Video not found for this user' });
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

  
    if (video.videoBlobName) {
      const videoContainer = video.videoBlobName.split('/')[0];
      const videoBlobName = video.videoBlobName.split('/').slice(1).join('/');
      const videoContainerClient = blobServiceClient.getContainerClient(videoContainer);
      const videoBlockBlobClient = videoContainerClient.getBlockBlobClient(videoBlobName);
      await videoBlockBlobClient.deleteIfExists();
    }

    if (video.thumbnailBlobName) {
      const thumbContainer = video.thumbnailBlobName.split('/')[0];
      const thumbBlobName = video.thumbnailBlobName.split('/').slice(1).join('/');
      const thumbContainerClient = blobServiceClient.getContainerClient(thumbContainer);
      const thumbBlockBlobClient = thumbContainerClient.getBlockBlobClient(thumbBlobName);
      await thumbBlockBlobClient.deleteIfExists();
    }

    await Video.deleteOne({ _id: videoId });

    res.json({ message: "Video and related files deleted successfully" });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};


// =====================Subscription==================


// get all plans
exports.getAllPlans = async (req, res) => {
  try {
    const prices = await stripe.prices.list({
      expand: ['data.product'],
      active: true,
      limit: 100,
    });

    const formattedPlans = {};

    prices.data.forEach((price) => {
      // Determine the plan name based on the interval
      let planName = price.product?.name ?? 'Unknown Plan';
      if (price.recurring?.interval === 'month') {
        planName = `${planName} Monthly`;
      } else if (price.recurring?.interval === 'year') {
        planName = `${planName} Yearly`;
      }

      // Add custom logic for child profiles
      let deviceLimits = 0;
      if (planName.includes('Studio Basic')) {
        deviceLimits = 3;
      } else if (planName.includes('Studio Select')) {
        deviceLimits = 5;
      } else if (planName.includes('Studio Everything')) {
        deviceLimits = 7;
      }

      // Add the plan to the formatted response
      formattedPlans[planName] = {
        planId: price.id ?? '',
        productName: price.product?.name ?? '',
        amount: price.unit_amount ? price.unit_amount / 100 : 0,
        currency: price.currency ?? '',
        interval: price.recurring?.interval ?? 'unknown',
        intervalCount: price.recurring?.interval_count ?? 1,
        deviceLimits: deviceLimits, 
      };
    });

    res.status(200).json({ plans: formattedPlans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};

// create customer and setup intent
exports.createCustomerAndSetupIntent = async (req, res) => {
  try {
    const { name, email, userId, stripeCustomerId } = req.body;

    if (!name || !email || !userId) {
      return res.status(400).json({ status: 'failed', message: 'Missing required fields.' });
    }

    // Create a customer in Stripe if no stripeCustomerId exists
    let customer;
    if (!stripeCustomerId) {
      customer = await stripe.customers.create({ name, email });
      // Save customerId to the database (Mongo)
      await User.updateOne(
        { _id: userId },
        { stripeCustomerId: customer.id }
      );
    } else {
      customer = await stripe.customers.retrieve(stripeCustomerId);
    }

    // Create a SetupIntent to save a payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      automatic_payment_methods: { enabled: true },
    });

    return res.json({
      status: 'success',
      data: setupIntent,
      stripeCustomerId: customer.id,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'failed', message: error.message });
  }
};



//Create subscription for customer===============

// exports.createSubscription = async (req, res) => {
//   try {
//     const { userId, priceId, setupIntentId } = req.body;

//     if (!userId || !priceId || !setupIntentId) {
//       return res.status(400).json({ status: 'failed', message: 'Missing required fields.' });
//     }

//     // Find user by MongoDB _id, not with 'where'
//     const user = await User.findById(userId);

//     if (!user || !user.stripeCustomerId) {
//       return res.status(404).json({ status: 'failed', message: 'User or Stripe customer not found.' });
//     }

//     const customerId = user.stripeCustomerId;

//     const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

//     if (!setupIntent.payment_method) {
//       return res.status(400).json({ status: 'failed', message: 'No payment method found in SetupIntent.' });
//     }

//     const paymentMethodId = setupIntent.payment_method;

//     await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });

//     await stripe.customers.update(customerId, {
//       invoice_settings: { default_payment_method: paymentMethodId }
//     });

//     const subscription = await stripe.subscriptions.create({
//       customer: customerId,
//       items: [{ price: priceId }],
//       expand: ['latest_invoice']
//     });

//     console.log('Subscription Data:', subscription);
//     console.log(JSON.stringify(subscription.latest_invoice, null, 2));

//     const stripeSubscriptionId = subscription.id;
//     const status = subscription.status;
//     const planId = subscription.plan ? subscription.plan.id : null;

//     // Calculate start and end date based on priceId
//     const priceDurations = {
//       'price_1RnDZ8FzfzQHoUIf9xCj087m': 1,
//       'price_1RnDZXFzfzQHoUIfRlY4JmDc': 12,
//       'price_1RnDa8FzfzQHoUIf19Ijc7in': 1,
//       'price_1RnDbVFzfzQHoUIfigNFlC1I': 12,
//       'price_1RnDcBFzfzQHoUIfNCztDsGP': 1,
//       'price_1RnDcXFzfzQHoUIf6FRucAqG': 12,
//     };

//     const startDateObj = new Date(subscription.start_date * 1000);
//     const monthsToAdd = priceDurations[priceId] || 1;
//     const endDateObj = new Date(startDateObj);
//     endDateObj.setMonth(endDateObj.getMonth() + monthsToAdd);

//     const startDate = startDateObj.toISOString();
//     const endDate = endDateObj.toISOString();

//     const productId = subscription.items.data[0].price.product;

//     let deviceLimit = 1;
//     if (productId === 'prod_SiesaGIzmORykD') {
//       deviceLimit = 3;
//     } else if (productId === 'prod_Siet5bc4f0fS4T') {
//       deviceLimit = 5;
//     } else if (productId === 'prod_SiewxfafGXPSUc') {
//       deviceLimit = 7;
//     } 

//     // Create the subscription record in the database (Mongoose)
//     await Subscription.create({
//       stripeSubscriptionId,
//       status,
//       planId,
//       priceId,
//       startDate,
//       endDate,
//       user: userId,   // If your Subscription model expects 'user'
//     });

//     // Update the User's subscription status and deviceLimit (Mongoose)
//     await User.updateOne(
//       { _id: userId },
//       {
//         subscriptionStatus: 'active',
//         totalDevices: 0,
//         deviceLimit: deviceLimit,
//       }
//     );

//     return res.json({
//       status: 'success',
//       data: subscription,
//     });
//   } catch (error) {
//     console.error('Stripe subscription error:', error);
//     return res.status(500).json({ status: 'failed', message: error.message });
//   }
// };

exports.createSubscription = async (req, res) => {
  try {
    const { userId, priceId, setupIntentId } = req.body;

    if (!userId || !priceId || !setupIntentId) {
      return res.status(400).json({ status: 'failed', message: 'Missing required fields.' });
    }

    const user = await User.findById(userId);
    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({ status: 'failed', message: 'User or Stripe customer not found.' });
    }

    const customerId = user.stripeCustomerId;

    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

    if (!setupIntent.payment_method) {
      return res.status(400).json({ status: 'failed', message: 'No payment method found in SetupIntent.' });
    }

    const paymentMethodId = setupIntent.payment_method;

    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId }
    });

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      expand: ['latest_invoice']
    });

    // Map productId to device limit
    const productId = subscription.items.data[0].price.product;
    let deviceLimit = 1;
    if (productId === 'prod_SiesaGIzmORykD') {
      deviceLimit = 3;
    } else if (productId === 'prod_Siet5bc4f0fS4T') {
      deviceLimit = 5;
    } else if (productId === 'prod_SiewxfafGXPSUc') {
      deviceLimit = 7;
    }

    // Calculate dates
    const priceDurations = {
      'price_1RnDZ8FzfzQHoUIf9xCj087m': 1,
      'price_1RnDZXFzfzQHoUIfRlY4JmDc': 12,
      'price_1RnDa8FzfzQHoUIf19Ijc7in': 1,
      'price_1RnDbVFzfzQHoUIfigNFlC1I': 12,
      'price_1RnDcBFzfzQHoUIfNCztDsGP': 1,
      'price_1RnDcXFzfzQHoUIf6FRucAqG': 12,
    };
    
    const startDateObj = new Date(subscription.start_date * 1000);
    const monthsToAdd = priceDurations[priceId] || 1;
    const endDateObj = new Date(startDateObj);
    endDateObj.setMonth(endDateObj.getMonth() + monthsToAdd);

    const startDate = startDateObj.toISOString();
    const endDate = endDateObj.toISOString();

    // Create the subscription record in the database (Mongoose)
    await Subscription.create({
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      planId: subscription.plan ? subscription.plan.id : null,
      priceId,
      startDate,
      endDate,
      userId: userId,
    });

    // Update the User's subscription status and deviceLimit (Mongoose)
    await User.updateOne(
      { _id: userId },
      {
        subscriptionStatus: 'active',
        deviceLimit: deviceLimit,
      }
    );

    return res.json({
      status: 'success',
      data: subscription,
      deviceLimit,
    });
  } catch (error) {
    console.error('Stripe subscription error:', error);
    return res.status(500).json({ status: 'failed', message: error.message });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {

    const { userId } = req.body;

    const deviceId = req.body.deviceId;

    if (!userId || !deviceId) {
      return res.status(400).json({ status: 'failed', message: 'User ID and device ID are required.' });
    }

    const subscription = await Subscription.findOne({ user: userId })
      .sort({ createdAt: -1 });

    if (!subscription) {
      return res.status(404).json({ status: 'failed', message: 'No active subscription found.' });
    }

    const canceledSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    const cancelDate = new Date(canceledSubscription.cancel_at * 1000);

    subscription.status = 'canceled';
    subscription.cancelDate = cancelDate.toISOString();
    await subscription.save();

    await User.updateOne(
      { _id: userId },
      {
        subscriptionStatus: 'inactive',
        deviceLimit: 1, 
      }
    );

    // === Force logout all other devices ===
    await Session.deleteMany({ user: userId, deviceId: { $ne: deviceId } });

    return res.status(200).json({
      status: 'success',
      message: 'Subscription will be canceled at the end of the current billing period. Other devices have been logged out.',
      cancelAt: cancelDate,
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return res.status(500).json({ status: 'failed', message: error.message });
  }
};


