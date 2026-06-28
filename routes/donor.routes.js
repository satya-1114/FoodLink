const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const donorController = require('../controllers/donor.controller');
const storage = require('../services/storage.service');

const { redirectIfAuthed, requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { donorRegisterRules, loginRules } = require('../validators/auth.validator');
const { profileRules, donationRules } = require('../validators/donor.validator');

/* ---------------- Auth ---------------- */
router.get('/register', redirectIfAuthed, authController.showDonorRegister);
router.post('/register', redirectIfAuthed, donorRegisterRules, authController.donorRegister);
router.get('/login', redirectIfAuthed, authController.showDonorLogin);
router.post('/login', redirectIfAuthed, loginRules, authController.donorLogin);

/* All routes below require an authenticated donor. */
router.use(requireAuth, requireRole('donor'));

/* ---------------- Dashboard ---------------- */
router.get('/dashboard', donorController.dashboard);

/* ---------------- Profile ---------------- */
router.get('/profile', donorController.showProfile);
router.get('/profile/edit', donorController.showEditProfile);
router.post('/profile/edit', profileRules, donorController.updateProfile);

/* ---------------- Donations ---------------- */
router.get('/donations', donorController.listDonations);
router.get('/donations/new', donorController.showCreateDonation);
router.post(
  '/donations',
  storage.singleImageUpload('image'),
  donationRules,
  donorController.createDonation
);
router.get('/donations/:id', donorController.showDonation);
router.post('/donations/:id/delete', donorController.deleteDonation);
// Allow DELETE via method-override too:
router.delete('/donations/:id', donorController.deleteDonation);

module.exports = router;
