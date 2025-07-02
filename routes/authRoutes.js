const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');


//Signup Route
router.post('/signup', authController.signup);

//Login Route
router.post('/login', authController.login);

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




module.exports = router;
