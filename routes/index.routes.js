/**
 * Root-level public routes (landing, about, contact, health, readiness).
 */
const express = require('express');
const router = express.Router();
const homeController = require('../controllers/home.controller');
const healthController = require('../controllers/health.controller');

router.get('/', homeController.landing);
router.get('/about', homeController.about);
router.get('/contact', homeController.contact);

// Operational endpoints — return plain JSON, no layout.
router.get('/health', healthController.health);
router.get('/ready', healthController.ready);

module.exports = router;
