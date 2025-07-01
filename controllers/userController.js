const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.signup = async (req, res) => {
    console.log('Signup endpoint hit!', req.body); 
  try {
    const { name, phone, password, channelName, region, country, role } = req.body;

    // Role-based validation
    if (!['Viewer', 'Content Creator'].includes(role)) {
      return res.status(400).json({ error: "Role must be either 'Viewer' or 'Content Creator'" });
    }
    if (role === 'Content Creator' && !channelName) {
      return res.status(400).json({ error: "Channel name is required for Content Creators" });
    }
    if (role === 'Viewer' && channelName) {
      return res.status(400).json({ error: "Viewers should not have a channel name" });
    }
    if (!name || !phone || !password || !role) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      name,
      phone,
      password: hashedPassword,
      channelName: role === 'Content Creator' ? channelName : undefined,
      region,
      country,
      role,
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully', user: { ...newUser._doc, password: undefined } });
  } catch (error) {
      console.error('Signup error:', error); 
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};
