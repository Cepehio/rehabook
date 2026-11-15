/**
 * Puslapio apacia: klinikos kontaktai, darbo laikas ir nuorodos.
 */
import { Activity, MapPin, Phone, Mail } from 'lucide-react';
import theme from '@/styles/theme';

export default function Footer() {
  return (
    <footer className="rb-footer" style={{ background: theme.c.char, color: 'white', padding: '56px 24px 28px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 40, marginBottom: 40 }}>
          {/* Prekės ženklas */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: theme.r.md, background: theme.c.sage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={16} color="white" />
              </div>
              <span style={{ fontFamily: theme.f.display, fontSize: 18, fontWeight: 600 }}>
                Reha<span style={{ color: theme.c.sageLt }}>Book</span>
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
              Profesionali kineziterapijos klinika Vilniuje.
            </p>
          </div>

          {/* Kontaktai */}
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)' }}>Kontaktai</h4>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 2.2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={13} />Gedimino pr. 28, Vilnius</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={13} />+370 5 234 5678</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={13} />info@rehabook.lt</div>
            </div>
          </div>

          {/* Darbo laikas */}
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)' }}>Darbo laikas</h4>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 2.2 }}>
              <div>Pr–Pn: 8:00–20:00</div>
              <div>Šš: 9:00–15:00</div>
              <div>Sk: Nedirbame</div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
          © 2026 RehaBook. Visos teisės saugomos.
        </div>
      </div>
    </footer>
  );
}
