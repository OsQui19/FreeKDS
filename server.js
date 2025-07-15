require("./utils/logger");
const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const settingsCache = require("./controllers/settingsCache");
const unitConversion = require("./controllers/unitConversion");
const { scheduleDailyLog } = require("./controllers/dailyUsage");
const {
  scheduleDailyBackup,
  setBackupDir,
  applySchema,
  applyMigrations,
} = require("./controllers/dbBackup");
const { logSecurityEvent } = require("./controllers/securityLog");
const accessControl = require("./controllers/accessControl");
const config = require("./config");
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const cspDirectives = helmet.contentSecurityPolicy.getDefaultDirectives();
// Default COOKIE_SECURE to false so local HTTP logins work out of the box.
// All HTTPS-reliant features are disabled by default for easier local install.
// To re-enable secure cookies and related headers, edit `config.js`.
const secureCookie = config.secureCookie;
// Remove upgrade-insecure-requests when not using HTTPS
// Always remove upgrade-insecure-requests so browsers don't force HTTPS.
delete cspDirectives["upgrade-insecure-requests"];
app.use(
  helmet({
    contentSecurityPolicy: { directives: cspDirectives },
    // Explicitly send HSTS header with max-age=0 to clear any previous rules
    // Browsers caching an old Strict-Transport-Security policy can otherwise
    // force HTTPS and break local testing.
    hsts: { maxAge: 0 },
  }),
);
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  // socket.io polling can easily exceed the limit, so skip those requests
  skip: (req) => req.path.startsWith('/socket.io'),
});
app.use(limiter);

// Database connection using local configuration
const db = mysql.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
const sessionStore = new MySQLStore({}, db);
db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }
  if (connection) connection.release();

  const init = async () => {
    try {
      await new Promise((resolve, reject) =>
        applySchema((e) => (e ? reject(e) : resolve()))
      );
      await new Promise((resolve, reject) =>
        applyMigrations(db, (e) => (e ? reject(e) : resolve()))
      );
      await accessControl.ensureDefaults(db);
      await Promise.all([
        new Promise((resolve, reject) =>
          settingsCache.loadSettings(db, (e) => (e ? reject(e) : resolve())),
        ),
        new Promise((resolve, reject) =>
          unitConversion.loadUnits(db, (e) => (e ? reject(e) : resolve())),
        ),
        accessControl.loadHierarchy(db),
        accessControl.loadPermissions(db),
      ]);
      const settings = settingsCache.getSettings();
      if (settings.backup_dir) setBackupDir(settings.backup_dir);
      scheduleDailyLog(db);
      scheduleDailyBackup(db);
      setupSocketHandlers(io, db);
      const PORT = config.port;
      server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    } catch (e) {
      console.error("Startup error:", e);
      process.exit(1);
    }
  };

  init();
});

// Middleware to parse request body
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: secureCookie,
      sameSite: "lax",
    },
  }),
);
// Redirect any HTTPS requests back to HTTP to avoid Safari forcing HTTPS
// when HSTS is cached or another redirect occurred previously.
app.use((req, res, next) => {
  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    return res.redirect("http://" + req.headers.host + req.originalUrl);
  }
  next();
});
// Allow login page and its stylesheets before authentication
app.use((req, res, next) => {
  const publicPaths = [
    "/login",
    "/login.css",
    "/style.css",
    "/base.css",
    "/clock.css",
    "/clock",
    "/clock.js",
    "/clock/dashboard",
    "/favicon.ico",
  ];
  if (
    req.session.user ||
    publicPaths.includes(req.path) ||
    req.path.startsWith("/vendor/")
  )
    return next();
  logSecurityEvent(db, "unauthorized", null, req.path, false, req.ip);
  return res.redirect("/login");
});

// Serve static files (for style.css, images, etc.)
app.use(express.static(path.join(__dirname, "public")));
// Load settings from cache
app.use((req, res, next) => {
  res.locals.settings = settingsCache.getSettings();
  next();
});
app.use((req, res, next) => {
  res.locals.req = req;
  res.locals.roles = accessControl.getHierarchy();
  res.locals.hasRoleLevel = (minRole) =>
    req.session && req.session.user
      ? accessControl.hasLevel(req.session.user.role, minRole)
      : false;
  res.locals.permissions = accessControl.getPermissions();
  res.locals.hasAccess = (component) =>
    req.session && req.session.user
      ? accessControl.roleHasAccess(req.session.user.role, component)
      : false;
  res.locals.user = req.session && req.session.user ? req.session.user : null;
  next();
});
// Make request accessible in views for flash messages
// Set up view engine for EJS templates
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
const setupSocketHandlers = require("./controllers/socketHandlers");
const adminRoutes = require("./routes/admin")(db, io);
const authRoutes = require("./routes/auth")(db, io);
const stationRoutes = require("./routes/stations")(db);
const apiRoutes = require("./routes/api")(db, io);
app.use(authRoutes);
app.use(adminRoutes);
app.use(stationRoutes);
app.use(apiRoutes);
app.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/clock');
  res.render('home');
});
// Central error handler to report unexpected issues
app.use((err, req, res, next) => {
  console.error('Unhandled application error', err);
  res.status(500).send('Internal Server Error');
});
// setupSocketHandlers and server.listen are invoked after initialization
