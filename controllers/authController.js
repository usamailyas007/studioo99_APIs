const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const secret_Key = process.env.SECRET_KEY;

exports.signup = async (req, res) => {
  try {
    const { name, email, password, channelName, role } = req.body;

    if (!['Viewer', 'Content Creator'].includes(role)) {
      return res.status(400).json({ error: "Role must be either 'Viewer' or 'Content Creator'" });
    }

    if (role === 'Content Creator' && !channelName) {
      return res.status(400).json({ error: "Channel name is required for Content Creators" });
    }

    if (role === 'Viewer' && channelName) {
      return res.status(400).json({ error: "Viewers should not have a channel name" });
    }

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      channelName: role === 'Content Creator' ? channelName : undefined,
      role,
    });

    await newUser.save();

    // Generate JWT Token
    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role },
      secret_Key,
      { expiresIn: '7d' } // Token expires in 7 days
    );

    res.status(201).json({
      message: 'User registered successfully',
      token, // return the JWT token
      user: { ...newUser._doc, password: undefined }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

//Add region and country
exports.updateProfile = async (req, res) => {
  try {
    const { userId,region, country } = req.body;

  
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { region, country },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "Profile updated", user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

