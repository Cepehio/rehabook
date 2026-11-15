/**
 * Modalinis langas: pritemdytas fonas, antraste, uzdarymo mygtukas.
 * Uzdaromas paspaudus fona arba kryzeli; turinys perduodamas kaip children.
 */
import { X } from 'lucide-react';
import theme from '@/styles/theme';

export default function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;

  return (
    <div
      className="rb-modal-overlay"
      style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }} />
      <div
        className="rb-modal"
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', background: 'white', color: theme.c.char,
          borderRadius: theme.r.xl, maxWidth: wide ? 720 : 520,
          width: '100%', padding: 32, boxShadow: theme.sh.xl,
          animation: 'scaleIn 0.25s ease', maxHeight: '85vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontFamily: theme.f.display, fontSize: 22, fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} aria-label="Uždaryti">
            <X size={20} color={theme.c.slate} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
