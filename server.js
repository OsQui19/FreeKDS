const express = require('express');
const mysql   = require('mysql2');
const path    = require('path');
const http    = require('http');
const { Server } = require('socket.io');
const settingsCache = require('./controllers/settingsCache');
const unitConversion = require('./controllers/unitConversion');
require('dotenv').config();
const app     = express();
const server  = http.createServer(app);
const io      = new Server(server);

// Database connection using environment variables
const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'freekds',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'kds_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
db.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  if (connection) connection.release();
  settingsCache.loadSettings(db);
  unitConversion.loadUnits(db);
});

async function recordDailyUsage() {
  try {
    const [rows] = await db.promise().query(
      `SELECT DATE(created_at) AS day, ingredient_id, SUM(amount) AS total
         FROM inventory_log
         WHERE DATE(created_at) = DATE(NOW() - INTERVAL 1 DAY)
         GROUP BY ingredient_id`
    );
    for (const r of rows) {
      await db.promise().query(
        'INSERT INTO daily_usage_log (start_date, end_date, ingredient_id, amount) VALUES (?, ?, ?, ?)',
        [r.day, r.day, r.ingredient_id, r.total]
      );
    }
  } catch (err) {
    console.error('Daily usage log error:', err);
  }
}

function scheduleDailyLog() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  setTimeout(async () => {
    await recordDailyUsage();
    scheduleDailyLog();
  }, next - now);
}
scheduleDailyLog();

// Middleware to parse request body
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files (for style.css, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));
// Load settings from cache
app.use((req, res, next) => {
  res.locals.settings = settingsCache.getSettings();
  next();
});
app.use((req, res, next) => {
  res.locals.req = req;
  next();
});
// Make request accessible in views for flash messages
// Set up view engine for EJS templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
const setupSocketHandlers = require('./controllers/socketHandlers');
const adminRoutes = require('./routes/admin')(db, io);
const stationRoutes = require('./routes/stations')(db);
const apiRoutes = require('./routes/api')(db, io);
app.use(adminRoutes);
app.use(stationRoutes);
app.use(apiRoutes);
setupSocketHandlers(io, db);
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
