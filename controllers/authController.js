const User = require('../models/User');

// Signup Controller
exports.signup = async (req, res) => {
  try {
    const { name, phone, password, channelName, region, country, role } = req.body;

    // Role-based validation
    if (!['Viewer', 'Content Creator'].includes(role)) {
      return res.status(400).json({ error: "Role must be either 'Viewer' or 'Content Creator'" });
    }

    if (role === 'Content Creator') {
      if (!channelName) {
        return res.status(400).json({ error: "Channel name is required for Content Creators" });
      }
    }

    if (role === 'Viewer' && channelName) {
      return res.status(400).json({ error: "Viewers should not have a channel name" });
    }

    // Basic required fields validation
    if (!name || !phone || !password || !role) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    // Create user
    const newUser = new User({
      name,
      phone,
      password, // You should hash passwords before saving in production!
      channelName: role === 'Content Creator' ? channelName : undefined,
      region,
      country,
      role,
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};
