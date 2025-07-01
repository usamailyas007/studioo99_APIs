const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/signup', authController.signup);
router.post('/updateProfile', authController.updateProfile);

// router.get('/users', userController.getUsers);

module.exports = router;
