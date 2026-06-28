/**
 * Public-facing pages: landing, about, contact.
 */
exports.landing = (req, res) => {
  res.render('pages/home', { title: 'Welcome to FoodLink' });
};

exports.about = (req, res) => {
  res.render('pages/about', { title: 'About FoodLink' });
};

exports.contact = (req, res) => {
  res.render('pages/contact', { title: 'Contact Us' });
};
