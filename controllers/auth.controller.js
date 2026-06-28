/**
 * Auth controller — thin HTTP layer.
 * Delegates all logic to services. NEVER imports repositories or firebase-admin.
 */
const authService = require('../services/auth.service');
const { collectValidation } = require('../utils/validate');
const { ROLES } = require('../models/user.model');

/* ---------------- Donor ---------------- */

exports.showDonorRegister = (req, res) => {
  res.render('pages/auth/donor-register', {
    title: 'Donor Registration',
    formData: {},
    errors: [],
  });
};

exports.donorRegister = async (req, res, next) => {
  const { valid, errors, data } = collectValidation(req);
  if (!valid) {
    return res.status(400).render('pages/auth/donor-register', {
      title: 'Donor Registration',
      formData: req.body,
      errors,
    });
  }
  try {
    const user = await authService.register({ ...data, role: ROLES.DONOR });
    authService.startSession(req, user);
    req.flash('success', `Welcome to FoodLink, ${user.name}!`);
    return res.redirect('/donor/dashboard');
  } catch (err) {
    if (err.name === 'AuthError') {
      return res.status(err.status).render('pages/auth/donor-register', {
        title: 'Donor Registration',
        formData: req.body,
        errors: [{ msg: err.message }],
      });
    }
    return next(err);
  }
};

exports.showDonorLogin = (req, res) => {
  res.render('pages/auth/donor-login', {
    title: 'Donor Login',
    formData: {},
    errors: [],
  });
};

exports.donorLogin = async (req, res, next) => {
  const { valid, errors, data } = collectValidation(req);
  if (!valid) {
    return res.status(400).render('pages/auth/donor-login', {
      title: 'Donor Login',
      formData: req.body,
      errors,
    });
  }
  try {
    const user = await authService.login({ ...data, role: ROLES.DONOR });
    authService.startSession(req, user);
    req.flash('success', `Welcome back, ${user.name}!`);
    return res.redirect('/donor/dashboard');
  } catch (err) {
    if (err.name === 'AuthError') {
      return res.status(err.status).render('pages/auth/donor-login', {
        title: 'Donor Login',
        formData: req.body,
        errors: [{ msg: err.message }],
      });
    }
    return next(err);
  }
};

/* ---------------- NGO ---------------- */

exports.showNgoRegister = (req, res) => {
  res.render('pages/auth/ngo-register', {
    title: 'NGO Registration',
    formData: {},
    errors: [],
  });
};

exports.ngoRegister = async (req, res, next) => {
  const { valid, errors, data } = collectValidation(req);
  if (!valid) {
    return res.status(400).render('pages/auth/ngo-register', {
      title: 'NGO Registration',
      formData: req.body,
      errors,
    });
  }
  try {
    const user = await authService.register({ ...data, role: ROLES.NGO });
    authService.startSession(req, user);
    req.flash('success', `Welcome, ${user.organizationName || user.name}!`);
    return res.redirect('/ngo/dashboard');
  } catch (err) {
    if (err.name === 'AuthError') {
      return res.status(err.status).render('pages/auth/ngo-register', {
        title: 'NGO Registration',
        formData: req.body,
        errors: [{ msg: err.message }],
      });
    }
    return next(err);
  }
};

exports.showNgoLogin = (req, res) => {
  res.render('pages/auth/ngo-login', {
    title: 'NGO Login',
    formData: {},
    errors: [],
  });
};

exports.ngoLogin = async (req, res, next) => {
  const { valid, errors, data } = collectValidation(req);
  if (!valid) {
    return res.status(400).render('pages/auth/ngo-login', {
      title: 'NGO Login',
      formData: req.body,
      errors,
    });
  }
  try {
    const user = await authService.login({ ...data, role: ROLES.NGO });
    authService.startSession(req, user);
    req.flash('success', `Welcome back, ${user.name}!`);
    return res.redirect('/ngo/dashboard');
  } catch (err) {
    if (err.name === 'AuthError') {
      return res.status(err.status).render('pages/auth/ngo-login', {
        title: 'NGO Login',
        formData: req.body,
        errors: [{ msg: err.message }],
      });
    }
    return next(err);
  }
};

/* ---------------- Admin ---------------- */

exports.showAdminLogin = (req, res) => {
  res.render('pages/auth/admin-login', {
    title: 'Admin Login',
    formData: {},
    errors: [],
  });
};

exports.adminLogin = async (req, res, next) => {
  const { valid, errors, data } = collectValidation(req);
  if (!valid) {
    return res.status(400).render('pages/auth/admin-login', {
      title: 'Admin Login',
      formData: req.body,
      errors,
    });
  }
  try {
    const user = await authService.login({ ...data, role: ROLES.ADMIN });
    authService.startSession(req, user);
    req.flash('success', `Welcome back, ${user.name}.`);
    return res.redirect('/admin/dashboard');
  } catch (err) {
    if (err.name === 'AuthError') {
      return res.status(err.status).render('pages/auth/admin-login', {
        title: 'Admin Login',
        formData: req.body,
        errors: [{ msg: err.message }],
      });
    }
    return next(err);
  }
};

/* ---------------- Logout ---------------- */

exports.logout = async (req, res, next) => {
  try {
    await authService.logout(req);
    res.clearCookie(process.env.SESSION_NAME || 'foodlink.sid');
    return res.redirect('/');
  } catch (err) {
    return next(err);
  }
};
