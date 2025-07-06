const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');


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

//Update Verifciation Status Route
router.post('/user/updateVerificationStatus', authMiddleware, adminController.updateVerificationStatus);

//Susupend User Route 
router.post('/user/suspendUser', authMiddleware,  adminController.suspendUser);


//Get All Viewers Route
router.get('/user/getUserStats',  adminController.getUserStats);




module.exports = router;
