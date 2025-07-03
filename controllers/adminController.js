const Policy = require('../models/policy');

exports.upsertPolicy = async (req, res) => {
  try {
    const { type, content } = req.body;
    if (!['privacy', 'terms', 'ssl'].includes(type)) {
      return res.status(400).json({ error: 'Type must be one of: privacy, terms, ssl' });
    }
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Find if the policy of this type exists, else create new (upsert)
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
