/**
 * Donor controller — Module 3.
 * Thin HTTP layer. No DB, no multer, no fs imports.
 */
const donorService = require('../services/donor.service');
const donationService = require('../services/donation.service');
const { collectValidation } = require('../utils/validate');
const { FOOD_CATEGORIES, VEG_TYPES, STATUS } = require('../models/donation.model');

/* -------- Dashboard -------- */

exports.dashboard = async (req, res, next) => {
  try {
    const donorId = req.session.user.id;
    const [profile, stats, donations] = await Promise.all([
      donorService.getProfile(donorId),
      donationService.statsForDonor(donorId),
      donationService.listForDonor(donorId),
    ]);
    res.render('pages/donor/dashboard', {
      title: 'Donor Dashboard',
      profile,
      stats: {
        totalDonations: stats.total,
        accepted: stats.accepted,
        pending: stats.pending,
      },
      recent: donations.slice(0, 5),
    });
  } catch (err) {
    next(err);
  }
};

/* -------- Profile -------- */

exports.showProfile = async (req, res, next) => {
  try {
    const profile = await donorService.getProfile(req.session.user.id);
    if (!profile) {
      req.flash('error', 'Profile not found.');
      return res.redirect('/donor/dashboard');
    }
    return res.render('pages/donor/profile', { title: 'My Profile', profile });
  } catch (err) {
    return next(err);
  }
};

exports.showEditProfile = async (req, res, next) => {
  try {
    const profile = await donorService.getProfile(req.session.user.id);
    res.render('pages/donor/edit-profile', {
      title: 'Edit Profile',
      formData: profile || {},
      errors: [],
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  const { valid, errors, data } = collectValidation(req);
  if (!valid) {
    return res.status(400).render('pages/donor/edit-profile', {
      title: 'Edit Profile',
      formData: { ...req.body, email: req.session.user.email },
      errors,
    });
  }
  try {
    const updated = await donorService.updateProfile(req.session.user.id, data);
    // Refresh session display name.
    req.session.user.name = updated.name;
    req.flash('success', 'Profile updated.');
    return res.redirect('/donor/profile');
  } catch (err) {
    return next(err);
  }
};

/* -------- Donations -------- */

exports.listDonations = async (req, res, next) => {
  try {
    const donations = await donationService.listForDonor(req.session.user.id);
    res.render('pages/donations/my-donations', {
      title: 'My Donations',
      donations,
      STATUS,
    });
  } catch (err) {
    next(err);
  }
};

exports.showCreateDonation = (req, res) => {
  res.render('pages/donations/create', {
    title: 'Create Donation',
    formData: {},
    errors: [],
    categories: FOOD_CATEGORIES,
    vegTypes: Object.values(VEG_TYPES),
  });
};

exports.createDonation = async (req, res, next) => {
  const { valid, errors, data } = collectValidation(req);
  if (!valid) {
    return res.status(400).render('pages/donations/create', {
      title: 'Create Donation',
      formData: req.body,
      errors,
      categories: FOOD_CATEGORIES,
      vegTypes: Object.values(VEG_TYPES),
    });
  }
  try {
    const donation = await donationService.createForDonor(
      req.session.user.id,
      data,
      req.file
    );
    req.flash('success', 'Donation posted successfully.');
    return res.redirect(`/donor/donations/${donation.id}`);
  } catch (err) {
    if (err.name === 'DonationError') {
      return res.status(err.status).render('pages/donations/create', {
        title: 'Create Donation',
        formData: req.body,
        errors: [{ msg: err.message }],
        categories: FOOD_CATEGORIES,
        vegTypes: Object.values(VEG_TYPES),
      });
    }
    return next(err);
  }
};

exports.showDonation = async (req, res, next) => {
  try {
    const donation = await donationService.getById(req.params.id);
    if (!donation || donation.donorId !== req.session.user.id) {
      return res.status(404).render('pages/404', {
        title: 'Donation not found',
        url: req.originalUrl,
      });
    }
    return res.render('pages/donations/details', {
      title: donation.foodName,
      donation,
      STATUS,
      viewer: 'donor',
    });
  } catch (err) {
    return next(err);
  }
};

exports.deleteDonation = async (req, res, next) => {
  try {
    await donationService.deleteForDonor(req.session.user.id, req.params.id);
    req.flash('success', 'Donation deleted.');
    return res.redirect('/donor/donations');
  } catch (err) {
    if (err.name === 'DonationError') {
      req.flash('error', err.message);
      return res.redirect('/donor/donations');
    }
    return next(err);
  }
};
