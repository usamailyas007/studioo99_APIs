const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');


//Admin login Route

router.post('/admin/adminLogin', adminController.adminLogin);

//Post Policy Route
router.post('/admin/policy', authMiddleware, adminController.upsertPolicy);

//Get Policy Route
router.get('/user/getAllPolicies',  adminController.getAllPolicies);

//Post App Setting route
router.post('/admin/appSetting',authMiddleware,  adminController.upsertAppSettings);

//Get Policy Route
router.get('/user/getAppSettings',  adminController.getAppSettings);

//Get Content Creators Route
router.get('/user/getContentCreator', authMiddleware, adminController.getAllContentCreators);

//Get All Viewers Route
router.get('/user/getViewers', authMiddleware, adminController.getAllViewers);

router.get('/user/getUserStats', authMiddleware, adminController.getUserStats);

//Update Verifciation Status Route
router.post('/user/updateVerificationStatus', authMiddleware, adminController.updateVerificationStatus);

//Susupend User Route 
router.post('/user/suspendUser', authMiddleware,  adminController.suspendUser);

//Update Video Status Route
// router.post('/user/suspendUser', authMiddleware,  adminController.suspendUser);

//Get All Viewers Route
router.post('/admin/updateVieoStatus', authMiddleware, adminController.updateVideoApprovalStatus);

//Genrate coupon code 
router.post('/admin/createCoupon', authMiddleware, adminController.createCoupon);

//Get all coupons
router.get('/admin/coupons', authMiddleware, adminController.getCoupons);

router.post('/admin/getVidByUserId', authMiddleware, adminController.getVidByUserId);

//Get Revenue Stats Route
router.get('/admin/getRevenueStats',  adminController.getRevenueStats);





module.exports = router;
