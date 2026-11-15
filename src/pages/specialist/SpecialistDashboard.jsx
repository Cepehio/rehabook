/**
 * Specialisto zona (/specialistas) su skirtukais:
 *  overview - artimiausi vizitai ir rodikliai, schedule - savaites grafikas, calendar - react-big-calendar,
 *  visits - mano vizitu sarasas su aprasu (VisitDetail), analytics - tendencija, diagnozes, uzimtumas,
 *  settings - slaptazodzio keitimas (reikia dabartinio slaptazodzio ir licencijos).
 * Visi skaiciavimai (savaites grafikas, diagnoziu pasiskirstymas, 4 savaiciu tendencija, uzimtumas)
 * atliekami is specialistui priskirtu vizitu (myV), kuriuos App.jsx uzkrauna is API.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Calendar,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Percent,
  Users,
  Activity,
  LogOut,
  BarChart3,
  Clipboard,
  Settings,
  Save,
  Lock,
  Key,
  AlertCircle,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  PieChart as RPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { lt } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import theme from '@/styles/theme';
import { Badge, Btn, Card, Input, Avatar, StatCard, StatusBadge, Modal } from '@/components/ui';
import { authService } from '@/services/api';
import { specialistPasswordSchema } from '@/utils/validation';
import { TIME_SLOTS, LT_DAYS, LT_MONTHS, PIE_COLORS } from '@/utils/constants';
import { useIsMobile } from '@/utils/useMediaQuery';
import VisitDetail from './VisitDetail';

// Vizito statusų spalvos kalendoriaus įvykiams
const STATUS_COLORS = {
  laukiamas: theme.c.gold,
  patvirtintas: theme.c.sage,
  įvykęs: theme.c.ok,
  atšauktas: theme.c.err,
};

// react-big-calendar lokalizatorius (lietuvių k. per date-fns)
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { lt },
});
const calMessages = {
  week: 'Savaitė',
  work_week: 'Darbo savaitė',
  day: 'Diena',
  month: 'Mėnuo',
  previous: 'Atgal',
  next: 'Pirmyn',
  today: 'Šiandien',
  agenda: 'Darbotvarkė',
  date: 'Data',
  time: 'Laikas',
  event: 'Vizitas',
  noEventsInRange: 'Šiuo laikotarpiu vizitų nėra.',
  showMore: (t) => `+ dar ${t}`,
};

function SpecDash({
  specialist,
  visits,
  patients,
  onUpdateVisit,
  onLogout,
}) {
  const [tab, setTab] = useState('overview');
  const [selVisit, setSelVisit] = useState(null);
  const [calVisit, setCalVisit] = useState(null);
  // Siaurame ekrane kalendorius pradeda nuo dienos rodinio (savaitė netelpa)
  const isMobile = useIsMobile();
  // Tik man priskirti vizitai; is ju skaiciuojami visi rodikliai zemiau.
  const myV = visits.filter((v) => v.specialistId === specialist.id);
  const now = new Date().toISOString().split('T')[0];
  const upcoming = myV.filter(
    (v) => v.date >= now && v.status !== 'atšauktas' && v.status !== 'įvykęs'
  );
  const completed = myV.filter((v) => v.status === 'įvykęs');
  // Einamoji savaite nuo pirmadienio (6 darbo dienos) savaites grafikui ir uzimtumui.
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay() + 1);
  const weekDays = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(thisWeekStart);
    d.setDate(thisWeekStart.getDate() + i);
    return d;
  });
  const weekSch = weekDays.map((d) => {
    const ds = d.toISOString().split('T')[0];
    return { date: d, visits: myV.filter((v) => v.date === ds) };
  });
  // Diagnoziu pasiskirstymas skritulinei diagramai: sutrumpintas pavadinimas -> vizitu skaicius, TOP 6.
  const diagCounts = {};
  myV.forEach((v) => {
    if (!v.diagnosis) return;
    const sh = v.diagnosis.split('(')[0].trim().slice(0, 28);
    diagCounts[sh] = (diagCounts[sh] || 0) + 1;
  });
  const diagData = Object.entries(diagCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  // 4 paskutiniu savaiciu vizitu skaicius tendencijos diagramai.
  const trendData = Array.from({ length: 4 }, (_, i) => {
    const ws = new Date();
    ws.setDate(ws.getDate() - (3 - i) * 7 - ws.getDay() + 1);
    const we = new Date(ws);
    we.setDate(ws.getDate() + 6);
    const c = myV.filter((v) => {
      const vd = new Date(v.date);
      return vd >= ws && vd <= we;
    }).length;
    return { name: ws.getDate() + '.' + String(ws.getMonth() + 1).padStart(2, '0'), vizitai: c };
  });
  // Uzimtumas procentais: sios savaites vizitai / visi galimi laikai per 6 dienas.
  const totalSlots = 6 * TIME_SLOTS.length;
  const thisWV = weekSch.reduce((a, d) => a + d.visits.length, 0);
  const occ = totalSlots > 0 ? Math.round((thisWV / totalSlots) * 100) : 0;

  // Kalendoriaus įvykiai iš mano vizitų (data+laikas -> Date, kad nepriklausytų nuo laiko juostos)
  const calEvents = myV
    .map((v) => {
      const [Y, Mo, D] = (v.date || '').split('-').map(Number);
      const [h, m] = (v.time || '0:0').split(':').map(Number);
      const start = new Date(Y, (Mo || 1) - 1, D || 1, h || 0, m || 0);
      const end = new Date(start);
      end.setMinutes(start.getMinutes() + v.duration);
      return { id: v.id, title: `${v.time} ${v.service}`, start, end, resource: v };
    })
    .filter((e) => !Number.isNaN(e.start.getTime()));
  const eventPropGetter = (event) => ({
    style: {
      backgroundColor: STATUS_COLORS[event.resource.status] || theme.c.sage,
      borderRadius: 6,
      border: 'none',
      color: 'white',
      fontSize: 12,
      padding: '1px 4px',
    },
  });

  // ─── Slaptažodžio keitimas (react-hook-form + zod) ───
  const [pwOk, setPwOk] = useState(false);
  const [pwErr, setPwErr] = useState('');
  const pwForm = useForm({
    resolver: zodResolver(specialistPasswordSchema),
    defaultValues: { license: '', currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  // Slaptazodzio keitimas per API; po sekmes serveris nutraukia kitas sesijas (tokenVersion).
  const changePw = async (data) => {
    setPwErr('');
    setPwOk(false);
    try {
      await authService.changeSpecialistPassword({
        license: data.license,
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setPwOk(true);
      pwForm.reset({ license: '', currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) {
      setPwErr(e.message || 'Nepavyko pakeisti slaptažodžio.');
    }
  };

  const sI = [
    { id: 'overview', l: 'Apžvalga', ic: BarChart3 },
    { id: 'schedule', l: 'Grafikas', ic: Calendar },
    { id: 'calendar', l: 'Kalendorius', ic: CalendarDays },
    { id: 'visits', l: 'Vizitai', ic: Clipboard },
    { id: 'analytics', l: 'Analitika', ic: PieChartIcon },
    { id: 'settings', l: 'Nustatymai', ic: Settings },
  ];

  return (
    <div
      className="rb-dash"
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: theme.c.cream,
        fontFamily: theme.f.b,
      }}
    >
      <aside
        className="rb-dash-aside"
        style={{
          width: 240,
          background: 'white',
          borderRight: `1px solid ${theme.c.border}`,
          padding: '24px 0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div className="rb-dash-brand" style={{ padding: '0 20px', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
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
            <div>
              <span style={{ fontFamily: theme.f.d, fontSize: 16, fontWeight: 600 }}>RehaBook</span>
              <div style={{ fontSize: 11, color: theme.c.slate }}>Specialistas</div>
            </div>
          </div>
          <div
            className="rb-dash-user"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              background: theme.c.sagePl + '40',
              borderRadius: theme.r.md,
            }}
          >
            <Avatar initials={specialist.photo} size={36} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{specialist.name}</div>
              <div style={{ fontSize: 11, color: theme.c.sage }}>{specialist.title}</div>
            </div>
          </div>
        </div>
        <nav className="rb-dash-nav" style={{ flex: 1 }}>
          {sI.map((it) => {
            const Ic = it.ic;
            return (
              <button
                key={it.id}
                className={'rb-dash-link' + (tab === it.id ? ' is-active' : '')}
                onClick={() => setTab(it.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 20px',
                  border: 'none',
                  background: tab === it.id ? theme.c.sagePl + '60' : 'transparent',
                  color: tab === it.id ? theme.c.sageDk : theme.c.slate,
                  fontSize: 14,
                  fontWeight: tab === it.id ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: theme.f.b,
                  textAlign: 'left',
                  borderLeft: tab === it.id ? `3px solid ${theme.c.sage}` : '3px solid transparent',
                }}
              >
                <Ic size={18} />
                {it.l}
              </button>
            );
          })}
        </nav>
        <button
          className="rb-dash-logout"
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 20px',
            border: 'none',
            background: 'transparent',
            color: theme.c.slate,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: theme.f.b,
          }}
        >
          <LogOut size={18} />
          Atsijungti
        </button>
      </aside>
      <main className="rb-dash-main" style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
        {tab === 'overview' && (
          <div>
            <h2 style={{ fontFamily: theme.f.d, fontSize: 26, fontWeight: 600, marginBottom: 24 }}>
              Sveiki, {specialist.name.split(' ')[0]}!
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
                gap: 14,
                marginBottom: 28,
              }}
            >
              <StatCard
                label="Artimiausi"
                value={upcoming.length}
                icon={Calendar}
                color={theme.c.sage}
              />
              <StatCard label="Įvykę" value={completed.length} icon={Check} color={theme.c.ok} />
              <StatCard label="Užimtumas" value={occ + '%'} icon={Percent} color={theme.c.coral} />
              <StatCard
                label="Pacientai"
                value={[...new Set(myV.map((v) => v.patientId))].length}
                icon={Users}
                color={theme.c.gold}
              />
            </div>
            <div className="rb-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Card hover={false}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>
                  Tendencija (4 sav.)
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.c.border} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke={theme.c.slate} />
                    <YAxis tick={{ fontSize: 12 }} stroke={theme.c.slate} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="vizitai" fill={theme.c.sage} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card hover={false}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Diagnozės</h3>
                {diagData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={140}>
                      <RPie>
                        <Pie
                          data={diagData}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={60}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {diagData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RPie>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                      {diagData.map((d, i) => (
                        <span
                          key={i}
                          style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: PIE_COLORS[i % PIE_COLORS.length],
                              display: 'inline-block',
                            }}
                          />
                          {d.name}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p style={{ color: theme.c.slate, textAlign: 'center', padding: 30 }}>Nėra</p>
                )}
              </Card>
            </div>
          </div>
        )}
        {tab === 'schedule' && (
          <div>
            <h2 style={{ fontFamily: theme.f.d, fontSize: 26, fontWeight: 600, marginBottom: 24 }}>
              Savaitinis grafikas
            </h2>
            <div
              className="rb-week-grid"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10 }}
            >
              {weekSch.map((day, i) => (
                <Card key={i} hover={false} style={{ padding: 16, minHeight: 200 }}>
                  <div
                    style={{
                      textAlign: 'center',
                      marginBottom: 12,
                      paddingBottom: 10,
                      borderBottom: `1px solid ${theme.c.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: theme.c.sage,
                        textTransform: 'uppercase',
                      }}
                    >
                      {LT_DAYS[day.date.getDay()]}
                    </div>
                    <div style={{ fontFamily: theme.f.d, fontSize: 22, fontWeight: 700 }}>
                      {day.date.getDate()}
                    </div>
                    <div style={{ fontSize: 11, color: theme.c.slate }}>
                      {LT_MONTHS[day.date.getMonth()]}
                    </div>
                  </div>
                  {day.visits.length === 0 ? (
                    <p
                      style={{
                        fontSize: 12,
                        color: theme.c.slate,
                        textAlign: 'center',
                        marginTop: 8,
                      }}
                    >
                      Laisva
                    </p>
                  ) : (
                    day.visits.map((v) => {
                      const pt = patients.find((p) => p.id === v.patientId);
                      return (
                        <div
                          key={v.id}
                          onClick={() => {
                            setSelVisit(v);
                            setTab('visits');
                          }}
                          style={{
                            background: theme.c.sagePl + '60',
                            borderRadius: theme.r.sm,
                            padding: '6px 8px',
                            marginBottom: 4,
                            cursor: 'pointer',
                            borderLeft: `3px solid ${theme.c.sage}`,
                            fontSize: 12,
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{v.time}</div>
                          <div style={{ color: theme.c.charLt }}>
                            {pt ? pt.name + ' ' + pt.surname[0] + '.' : '—'}
                          </div>
                        </div>
                      );
                    })
                  )}
                </Card>
              ))}
            </div>
            <div
              style={{
                marginTop: 20,
                padding: 16,
                background: theme.c.sagePl + '30',
                borderRadius: theme.r.md,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Percent size={20} color={theme.c.sage} />
              <span style={{ fontWeight: 600 }}>Užimtumas: </span>
              <span
                style={{
                  fontFamily: theme.f.d,
                  fontSize: 20,
                  fontWeight: 700,
                  color: theme.c.sage,
                }}
              >
                {occ}%
              </span>
            </div>
          </div>
        )}
        {tab === 'calendar' && (
          <div>
            <h2 style={{ fontFamily: theme.f.d, fontSize: 26, fontWeight: 600, marginBottom: 24 }}>
              Kalendorius
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
              {Object.entries(STATUS_COLORS).map(([s, c]) => (
                <span
                  key={s}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: theme.c.charLt,
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      background: c,
                      display: 'inline-block',
                    }}
                  />
                  {s}
                </span>
              ))}
            </div>
            <Card hover={false} style={{ padding: 16 }}>
              <div className="rb-calendar" style={{ height: 620 }}>
                <BigCalendar
                  key={isMobile ? 'mobile' : 'desktop'}
                  localizer={localizer}
                  events={calEvents}
                  startAccessor="start"
                  endAccessor="end"
                  defaultView={isMobile ? 'day' : 'week'}
                  views={['month', 'week', 'day', 'agenda']}
                  culture="lt"
                  messages={calMessages}
                  eventPropGetter={eventPropGetter}
                  onSelectEvent={(e) => setCalVisit(e.resource)}
                  min={new Date(0, 0, 0, 8, 0)}
                  max={new Date(0, 0, 0, 18, 0)}
                  popup
                  style={{ height: '100%', fontFamily: theme.f.b }}
                />
              </div>
            </Card>
          </div>
        )}
        {tab === 'visits' && (
          <div>
            <h2 style={{ fontFamily: theme.f.d, fontSize: 26, fontWeight: 600, marginBottom: 20 }}>
              Vizitai
            </h2>
            {selVisit ? (
              <div>
                <Btn
                  variant="ghost"
                  onClick={() => setSelVisit(null)}
                  icon={<ChevronLeft size={16} />}
                  style={{ marginBottom: 16 }}
                >
                  Grįžti
                </Btn>
                <VisitDetail
                  key={selVisit.id}
                  visit={selVisit}
                  patient={patients.find((p) => p.id === selVisit.patientId)}
                  onUpdate={onUpdateVisit}
                />
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {myV.map((v, i) => {
                  const pt = patients.find((p) => p.id === v.patientId);
                  return (
                    <Card
                      key={v.id}
                      className="rb-visit-row"
                      onClick={() => setSelVisit(v)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '14px 18px',
                        animation: `slideR 0.3s ease ${i * 0.03}s forwards`,
                        opacity: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 54,
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
                            fontSize: 18,
                            fontWeight: 700,
                            color: theme.c.sage,
                            lineHeight: 1,
                          }}
                        >
                          {new Date(v.date).getDate()}
                        </span>
                        <span style={{ fontSize: 10, color: theme.c.slate }}>
                          {LT_MONTHS[new Date(v.date).getMonth()].slice(0, 3)}
                        </span>
                      </div>
                      <div className="rb-visit-info" style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                          {v.service}
                        </div>
                        <div style={{ fontSize: 12, color: theme.c.slate }}>
                          {pt ? pt.name + ' ' + pt.surname : '—'} • {v.time}
                        </div>
                      </div>
                      <StatusBadge status={v.status} />
                      <span
                        style={{
                          fontFamily: theme.f.d,
                          fontSize: 16,
                          fontWeight: 700,
                          color: theme.c.sage,
                        }}
                      >
                        €{v.price}
                      </span>
                      <ChevronRight size={16} color={theme.c.slate} />
                    </Card>
                  );
                })}
                {myV.length === 0 && (
                  <Card hover={false} style={{ textAlign: 'center', padding: 48 }}>
                    <Calendar size={44} color={theme.c.sageLt} style={{ margin: '0 auto 14px' }} />
                    <h3 style={{ fontFamily: theme.f.d, fontSize: 18, fontWeight: 600 }}>
                      Vizitų nėra
                    </h3>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
        {tab === 'analytics' && (
          <div>
            <h2 style={{ fontFamily: theme.f.d, fontSize: 26, fontWeight: 600, marginBottom: 24 }}>
              Analitika
            </h2>
            <div className="rb-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Card hover={false}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Tendencija</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.c.border} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke={theme.c.slate} />
                    <YAxis tick={{ fontSize: 12 }} stroke={theme.c.slate} allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="vizitai"
                      stroke={theme.c.sage}
                      strokeWidth={3}
                      dot={{ r: 5, fill: theme.c.sage }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
              <Card hover={false}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Diagnozės</h3>
                {diagData.length > 0 ? (
                  <>
                    {/* 200 px aukštis: reikšmių užrašai brėžiami 20 px už išorinio spindulio (68 px),
                        todėl viršuje ir apačioje jiems reikia bent 96 px nuo centro. */}
                    <ResponsiveContainer width="100%" height={200}>
                      <RPie>
                        <Pie
                          data={diagData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={68}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ value }) => value}
                        >
                          {diagData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RPie>
                    </ResponsiveContainer>
                    <div style={{ display: 'grid', gap: 3, marginTop: 6 }}>
                      {diagData.map((d, i) => (
                        <div
                          key={i}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                        >
                          <span
                            style={{
                              width: 9,
                              height: 9,
                              borderRadius: '50%',
                              background: PIE_COLORS[i % PIE_COLORS.length],
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ flex: 1 }}>{d.name}</span>
                          <span style={{ fontWeight: 600 }}>{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p style={{ color: theme.c.slate, textAlign: 'center', padding: 30 }}>Nėra</p>
                )}
              </Card>
            </div>
            <Card hover={false} style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Užimtumas</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ position: 'relative', width: 120, height: 120 }}>
                  <svg viewBox="0 0 120 120" width={120} height={120}>
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke={theme.c.creamDk}
                      strokeWidth="10"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke={theme.c.sage}
                      strokeWidth="10"
                      strokeDasharray={`${occ * 3.14} ${314 - occ * 3.14}`}
                      strokeDashoffset="78.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: theme.f.d,
                      fontSize: 28,
                      fontWeight: 700,
                      color: theme.c.sage,
                    }}
                  >
                    {occ}%
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 14, marginBottom: 8 }}>Savaitės užimtumas</p>
                  <p style={{ fontSize: 13, color: theme.c.slate }}>
                    {thisWV} iš {totalSlots} tarpų
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
        {tab === 'settings' && (
          <div>
            <h2 style={{ fontFamily: theme.f.d, fontSize: 26, fontWeight: 600, marginBottom: 24 }}>
              Nustatymai
            </h2>
            <Card hover={false} style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Profilis</h3>
              <div
                className="rb-grid-2"
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}
              >
                {[
                  ['Vardas', specialist.name],
                  ['Pareigos', specialist.title],
                  ['El. paštas', specialist.email],
                  ['Telefonas', specialist.phone],
                  ['Licencija', specialist.license],
                  ['Patirtis', specialist.experience + ' m.'],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      padding: '10px 14px',
                      background: theme.c.creamDk,
                      borderRadius: theme.r.md,
                    }}
                  >
                    <div style={{ fontSize: 12, color: theme.c.slate, marginBottom: 2 }}>{k}</div>
                    <div style={{ fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card hover={false}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>Slaptažodžio keitimas</h3>
                <Badge variant="coral">Reikia licencijos nr.</Badge>
              </div>
              {pwOk && (
                <div
                  style={{
                    background: theme.c.ok + '15',
                    borderRadius: theme.r.md,
                    padding: '10px 14px',
                    marginBottom: 14,
                    color: theme.c.ok,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Check size={16} />
                  Pakeista!
                </div>
              )}
              {pwErr && (
                <div
                  style={{
                    background: theme.c.err + '10',
                    borderRadius: theme.r.md,
                    padding: '10px 14px',
                    marginBottom: 14,
                    color: theme.c.err,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertCircle size={16} />
                  {pwErr}
                </div>
              )}
              <form onSubmit={pwForm.handleSubmit(changePw)} noValidate>
                <Input
                  label="Licencijos nr."
                  icon={Key}
                  required
                  error={pwForm.formState.errors.license?.message}
                  {...pwForm.register('license')}
                />
                <div
                  className="rb-grid-2"
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}
                >
                  <Input
                    label="Dabartinis slaptažodis"
                    type="password"
                    autoComplete="current-password"
                    icon={Lock}
                    required
                    error={pwForm.formState.errors.currentPassword?.message}
                    {...pwForm.register('currentPassword')}
                  />
                  <Input
                    label="Naujas slaptažodis"
                    type="password"
                    icon={Lock}
                    error={pwForm.formState.errors.newPassword?.message}
                    {...pwForm.register('newPassword')}
                  />
                  <Input
                    label="Pakartokite"
                    type="password"
                    icon={Lock}
                    error={pwForm.formState.errors.confirmPassword?.message}
                    {...pwForm.register('confirmPassword')}
                  />
                </div>
                <Btn
                  variant="primary"
                  type="submit"
                  icon={<Save size={16} />}
                  disabled={pwForm.formState.isSubmitting}
                >
                  Pakeisti
                </Btn>
              </form>
            </Card>
          </div>
        )}
      </main>

      {/* Kalendoriaus vizito modalas */}
      <Modal open={!!calVisit} onClose={() => setCalVisit(null)} title="Vizitas" wide>
        {calVisit && (
          <VisitDetail
            key={calVisit.id}
            visit={calVisit}
            patient={patients.find((p) => p.id === calVisit.patientId)}
            onUpdate={onUpdateVisit}
            inModal
          />
        )}
      </Modal>
    </div>
  );
}

export default SpecDash;
