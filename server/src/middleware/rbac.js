/**
 * RBAC (rolėmis paremta prieiga).
 * requireRole('admin') -> praleidžia tik nurodytos rolės naudotojus.
 * Rolė tikrinama serveryje (ne tik frontend).
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Neautentifikuota.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Nepakanka teisių šiam veiksmui.' });
    }
    next();
  };
}

export default requireRole;
