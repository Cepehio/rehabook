/**
 * Maza spalvota zyme (etikete) tekstui pazymeti, pvz. paslaugos kategorijai.
 */
import theme from '@/styles/theme';

const variants = {
  sage:  { bg: theme.c.sagePl, c: theme.c.sageDk },
  coral: { bg: theme.c.coral + '18', c: theme.c.coral },
  gold:  { bg: theme.c.gold + '18', c: theme.c.gold },
  ok:    { bg: theme.c.ok + '18', c: theme.c.ok },
  err:   { bg: theme.c.err + '15', c: theme.c.err },
  blue:  { bg: '#6C8EEF20', c: '#6C8EEF' },
};

export default function Badge({ children, variant = 'sage', style }) {
  const cl = variants[variant] || variants.sage;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '4px 12px', borderRadius: theme.r.full,
      background: cl.bg, color: cl.c,
      fontSize: 13, fontWeight: 600, fontFamily: theme.f.body,
      ...style,
    }}>
      {children}
    </span>
  );
}
