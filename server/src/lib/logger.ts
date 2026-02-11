/**
 * Structured Logger (Pino)
 *
 * JSON-formatted, level-aware structured logging.
 * Currently used on critical paths only (startup, shutdown, middleware,
 * cron jobs, error handlers). Remaining console.* calls throughout the
 * codebase should be migrated to this logger over time.
 */

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
