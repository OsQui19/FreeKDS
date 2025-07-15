# FreeKDS

<p align="center">
  <img src="docs/banner.svg" alt="FreeKDS banner" />
</p>

<p align="center">
  <img alt="build status" src="https://img.shields.io/badge/build-passing-brightgreen" />
  <img alt="license" src="https://img.shields.io/badge/license-ISC-blue" />
  <img alt="node version" src="https://img.shields.io/badge/node-%3E=18-blue" />
</p>

This project is a simplified kitchen display system. Below are basic steps to run the application and keep the database backed up.

<details>
<summary>🚀 <strong>Setup</strong></summary>

1. Install Node.js (v18+) and MySQL.
2. Run `npm install` to install dependencies.
3. Update `config.js` with your database credentials and session settings.
4. Import `schema.sql` into your MySQL server.
5. (Optional) Set `GITHUB_REPO` in `config.js` to enable GitHub update checks.
6. Session data is stored in MySQL using
   [`express-mysql-session`](https://www.npmjs.com/package/express-mysql-session).
   The required table is created automatically on first run.

</details>

<details>
<summary>▶️ <strong>Running</strong></summary>

Use `npm start` (or `./start.sh`) to start the server on `http://localhost:$PORT`.
`COOKIE_SECURE` defaults to `false`, so HTTPS isn't required for local testing.

</details>

## 🧪 Testing
Run `npm test` to execute the automated test suite.

## 🔒 Security
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

<details>
<summary>💾 <strong>Database Backup</strong></summary>

Automated daily backups are created in the `BACKUP_DIR` directory. You can create or restore backups from the **Backups** tab in the admin interface. To create a backup from the command line use:

```bash
npm run backup
```

</details>

<details>
<summary>🐳 <strong>Docker</strong></summary>

The project includes a `Dockerfile` and `docker-compose.yml` for containerised
development. Ensure Docker Desktop or the Docker daemon is running. Build and
start the stack with:

```bash
docker compose up --build  # `docker-compose` also works on older versions
```

`docker compose` starts two services:

- **app** – the Node.js server defined by the Dockerfile.
- **mysql** – a MySQL 8 instance with persistent storage.

The application container installs the MySQL client so commands like schema
creation and backups work inside the container.

Database credentials default to the values in `config.js`. You can override them
by exporting the `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `DB_PORT`
environment variables before running compose:

```bash
export DB_USER=myuser
export DB_PASSWORD=mypassword
export DB_NAME=mydb
export DB_PORT=3306
docker compose up
```

Alternatively edit `config.js` to change the default settings. On first start
the MySQL container automatically initializes the schema using `schema.sql`.

The Dockerfile installs system packages, including the MySQL client, as the
`root` user. After the project files are copied it runs `npm run build` to
generate the `public/dist` assets. Permissions are then adjusted so the files
belong to the unprivileged `node` user, and the container switches to that user
so the application runs without full container privileges.

</details>

## 📊 Reporting / Tracking
Inventory usage is logged daily via `controllers/dailyUsage.js`. Security events are recorded to the `security_log` table.
