const Policy = require('../models/policy');
const AppSettings = require('../models/AppSettings');
const User = require('../models/User');



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
exports.upsertAppSettings = async (req, res) => {
  try {
    const {
      appName,
      stripeKey,
      videoCategories,
      subscriptionPackages
    } = req.body;

    const updatedSettings = await AppSettings.findOneAndUpdate(
      {},
      {
        appName,
        stripeKey,
        videoCategories,
        subscriptionPackages,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'App settings updated', appSettings: updatedSettings });
  } catch (error) {
    console.error('App settings update error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};


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

//Get All content Creators======================
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
