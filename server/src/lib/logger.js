/**
 * Winston logeris.
 * - Failai: logs/combined.log (viskas) ir logs/error.log (tik klaidos), JSON su laiko žyma.
 * - Konsolėje — žmogui skaitomas, spalvotas formatas.
 *
 * Detalų veiksmų protokolavimą (prisijungimai, vizitai, admin CRUD — žr. 8.1)
 * prideda 2 ETAPAS; čia paruošiama bazinė logging infrastruktūra.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import winston from 'winston';

const __dirname = dirname(fileURLToPath(import.meta.url));
const logsDir = join(__dirname, '..', '..', 'logs');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: join(logsDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: join(logsDir, 'combined.log') }),
  ],
});

// Vystymo metu — skaitomas konsolės išvedimas
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`)
      ),
    })
  );
}

// morgan srautas, kad HTTP žurnalas keliautų per winston (info lygiu, kad matytųsi)
export const morganStream = {
  write: (line) => logger.info(line.trim()),
};

export default logger;
