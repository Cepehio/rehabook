/**
 * Mygtukas su variantais (primary, outline, ghost, danger) ir dydziais.
 * Palaiko piktograma, pilno plocio rezima ir isjungta busena (pvz. kol siunciama forma).
 */
import { useState } from 'react';
import theme from '@/styles/theme';

const variantStyles = {
  primary:   { bg: `linear-gradient(135deg,${theme.c.sage},${theme.c.sageDk})`, c: 'white', bd: 'none' },
  secondary: { bg: theme.c.warmWh, c: theme.c.char, bd: `1.5px solid ${theme.c.border}` },
  ghost:     { bg: 'transparent', c: theme.c.sage, bd: 'none' },
  coral:     { bg: `linear-gradient(135deg,${theme.c.coral},#c07050)`, c: 'white', bd: 'none' },
  danger:    { bg: `linear-gradient(135deg,${theme.c.err},#a03030)`, c: 'white', bd: 'none' },
};

const sizeStyles = {
  sm: { p: '8px 16px', fs: 13 },
  md: { p: '11px 22px', fs: 14 },
  lg: { p: '14px 30px', fs: 16 },
};

export default function Btn({ children, variant = 'primary', size = 'md', icon, onClick, disabled, style, ...rest }) {
  const [hovered, setHovered] = useState(false);
  const v = variantStyles[variant] || variantStyles.primary;
  const sz = sizeStyles[size] || sizeStyles.md;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: v.bg, color: v.c, border: v.bd,
        padding: sz.p, fontSize: sz.fs,
        fontWeight: 600, fontFamily: theme.f.body,
        borderRadius: theme.r.full,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        transition: 'all 0.25s',
        opacity: disabled ? 0.5 : hovered ? 0.88 : 1,
        transform: hovered && !disabled ? 'translateY(-1px)' : 'none',
        ...style,
      }}
      {...rest}
    >
      {icon}{children}
    </button>
  );
}
