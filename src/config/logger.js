/*
 * Using winston to log and display errors on console
 * when necessary. Some errors is logged to a file(s) in logs folder
 * 
 * Author: Uche Osuchukwu.
 * Date: 17/05/2025
 * 
 */

const winston = require('winston');

const logger = winston.createLogger({
  level: 'info', // Log info and above
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({ filename: './logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: './logs/combined.log' }),
  ],
});

// Log to console if not in production
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
    ),
  }));
}

module.exports = logger;
