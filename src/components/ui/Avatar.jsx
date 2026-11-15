/**
 * Apskritas avataras su inicialais (specialisto ar paciento vardo raides) ir pasirenkamu dydziu.
 */
import theme from '@/styles/theme';

export default function Avatar({ initials, size = 56, available, color }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: color || `linear-gradient(135deg,${theme.c.sage},${theme.c.sageDk})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: theme.f.display, fontSize: size * 0.32,
        fontWeight: 600, color: 'white',
        boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
      }}>
        {initials}
      </div>
      {available !== undefined && (
        <div style={{
          position: 'absolute', bottom: 1, right: 1,
          width: size * 0.22, height: size * 0.22,
          borderRadius: '50%',
          background: available ? theme.c.ok : theme.c.slate,
          border: '2px solid white',
        }} />
      )}
    </div>
  );
}
