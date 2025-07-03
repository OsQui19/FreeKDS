# FreeKDS

This project is a simplified kitchen display system. Below are basic steps to run the application and keep the database backed up.

## Setup
1. Install Node.js (v18+) and MySQL.
2. Run `npm install` to install dependencies.
3. Copy `.env` to your environment and update the database credentials and `SESSION_SECRET`.
4. Import `schema.sql` into your MySQL server.

## Running
Use `npm start` (or `./start.sh`) to start the server on `http://localhost:$PORT`.

## Security
The app now uses [helmet](https://github.com/helmetjs/helmet) and basic rate limiting. Set a strong `SESSION_SECRET` in `.env` for secure sessions.

## Database Backup
Automated daily backups are created in the `BACKUP_DIR` directory. You can run a manual backup anytime with:

```bash
npm run backup
```

## Reporting / Tracking
Inventory usage is logged daily via `controllers/dailyUsage.js`. Security events are recorded to the `security_log` table.
