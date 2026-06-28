/**
 * NGO controller — Module 4.
 * Thin HTTP layer. No DB, no stats computation, no filter logic here.
 */
const ngoService = require('../services/ngo.service');
const donationService = require('../services/donation.service');
const { collectValidation } = require('../utils/validate');
const { FOOD_CATEGORIES, VEG_TYPES, STATUS } = require('../models/donation.model');

/* ---------------- Dashboard ---------------- */

exports.dashboard = async (req, res, next) => {
  try {
    const ngoId = req.session.user.id;
    const [profile, stats] = await Promise.all([
      ngoService.getProfile(ngoId),
      donationService.statsForNgo(ngoId),
    ]);
    res.render('pages/ngo/dashboard', {
      title: 'NGO Dashboard',
      profile,
      stats: {
        totalAccepted: stats.totalAccepted,
        pendingPickup: stats.pendingPickup,
        collected: stats.collected,
      },
      recent: stats.recent,
    });
  } catch (err) {
    next(err);
  }
};

/* ---------------- Profile ---------------- */

exports.showProfile = async (req, res, next) => {
  try {
    const profile = await ngoService.getProfile(req.session.user.id);
    if (!profile) {
      req.flash('error', 'Profile not found.');
      return res.redirect('/ngo/dashboard');
    }
    return res.render('pages/ngo/profile', { title: 'My Profile', profile });
  } catch (err) {
    return next(err);
  }
};

exports.showEditProfile = async (req, res, next) => {
  try {
    const profile = await ngoService.getProfile(req.session.user.id);
    res.render('pages/ngo/edit-profile', {
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
    return res.status(400).render('pages/ngo/edit-profile', {
      title: 'Edit Profile',
      formData: { ...req.body, email: req.session.user.email },
      errors,
    });
  }
  try {
    const updated = await ngoService.updateProfile(req.session.user.id, data);
    req.session.user.name = updated.name;
    req.flash('success', 'Profile updated.');
    return res.redirect('/ngo/profile');
  } catch (err) {
    return next(err);
  }
};

/* ---------------- Browse / search ---------------- */

exports.browse = async (req, res, next) => {
  try {
    const filters = {
      q: req.query.q || '',
      foodCategory: req.query.foodCategory || '',
      vegType: req.query.vegType || '',
      city: req.query.city || '',
    };
    const pagination = {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 10,
    };

    const result = await donationService.browseAvailable(filters, pagination);

    res.render('pages/ngo/browse', {
      title: 'Browse Donations',
      filters,
      result,
      categories: FOOD_CATEGORIES,
      vegTypes: Object.values(VEG_TYPES),
    });
  } catch (err) {
    next(err);
  }
};

/* ---------------- Donation details (NGO view) ---------------- */

exports.showDonation = async (req, res, next) => {
  try {
    const donation = await donationService.getById(req.params.id);
    if (!donation) {
      return res.status(404).render('pages/404', {
        title: 'Donation not found',
        url: req.originalUrl,
      });
    }
    const ngoId = req.session.user.id;
    const canAccept = donation.status === STATUS.PENDING;
    const canMarkCollected =
      donation.status === STATUS.ACCEPTED && donation.acceptedByNgoId === ngoId;
    return res.render('pages/donations/details', {
      title: donation.foodName,
      donation,
      STATUS,
      viewer: 'ngo',
      canAccept,
      canMarkCollected,
    });
  } catch (err) {
    return next(err);
  }
};

/* ---------------- Status actions ---------------- */

exports.accept = async (req, res, next) => {
  try {
    const updated = await donationService.acceptByNgo(req.session.user.id, req.params.id);
    req.flash('success', `Accepted "${updated.foodName}". Coordinate pickup with the donor.`);
    return res.redirect(`/ngo/donations/${updated.id}`);
  } catch (err) {
    if (err.name === 'DonationError') {
      req.flash('error', err.message);
      return res.redirect(`/ngo/donations/${req.params.id}`);
    }
    return next(err);
  }
};

exports.markCollected = async (req, res, next) => {
  try {
    const updated = await donationService.markCollectedByNgo(req.session.user.id, req.params.id);
    req.flash('success', `Marked "${updated.foodName}" as Collected. Thank you!`);
    return res.redirect('/ngo/accepted');
  } catch (err) {
    if (err.name === 'DonationError') {
      req.flash('error', err.message);
      return res.redirect(`/ngo/donations/${req.params.id}`);
    }
    return next(err);
  }
};

/* ---------------- Lists ---------------- */

exports.accepted = async (req, res, next) => {
  try {
    const donations = await donationService.listForNgo(req.session.user.id, {
      status: STATUS.ACCEPTED,
    });
    res.render('pages/ngo/accepted', {
      title: 'Accepted Donations',
      donations,
      STATUS,
    });
  } catch (err) {
    next(err);
  }
};

exports.history = async (req, res, next) => {
  try {
    const donations = await donationService.listForNgo(req.session.user.id);
    res.render('pages/ngo/history', {
      title: 'Donation History',
      donations,
      STATUS,
    });
  } catch (err) {
    next(err);
  }
};
