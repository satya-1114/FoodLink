const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

// Logout — POST only (CSRF-safer than GET)
router.post('/logout', requireAuth, authController.logout);

module.exports = router;
