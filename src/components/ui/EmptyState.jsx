/**
 * EmptyState — vieninga tuščios būsenos kortelė („Įrašų nerasta" su ikona).
 */
import { Inbox } from 'lucide-react';
import theme from '@/styles/theme';

export default function EmptyState({ icon: Icon = Inbox, title = 'Įrašų nerasta', message, children, dark = false }) {
  const fg = dark ? 'rgba(255,255,255,0.85)' : theme.c.char;
  const sub = dark ? 'rgba(255,255,255,0.45)' : theme.c.slate;
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <Icon size={44} color={theme.c.sageLt} style={{ margin: '0 auto 14px' }} />
      <h3 style={{ fontFamily: theme.f.display, fontSize: 18, fontWeight: 600, color: fg, marginBottom: message ? 8 : 0 }}>
        {title}
      </h3>
      {message && <p style={{ fontSize: 14, color: sub }}>{message}</p>}
      {children && <div style={{ marginTop: 16 }}>{children}</div>}
    </div>
  );
}
