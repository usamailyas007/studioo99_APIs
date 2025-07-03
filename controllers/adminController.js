const Policy = require('../models/policy');


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
