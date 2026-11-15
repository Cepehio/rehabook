/**
 * Viesas specialistu katalogas: korteles su pareigomis, specializacijomis, patirtimi ir ivertinimu,
 * detaliu modalas ir mygtukas "Registruotis" pas pasirinkta specialista. Kol duomenys kraunasi - skeleton korteles.
 */
import { useState } from 'react';
import { Award, Calendar, Users } from 'lucide-react';
import theme from '@/styles/theme';
import {
  Badge,
  Btn,
  Card,
  Avatar,
  Stars,
  Modal,
  SectionHeading as SH,
  Skeleton,
  EmptyState,
} from '@/components/ui';

/** Krovimosi kortelės vietos rezervas (skeleton) — atitinka specialisto kortelės struktūrą. */
function SpecCardSkeleton() {
  return (
    <Card hover={false}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
        <Skeleton width={64} height={64} radius="50%" />
        <div style={{ flex: 1 }}>
          <Skeleton width="70%" height={17} style={{ marginBottom: 8 }} />
          <Skeleton width="50%" height={13} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <Skeleton width="100%" height={13} style={{ marginBottom: 6 }} />
      <Skeleton width="90%" height={13} style={{ marginBottom: 14 }} />
      <div style={{ display: 'flex', gap: 5 }}>
        <Skeleton width={80} height={22} radius={theme.r.full} />
        <Skeleton width={70} height={22} radius={theme.r.full} />
      </div>
    </Card>
  );
}

function SpecialistsPage({ specialists, setPage, loading = false }) {
  const [sel, setSel] = useState(null);
  return (
    <div style={{ paddingTop: 100, minHeight: '100vh' }}>
      <section
        className="rb-page-section"
        style={{ padding: '40px 24px 80px', maxWidth: 1200, margin: '0 auto' }}
      >
        <SH overline="Komanda" title="Mūsų specialistai" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))',
            gap: 24,
          }}
        >
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SpecCardSkeleton key={i} />)
            : specialists.map((sp) => (
                <Card key={sp.id} onClick={() => setSel(sp)}>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                    <Avatar initials={sp.photo} size={64} available={sp.available} />
                    <div>
                      <h3
                        style={{
                          fontFamily: theme.f.d,
                          fontSize: 17,
                          fontWeight: 600,
                          marginBottom: 2,
                        }}
                      >
                        {sp.name}
                      </h3>
                      <p
                        style={{
                          fontFamily: theme.f.b,
                          fontSize: 13,
                          color: theme.c.sage,
                          fontWeight: 500,
                          marginBottom: 6,
                        }}
                      >
                        {sp.title}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Stars rating={Math.round(sp.rating)} />
                        <span style={{ fontSize: 12, color: theme.c.slate }}>{sp.rating}</span>
                      </div>
                    </div>
                  </div>
                  <p
                    style={{
                      fontFamily: theme.f.b,
                      fontSize: 13,
                      color: theme.c.slate,
                      lineHeight: 1.6,
                      marginBottom: 14,
                    }}
                  >
                    {sp.bio}
                  </p>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
                    {sp.specialties.map((s) => (
                      <Badge key={s}>{s}</Badge>
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: 14,
                      borderTop: `1px solid ${theme.c.border}`,
                    }}
                  >
                    <span style={{ fontSize: 13, color: theme.c.slate }}>
                      <Award size={13} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                      {sp.experience} m.
                    </span>
                    <Badge variant={sp.available ? 'ok' : 'coral'}>
                      {sp.available ? 'Prieinamas' : 'Užimtas'}
                    </Badge>
                  </div>
                </Card>
              ))}
        </div>
        {!loading && specialists.length === 0 && (
          <EmptyState
            icon={Users}
            title="Specialistų nerasta"
            message="Šiuo metu specialistų sąrašas tuščias."
          />
        )}
      </section>
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.name || ''}>
        {sel && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ margin: '0 auto 12px' }}>
                <Avatar initials={sel.photo} size={88} available={sel.available} />
              </div>
              <p style={{ color: theme.c.sage, fontWeight: 500 }}>{sel.title}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginBottom: 20 }}>
              {[
                { v: sel.experience, l: 'Metų' },
                { v: sel.rating, l: 'Įvertinimas' },
                { v: sel.reviews, l: 'Atsiliepimai' },
              ].map((x, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontFamily: theme.f.d,
                      fontSize: 22,
                      fontWeight: 700,
                      color: theme.c.sage,
                    }}
                  >
                    {x.v}
                  </div>
                  <div style={{ fontSize: 12, color: theme.c.slate }}>{x.l}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.7, textAlign: 'center', marginBottom: 20 }}>
              {sel.bio}
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              {sel.specialties.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
            {sel.available && (
              <Btn
                variant="primary"
                size="lg"
                style={{ width: '100%' }}
                onClick={() => {
                  setSel(null);
                  setPage('booking');
                }}
                icon={<Calendar size={18} />}
              >
                Registruotis
              </Btn>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default SpecialistsPage;
