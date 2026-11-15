/**
 * Sekcijos antraste viesiems puslapiams: maza antrastele virsuje, pavadinimas ir paaiskinimas.
 */
import theme from '@/styles/theme';

export default function SectionHeading({ overline, title, subtitle, align = 'center' }) {
  return (
    <div style={{ textAlign: align, maxWidth: 640, margin: align === 'center' ? '0 auto 44px' : '0 0 44px' }}>
      {overline && (
        <div style={{
          fontFamily: theme.f.body, fontSize: 12, fontWeight: 700,
          letterSpacing: '2px', textTransform: 'uppercase',
          color: theme.c.sage, marginBottom: 10,
        }}>
          {overline}
        </div>
      )}
      <h2 style={{
        fontFamily: theme.f.display,
        fontSize: 'clamp(26px,4vw,38px)', fontWeight: 600,
        color: theme.c.char, lineHeight: 1.2,
        marginBottom: subtitle ? 14 : 0,
      }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ fontFamily: theme.f.body, fontSize: 16, color: theme.c.slate, lineHeight: 1.6 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
