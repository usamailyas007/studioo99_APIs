const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const secret_Key = "sjjsjsjd;owqknnqkwjcnnwkcncn";

//Signup API===========================
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

    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role },
      secret_Key,
      { expiresIn: '7d' } 
    );

    res.status(200).json({
      message: 'User registered successfully',
      token, 
      user: { ...newUser._doc, password: undefined }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

//Login API===========================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Please provide both email and password" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      secret_Key,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: { ...user._doc, password: undefined }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};


//AddRegion API===========================
exports.addRegion = async (req, res) => {
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

