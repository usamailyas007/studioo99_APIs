const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');



//Request Upload Video Route
router.post('/user/requestVideoUpload', userController.requestVideoUpload);

//Login Route
router.post('/user/confirmVideoUpload', userController.confirmVideoUpload);

module.exports = router;
