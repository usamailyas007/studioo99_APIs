const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/sessions');
const Coupon = require('../models/Coupon');
const bcrypt = require('bcryptjs');
const secret_Key = process.env.SECRET_KEY;
const { sendOtpMail } = require('../services/otpServices'); 
const uploadToAzure = require('../utils/azureBlob');
const getBlobSasUrl = require('../utils/getBlobSasUrl');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const ACCESS_TOKEN_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

const refresh_Secret_Key = process.env.REFRESH_SECRET_KEY;

require('dotenv').config();


exports.signup = async (req, res) => {
  try {
    const { name, email, password, channelName, role, couponCode } = req.body;

    if (!['Viewer', 'Content Creator', 'Admin'].includes(role)) {
      return res.status(400).json({ error: "Role must be either 'Viewer' or 'Content Creator'" });
    }

    if (role === 'Content Creator' && !channelName) {
      return res.status(400).json({ error: "Channel name is required for Content Creators" });
    }

       if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() });
      if (!coupon) {
        return res.status(400).json({ error: "Invalid coupon code, try to add correct one" });
      }
    }

    if (role === 'Viewer' && channelName) {
      return res.status(400).json({ error: "Viewers should not have a channel name" });
    }

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }


    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    if (couponCode) {
  const couponUsed = await User.findOne({
    couponCode: couponCode.trim().toUpperCase()
  });
  if (couponUsed) {
    return res.status(400).json({ error: "This coupon code already in use" });
  }
}
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      channelName: role === 'Content Creator' ? channelName : undefined,
      role,
      couponCode,
       verificationStatus: role === 'Content Creator' ? 'Pending' : 'Approved',
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
// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ error: "Please provide both email and password" });
//     }

//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ error: "Invalid email or password" });
//     }

//      if (user.suspended === true) {
//       return res.status(403).json({ error: "This account has been suspended." });
//     }

//     if (user.activeStatus === false) {
//       return res.status(403).json({ error: "This account has been deleted." });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ error: "Invalid email or password" });
//     }

//     const token = jwt.sign(
//       { userId: user._id, role: user.role },
//       secret_Key,
//       { expiresIn: '7d' }
//     );

//     res.status(200).json({
//       message: "Login successful",
//       token,
//       user: { ...user._doc, password: undefined }
//     });
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({ error: 'Server error', details: error.message });
//   }
// };

exports.login = async (req, res) => {
  try {
    const { email, password, deviceId } = req.body;

    if (!email || !password || !deviceId) {
      return res.status(400).json({ error: "Please provide email, password, and deviceId" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid email or password" });
    if (user.suspended) return res.status(403).json({ error: "This account has been suspended." });
    if (user.activeStatus === false) return res.status(403).json({ error: "This account has been deleted." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid email or password" });

    // Enforce device/session limit
    const activeSessions = await Session.countDocuments({ user: user._id });
    if (activeSessions >= 3) {
      return res.status(403).json({ error: "Maximum device limit reached. Please logout from another device first." });
    }

    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      secret_Key,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );
    const refreshToken = jwt.sign(
      { userId: user._id, role: user.role, deviceId },
      refresh_Secret_Key,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    // Store refresh token and device session
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);
    await user.save();

    await Session.create({
      user: user._id,
      deviceId,
      refreshToken,
      createdAt: new Date(),
      lastActiveAt: new Date()
    });

    res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: { ...user._doc, password: undefined, refreshTokens: undefined }
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


//Edit Profile==========================
// exports.editProfile = [
//   upload.single('profileImage'), 
//   async (req, res) => {
//     try {
//       const userId = req.user._id;
//       const { name, channelName, email, country, region } = req.body;

//       const updateData = {};
//       if (name) updateData.name = name;
//       if (channelName) updateData.channelName = channelName;
//       if (email) updateData.email = email;
//       if (country) updateData.country = country;
//       if (region) updateData.region = region;

//       if (req.file) {
//         const ext = req.file.originalname.split('.').pop();
//         const fileName = `profile_${userId}_${Date.now()}.${ext}`;
//         await uploadToAzure(req.file.buffer, fileName, "profileimages");
//         updateData.profileImage = `profileimages/${fileName}`;
//       }

//       const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
//       if (!updatedUser) {
//         return res.status(404).json({ error: "User not found" });
//       }

//       res.json({ message: "Profile updated", user: updatedUser });
//     } catch (error) {
//       console.error('Edit profile error:', error);
//       res.status(500).json({ error: 'Server error', details: error.message });
//     }
//   }
// ];
exports.editProfile = [
  // Multer middleware for single file upload
  upload.single('profileImage'), 
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { name, channelName, email, country, region } = req.body;

      const updateData = {};
      if (name) updateData.name = name;
      if (channelName) updateData.channelName = channelName;
      if (email) updateData.email = email;
      if (country) updateData.country = country;
      if (region) updateData.region = region;

      let publicImageUrl = null;

      if (req.file) {
        const ext = req.file.originalname.split('.').pop();
        const fileName = `profile_${userId}_${Date.now()}.${ext}`;
        await uploadToAzure(req.file.buffer, fileName, "profileimages");
        updateData.profileImage = `profileimages/${fileName}`;
        publicImageUrl = `https://studio99.blob.core.windows.net/profileimages/${fileName}`;
      }

      const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        message: "Profile updated",
        user: updatedUser,
        profileImageUrl: publicImageUrl || (updatedUser.profileImage
            ? `https://studio99.blob.core.windows.net/${updatedUser.profileImage}`
            : null)
      });
    } catch (error) {
      console.error('Edit profile error:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  }
];

// Get SAS Url===================================
exports.getProfileImageUrl = async (req, res) => {
  try {
    const userId = req.body.userId;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required in the body' });
    }
    const user = await User.findById(userId);
    if (!user || !user.profileImage) {
      return res.status(404).json({ message: 'No profile image found' });
    }
    const [containerName, ...blobParts] = user.profileImage.split('/');
    const blobName = blobParts.join('/');
    const imageUrl = await getBlobSasUrl(containerName, blobName, 60); 
    res.json({ url: imageUrl });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
