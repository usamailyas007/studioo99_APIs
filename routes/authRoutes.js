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

// router.get('/users', userController.getUsers);

module.exports = router;
