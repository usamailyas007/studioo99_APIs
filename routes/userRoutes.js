const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');



//Request Upload Video Route
router.post('/user/requestVideoUpload', authMiddleware, userController.requestVideoUpload);

//Confirm Videp Upload Route
router.post('/user/confirmVideoUpload', authMiddleware, userController.confirmVideoUpload);

//Add to List Route 
router.post('/user/addToMyList', authMiddleware, userController.addToMyList);

//Remove to List Route 
router.post('/user/removeFromMyList', authMiddleware, userController.removeFromMyList);

//Get ALL list Route
router.get('/user/getMyList',authMiddleware, userController.getMyList);

//Get All videos Route
router.get('/user/getAllVideos', authMiddleware, userController.getAllVideos);


//Search All videos Route
router.get('/user/searchVideo', authMiddleware, userController.searchVideos);

//Incremnt view to video Route
router.post('/user/incrementView', authMiddleware, userController.incrementViewCount);

//Get Video by ID 
router.get('/user/getVideosByUserId', authMiddleware, userController.getVideosByUserId);

//Delete Video Route
router.post('/user/deletVideo', authMiddleware, userController.deleteVideoByUserAndId);


router.get('/subscription/getAllPlans', authMiddleware, userController.getAllPlans);

router.post('/subscription/createCustomerAndSetupIntent', authMiddleware, userController.createCustomerAndSetupIntent);

router.post('/subscription/createSubscription', authMiddleware, userController.createSubscription);

router.post('/subscription/cancelSubscription', authMiddleware, userController.cancelSubscription);

router.get('/subscription/getCurrentSubscription', authMiddleware, userController.getCurrentSubscription);

router.post('/subscription/upgradeSubscription', authMiddleware, userController.upgradeSubscription);


module.exports = router;
