/**
 * Viesas pradzios puslapis: hero blokas su kvietimu registruotis, klinikos rodikliai,
 * privalumu sekcija ir kvietimas pradeti. Sekcijos pasirodo su animacija, kai tampa matomos ekrane.
 */
import { useState, useEffect } from 'react';
import {
  Calendar,
  ArrowRight,
  Award,
  Zap,
  Heart,
  Shield,
  Activity,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';
import theme from '@/styles/theme';
import { Badge, Btn, Card, SectionHeading as SH } from '@/components/ui';

function HomePage({ setPage }) {
  const [vis, setVis] = useState({});
  useEffect(() => {
    // Sekciju pasirodymo animacija: IntersectionObserver pazymi, kurios sekcijos jau matomos.
    const obs = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) setVis((p) => ({ ...p, [e.target.dataset.section]: true }));
        }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('[data-section]').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
  const sec = (k) => ({
    opacity: vis[k] ? 1 : 0,
    transform: vis[k] ? 'none' : 'translateY(28px)',
    transition: 'all 0.8s ease',
  });
  const sU = (d) => ({ animation: `slideUp 0.6s ease ${d}s forwards`, opacity: 0 });

  return (
    <div>
      <section
        className="rb-hero"
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          paddingTop: 80,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div
            style={{
              position: 'absolute',
              top: '-20%',
              right: '-10%',
              width: 600,
              height: 600,
              borderRadius: '50%',
              background: `radial-gradient(circle,${theme.c.sagePl}40,transparent 70%)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-10%',
              left: '-5%',
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: `radial-gradient(circle,${theme.c.coralLt}20,transparent 70%)`,
            }}
          />
        </div>
        <div
          className="rb-hero-grid"
          style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: 1200,
            margin: '0 auto',
            padding: '60px 24px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 60,
            alignItems: 'center',
          }}
        >
          <div>
            <div style={sU(0)}>
              <Badge>✦ Vilniaus kineziterapijos klinika</Badge>
            </div>
            <h1
              style={{
                fontFamily: theme.f.d,
                fontSize: 'clamp(34px,5vw,56px)',
                fontWeight: 700,
                lineHeight: 1.1,
                color: theme.c.char,
                margin: '22px 0',
                letterSpacing: '-1px',
                ...sU(0.1),
              }}
            >
              Jūsų kelias į{' '}
              <span style={{ color: theme.c.sage, fontStyle: 'italic' }}>sveikatą</span> prasideda
              čia
            </h1>
            <p
              style={{
                fontFamily: theme.f.b,
                fontSize: 18,
                lineHeight: 1.7,
                color: theme.c.slate,
                marginBottom: 32,
                maxWidth: 460,
                ...sU(0.2),
              }}
            >
              Profesionali kineziterapija, pritaikyta jūsų poreikiams. Modernūs metodai, patyrę
              specialistai.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', ...sU(0.3) }}>
              <Btn
                variant="primary"
                size="lg"
                onClick={() => setPage('booking')}
                icon={<Calendar size={18} />}
              >
                Registruotis vizitui
              </Btn>
              <Btn
                variant="secondary"
                size="lg"
                onClick={() => setPage('services')}
                icon={<ArrowRight size={18} />}
              >
                Mūsų paslaugos
              </Btn>
            </div>
            <div
              className="rb-hero-stats"
              style={{ display: 'flex', gap: 28, marginTop: 44, ...sU(0.4) }}
            >
              {[
                { v: '5000+', l: 'Pacientų' },
                { v: '14+', l: 'Metų patirties' },
                { v: '4.9', l: 'Įvertinimas' },
                { v: '98%', l: 'Rekomenduoja' },
              ].map((s, i) => (
                <div key={i}>
                  <div
                    style={{
                      fontFamily: theme.f.d,
                      fontSize: 26,
                      fontWeight: 700,
                      color: theme.c.sage,
                    }}
                  >
                    {s.v}
                  </div>
                  <div
                    style={{
                      fontFamily: theme.f.b,
                      fontSize: 12,
                      color: theme.c.slate,
                      marginTop: 2,
                    }}
                  >
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rb-hero-art" style={sU(0.2)}>
            <div
              style={{
                width: '100%',
                aspectRatio: '4/5',
                borderRadius: theme.r.xl,
                background: `linear-gradient(160deg,${theme.c.sagePl},${theme.c.creamDk})`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  fontSize: 110,
                  lineHeight: 1,
                  marginBottom: 14,
                  animation: 'float 4s ease-in-out infinite',
                }}
              >
                🧘
              </div>
              <div
                style={{
                  fontFamily: theme.f.d,
                  fontSize: 22,
                  color: theme.c.sageDk,
                  textAlign: 'center',
                  padding: '0 28px',
                }}
              >
                Judėjimas yra geriausias vaistas
              </div>
              <div
                className="rb-hero-badge"
                style={{
                  position: 'absolute',
                  top: 28,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'white',
                  borderRadius: theme.r.md,
                  padding: '10px 16px',
                  boxShadow: theme.sh.lg,
                  animation: 'float 3s ease-in-out infinite',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap',
                }}
              >
                <Shield size={18} color={theme.c.sage} />
                <span style={{ fontFamily: theme.f.b, fontSize: 12, fontWeight: 600 }}>
                  Licencijuoti specialistai
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section data-section="why" className="rb-section" style={{ padding: '90px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', ...sec('why') }}>
          <SH overline="Kodėl mes" title="Patikima kineziterapija Vilniuje" />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
              gap: 20,
            }}
          >
            {[
              {
                i: <Award size={26} />,
                t: 'Aukšta kvalifikacija',
                d: 'Visi specialistai turi aukštąjį išsilavinimą.',
              },
              {
                i: <Zap size={26} />,
                t: 'Modernūs metodai',
                d: 'Mokslu pagrįstų metodų taikymas.',
              },
              {
                i: <Heart size={26} />,
                t: 'Individualus požiūris',
                d: 'Asmeniškai pritaikytas planas.',
              },
              {
                i: <Shield size={26} />,
                t: 'Saugumas ir kokybė',
                d: 'Griežti higienos standartai.',
              },
            ].map((x, i) => (
              <Card key={i} style={{ textAlign: 'center', padding: 32 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: theme.r.lg,
                    background: theme.c.sagePl,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: theme.c.sage,
                  }}
                >
                  {x.i}
                </div>
                <h3
                  style={{ fontFamily: theme.f.d, fontSize: 18, fontWeight: 600, marginBottom: 8 }}
                >
                  {x.t}
                </h3>
                <p
                  style={{
                    fontFamily: theme.f.b,
                    fontSize: 14,
                    color: theme.c.slate,
                    lineHeight: 1.6,
                  }}
                >
                  {x.d}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <section className="rb-section" style={{ padding: '90px 24px' }}>
        <div
          className="rb-cta"
          style={{
            maxWidth: 760,
            margin: '0 auto',
            textAlign: 'center',
            background: `linear-gradient(135deg,${theme.c.sage},${theme.c.sageDk})`,
            borderRadius: theme.r.xl,
            padding: '56px 40px',
          }}
        >
          <h2
            style={{
              fontFamily: theme.f.d,
              fontSize: 'clamp(26px,4vw,38px)',
              fontWeight: 700,
              color: 'white',
              marginBottom: 14,
            }}
          >
            Pradėkite kelionę link sveikatos
          </h2>
          <p
            style={{
              fontFamily: theme.f.b,
              fontSize: 17,
              color: 'rgba(255,255,255,0.85)',
              marginBottom: 32,
              maxWidth: 480,
              margin: '0 auto 32px',
            }}
          >
            Užsiregistruokite jau šiandien.
          </p>
          <Btn
            variant="coral"
            size="lg"
            onClick={() => setPage('booking')}
            icon={<Calendar size={18} />}
          >
            Registruotis dabar
          </Btn>
        </div>
      </section>
      <footer
        className="rb-footer"
        style={{ background: theme.c.char, color: 'white', padding: '56px 24px 28px' }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
              gap: 40,
              marginBottom: 40,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: theme.r.md,
                    background: theme.c.sage,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Activity size={16} color="white" />
                </div>
                <span style={{ fontFamily: theme.f.d, fontSize: 18, fontWeight: 600 }}>
                  Reha<span style={{ color: theme.c.sageLt }}>Book</span>
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                Profesionali kineziterapijos klinika Vilniuje.
              </p>
            </div>
            <div>
              <h4
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 14,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                Kontaktai
              </h4>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 2.2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={13} />
                  Gedimino pr. 28, Vilnius
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={13} />
                  +370 5 234 5678
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={13} />
                  info@rehabook.lt
                </div>
              </div>
            </div>
            <div>
              <h4
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 14,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                Darbo laikas
              </h4>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 2.2 }}>
                <div>Pr–Pn: 8:00–20:00</div>
                <div>Šš: 9:00–15:00</div>
                <div>Sk: Nedirbame</div>
              </div>
            </div>
          </div>
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: 20,
              textAlign: 'center',
              fontSize: 12,
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            © 2026 RehaBook. Visos teisės saugomos.
          </div>
        </div>
      </footer>
    </div>
  );
}
export default HomePage;
