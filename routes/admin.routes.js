const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const adminController = require('../controllers/admin.controller');
const { redirectIfAuthed, requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { loginRules } = require('../validators/auth.validator');

/* -------- Auth -------- */
router.get('/login', redirectIfAuthed, authController.showAdminLogin);
router.post('/login', redirectIfAuthed, loginRules, authController.adminLogin);

/* -------- Admin area (role-guarded) -------- */
router.use(requireAuth, requireRole('admin'));

router.get('/dashboard', adminController.dashboard);

// Users
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.viewUser);
router.post('/users/:id/deactivate', adminController.deactivateUser);
router.post('/users/:id/activate', adminController.activateUser);
router.delete('/users/:id', adminController.deleteUser);

// Donations
router.get('/donations', adminController.listDonations);
router.get('/donations/:id', adminController.viewDonation);
router.delete('/donations/:id', adminController.deleteDonation);

module.exports = router;
