const fs = require('fs');
const path = require('path');
let createLogger;
let format;
let transports;
let DailyRotateFile;
try {
  ({ createLogger, format, transports } = require('winston'));
  DailyRotateFile = require('winston-daily-rotate-file');
} catch (err) {
  module.exports = console;
  return;
}

const logDir = process.env.LOG_DIR || path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message, ...meta }) => {
      const rest = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
      return `${timestamp} [${level}] ${message}${rest}`;
    })
  ),
  transports: [
    new transports.Console(),
    new DailyRotateFile({
      filename: path.join(logDir, '%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
    }),
  ],
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', err);
});

module.exports = logger;
