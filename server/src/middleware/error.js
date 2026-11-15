/**
 * Centralizuotas klaidų apdorojimas.
 * - notFound: nežinomi maršrutai -> 404.
 * - errorHandler: paskutinis middleware; produkcijoje negrąžina stack trace.
 *   Atpažįsta dažnas Prisma klaidas (unikalumo pažeidimas P2002, nerasta P2025).
 */
import logger from '../lib/logger.js';

export function notFound(req, res) {
  res.status(404).json({ error: 'Maršrutas nerastas.' });
}

export function errorHandler(err, req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';

  // Prisma žinomos klaidos
  if (err.code === 'P2002') {
    const fields = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'laukas';
    return res.status(409).json({ error: `Toks įrašas jau egzistuoja (${fields}).` });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Įrašas nerastas.' });
  }

  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
    logger.error(err.message, { stack: err.stack, path: req.originalUrl });
  }

  res.status(status).json({
    error: status >= 500 ? 'Vidinė serverio klaida.' : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });
}

export default errorHandler;
