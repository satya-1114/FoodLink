/**
 * 404 handler - renders the not-found view.
 */
module.exports = function notFoundHandler(req, res) {
  res.status(404).render('pages/404', {
    title: 'Page Not Found',
    url: req.originalUrl,
  });
};
