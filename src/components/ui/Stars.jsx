/**
 * Zvaigzduciu ivertinimo atvaizdavimas (1-5) specialistu kataloge.
 */
import { Star } from 'lucide-react';
import theme from '@/styles/theme';

export default function Stars({ rating, size = 14 }) {
  return (
    <div style={{ display: 'flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} fill={i <= rating ? theme.c.gold : 'none'} color={i <= rating ? theme.c.gold : theme.c.border} />
      ))}
    </div>
  );
}
