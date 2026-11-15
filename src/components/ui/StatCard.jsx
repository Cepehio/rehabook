/**
 * Rodiklio kortele (skaicius + pavadinimas + piktograma) apzvalgos skydeliams.
 */
import theme from '@/styles/theme';
import Card from './Card';

export default function StatCard({ label, value, icon: Icon, color }) {
  return (
    <Card hover={false} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18 }}>
      <div style={{
        width: 46, height: 46, borderRadius: theme.r.md,
        background: color + '15',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color,
      }}>
        <Icon size={22} />
      </div>
      <div>
        <div style={{ fontFamily: theme.f.display, fontSize: 24, fontWeight: 700, color: theme.c.char }}>{value}</div>
        <div style={{ fontFamily: theme.f.body, fontSize: 12, color: theme.c.slate }}>{label}</div>
      </div>
    </Card>
  );
}
