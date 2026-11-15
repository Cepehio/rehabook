/**
 * Paciento zona (/paskyra): rodikliai, skirtukai "Artimiausi" ir "Istorija",
 * vizito atsaukimas su priezastimi (modalinis langas), ivykusio vizito PDF atsisiuntimas
 * ir greitas perejimas i registracijos vedli.
 */
import { useState } from 'react';
import {
  Calendar,
  Activity,
  Plus,
  LogOut,
  ChevronLeft,
  XCircle,
  MessageSquare,
  Download,
} from 'lucide-react';
import theme from '@/styles/theme';
import { Btn, Card, Avatar, StatCard, StatusBadge, Modal } from '@/components/ui';
import { BookingPage } from '@/features/booking';
import { LT_MONTHS } from '@/utils/constants';
import { generateVisitPdf } from '@/utils/pdf';

function PatientDashboard({
  patient,
  visits,
  specialists,
  onLogout,
  onCancel,
  onBooked,
}) {
  const [tab, setTab] = useState('upcoming');
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showBooking, setShowBooking] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const now = new Date().toISOString().split('T')[0];
  // Mano vizitai: artimiausi (ateities, neatsaukti, neivyke) ir istorija (likusieji).
  const myVisits = visits.filter((v) => v.patientId === patient.id);
  const up = myVisits.filter(
    (v) => v.date >= now && v.status !== 'atšauktas' && v.status !== 'įvykęs'
  );
  const past = myVisits.filter(
    (v) => v.date < now || v.status === 'įvykęs' || v.status === 'atšauktas'
  );
  const list = tab === 'upcoming' ? up : past;

  // Atsaukimas su privaloma priezastimi (PATCH /api/visits/:id/cancel); laikas tampa laisvas kitiems.
  const doCancel = async () => {
    if (!cancelReason.trim() || cancelling) return;
    setCancelling(true);
    setCancelError('');
    try {
      await onCancel(cancelModal.id, cancelReason);
      setCancelModal(null);
      setCancelReason('');
    } catch (e) {
      setCancelError(e.message || 'Nepavyko atšaukti vizito.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.c.cream }}>
      {/* Viršutinė juosta */}
      <div
        className="rb-topbar"
        style={{
          background: 'white',
          borderBottom: `1px solid ${theme.c.border}`,
          padding: '14px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: theme.r.md,
              background: `linear-gradient(135deg,${theme.c.sage},${theme.c.sageDk})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={18} color="white" />
          </div>
          <span style={{ fontFamily: theme.f.d, fontSize: 18, fontWeight: 600 }}>
            Reha<span style={{ color: theme.c.sage }}>Book</span>
          </span>{' '}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar initials={patient.name[0] + patient.surname[0]} size={36} />
            <div className="rb-user-meta">
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {patient.name} {patient.surname}
              </div>
              <div style={{ fontSize: 11, color: theme.c.slate }}>{patient.email}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 14px',
              border: `1.5px solid ${theme.c.border}`,
              borderRadius: theme.r.full,
              background: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: theme.f.b,
              color: theme.c.slate,
            }}
          >
            <LogOut size={14} />
            Atsijungti
          </button>
        </div>
      </div>

      {showBooking ? (
        <div>
          <div style={{ padding: '16px 24px 0', maxWidth: 920, margin: '0 auto' }}>
            <Btn
              variant="ghost"
              onClick={() => setShowBooking(false)}
              icon={<ChevronLeft size={16} />}
            >
              Grįžti į vizitus
            </Btn>
          </div>
          <BookingPage
            preSelSvc={null}
            specialists={specialists}
            embedded={true}
            onBooked={onBooked}
          />
        </div>
      ) : (
        <section
          className="rb-page-section"
          style={{ padding: '40px 24px 80px', maxWidth: 920, margin: '0 auto' }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 36,
              flexWrap: 'wrap',
              gap: 14,
            }}
          >
            <div>
              <h1 style={{ fontFamily: theme.f.d, fontSize: 28, fontWeight: 600, marginBottom: 3 }}>
                Sveiki, {patient.name}! 👋
              </h1>
              <p style={{ fontSize: 15, color: theme.c.slate }}>Jūsų vizitų informacija.</p>
            </div>
            <Btn variant="primary" onClick={() => setShowBooking(true)} icon={<Plus size={16} />}>
              Registruotis vizitui
            </Btn>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))',
              gap: 14,
              marginBottom: 36,
            }}
          >
            <StatCard label="Artimiausi" value={up.length} icon={Calendar} color={theme.c.sage} />
            <StatCard
              label="Iš viso"
              value={myVisits.length}
              icon={Activity}
              color={theme.c.coral}
            />
            <StatCard
              label="Atšaukti"
              value={myVisits.filter((v) => v.status === 'atšauktas').length}
              icon={XCircle}
              color={theme.c.err}
            />
          </div>
          <div
            style={{
              display: 'flex',
              gap: 3,
              background: theme.c.creamDk,
              borderRadius: theme.r.full,
              padding: 3,
              width: 'fit-content',
              marginBottom: 24,
            }}
          >
            {[
              { id: 'upcoming', l: 'Artimiausi' },
              { id: 'past', l: 'Istorija' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '9px 20px',
                  borderRadius: theme.r.full,
                  border: 'none',
                  background: tab === t.id ? 'white' : 'transparent',
                  fontSize: 14,
                  fontWeight: tab === t.id ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: theme.f.b,
                  boxShadow: tab === t.id ? theme.sh.sm : 'none',
                }}
              >
                {t.l}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {list.map((v, i) => {
              const sp = specialists.find((s) => s.id === v.specialistId);
              const canCancel = v.status !== 'atšauktas' && v.status !== 'įvykęs';
              return (
                <Card
                  key={v.id}
                  hover={false}
                  className="rb-visit-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '16px 20px',
                    animation: `slideR 0.3s ease ${i * 0.04}s forwards`,
                    opacity: 0,
                  }}
                >
                  <div
                    style={{
                      width: 50,
                      height: 58,
                      borderRadius: theme.r.md,
                      background: `linear-gradient(135deg,${theme.c.sagePl},${theme.c.creamDk})`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: theme.f.d,
                        fontSize: 20,
                        fontWeight: 700,
                        color: theme.c.sage,
                        lineHeight: 1,
                      }}
                    >
                      {new Date(v.date).getDate()}
                    </span>
                    <span
                      style={{ fontSize: 10, color: theme.c.slate, textTransform: 'uppercase' }}
                    >
                      {LT_MONTHS[new Date(v.date).getMonth()].slice(0, 3)}
                    </span>
                  </div>
                  <div className="rb-visit-info" style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>
                      {v.service}
                    </div>
                    <div style={{ fontSize: 13, color: theme.c.slate }}>
                      {sp?.name} • {v.time}
                    </div>
                    {v.status === 'atšauktas' && v.cancelReason && (
                      <div
                        style={{
                          fontSize: 12,
                          color: theme.c.err,
                          marginTop: 3,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <MessageSquare size={12} />
                        {v.cancelReason}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={v.status} />
                  <span
                    style={{
                      fontFamily: theme.f.d,
                      fontSize: 17,
                      fontWeight: 700,
                      color: theme.c.sage,
                    }}
                  >
                    €{v.price}
                  </span>
                  {v.status === 'įvykęs' && (
                    <button
                      onClick={() =>
                        generateVisitPdf(v, sp?.name).catch((error) =>
                          window.alert(error.message || 'Nepavyko parengti PDF.')
                        )
                      }
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: theme.r.sm,
                        background: theme.c.sage + '18',
                        border: 'none',
                        color: theme.c.sage,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Atsisiųsti PDF"
                    >
                      <Download size={16} />
                    </button>
                  )}
                  {canCancel && (
                    <button
                      onClick={() => {
                        setCancelModal(v);
                        setCancelReason('');
                        setCancelError('');
                      }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: theme.r.sm,
                        background: theme.c.err + '12',
                        border: 'none',
                        color: theme.c.err,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Atšaukti vizitą"
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </Card>
              );
            })}
            {list.length === 0 && (
              <Card hover={false} style={{ textAlign: 'center', padding: 48 }}>
                <Calendar size={44} color={theme.c.sageLt} style={{ margin: '0 auto 14px' }} />
                <h3
                  style={{ fontFamily: theme.f.d, fontSize: 18, fontWeight: 600, marginBottom: 8 }}
                >
                  Vizitų nėra
                </h3>
                {tab === 'upcoming' && (
                  <Btn
                    variant="primary"
                    onClick={() => setShowBooking(true)}
                    icon={<Calendar size={16} />}
                  >
                    Registruotis vizitui
                  </Btn>
                )}
              </Card>
            )}
          </div>
        </section>
      )}

      {/* Atšaukimo modalas */}
      <Modal open={!!cancelModal} onClose={() => setCancelModal(null)} title="Atšaukti vizitą">
        {cancelModal && (
          <div>
            {cancelError && (
              <p role="alert" style={{ color: theme.c.err }}>
                {cancelError}
              </p>
            )}
            <div
              style={{
                background: theme.c.err + '08',
                border: `1px solid ${theme.c.err}20`,
                borderRadius: theme.r.md,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                {cancelModal.service}
              </div>
              <div style={{ fontSize: 13, color: theme.c.slate }}>
                {cancelModal.date} • {cancelModal.time}
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                Atšaukimo priežastis <span style={{ color: theme.c.coral }}>*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nurodykite priežastį..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  border: `1.5px solid ${theme.c.border}`,
                  borderRadius: theme.r.md,
                  fontFamily: theme.f.b,
                  fontSize: 14,
                  resize: 'vertical',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variant="secondary" onClick={() => setCancelModal(null)}>
                Grįžti
              </Btn>
              <Btn
                variant="danger"
                onClick={doCancel}
                disabled={cancelling || !cancelReason.trim()}
                icon={<XCircle size={16} />}
              >
                Atšaukti vizitą
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default PatientDashboard;
