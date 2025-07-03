# FreeKDS

This project is a simplified kitchen display system. Below are basic steps to run the application and keep the database backed up.

## Setup
1. Install Node.js (v18+) and MySQL.
2. Run `npm install` to install dependencies.
3. Copy `.env` to your environment and update the database credentials, `SESSION_SECRET`, and `COOKIE_SECURE`.
4. Import `schema.sql` into your MySQL server.

## Running
Use `npm start` (or `./start.sh`) to start the server on `http://localhost:$PORT`.
If HTTPS is unavailable, ensure `COOKIE_SECURE=false` in your environment before running.

## Security
The app now uses [helmet](https://github.com/helmetjs/helmet) and basic rate limiting. Set a strong `SESSION_SECRET` in `.env` for secure sessions. Use the `COOKIE_SECURE` flag to control whether session cookies require HTTPS: set it to `true` when deploying over HTTPS, or `false` for local HTTP testing.

## Database Backup
Automated daily backups are created in the `BACKUP_DIR` directory. You can run a manual backup anytime with:

```bash
npm run backup
```

## Reporting / Tracking
Inventory usage is logged daily via `controllers/dailyUsage.js`. Security events are recorded to the `security_log` table.
