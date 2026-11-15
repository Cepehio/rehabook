/**
 * JWT autentifikacijos middleware.
 * Tikrina `Authorization: Bearer <token>` antraštę, patvirtina parašą
 * ir įdeda { id, role } į req.user.
 */
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

/**
 * Iš antraštės nustato naudotoją. Grąžina { user } arba { status, error }.
 * Pašalintos paskyros ir senesnės sesijos (tokenVersion) atmetamos.
 */
async function resolveUser(header = '') {
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return { status: 401, error: 'Trūksta autentifikacijos token (Bearer).' };
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return { status: 401, error: 'Neteisingas arba pasibaigęs token.' };
  }
  if (payload.role === 'admin' && payload.id === 'admin') {
    return { user: { id: 'admin', role: 'admin' } };
  }
  if (
    !['patient', 'specialist'].includes(payload.role) ||
    !Number.isInteger(payload.id) ||
    payload.id < 1
  ) {
    return { status: 401, error: 'Neteisinga sesija.' };
  }
  const account = await prisma[payload.role].findFirst({
    where: { id: payload.id, deletedAt: null },
    select: { id: true, tokenVersion: true },
  });
  if (!account || payload.v !== account.tokenVersion) {
    return { status: 401, error: 'Sesija nebegalioja. Prisijunkite iš naujo.' };
  }
  return { user: { id: account.id, role: payload.role } };
}

export async function authenticate(req, res, next) {
  try {
    const result = await resolveUser(req.headers.authorization);
    if (result.error) return res.status(result.status).json({ error: result.error });
    req.user = result.user;
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Viešiems maršrutams: jei pateiktas galiojantis token, nustato req.user,
 * kitaip užklausa tęsiama kaip neprisijungusio lankytojo (be klaidos).
 */
export async function optionalAuthenticate(req, res, next) {
  if (!req.headers.authorization) return next();
  try {
    const result = await resolveUser(req.headers.authorization);
    if (result.user) req.user = result.user;
    return next();
  } catch (error) {
    return next(error);
  }
}

export default authenticate;
