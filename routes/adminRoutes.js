const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');


//Post Policy Route
router.post('/admin/policy',  adminController.upsertPolicy);

//Get Policy Route
router.get('/user/getAllPolicies',  adminController.getAllPolicies);

//Post App Setting route
router.post('/admin/appSetting',  adminController.upsertAppSettings);


//Get Policy Route
router.get('/user/getAppSettings',  adminController.getAppSettings);


//Get Content Creators Route
router.get('/user/getContentCreator',  adminController.getAllContentCreators);

//Get All Viewers Route
router.get('/user/getViewers',  adminController.getAllViewers);

//Update Verifciation Status Route
router.post('/user/updateVerificationStatus',  adminController.updateVerificationStatus);

//Susupend User Route 
router.post('/user/suspendUser',  adminController.suspendUser);




module.exports = router;
