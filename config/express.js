/**
 * Express application configuration.
 * Centralizes middleware, view engine, sessions, routes, error handlers.
 */
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');

const sessionConfig = require('./session');
const firebase = require('./firebase');
const logger = require('../utils/logger');

// Wire all in-process event subscribers (notification + audit) exactly once.
require('../events');

const requestLogger = require('../middlewares/logger.middleware');
const notFoundHandler = require('../middlewares/notFound.middleware');
const errorHandler = require('../middlewares/error.middleware');

const indexRoutes = require('../routes/index.routes');
const authRoutes = require('../routes/auth.routes');
const donorRoutes = require('../routes/donor.routes');
const ngoRoutes = require('../routes/ngo.routes');
const adminRoutes = require('../routes/admin.routes');

const app = express();

/* -------- Database -------- */
const appConfig = require('./index');
const dbDriver = (appConfig.database && appConfig.database.driver) || 'firestore';
if (dbDriver === 'firestore') {
  try {
    firebase.init();
  } catch (err) {
    logger.warn('Firebase not initialized:', err.message);
  }
} else {
  logger.info(`Database driver: ${dbDriver} (firebase init skipped)`);
}

/* -------- View engine -------- */
app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main');

/* -------- Security & parsing -------- */
app.use(
  helmet({
    contentSecurityPolicy: false, // relax for Bootstrap CDN in dev; tighten in prod
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(methodOverride('_method'));

/* -------- Static -------- */
app.use(express.static(path.join(__dirname, '..', 'public')));

/* -------- Logging -------- */
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}
app.use(requestLogger);

/* -------- Session & flash -------- */
app.use(session(sessionConfig));
app.use(flash());

/* -------- Locals available to all views -------- */
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.currentPath = req.path;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.appName = 'FoodLink';
  next();
});

/* -------- Routes -------- */
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/donor', donorRoutes);
app.use('/ngo', ngoRoutes);
app.use('/admin', adminRoutes);

/* -------- 404 & errors -------- */
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
