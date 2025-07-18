const Policy = require('../models/policy');
const AppSettings = require('../models/AppSettings');
const User = require('../models/User');
const Video = require('../models/Video');
const Coupon = require('../models/Coupon');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); 
const uploadToAzure = require('../utils/azureBlob'); 
const getBlobSasUrl = require('../utils/getBlobSasUrl');




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

    const totalPages = Math.ceil(total / limit);

    res.json({
      contentCreators,
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

    const totalPages = Math.ceil(total / limit);

    res.json({
      viewers,
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
    const [viewersCount, creatorsCount] = await Promise.all([
      User.countDocuments({ role: 'Viewer' }),
      User.countDocuments({ role: 'Content Creator' }),
    ]);

    res.json({
      message: "User role stats fetched successfully",
      totalViewers: viewersCount,
      totalContentCreators: creatorsCount
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