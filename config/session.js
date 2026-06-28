/**
 * Express session configuration.
 * NOTE: default MemoryStore is for development only.
 * Swap to a persistent store (Redis/Firestore) for production.
 */
module.exports = {
  name: process.env.SESSION_NAME || 'foodlink.sid',
  secret: process.env.SESSION_SECRET || 'change_me_in_env',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24, // 24h
  },
};
