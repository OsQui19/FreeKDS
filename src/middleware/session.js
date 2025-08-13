const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

module.exports = function sessionMiddleware(db, config, logger) {
  const secureCookie = config.secureCookie;
  try {
    const sessionStore = new MySQLStore({}, db);
    return session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        httpOnly: true,
        secure: secureCookie,
        sameSite: 'lax',
      },
    });
  } catch (err) {
    logger.error('Failed to initialize MySQL session store', err);
    return session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: secureCookie,
        sameSite: 'lax',
      },
    });
  }
};
