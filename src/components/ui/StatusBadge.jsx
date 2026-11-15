/**
 * Vizito busenos zyme: laukiamas, patvirtintas, ivykes, atsauktas - kiekviena savo spalva.
 */
import theme from '@/styles/theme';

const statusColors = {
  patvirtintas: { bg: theme.c.ok + '18', c: theme.c.ok },
  laukiamas:    { bg: theme.c.gold + '18', c: theme.c.gold },
  'įvykęs':    { bg: theme.c.sagePl, c: theme.c.sageDk },
  'atšauktas':  { bg: theme.c.err + '12', c: theme.c.err },
};

export default function StatusBadge({ status }) {
  const s = statusColors[status] || statusColors.laukiamas;
  return (
    <span style={{
      padding: '4px 12px', borderRadius: theme.r.full,
      background: s.bg, color: s.c,
      fontSize: 12, fontWeight: 600,
      fontFamily: theme.f.body, textTransform: 'capitalize',
    }}>
      {status}
    </span>
  );
}
