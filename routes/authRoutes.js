const express = require('express');
const router = express.Router();
const authController = require('../controllers/userController');

router.post('/signup', authController.signup);
// router.get('/users', userController.getUsers);

module.exports = router;
