const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');


//Signup Route
router.post('/signup', authController.signup);

//Login Route
router.post('/login', authController.login);

//Logout Route
router.post('/logout', authController.logout);

//Add Region Route
router.post('/addRegion', authMiddleware, authController.addRegion);

//Send OTP Route
router.post('/send-otp', authController.sendOtp);


//Veirfy OTP Route
router.post('/verify-otp', authController.verifyOtp);

//Resend OTP Route
router.post('/resend-otp', authController.resendOtp);

//Set New Password Route
router.post('/set-new-Password', authController.setNewPassword);

//Set Password by Id Route
router.post('/change-password-by-id', authMiddleware, authController.changePasswordById);

//Delete user by ID
router.post('/deleteUser', authMiddleware, authController.deleteUser);


//Edit Profile Route
router.post('/edit-profile', authMiddleware, authController.editProfile);

//Get SAS URL Route 
router.get('/getProfileUrl', authMiddleware, authController.getProfileImageUrl);


module.exports = router;
