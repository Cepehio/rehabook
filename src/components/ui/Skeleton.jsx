/**
 * Skeleton — krovimosi vietos rezervas („skeleton kortelės sąrašams").
 * Mirgantis pilkšvas blokas; dydis/forma valdomi props.
 */
import theme from '@/styles/theme';

export default function Skeleton({ width = '100%', height = 16, radius = theme.r.sm, style = {} }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${theme.c.creamDk} 25%, ${theme.c.sagePl} 37%, ${theme.c.creamDk} 63%)`,
        backgroundSize: '400px 100%',
        animation: 'shimmer 1.4s ease infinite',
        ...style,
      }}
    />
  );
}
