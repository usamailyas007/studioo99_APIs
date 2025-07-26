const Policy = require('../models/policy');
const AppSettings = require('../models/AppSettings');
const User = require('../models/User');
const Video = require('../models/Video');
const Subscription = require('../models/subscription')
const Coupon = require('../models/Coupon');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); 
const uploadToAzure = require('../utils/azureBlob'); 
const getBlobSasUrl = require('../utils/getBlobSasUrl');
const bcrypt = require('bcryptjs');
const secret_Key = process.env.SECRET_KEY;
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');



//Admin login============================
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Please provide both email and password" });
    }

    // Only find users with the Admin role
    const user = await User.findOne({ email, role: 'Admin' });
    if (!user) {
      return res.status(400).json({ error: "Invalid email, password, or not an admin" });
    }

    if (user.suspended === true) {
      return res.status(403).json({ error: "This admin account has been suspended." });
    }

    if (user.activeStatus === false) {
      return res.status(403).json({ error: "This admin account has been deleted." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      secret_Key,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: "Admin login successful",
      token,
      user: { ...user._doc, password: undefined }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

//post Privacy SSL Term======================
exports.upsertPolicy = async (req, res) => {
  try {
    const { type, content } = req.body;
    if (!['privacy', 'terms', 'ssl'].includes(type)) {
      return res.status(400).json({ error: 'Type must be one of: privacy, terms, ssl' });
    }
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const updatedPolicy = await Policy.findOneAndUpdate(
      { type },
      { content, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ message: `Policy (${type}) saved successfully`, policy: updatedPolicy });
  } catch (error) {
    console.error('Upsert Policy error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

//Get Privacy SSL Term======================
exports.getAllPolicies = async (req, res) => {
  try {
    const policies = await Policy.find({});
    res.json({ policies });
  } catch (error) {
    console.error('Get all policies error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

//App Settings=========================== 
exports.upsertAppSettings = [
  upload.single('appLogo'), 
  async (req, res) => {
    try {
      let { appName, stripeKey, videoCategories, subscriptionPackages } = req.body;

      let appLogoUrl;

      if (req.file) {
        const ext = req.file.originalname.split('.').pop();
        const fileName = `applogo_${Date.now()}.${ext}`;
        await uploadToAzure(req.file.buffer, fileName, 'applogos');
        appLogoUrl = `https://studio99.blob.core.windows.net/applogos/${fileName}`;
      }

      if (typeof videoCategories === "string") {
        try { videoCategories = JSON.parse(videoCategories); } catch {}
      }
      if (typeof subscriptionPackages === "string") {
        try { subscriptionPackages = JSON.parse(subscriptionPackages); } catch {}
      }

      let existing = await AppSettings.findOne({});

      let mergedCategories = videoCategories || [];
      if (existing && existing.videoCategories) {
        mergedCategories = Array.from(new Set([...existing.videoCategories, ...mergedCategories]));
      }

      let mergedPackages = subscriptionPackages || [];
      if (existing && existing.subscriptionPackages && Array.isArray(subscriptionPackages)) {
        const existingNames = new Set(existing.subscriptionPackages.map(p => p.name));
        mergedPackages = [
          ...existing.subscriptionPackages,
          ...mergedPackages.filter(p => !existingNames.has(p.name))
        ];
      }

      const updateFields = {
        appName,
        stripeKey,
        videoCategories: mergedCategories,
        subscriptionPackages: mergedPackages,
        updatedAt: new Date()
      };
      if (appLogoUrl) updateFields.appLogo = appLogoUrl;

      const updatedSettings = await AppSettings.findOneAndUpdate(
        {},
        updateFields,
        { upsert: true, new: true }
      );

      res.json({ message: 'App settings updated', appSettings: updatedSettings });
    } catch (error) {
      console.error('App settings update error:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  }
];


//Get App Settings=========================== 
exports.getAppSettings = async (req, res) => {
  try {
    const settings = await AppSettings.findOne({});
    if (!settings) {
      return res.status(404).json({ error: 'App settings not found' });
    }
    res.json({ appSettings: settings });
  } catch (error) {
    console.error('Get app settings error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

//Get All content Creators==========================
exports.getAllContentCreators = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; 
    const limit = 6;
    const skip = (page - 1) * limit;

    const [contentCreators, total] = await Promise.all([
      User.find({ role: 'Content Creator' })
        .skip(skip)
        .limit(limit),
      User.countDocuments({ role: 'Content Creator' })
    ]);

    const storageAccount = "studio99";

    const creatorsWithProfileUrl = contentCreators.map(user => {
      const userObj = { ...user._doc };
      userObj.profileImageUrl = user.profileImage
        ? `https://${storageAccount}.blob.core.windows.net/${user.profileImage}`
        : null;
      delete userObj.refreshTokens; // Remove sensitive field
      return userObj;
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      contentCreators: creatorsWithProfileUrl,
      pagination: {
        total,
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

//Get All Viewers================================
exports.getAllViewers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    const [viewers, total] = await Promise.all([
      User.find({ role: 'Viewer' }).skip(skip).limit(limit),
      User.countDocuments({ role: 'Viewer' })
    ]);

    const storageAccount = "studio99";

    const viewersWithProfileUrl = viewers.map(user => {
      const userObj = { ...user._doc };
      userObj.profileImageUrl = user.profileImage
        ? `https://${storageAccount}.blob.core.windows.net/${user.profileImage}`
        : null;
      delete userObj.refreshTokens; // <-- do not send this
      return userObj;
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      viewers: viewersWithProfileUrl,
      pagination: {
        total,
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};


//Update Verification Status====================
exports.updateVerificationStatus = async (req, res) => {
  try {
    const { userId, verificationStatus } = req.body;
    if (!userId || !['Pending', 'Approved', 'Rejected'].includes(verificationStatus)) {
      return res.status(400).json({ error: "userId and valid verificationStatus are required." });
    }
    const user = await User.findByIdAndUpdate(
      userId,
      { verificationStatus },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: 'Verification status updated', user });
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};


//Suspend User===================================
exports.suspendUser = async (req, res) => {
  try {
    const { userId, suspended } = req.body;
    if (typeof suspended !== 'boolean' || !userId) {
      return res.status(400).json({ error: "userId and suspended(boolean) are required." });
    }
    const user = await User.findByIdAndUpdate(
      userId,
      { suspended },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: `User ${suspended ? 'suspended' : 'unsuspended'} successfully`, user });
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

//Get User Stats================================
exports.getUserStats = async (req, res) => {
  try {
    const [viewersCount, creatorsCount, revenueAgg] = await Promise.all([
      User.countDocuments({ role: 'Viewer' }),
      User.countDocuments({ role: 'Content Creator' }),
      Subscription.aggregate([
        { $group: { _id: null, totalRevenue: { $sum: "$amount" } } }
      ])
    ]);

    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

    res.json({
      message: "User role stats fetched successfully",
      totalViewers: viewersCount,
      totalContentCreators: creatorsCount,
      totalRevenue
    });

  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


//Update Video status ==================================
exports.updateVideoApprovalStatus = async (req, res) => {
  try {
    const { videoId, approvalStatus } = req.body;
    if (!videoId || !['Approved', 'Rejected'].includes(approvalStatus)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const video = await Video.findByIdAndUpdate(
      videoId,
      { approvalStatus },
      { new: true }
    );

    if (!video) return res.status(404).json({ error: "Video not found" });

    res.json({ message: `Video ${approvalStatus.toLowerCase()}`, video });
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

//Add Coupon code======================================
exports.createCoupon = async (req, res) => {
  try {
    const { code } = req.body;

    const existing = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({ error: 'Coupon code already exists' });
    }

    const coupon = new Coupon({
      code: code.trim().toUpperCase()
    });

    await coupon.save();
    res.status(200).json({ message: 'Coupon created', coupon });
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
}

//Get All coupons
exports.getCoupons = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const [coupons, total] = await Promise.all([
      Coupon.find({})
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }), 
      Coupon.countDocuments()
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      coupons,
      pagination: {
        total,
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

//
exports.getVidByUserId = async (req, res) => {
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

//Track revenue===============================
exports.getRevenueStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1); // Jan 1 of this year
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of this month

    // 1. Monthly: Revenue per day in current month
    const monthlyData = await Subscription.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: { day: { $dayOfMonth: "$createdAt" } },
          total: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.day": 1 } }
    ]);

    // Fill in days with 0 if no revenue
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthly = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const found = monthlyData.find(item => item._id.day === d);
      monthly.push({ day: d, amount: found ? found.total : 0 });
    }

    // 2. Yearly: Revenue per month in current year
    const yearlyData = await Subscription.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear }
        }
      },
      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          total: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.month": 1 } }
    ]);

    // Month names for Jan-Dec
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const yearly = [];
    for (let m = 1; m <= 12; m++) {
      const found = yearlyData.find(item => item._id.month === m);
      yearly.push({ month: months[m - 1], amount: found ? found.total : 0 });
    }

    res.json({
      message: "Revenue stats fetched",
      monthly, // [{day: 1, amount: 0}, ...]
      yearly   // [{month: 'Jan', amount: 0}, ...]
    });

  } catch (error) {
    console.error("Error fetching revenue stats:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
