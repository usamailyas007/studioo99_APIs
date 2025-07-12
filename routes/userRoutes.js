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
router.post('/user/getVideoById', authMiddleware, userController.getVideoById);





module.exports = router;
