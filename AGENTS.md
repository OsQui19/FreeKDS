# AGENTS instructions for FreeKDS

This file explains how to set up and run the project for Codex or anyone else cloning the repository.

## 1. Environment setup
1. Install **Node.js** (v18+ works) and a **MySQL** server.
2. From the repository root, install dependencies:
   ```bash
   npm install
   ```
3. Edit `config.js` with your local database credentials and session settings.
   The defaults can also be overridden using the `DB_HOST`, `DB_PORT`,
   `DB_USER`, `DB_PASSWORD`, and `DB_NAME` environment variables when running
   the app or `docker compose`.

## 2. Database setup
1. Import the database schema:
   ```bash
   mysql -u "$DB_USER" -p"$DB_PASSWORD" < schema.sql
   ```
2. (Optional) Populate seed data for testing:
   ```bash
   npm run seed
   ```
3. (Optional) Create an initial admin account:
   ```bash
   npm run create-admin [username] [password]
   ```

## 3. Running the application
Start the server with one of the following commands:
```bash
npm start      # or ./start.sh
```
The app will run on `http://localhost:$PORT`.
`COOKIE_SECURE` defaults to `false`, so HTTPS isn't required for local development.

## 4. Notes
- Configuration is stored in `config.js` and no environment variables are required.
- Run `npm test` to execute the automated test suite.
