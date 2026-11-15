import { Navigate } from 'react-router-dom';
import { getStoredSession } from '@/services/api';
import ForbiddenPage from '@/pages/public/ForbiddenPage';

/**
 * Rolėmis paremtas maršruto sargas.
 *
 * - Neprisijungus -> nukreipia į atitinkamą prisijungimo langą.
 * - Prisijungus su netinkama role -> rodo 403 puslapį.
 * - Tinkama rolė -> atvaizduoja vaiką.
 *
 * Rolė imama iš sesijos (localStorage per getStoredSession), todėl veikia ir
 * po puslapio perkrovimo. Serveris papildomai tikrina rolę kiekvienoje užklausoje
 * (tikroji apsauga — ne tik frontend).
 */
const loginPath = {
  patient: '/prisijungimas',
  specialist: '/specialistams',
  admin: '/admin/prisijungimas',
};

// role - reikalaujama role (patient, specialist, admin).
export default function RequireRole({ role, children }) {
  const session = getStoredSession();

  if (!session) {
    return <Navigate to={loginPath[role] || '/'} replace />;
  }
  if (session.user.role !== role) {
    return <ForbiddenPage />;
  }
  return children;
}
