# FreeKDS

This project is a simplified kitchen display system. Below are basic steps to run the application and keep the database backed up.

## Setup
1. Install Node.js (v18+) and MySQL.
2. Run `npm install` to install dependencies.
3. Update `config.js` with your database credentials and session settings.
4. Import `schema.sql` into your MySQL server.

## Running
Use `npm start` (or `./start.sh`) to start the server on `http://localhost:$PORT`.
`COOKIE_SECURE` defaults to `false`, so HTTPS isn't required for local testing.

## Security
The app now uses [helmet](https://github.com/helmetjs/helmet) and basic rate limiting. Set a strong `sessionSecret` in `config.js` for secure sessions. Use the `secureCookie` flag to control whether session cookies require HTTPS: set it to `true` when deploying over HTTPS, or `false` for local HTTP testing.

## Database Backup
Automated daily backups are created in the `BACKUP_DIR` directory. You can run a manual backup anytime with:

```bash
npm run backup
```

## Reporting / Tracking
Inventory usage is logged daily via `controllers/dailyUsage.js`. Security events are recorded to the `security_log` table.
