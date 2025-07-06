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

//Get ALL list 
router.get('/user/getMyList', userController.getMyList);



module.exports = router;
