const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');


router.post('/admin/policy',  adminController.upsertPolicy);

module.exports = router;
