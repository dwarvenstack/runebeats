// src/utils/logger.js
// Structured logger with timestamps and log-level filtering.

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const currentLevel = LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LEVELS.info;

function stamp() {
  return new Date().toISOString();
}

function log(level, ...args) {
  if (LEVELS[level] > currentLevel) return;
  const prefix = `[${stamp()}] [${level.toUpperCase()}]`;
  if (level === 'error') {
    console.error(prefix, ...args);
  } else if (level === 'warn') {
    console.warn(prefix, ...args);
  } else {
    console.log(prefix, ...args);
  }
}

const logger = {
  error: (...args) => log('error', ...args),
  warn:  (...args) => log('warn',  ...args),
  info:  (...args) => log('info',  ...args),
  debug: (...args) => log('debug', ...args),
};

export default logger;
