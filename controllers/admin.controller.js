/**
 * Admin controller — thin HTTP layer.
 *
 * No DB / business / notification / audit / filesystem / date logic here.
 * Everything delegates to admin.service.
 */
const adminService = require('../services/admin.service');
const { USER_ROLES, DONATION_STATUS } = require('../config/app');

function asyncH(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/* ----------------------------- Dashboard ----------------------------- */

exports.dashboard = asyncH(async (req, res) => {
  const stats = await adminService.getDashboardStats();
  res.render('pages/admin/dashboard', {
    title: 'Admin Dashboard',
    stats,
  });
});

/* ------------------------------- Users ------------------------------- */

exports.listUsers = asyncH(async (req, res) => {
  const filters = {
    q: req.query.q || '',
    role: req.query.role || '',
    status: req.query.status || '',
  };
  const result = await adminService.searchUsers(filters, {
    page: req.query.page,
    limit: req.query.limit,
  });
  res.render('pages/admin/users', {
    title: 'Manage Users',
    result,
    filters,
    query: req.query,
    roles: USER_ROLES,
  });
});

exports.viewUser = asyncH(async (req, res) => {
  const user = await adminService.getUser(req.params.id);
  res.render('pages/admin/user-details', { title: 'User Details', user });
});

exports.deactivateUser = asyncH(async (req, res) => {
  await adminService.setUserActive(req.session.user.id, req.params.id, false);
  req.flash('success', 'User deactivated.');
  res.redirect('/admin/users');
});

exports.activateUser = asyncH(async (req, res) => {
  await adminService.setUserActive(req.session.user.id, req.params.id, true);
  req.flash('success', 'User reactivated.');
  res.redirect('/admin/users');
});

exports.deleteUser = asyncH(async (req, res) => {
  await adminService.deleteUser(req.session.user.id, req.params.id);
  req.flash('success', 'User deleted.');
  res.redirect('/admin/users');
});

/* ----------------------------- Donations ----------------------------- */

exports.listDonations = asyncH(async (req, res) => {
  const filters = {
    q: req.query.q || '',
    status: req.query.status || '',
    foodCategory: req.query.foodCategory || '',
    vegType: req.query.vegType || '',
    city: req.query.city || '',
  };
  const result = await adminService.searchDonations(filters, {
    page: req.query.page,
    limit: req.query.limit,
  });
  res.render('pages/admin/donations', {
    title: 'Manage Donations',
    result,
    filters,
    query: req.query,
    statuses: DONATION_STATUS,
  });
});

exports.viewDonation = asyncH(async (req, res) => {
  const donation = await adminService.getDonation(req.params.id);
  res.render('pages/admin/donation-details', { title: 'Donation Details', donation });
});

exports.deleteDonation = asyncH(async (req, res) => {
  await adminService.deleteDonation(req.session.user.id, req.params.id);
  req.flash('success', 'Donation deleted.');
  res.redirect('/admin/donations');
});
