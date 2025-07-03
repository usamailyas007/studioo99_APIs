const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const secret_Key = process.env.SECRET_KEY;
const { sendOtpMail } = require('../services/services'); 

require('dotenv').config();


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

//send Otp API===========================

exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 min

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    await sendOtpMail(email, otp);

    res.status(200).json({ message: 'OTP sent to email' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};


// Verify OTP============================
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ error: 'OTP not requested' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (Date.now() > user.otpExpiry) {
      return res.status(400).json({ error: 'OTP expired' });
    }

    user.otp = undefined;
    user.otpExpiry = undefined;
    user.isVerified = true;
    await user.save();

    res.status(200).json({ message: 'Email verified' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// Resend OTP============================
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000; 

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    await sendOtpMail(email, otp);

    res.status(200).json({ message: 'OTP resent to email' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

//Set New Password=======================
exports.setNewPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Set new password error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

//Change Password by userID================
exports.changePasswordById = async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'User ID, current password, and new password are required.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

  
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password by ID error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

//Delete user by ID
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { activeStatus: false },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User Deleted successfully', user: updatedUser });
  } catch (error) {
    console.error('Soft delete error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};


