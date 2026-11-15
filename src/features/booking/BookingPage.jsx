/**
 * Vizito registracijos vedlys (5 zingsniai):
 *  1) paslauga, 2) specialistas arba "bet kuris laisvas", 3) data ir laikas is dienos laiku lenteles,
 *  4) santrauka (neprisijungusiam - prisijungimas), 5) patvirtinimas su rezervacijos numeriu.
 * Pasirinkimai saugomi sessionStorage, kad isliktu po prisijungimo.
 * Laiku lentele gaunama is GET /api/visits/availability: uzimti laikai pritemdyti ir nepasirenkami,
 * persidengiantys su paties paciento vizitu - bruksniuoti. Galutine patikra visada atlieka serveris
 * (POST /api/visits grazina 409, jei laikas tuo metu uzimtas) - tada lentele uzkraunama is naujo.
 */
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Check, ChevronRight, ChevronLeft, Search, Activity, Users } from 'lucide-react';
import theme from '@/styles/theme';
import { Btn, Card, Input, Avatar, SectionHeading } from '@/components/ui';
import { serviceService, visitService, getStoredSession } from '@/services/api';
import { clinicNow, workingHours } from '../../../shared/booking.js';

const DRAFT_KEY = 'rehabook_booking_draft';
const EMPTY = { service: '', specialist: '', date: '', time: '' };
/** Dienos laikų lentelė iš API: visi laikai, užimti, persidengiantys su savais vizitais, laisvi. */
const EMPTY_TABLE = { slots: [], taken: [], own: [], available: [] };
const SLOT_LABELS = { taken: 'Užimta', own: 'Užrezervuotas jūsų laikas' };
/** Pasirinkimas „bet kuris laisvas specialistas“ – serveris priskiria mažiausiai apkrautą. */
export const ANY_SPECIALIST = 'any';
const ANY_SPECIALIST_OPTION = {
  id: ANY_SPECIALIST,
  name: 'Bet kuris laisvas specialistas',
  title: 'Parenkamas automatiškai pagal mažiausią darbo krūvį',
  available: true,
};
// Atkuria is sessionStorage pradetos registracijos pasirinkimus (po prisijungimo vedlys tesiamas).
function savedDraft(preSelSvc) {
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY));
    if (
      draft &&
      draft.date >= clinicNow().date &&
      (!preSelSvc || Number(draft.service) === preSelSvc.id)
    )
      return { ...EMPTY, ...draft };
  } catch {
    /* Sugadintą juodraštį pradedame iš naujo. */
  }
  return { ...EMPTY, ...(preSelSvc ? { service: preSelSvc.id } : {}) };
}

export default function BookingPage({ preSelSvc, specialists, embedded, onBooked }) {
  const navigate = useNavigate();
  // form - paciento pasirinkimai (paslauga, specialistas, data, laikas); step - aktyvus vedlio zingsnis 1-5.
  const [form, setForm] = useState(() => savedDraft(preSelSvc));
  const [step, setStep] = useState(() => (savedDraft(preSelSvc).time ? 4 : 1));
  const [services, setServices] = useState([]);
  const [serviceLoading, setServiceLoading] = useState(true);
  const [serviceError, setServiceError] = useState('');
  const [serviceAttempt, setServiceAttempt] = useState(0);
  // table - dienos laiku lentele is API: slots (visi), taken (uzimti), own (persidengia su mano vizitu), available (laisvi).
  const [table, setTable] = useState(EMPTY_TABLE);
  const available = table.available;
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotError, setSlotError] = useState('');
  const [slotAttempt, setSlotAttempt] = useState(0);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const isPatient = getStoredSession()?.user.role === 'patient';
  const selectedService = services.find((s) => s.id === Number(form.service));
  const anySpecialist = form.specialist === ANY_SPECIALIST;
  const selectedSpecialist = anySpecialist
    ? ANY_SPECIALIST_OPTION
    : specialists.find((s) => s.id === Number(form.specialist));
  const filtered = specialists.filter(
    (s) => s.available && s.name.toLowerCase().includes(filter.toLowerCase())
  );
  // 21 artimiausia diena nuo rytojaus, paliekant tik klinikos darbo dienas (sekmadieniai praleidziami).
  const dates = useMemo(() => {
    const start = new Date(clinicNow().date + 'T12:00:00Z');
    return Array.from({ length: 21 }, (_, i) => {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + i + 1);
      return date.toISOString().slice(0, 10);
    }).filter((date) => workingHours(date));
  }, []);
  useEffect(() => {
    let active = true;
    setServiceLoading(true);
    setServiceError('');
    serviceService
      .getAll()
      .then((data) => {
        if (active) setServices(data);
      })
      .catch((e) => {
        if (active) setServiceError(e.message);
      })
      .finally(() => {
        if (active) setServiceLoading(false);
      });
    return () => {
      active = false;
    };
  }, [serviceAttempt]);
  useEffect(() => {
    // Kiekvienas pasirinkimas is karto issaugomas, kad neprapultu nukreipus i prisijungima.
    if (!confirmation) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form, confirmation]);
  useEffect(() => {
    setTable(EMPTY_TABLE);
    setSlotError('');
    // Pasirinkus specialista, data ir paslauga uzklausiama dienos laiku lentele (su paciento token, jei prisijunges).
    if (!form.specialist || !form.date || !form.service) return;
    let active = true;
    setSlotLoading(true);
    visitService
      .getAvailability(
        form.specialist === ANY_SPECIALIST ? undefined : form.specialist,
        form.date,
        form.service
      )
      .then((data) => {
        if (!active) return;
        const next = {
          slots: data.slots ?? data.available ?? [],
          taken: data.taken ?? [],
          own: data.own ?? [],
          available: data.available ?? [],
        };
        setTable(next);
        setForm((old) => (next.available.includes(old.time) ? old : { ...old, time: '' }));
      })
      .catch((e) => {
        if (active) {
          setSlotError(e.message);
          setForm((old) => ({ ...old, time: '' }));
        }
      })
      .finally(() => {
        if (active) setSlotLoading(false);
      });
    return () => {
      active = false;
    };
  }, [form.specialist, form.date, form.service, slotAttempt]);

  // Pakeitus bet kuri pasirinkima (isskyrus laika) laikas isvalomas, nes lentele bus kita.
  const choose = (field, value) => {
    setError('');
    setForm((old) => ({ ...old, [field]: value, ...(field !== 'time' ? { time: '' } : {}) }));
  };
  // Perejimas i kita zingsni leidziamas tik su galiojanciu pasirinkimu; 3 zingsnyje - tik patikrintas laisvas laikas.
  const next = () => {
    if (step === 1 && !selectedService) return setError('Pasirinkite paslaugą.');
    if (step === 2 && !selectedSpecialist?.available) return setError('Pasirinkite specialistą.');
    if (step === 3 && (!form.date || !available.includes(form.time) || slotError || slotLoading))
      return setError('Pasirinkite patikrintą laisvą laiką.');
    setError('');
    setStep((s) => s + 1);
  };
  // Galutinis pateikimas: neprisijunges siunciamas prisijungti (pasirinkimai isliks), prisijunges - POST /api/visits.
  const submit = async () => {
    if (busy) return;
    if (!isPatient) return navigate('/prisijungimas?next=/registracija');
    if (
      !selectedService ||
      !selectedSpecialist?.available ||
      !available.includes(form.time) ||
      slotError ||
      slotLoading
    ) {
      setStep(3);
      return setError('Dar kartą patikrinkite ir pasirinkite laisvą laiką.');
    }
    setBusy(true);
    setError('');
    try {
      // Be specialistId serveris priskiria laisvą, mažiausiai apkrautą specialistą.
      const payload = { serviceId: Number(form.service), date: form.date, time: form.time };
      if (!anySpecialist) payload.specialistId = Number(form.specialist);
      const visit = await visitService.create(payload);
      setConfirmation(visit);
      setStep(5);
      sessionStorage.removeItem(DRAFT_KEY);
      onBooked?.();
    } catch (e) {
      setError(e.message);
      if (e.status === 409) {
        setStep(3);
        setSlotAttempt((n) => n + 1);
      }
    } finally {
      setBusy(false);
    }
  };
  const optionStyle = (selected) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    padding: '14px 18px',
    textAlign: 'left',
    border: '2px solid ' + (selected ? theme.c.sage : theme.c.border),
    borderRadius: theme.r.md,
    background: selected ? theme.c.sagePl : 'white',
    cursor: 'pointer',
    fontFamily: theme.f.body,
  });
  // Užimtas laikas: pritemdytas ir nepasirenkamas; persidengiantis su savu vizitu – brūkšniuotu rėmeliu.
  const takenStyle = (status) => ({
    ...optionStyle(false),
    background: theme.c.creamDk,
    color: theme.c.slate,
    border: status === 'own' ? '2px dashed ' + theme.c.sage : '2px solid ' + theme.c.border,
    opacity: 0.55,
    cursor: 'not-allowed',
  });
  // Laiko busena mygtukui: own (bruksniuotas), taken (pritemdytas) arba free.
  const slotStatus = (time) =>
    table.own.includes(time) ? 'own' : table.taken.includes(time) ? 'taken' : 'free';
  return (
    <div style={{ paddingTop: embedded ? 16 : 100, minHeight: '80vh', background: theme.c.cream }}>
      <section
        className="rb-page-section"
        style={{ padding: '40px 24px 80px', maxWidth: 780, margin: '0 auto' }}
      >
        <SectionHeading overline="Registracija" title="Registruotis vizitui" />
        <ol
          aria-label="Registracijos žingsniai"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            listStyle: 'none',
            padding: 0,
            margin: '0 0 30px',
            flexWrap: 'wrap',
          }}
        >
          {['Paslauga', 'Specialistas', 'Data', 'Santrauka', 'Patvirtinimas'].map((label, i) => (
            <li
              key={label}
              aria-current={step === i + 1 ? 'step' : undefined}
              style={{
                fontSize: 12,
                color: step >= i + 1 ? theme.c.sageDk : theme.c.slate,
                fontWeight: step === i + 1 ? 700 : 400,
              }}
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>
        <Card hover={false}>
          {step === 1 && (
            <>
              <h2 style={{ marginBottom: 20 }}>Pasirinkite paslaugą</h2>
              {serviceLoading && <p role="status">Kraunamos paslaugos…</p>}
              {serviceError && (
                <>
                  <p role="alert">{serviceError}</p>
                  <Btn onClick={() => setServiceAttempt((n) => n + 1)}>Bandyti dar kartą</Btn>
                </>
              )}
              {!serviceLoading && !serviceError && !services.length && (
                <p>Paslaugų šiuo metu nėra.</p>
              )}
              <div style={{ display: 'grid', gap: 10 }}>
                {services.map((s) => (
                  <button
                    key={s.id}
                    aria-pressed={Number(form.service) === s.id}
                    style={optionStyle(Number(form.service) === s.id)}
                    onClick={() => choose('service', s.id)}
                  >
                    <Activity size={22} color={theme.c.sage} />
                    <span style={{ flex: 1 }}>
                      <strong>{s.name}</strong>
                      <small style={{ display: 'block', marginTop: 5 }}>
                        {s.duration} min · {s.category}
                      </small>
                    </span>
                    <strong>€{s.price}</strong>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2 style={{ marginBottom: 20 }}>Pasirinkite specialistą</h2>
              <Input
                label="Specialisto paieška"
                icon={Search}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              {!filtered.length && <p>Pagal šią paiešką specialistų nerasta.</p>}
              <div style={{ display: 'grid', gap: 10 }}>
                <button
                  aria-pressed={anySpecialist}
                  style={optionStyle(anySpecialist)}
                  onClick={() => choose('specialist', ANY_SPECIALIST)}
                >
                  <Users size={22} color={theme.c.sage} />
                  <span>
                    <strong>{ANY_SPECIALIST_OPTION.name}</strong>
                    <small style={{ display: 'block', marginTop: 5 }}>
                      {ANY_SPECIALIST_OPTION.title}
                    </small>
                  </span>
                </button>
                {filtered.map((s) => (
                  <button
                    key={s.id}
                    aria-pressed={Number(form.specialist) === s.id}
                    style={optionStyle(Number(form.specialist) === s.id)}
                    onClick={() => choose('specialist', s.id)}
                  >
                    <Avatar initials={s.photo} size={44} />
                    <span>
                      <strong>{s.name}</strong>
                      <small style={{ display: 'block', marginTop: 5 }}>{s.title}</small>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <h2 style={{ marginBottom: 20 }}>Data ir laikas</h2>
              <p style={{ color: theme.c.slate, marginBottom: 16 }}>
                Rodomas Lietuvos laikas. Paslaugos trukmė: {selectedService?.duration} min.
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))',
                  gap: 6,
                  marginBottom: 24,
                }}
              >
                {dates.map((date) => (
                  <button
                    key={date}
                    style={optionStyle(form.date === date)}
                    aria-pressed={form.date === date}
                    onClick={() => choose('date', date)}
                  >
                    {new Intl.DateTimeFormat('lt-LT', {
                      day: 'numeric',
                      month: 'short',
                      weekday: 'short',
                      timeZone: 'UTC',
                    }).format(new Date(date + 'T12:00:00Z'))}
                  </button>
                ))}
              </div>
              {!form.date ? (
                <p>Pirmiausia pasirinkite datą.</p>
              ) : slotLoading ? (
                <p role="status">Tikrinami laisvi laikai…</p>
              ) : slotError ? (
                <>
                  <p role="alert">{slotError}</p>
                  <Btn onClick={() => setSlotAttempt((n) => n + 1)}>Bandyti dar kartą</Btn>
                </>
              ) : (
                <>
                  {!available.length && <p>Šią dieną laisvų laikų nėra. Pasirinkite kitą datą.</p>}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill,minmax(84px,1fr))',
                      gap: 6,
                    }}
                  >
                    {table.slots.map((time) => {
                      const status = slotStatus(time);
                      return status === 'free' ? (
                        <button
                          key={time}
                          style={optionStyle(form.time === time)}
                          aria-pressed={form.time === time}
                          onClick={() => choose('time', time)}
                        >
                          {time}
                        </button>
                      ) : (
                        <button
                          key={time}
                          type="button"
                          disabled
                          title={SLOT_LABELS[status]}
                          aria-label={`${time} – ${SLOT_LABELS[status]}`}
                          style={takenStyle(status)}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                  {(table.taken.length > 0 || table.own.length > 0) && (
                    <p style={{ color: theme.c.slate, fontSize: 14, marginTop: 14 }}>
                      Pritemdyti laikai užimti
                      {table.own.length > 0 && ', brūkšniuoti – užrezervuoti jūsų laikai'}
                      .
                    </p>
                  )}
                </>
              )}
            </>
          )}
          {step === 4 && (
            <>
              <h2 style={{ marginBottom: 20 }}>Vizito santrauka</h2>
              <dl style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
                {[
                  ['Paslauga', selectedService?.name],
                  ['Specialistas', selectedSpecialist?.name],
                  ['Data', form.date],
                  ['Laikas', form.time],
                  ['Trukmė', (selectedService?.duration ?? '–') + ' min'],
                  ['Kaina', '€' + (selectedService?.price ?? '–')],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'contents' }}>
                    <dt style={{ color: theme.c.slate }}>{label}</dt>
                    <dd style={{ margin: 0, fontWeight: 600 }}>{value}</dd>
                  </div>
                ))}
              </dl>
              {!isPatient && (
                <p style={{ marginTop: 24 }}>
                  Norėdami patvirtinti vizitą, prisijunkite arba sukurkite paciento paskyrą. Jūsų
                  pasirinkimai bus išsaugoti.
                </p>
              )}
            </>
          )}
          {step === 5 && confirmation && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Check size={48} color={theme.c.sage} style={{ margin: '0 auto 20px' }} />
              <h2>Vizitas užregistruotas</h2>
              <p style={{ margin: '16px 0' }}>
                Rezervacijos numeris: <strong>#{confirmation.id}</strong>
                <br />
                {confirmation.date} · {confirmation.time} · {confirmation.duration} min
                {(confirmation.specialist?.name || (!anySpecialist && selectedSpecialist)) && (
                  <>
                    <br />
                    Specialistas:{' '}
                    <strong>{confirmation.specialist?.name || selectedSpecialist.name}</strong>
                    {confirmation.autoAssigned && ' (parinktas automatiškai)'}
                  </>
                )}
              </p>
              <Btn
                icon={<Calendar size={16} />}
                onClick={() => {
                  setConfirmation(null);
                  setForm({ ...EMPTY });
                  setStep(1);
                }}
              >
                Naujas vizitas
              </Btn>
              {!embedded && (
                <p style={{ marginTop: 20 }}>
                  <Btn variant="ghost" onClick={() => navigate('/paskyra')}>
                    Mano vizitai
                  </Btn>
                </p>
              )}
            </div>
          )}
          {error && (
            <p role="alert" style={{ color: theme.c.err, marginTop: 20 }}>
              {error}
            </p>
          )}
          {step < 5 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                marginTop: 28,
                paddingTop: 20,
                borderTop: '1px solid ' + theme.c.border,
              }}
            >
              {step > 1 ? (
                <Btn
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    setError('');
                    setStep((s) => s - 1);
                  }}
                  icon={<ChevronLeft size={16} />}
                >
                  Atgal
                </Btn>
              ) : (
                <span />
              )}
              {step < 4 ? (
                <Btn
                  onClick={next}
                  disabled={
                    serviceLoading ||
                    Boolean(serviceError) ||
                    (step === 3 && (slotLoading || Boolean(slotError)))
                  }
                >
                  Toliau <ChevronRight size={16} />
                </Btn>
              ) : (
                <Btn
                  variant="coral"
                  onClick={submit}
                  disabled={busy || serviceLoading || slotLoading}
                >
                  {busy
                    ? 'Registruojama…'
                    : isPatient
                      ? 'Patvirtinti vizitą'
                      : 'Prisijungti ir tęsti'}
                </Btn>
              )}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
