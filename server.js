require("./utils/logger");
const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const session = require("express-session");
const settingsCache = require("./controllers/settingsCache");
const unitConversion = require("./controllers/unitConversion");
const { scheduleDailyLog } = require("./controllers/dailyUsage");
const { scheduleDailyBackup } = require("./controllers/dbBackup");
const { logSecurityEvent } = require("./controllers/securityLog");
const accessControl = require("./controllers/accessControl");
require("dotenv").config();
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Database connection using environment variables
const db = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "freekds",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "kds_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }
  if (connection) connection.release();
  settingsCache.loadSettings(db);
  unitConversion.loadUnits(db);
  accessControl.loadHierarchy(db);
  accessControl.loadPermissions(db);
  scheduleDailyLog(db);
  scheduleDailyBackup();
});

// Middleware to parse request body
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "keyboard cat",
    resave: false,
    saveUninitialized: false,
  }),
);

// Allow login page and its stylesheets before authentication
app.use((req, res, next) => {
  const publicPaths = ["/login", "/login.css", "/style.css"];
  if (req.session.user || publicPaths.includes(req.path)) return next();
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
  next();
});
// Make request accessible in views for flash messages
// Set up view engine for EJS templates
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
const setupSocketHandlers = require("./controllers/socketHandlers");
const adminRoutes = require("./routes/admin")(db, io);
const authRoutes = require("./routes/auth")(db);
const stationRoutes = require("./routes/stations")(db);
const apiRoutes = require("./routes/api")(db, io);
app.use(authRoutes);
app.use(adminRoutes);
app.use(stationRoutes);
app.use(apiRoutes);
app.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('home');
});
// Central error handler to report unexpected issues
app.use((err, req, res, next) => {
  console.error('Unhandled application error', err);
  res.status(500).send('Internal Server Error');
});
setupSocketHandlers(io, db);
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
