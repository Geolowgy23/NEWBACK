const express = require('express');
const authController = require('../controllers/authController');
const router = express.Router();

// Routes for user and admin authentication
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/admin-login', authController.adminLogin);

module.exports = router;
