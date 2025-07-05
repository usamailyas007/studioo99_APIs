const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');



//Request Upload Video Route
router.post('/user/requestVideoUpload', authMiddleware, userController.requestVideoUpload);

//Login Route
router.post('/user/confirmVideoUpload', authMiddleware, userController.confirmVideoUpload);

module.exports = router;
