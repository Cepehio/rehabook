/**
 * Kortele - baltas konteineris su apvalintais kampais ir seseliu.
 * Naudojama visuose puslapiuose kaip bazinis blokas; palaiko hover efekta ir papildomus stilius.
 */
import { useState } from 'react';
import theme from '@/styles/theme';

export default function Card({ children, style, onClick, hover = true, className, ...rest }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={['rb-card', className].filter(Boolean).join(' ')}
      style={{
        background: theme.c.card,
        borderRadius: theme.r.lg,
        border: `1px solid ${theme.c.border}`,
        padding: 24,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        transform: hover && hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hover && hovered ? theme.sh.lg : theme.sh.sm,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
