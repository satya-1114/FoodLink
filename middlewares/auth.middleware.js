/**
 * Auth middleware — gates routes that require a session.
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  req.flash('error', 'Please log in to continue.');
  return res.redirect('/');
}

/**
 * Inverse: redirect already-authenticated users away from login/register pages
 * to their role dashboard.
 */
function redirectIfAuthed(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect(`/${req.session.user.role}/dashboard`);
  }
  return next();
}

module.exports = { requireAuth, redirectIfAuthed };
