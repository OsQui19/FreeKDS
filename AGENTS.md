# AGENTS instructions for FreeKDS

This file explains how to set up and run the project for Codex or anyone else cloning the repository.

## 1. Environment setup
1. Install **Node.js** (v18+ works) and a **MySQL** server.
2. From the repository root, install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file. A sample is provided in the repo. Update it with your database credentials:
   ```
   DB_HOST=127.0.0.1
   DB_USER=freekds
   DB_PASS=yourpassword
   DB_NAME=kds_db
   PORT=3000
   ```

## 2. Database setup
1. Import the database schema:
   ```bash
   mysql -u "$DB_USER" -p"$DB_PASS" < schema.sql
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

## 4. Notes
- The application uses the variables from `.env` to connect to MySQL.
- There is **no automated test suite** included.
