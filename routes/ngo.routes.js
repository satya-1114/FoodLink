const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const ngoController = require('../controllers/ngo.controller');

const { redirectIfAuthed, requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { ngoRegisterRules, loginRules } = require('../validators/auth.validator');
const { browseRules, profileRules } = require('../validators/ngo.validator');

/* ---------------- Auth ---------------- */
router.get('/register', redirectIfAuthed, authController.showNgoRegister);
router.post('/register', redirectIfAuthed, ngoRegisterRules, authController.ngoRegister);
router.get('/login', redirectIfAuthed, authController.showNgoLogin);
router.post('/login', redirectIfAuthed, loginRules, authController.ngoLogin);

router.use(requireAuth, requireRole('ngo'));

/* ---------------- Dashboard ---------------- */
router.get('/dashboard', ngoController.dashboard);

/* ---------------- Profile ---------------- */
router.get('/profile', ngoController.showProfile);
router.get('/profile/edit', ngoController.showEditProfile);
router.post('/profile/edit', profileRules, ngoController.updateProfile);

/* ---------------- Browse / details / actions ---------------- */
router.get('/donations', browseRules, ngoController.browse);
router.get('/donations/:id', ngoController.showDonation);
router.post('/donations/:id/accept', ngoController.accept);
router.post('/donations/:id/collected', ngoController.markCollected);

/* ---------------- Lists ---------------- */
router.get('/accepted', ngoController.accepted);
router.get('/history', ngoController.history);

module.exports = router;
