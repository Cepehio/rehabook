import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import theme from '@/styles/theme';
import { Btn } from '@/components/ui';

/**
 * 403 puslapis — rodomas, kai prisijungęs naudotojas bando pasiekti
 * netinkamos rolės zoną.
 */
export default function ForbiddenPage() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.c.cream, padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 440 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: theme.c.err + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <ShieldAlert size={34} color={theme.c.err} />
        </div>
        <div style={{ fontFamily: theme.f.display, fontSize: 56, fontWeight: 700, color: theme.c.err, lineHeight: 1 }}>403</div>
        <h2 style={{ fontFamily: theme.f.display, fontSize: 24, fontWeight: 600, margin: '12px 0 8px' }}>Prieiga uždrausta</h2>
        <p style={{ fontSize: 15, color: theme.c.slate, marginBottom: 24 }}>
          Neturite teisių pasiekti šios srities. Prisijunkite su tinkama paskyra.
        </p>
        <Btn variant="primary" onClick={() => navigate('/')}>Į pradžią</Btn>
      </div>
    </div>
  );
}
