/**
 * Role middleware — restrict a route to one or more roles.
 * Usage: router.get('/admin/x', requireAuth, requireRole('admin'), handler)
 */
function requireRole(...allowed) {
  return function (req, res, next) {
    const user = req.session && req.session.user;
    if (!user) {
      req.flash('error', 'Please log in to continue.');
      return res.redirect('/');
    }
    if (!allowed.includes(user.role)) {
      return res.status(403).render('pages/error', {
        title: 'Forbidden',
        status: 403,
        message: 'You do not have permission to access this page.',
        stack: null,
      });
    }
    return next();
  };
}

module.exports = { requireRole };
