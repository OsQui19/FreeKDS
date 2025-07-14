# FreeKDS

This project is a simplified kitchen display system. Below are basic steps to run the application and keep the database backed up.

## Setup
1. Install Node.js (v18+) and MySQL.
2. Run `npm install` to install dependencies.
3. Update `config.js` with your database credentials and session settings.
4. Import `schema.sql` into your MySQL server.
5. Session data is stored in MySQL using
   [`express-mysql-session`](https://www.npmjs.com/package/express-mysql-session).
   The required table is created automatically on first run.

## Running
Use `npm start` (or `./start.sh`) to start the server on `http://localhost:$PORT`.
`COOKIE_SECURE` defaults to `false`, so HTTPS isn't required for local testing.

## Security
The app now uses [helmet](https://github.com/helmetjs/helmet) and basic rate limiting. Set a strong `sessionSecret` in `config.js` for secure sessions. Use the `secureCookie` flag to control whether session cookies require HTTPS: set it to `true` when deploying over HTTPS, or `false` for local HTTP testing. Rate limiting thresholds can be adjusted in the `rateLimit` section of `config.js` if your deployment requires higher traffic.

### Role hierarchy
The highest role in the hierarchy (`management` by default) cannot be removed. This prevents administrators from accidentally losing permission to manage roles. If the top role is missing it will be automatically restored on server start.

### Hierarchy
The `/api/modules` endpoint exposes modules grouped by category. Each entry has a `category` name and a list of `modules`:

```json
{
  "modules": ["stations", "order", "menu", ...],
  "groups": [
    { "category": "operations", "modules": ["order", "stations"] },
    { "category": "admin", "modules": ["menu", "theme", "inventory", "reports", "employees", "locations"] }
  ]
}
```

Use these groups in the Employees &rarr; Hierarchy screen to expand or collapse access to each module category.

## Database Backup
Automated daily backups are created in the `BACKUP_DIR` directory. You can create or restore backups from the **Backups** tab in the admin interface. To create a backup from the command line use:

```bash
npm run backup
```

## Reporting / Tracking
Inventory usage is logged daily via `controllers/dailyUsage.js`. Security events are recorded to the `security_log` table.
