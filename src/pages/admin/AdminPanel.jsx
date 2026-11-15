/**
 * Administratoriaus zona su penkiais skirtukais:
 *  overview - suvestines ir diagramos (verte pagal menesius, vizitai pagal busenas, uzimtumas, TOP paslaugos),
 *  specialists - specialistu CRUD ir priemimo ijungimas/isjungimas,
 *  patients - pacientu sarasas su paieska, CRUD,
 *  visits - visu vizitu lentele,
 *  services - paslaugu CRUD, aktyvumo keitimas, salinimas tik be vizitu.
 * Formos: react-hook-form + zod schemos is utils/validation.js. Duomenys ir veiksmai (props) ateina is App.jsx,
 * kuris kreipiasi i API ir po kiekvieno veiksmo atnaujina sarasus.
 */
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Calendar,
  Heart,
  Users,
  TrendingUp,
  Activity,
  LogOut,
  Plus,
  Trash2,
  Edit3,
  UserPlus,
  Save,
  BarChart3,
  Hash,
  Award,
  Mail,
  Phone,
  Briefcase,
  User,
  ClipboardList,
  Clock,
  Euro,
  Tag,
  Power,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import theme from '@/styles/theme';
import { Badge, Btn, Input, Avatar, Modal, StatusBadge, useToast } from '@/components/ui';
import { statsService } from '@/services/api';
import { specialistAdminSchema, patientAdminSchema, serviceAdminSchema } from '@/utils/validation';
import { PIE_COLORS } from '@/utils/constants';

// Vizito statusų spalvos skritulinei diagramai
const STATUS_COLORS = {
  laukiamas: theme.c.gold,
  patvirtintas: theme.c.sage,
  įvykęs: theme.c.ok,
  atšauktas: theme.c.err,
};

function AdminPanel({
  specialists,
  onSaveSpecialist,
  onDeleteSpecialist,
  patients,
  onSavePatient,
  onDeletePatient,
  services = [],
  onSaveService,
  onDeleteService,
  onToggleService,
  visits,
  onLogout,
}) {
  const toast = useToast();
  // Aktyvus skirtukas ir redagavimo busenos (null - kuriamas naujas irasas, objektas - redaguojamas esamas).
  const [tab, setTab] = useState('overview');
  const [editSpec, setEditSpec] = useState(null);
  const [editPat, setEditPat] = useState(null);
  const [specSearch, setSpecSearch] = useState('');
  const [patSearch, setPatSearch] = useState('');
  const [specModal, setSpecModal] = useState(false);
  const [patModal, setPatModal] = useState(false);
  const [specAvailable, setSpecAvailable] = useState(true);

  // ─── Admin analitika ───
  // Suvestines (GET /api/stats/admin) uzkraunamos viena karta atidarius zona.
  const [stats, setStats] = useState(null);
  useEffect(() => {
    statsService
      .getAdmin()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  // ─── Formos su react-hook-form + zod (klaidos po laukais) ───
  // Resolveris skaito isEdit per ref, kad redaguojant slaptažodis būtų neprivalomas.
  const specIsEdit = useRef(false);
  const specForm = useForm({
    resolver: (v, c, o) => zodResolver(specialistAdminSchema(specIsEdit.current))(v, c, o),
    defaultValues: {
      name: '',
      title: '',
      license: '',
      experience: '',
      email: '',
      phone: '',
      specialties: '',
    },
  });
  const patIsEdit = useRef(false);
  const patForm = useForm({
    resolver: (v, c, o) => zodResolver(patientAdminSchema(patIsEdit.current))(v, c, o),
    defaultValues: { name: '', surname: '', email: '', phone: '', birthDate: '' },
  });
  const sErr = specForm.formState.errors;
  const pErr = patForm.formState.errors;

  // Specialistu modalas: atidarymas kurti/redaguoti, uzdarymas ir issaugojimas per App perduotas funkcijas.
  const openAddSpec = () => {
    specIsEdit.current = false;
    setEditSpec(null);
    setSpecAvailable(true);
    specForm.reset({
      name: '',
      title: '',
      license: '',
      experience: '',
      email: '',
      phone: '',
      specialties: '',
    });
    setSpecModal(true);
  };
  const openEditSpec = (sp) => {
    specIsEdit.current = true;
    setEditSpec(sp);
    setSpecAvailable(sp.available);
    specForm.reset({
      name: sp.name || '',
      title: sp.title || '',
      license: sp.license || '',
      experience: sp.experience ?? '',
      email: sp.email || '',
      phone: sp.phone || '',
      specialties: Array.isArray(sp.specialties) ? sp.specialties.join(', ') : sp.specialties || '',
    });
    setSpecModal(true);
  };
  const closeSpec = () => {
    setSpecModal(false);
    setEditSpec(null);
  };
  const saveSpec = async (data) => {
    const payload = {
      name: data.name,
      title: data.title,
      license: data.license,
      experience: Number(data.experience) || 0,
      email: data.email,
      phone: data.phone,
      specialties: data.specialties,
      available: specAvailable,
    };
    if (!editSpec) payload.password = 'spec1234'; // numatytas slaptažodis naujam (kaip iki šiol)
    try {
      await onSaveSpecialist(payload, editSpec ? editSpec.id : null);
      closeSpec();
    } catch (e) {
      toast.error(e.message || 'Nepavyko išsaugoti specialisto.');
    }
  };

  // Pacientu modalas - ta pati schema kaip specialistu.
  const openAddPat = () => {
    patIsEdit.current = false;
    setEditPat(null);
    patForm.reset({ name: '', surname: '', email: '', phone: '', birthDate: '' });
    setPatModal(true);
  };
  const openEditPat = (pt) => {
    patIsEdit.current = true;
    setEditPat(pt);
    patForm.reset({
      name: pt.name || '',
      surname: pt.surname || '',
      email: pt.email || '',
      phone: pt.phone || '',
      birthDate: pt.birthDate || '',
    });
    setPatModal(true);
  };
  const closePat = () => {
    setPatModal(false);
    setEditPat(null);
  };
  const savePat = async (data) => {
    const payload = {
      name: data.name,
      surname: data.surname,
      email: data.email,
      phone: data.phone,
      birthDate: data.birthDate,
    };
    if (!editPat) payload.password = 'pac12345'; // numatytas slaptažodis naujam (kaip iki šiol)
    try {
      await onSavePatient(payload, editPat ? editPat.id : null);
      closePat();
    } catch (e) {
      toast.error(e.message || 'Nepavyko išsaugoti paciento.');
    }
  };

  // ─── Paslaugų katalogas (kainos, trukmės, aktyvumas) ───
  // Paslaugu katalogas: kurimas, redagavimas, aktyvumo keitimas; salinimas leidziamas tik paslaugai be vizitu (API grazina 409).
  const [editService, setEditService] = useState(null);
  const [svcSearch, setSvcSearch] = useState('');
  const [svcModal, setSvcModal] = useState(false);
  const [svcActive, setSvcActive] = useState(true);
  const svcDefaults = { name: '', category: '', description: '', price: '', duration: '' };
  const svcForm = useForm({
    resolver: zodResolver(serviceAdminSchema),
    defaultValues: svcDefaults,
  });
  const vErr = svcForm.formState.errors;
  const categories = [...new Set(services.map((s) => s.category))];
  const openAddSvc = () => {
    setEditService(null);
    setSvcActive(true);
    svcForm.reset(svcDefaults);
    setSvcModal(true);
  };
  const openEditSvc = (sv) => {
    setEditService(sv);
    setSvcActive(sv.active !== false);
    svcForm.reset({
      name: sv.name || '',
      category: sv.category || '',
      description: sv.description || '',
      price: String(sv.price ?? ''),
      duration: String(sv.duration ?? ''),
    });
    setSvcModal(true);
  };
  const closeSvc = () => {
    setSvcModal(false);
    setEditService(null);
  };
  const saveSvc = async (data) => {
    const payload = {
      name: data.name,
      category: data.category,
      description: data.description || '',
      price: Number(data.price),
      duration: Number(data.duration),
      active: svcActive,
    };
    try {
      await onSaveService(payload, editService ? editService.id : null);
      closeSvc();
    } catch (e) {
      toast.error(e.message || 'Nepavyko išsaugoti paslaugos.');
    }
  };
  // Paieskos filtrai sarasams (tik kliento puseje, pagal pavadinima).
  const fServices = services.filter((sv) =>
    (sv.name + ' ' + sv.category).toLowerCase().includes(svcSearch.toLowerCase())
  );

  const fSpecs = specialists.filter((s) => s.name.toLowerCase().includes(specSearch.toLowerCase()));
  const fPats = patients.filter((p) =>
    (p.name + ' ' + p.surname).toLowerCase().includes(patSearch.toLowerCase())
  );
  // Sonines (siaurame ekrane - virsutines) navigacijos punktai.
  const sideItems = [
    { id: 'overview', l: 'Apžvalga', ic: BarChart3 },
    { id: 'specialists', l: 'Specialistai', ic: Users },
    { id: 'patients', l: 'Pacientai', ic: Heart },
    { id: 'visits', l: 'Vizitai', ic: Calendar },
    { id: 'services', l: 'Paslaugos', ic: ClipboardList },
  ];

  return (
    <div
      className="rb-dash"
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: theme.c.adminBg,
        fontFamily: theme.f.b,
      }}
    >
      <aside
        className="rb-dash-aside rb-dash-aside--admin"
        style={{
          width: 240,
          background: theme.c.adminCard,
          borderRight: `1px solid ${theme.c.adminBorder}`,
          padding: '24px 0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div
          className="rb-dash-brand"
          style={{
            padding: '0 20px',
            marginBottom: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
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
            <span style={{ fontFamily: theme.f.d, fontSize: 16, fontWeight: 600, color: 'white' }}>
              RehaBook
            </span>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Administratorius</div>
          </div>
        </div>
        <nav className="rb-dash-nav" style={{ flex: 1 }}>
          {sideItems.map((it) => {
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
                  background: tab === it.id ? 'rgba(108,142,239,0.12)' : 'transparent',
                  color: tab === it.id ? '#6C8EEF' : 'rgba(255,255,255,0.55)',
                  fontSize: 14,
                  fontWeight: tab === it.id ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: theme.f.b,
                  textAlign: 'left',
                  borderLeft: tab === it.id ? '3px solid #6C8EEF' : '3px solid transparent',
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
            color: 'rgba(255,255,255,0.4)',
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: theme.f.b,
          }}
        >
          <LogOut size={18} />
          Atsijungti
        </button>
      </aside>
      <main
        className="rb-dash-main"
        style={{ flex: 1, padding: 28, overflowY: 'auto', color: 'white' }}
      >
        {tab === 'overview' && (
          <div>
            <h2 style={{ fontFamily: theme.f.d, fontSize: 26, fontWeight: 600, marginBottom: 24 }}>
              Valdymo skydelis
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
                gap: 16,
                marginBottom: 32,
              }}
            >
              {[
                { l: 'Specialistai', v: specialists.length, ic: Users, cl: '#6C8EEF' },
                { l: 'Pacientai', v: patients.length, ic: Heart, cl: theme.c.coral },
                {
                  l: 'Vizitai (iš viso)',
                  v: stats?.totals?.visits ?? visits.length,
                  ic: Calendar,
                  cl: theme.c.sage,
                },
                {
                  l: 'Vizitų vertė',
                  v:
                    '€' +
                    (stats?.totals?.revenue ??
                      visits
                        .filter((v) => v.status !== 'atšauktas')
                        .reduce((a, v) => a + v.price, 0)),
                  ic: TrendingUp,
                  cl: theme.c.gold,
                },
              ].map((x, i) => {
                const Ic = x.ic;
                return (
                  <div
                    key={i}
                    style={{
                      background: theme.c.adminCard,
                      border: `1px solid ${theme.c.adminBorder}`,
                      borderRadius: theme.r.lg,
                      padding: 20,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: theme.r.md,
                        background: x.cl + '18',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: x.cl,
                      }}
                    >
                      <Ic size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: theme.f.d }}>
                        {x.v}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{x.l}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ═══ Analitikos diagramos ═══ */}
            <div
              className="rb-grid-2"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}
            >
              <div
                style={{
                  background: theme.c.adminCard,
                  border: `1px solid ${theme.c.adminBorder}`,
                  borderRadius: theme.r.lg,
                  padding: 24,
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                  Neatšauktų vizitų vertė pagal mėnesį
                </h3>
                {stats?.revenueByMonth?.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={stats.revenueByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.c.adminBorder} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.5)' }}
                        stroke={theme.c.adminBorder}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.5)' }}
                        stroke={theme.c.adminBorder}
                      />
                      <Tooltip
                        contentStyle={{
                          background: theme.c.adminCard,
                          border: `1px solid ${theme.c.adminBorder}`,
                          borderRadius: 8,
                          color: 'white',
                        }}
                        itemStyle={{ color: 'white' }}
                        labelStyle={{ color: 'white' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        name="Vizitų vertė (€)"
                        stroke="#6C8EEF"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#6C8EEF' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 40 }}>
                    Nėra duomenų
                  </p>
                )}
              </div>
              <div
                style={{
                  background: theme.c.adminCard,
                  border: `1px solid ${theme.c.adminBorder}`,
                  borderRadius: theme.r.lg,
                  padding: 24,
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                  Vizitai pagal statusą
                </h3>
                {stats?.visitsByStatus?.length ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <RPie>
                        <Pie
                          data={stats.visitsByStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="count"
                          nameKey="status"
                        >
                          {stats.visitsByStatus.map((s, i) => (
                            <Cell
                              key={i}
                              fill={STATUS_COLORS[s.status] || PIE_COLORS[i % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: theme.c.adminCard,
                            border: `1px solid ${theme.c.adminBorder}`,
                            borderRadius: 8,
                            color: 'white',
                          }}
                          itemStyle={{ color: 'white' }}
                          labelStyle={{ color: 'white' }}
                        />
                      </RPie>
                    </ResponsiveContainer>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 10,
                        justifyContent: 'center',
                        marginTop: 6,
                      }}
                    >
                      {stats.visitsByStatus.map((s, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            color: 'rgba(255,255,255,0.7)',
                          }}
                        >
                          <span
                            style={{
                              width: 9,
                              height: 9,
                              borderRadius: '50%',
                              background:
                                STATUS_COLORS[s.status] || PIE_COLORS[i % PIE_COLORS.length],
                              display: 'inline-block',
                            }}
                          />
                          {s.status} ({s.count})
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 40 }}>
                    Nėra duomenų
                  </p>
                )}
              </div>
            </div>
            <div
              className="rb-grid-2"
              style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}
            >
              <div
                style={{
                  background: theme.c.adminCard,
                  border: `1px solid ${theme.c.adminBorder}`,
                  borderRadius: theme.r.lg,
                  padding: 24,
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                  Specialistų užimtumas
                </h3>
                {stats?.specialistWorkload?.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.specialistWorkload}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.c.adminBorder} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }}
                        stroke={theme.c.adminBorder}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.5)' }}
                        stroke={theme.c.adminBorder}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: theme.c.adminCard,
                          border: `1px solid ${theme.c.adminBorder}`,
                          borderRadius: 8,
                          color: 'white',
                        }}
                        itemStyle={{ color: 'white' }}
                        labelStyle={{ color: 'white' }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      <Bar
                        dataKey="count"
                        name="Vizitai"
                        fill={theme.c.sage}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 40 }}>
                    Nėra duomenų
                  </p>
                )}
              </div>
              <div
                style={{
                  background: theme.c.adminCard,
                  border: `1px solid ${theme.c.adminBorder}`,
                  borderRadius: theme.r.lg,
                  padding: 24,
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Top 5 paslaugos</h3>
                <div style={{ display: 'grid', gap: 6 }}>
                  {(stats?.topServices || []).map((s, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: theme.r.md,
                      }}
                    >
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: PIE_COLORS[i % PIE_COLORS.length] + '33',
                          color: PIE_COLORS[i % PIE_COLORS.length],
                          fontSize: 12,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span style={{ flex: 1, fontSize: 13 }}>{s.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: theme.c.sage }}>
                        {s.count}
                      </span>
                    </div>
                  ))}
                  {(!stats?.topServices || stats.topServices.length === 0) && (
                    <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 30 }}>
                      Nėra duomenų
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'specialists' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <h2 style={{ fontFamily: theme.f.d, fontSize: 26, fontWeight: 600 }}>Specialistai</h2>
              <button
                onClick={openAddSpec}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 20px',
                  background: `linear-gradient(135deg,${theme.c.sage},${theme.c.sageDk})`,
                  color: 'white',
                  border: 'none',
                  borderRadius: theme.r.full,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Plus size={16} />
                Pridėti
              </button>
            </div>
            <input
              value={specSearch}
              onChange={(e) => setSpecSearch(e.target.value)}
              placeholder="Ieškoti..."
              style={{
                width: '100%',
                maxWidth: 360,
                padding: '10px 14px',
                background: '#1a1f2e',
                border: `1px solid ${theme.c.adminBorder}`,
                borderRadius: theme.r.md,
                color: 'white',
                fontSize: 14,
                fontFamily: theme.f.b,
                marginBottom: 16,
              }}
            />
            <div style={{ display: 'grid', gap: 10 }}>
              {fSpecs.map((sp) => (
                <div
                  key={sp.id}
                  className="rb-list-row"
                  style={{
                    background: theme.c.adminCard,
                    border: `1px solid ${theme.c.adminBorder}`,
                    borderRadius: theme.r.lg,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <Avatar
                    initials={sp.photo}
                    size={44}
                    available={sp.available}
                    color="linear-gradient(135deg,#6C8EEF,#4a6cd4)"
                  />
                  <div className="rb-list-info" style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{sp.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                      {sp.title} • {sp.license}
                    </div>
                  </div>
                  <Badge variant={sp.available ? 'ok' : 'coral'}>
                    {sp.available ? 'Aktyvus' : 'Neaktyvus'}
                  </Badge>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => openEditSpec(sp)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: theme.r.sm,
                        background: 'rgba(108,142,239,0.12)',
                        border: 'none',
                        color: '#6C8EEF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() =>
                        onDeleteSpecialist(sp.id).catch((e) =>
                          toast.error(e.message || 'Nepavyko pašalinti.')
                        )
                      }
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: theme.r.sm,
                        background: 'rgba(199,80,80,0.12)',
                        border: 'none',
                        color: theme.c.err,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Modal
              open={specModal}
              onClose={closeSpec}
              title={editSpec ? 'Redaguoti' : 'Naujas specialistas'}
              wide
            >
              <form onSubmit={specForm.handleSubmit(saveSpec)} noValidate>
                <div
                  className="rb-grid-2"
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}
                >
                  <Input
                    label="Vardas, Pavardė"
                    required
                    icon={User}
                    error={sErr.name?.message}
                    {...specForm.register('name')}
                  />
                  <Input
                    label="Pareigos"
                    icon={Briefcase}
                    error={sErr.title?.message}
                    {...specForm.register('title')}
                  />
                  <Input
                    label="Licencijos nr."
                    required
                    icon={Hash}
                    error={sErr.license?.message}
                    {...specForm.register('license')}
                  />
                  <Input
                    label="Patirtis"
                    type="number"
                    icon={Award}
                    error={sErr.experience?.message}
                    {...specForm.register('experience')}
                  />
                  <Input
                    label="El. paštas"
                    icon={Mail}
                    error={sErr.email?.message}
                    {...specForm.register('email')}
                  />
                  <Input
                    label="Telefonas"
                    icon={Phone}
                    error={sErr.phone?.message}
                    {...specForm.register('phone')}
                  />
                </div>
                <Input
                  label="Specializacijos (kableliu)"
                  error={sErr.specialties?.message}
                  {...specForm.register('specialties')}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <label>Aktyvus:</label>
                  <button
                    type="button"
                    onClick={() => setSpecAvailable((a) => !a)}
                    style={{
                      width: 48,
                      height: 26,
                      borderRadius: 13,
                      background: specAvailable ? theme.c.sage : theme.c.border,
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'white',
                        position: 'absolute',
                        top: 2,
                        left: specAvailable ? 24 : 2,
                        transition: 'left 0.2s',
                      }}
                    />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <Btn variant="secondary" type="button" onClick={closeSpec}>
                    Atšaukti
                  </Btn>
                  <Btn variant="primary" type="submit" icon={<Save size={16} />}>
                    {editSpec ? 'Išsaugoti' : 'Pridėti'}
                  </Btn>
                </div>
              </form>
            </Modal>
          </div>
        )}

        {tab === 'patients' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <h2 style={{ fontFamily: theme.f.d, fontSize: 26, fontWeight: 600 }}>Pacientai</h2>
              <button
                onClick={openAddPat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 20px',
                  background: `linear-gradient(135deg,${theme.c.sage},${theme.c.sageDk})`,
                  color: 'white',
                  border: 'none',
                  borderRadius: theme.r.full,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <UserPlus size={16} />
                Pridėti
              </button>
            </div>
            <input
              value={patSearch}
              onChange={(e) => setPatSearch(e.target.value)}
              placeholder="Ieškoti..."
              style={{
                width: '100%',
                maxWidth: 360,
                padding: '10px 14px',
                background: '#1a1f2e',
                border: `1px solid ${theme.c.adminBorder}`,
                borderRadius: theme.r.md,
                color: 'white',
                fontSize: 14,
                fontFamily: theme.f.b,
                marginBottom: 16,
              }}
            />
            <div style={{ display: 'grid', gap: 10 }}>
              {fPats.map((pt) => (
                <div
                  key={pt.id}
                  className="rb-list-row"
                  style={{
                    background: theme.c.adminCard,
                    border: `1px solid ${theme.c.adminBorder}`,
                    borderRadius: theme.r.lg,
                    padding: '14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <Avatar
                    initials={pt.name[0] + pt.surname[0]}
                    size={40}
                    color="linear-gradient(135deg,#D4856A,#c07050)"
                  />
                  <div className="rb-list-info" style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>
                      {pt.name} {pt.surname}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                      {pt.email} • {pt.phone}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                    Nuo {pt.registeredDate}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => openEditPat(pt)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: theme.r.sm,
                        background: 'rgba(108,142,239,0.12)',
                        border: 'none',
                        color: '#6C8EEF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() =>
                        onDeletePatient(pt.id).catch((e) =>
                          toast.error(e.message || 'Nepavyko pašalinti.')
                        )
                      }
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: theme.r.sm,
                        background: 'rgba(199,80,80,0.12)',
                        border: 'none',
                        color: theme.c.err,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Modal
              open={patModal}
              onClose={closePat}
              title={editPat ? 'Redaguoti' : 'Naujas pacientas'}
            >
              <form onSubmit={patForm.handleSubmit(savePat)} noValidate>
                <div
                  className="rb-grid-2"
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}
                >
                  <Input
                    label="Vardas"
                    required
                    icon={User}
                    error={pErr.name?.message}
                    {...patForm.register('name')}
                  />
                  <Input
                    label="Pavardė"
                    required
                    icon={User}
                    error={pErr.surname?.message}
                    {...patForm.register('surname')}
                  />
                  <Input
                    label="El. paštas"
                    icon={Mail}
                    error={pErr.email?.message}
                    {...patForm.register('email')}
                  />
                  <Input
                    label="Telefonas"
                    icon={Phone}
                    error={pErr.phone?.message}
                    {...patForm.register('phone')}
                  />
                  <Input
                    label="Gimimo data"
                    type="date"
                    error={pErr.birthDate?.message}
                    {...patForm.register('birthDate')}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <Btn variant="secondary" type="button" onClick={closePat}>
                    Atšaukti
                  </Btn>
                  <Btn variant="primary" type="submit" icon={<Save size={16} />}>
                    {editPat ? 'Išsaugoti' : 'Pridėti'}
                  </Btn>
                </div>
              </form>
            </Modal>
          </div>
        )}

        {tab === 'visits' && (
          <div>
            <h2 style={{ fontFamily: theme.f.d, fontSize: 26, fontWeight: 600, marginBottom: 20 }}>
              Visi vizitai
            </h2>
            <div
              className="rb-table-scroll"
              style={{
                background: theme.c.adminCard,
                border: `1px solid ${theme.c.adminBorder}`,
                borderRadius: theme.r.lg,
                overflow: 'hidden',
              }}
            >
              <div
                className="rb-table-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 2fr 2fr 1.2fr 1fr 1fr',
                  padding: '12px 20px',
                  borderBottom: `1px solid ${theme.c.adminBorder}`,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                }}
              >
                <span>Pacientas</span>
                <span>Paslauga</span>
                <span>Specialistas</span>
                <span>Data</span>
                <span>Statusas</span>
                <span>Kaina</span>
              </div>
              {visits.map((v) => {
                const pt = patients.find((p) => p.id === v.patientId);
                const sp = specialists.find((s) => s.id === v.specialistId);
                return (
                  <div
                    key={v.id}
                    className="rb-table-row"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 2fr 2fr 1.2fr 1fr 1fr',
                      padding: '12px 20px',
                      borderBottom: `1px solid ${theme.c.adminBorder}22`,
                      fontSize: 14,
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{pt ? pt.name + ' ' + pt.surname : '—'}</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>{v.service}</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>{sp?.name || '—'}</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {v.date} {v.time}
                    </span>
                    <StatusBadge status={v.status} />
                    <span style={{ fontWeight: 600, color: theme.c.sage }}>€{v.price}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'services' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <h2 style={{ fontFamily: theme.f.d, fontSize: 26, fontWeight: 600 }}>Paslaugos</h2>
              <button
                onClick={openAddSvc}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 20px',
                  background: `linear-gradient(135deg,${theme.c.sage},${theme.c.sageDk})`,
                  color: 'white',
                  border: 'none',
                  borderRadius: theme.r.full,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Plus size={16} />
                Pridėti
              </button>
            </div>
            <input
              value={svcSearch}
              onChange={(e) => setSvcSearch(e.target.value)}
              placeholder="Ieškoti..."
              style={{
                width: '100%',
                maxWidth: 360,
                padding: '10px 14px',
                background: '#1a1f2e',
                border: `1px solid ${theme.c.adminBorder}`,
                borderRadius: theme.r.md,
                color: 'white',
                fontSize: 14,
                fontFamily: theme.f.b,
                marginBottom: 16,
              }}
            />
            <div style={{ display: 'grid', gap: 10 }}>
              {fServices.map((sv) => (
                <div
                  key={sv.id}
                  className="rb-list-row"
                  style={{
                    background: theme.c.adminCard,
                    border: `1px solid ${theme.c.adminBorder}`,
                    borderRadius: theme.r.lg,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    opacity: sv.active ? 1 : 0.6,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: theme.r.md,
                      background: 'rgba(122,139,111,0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: theme.c.sageLt,
                      flexShrink: 0,
                    }}
                  >
                    <Activity size={20} />
                  </div>
                  <div className="rb-list-info" style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{sv.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                      {sv.category} • {sv.duration} min • vizitų: {sv.visitCount ?? 0}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: theme.f.d,
                      fontSize: 16,
                      fontWeight: 700,
                      color: theme.c.sage,
                    }}
                  >
                    €{sv.price}
                  </span>
                  <Badge variant={sv.active ? 'ok' : 'coral'}>
                    {sv.active ? 'Aktyvi' : 'Išjungta'}
                  </Badge>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() =>
                        onToggleService(sv.id).catch((e) =>
                          toast.error(e.message || 'Nepavyko pakeisti aktyvumo.')
                        )
                      }
                      title={sv.active ? 'Išjungti paslaugą' : 'Įjungti paslaugą'}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: theme.r.sm,
                        background: 'rgba(196,162,101,0.14)',
                        border: 'none',
                        color: theme.c.gold,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Power size={14} />
                    </button>
                    <button
                      onClick={() => openEditSvc(sv)}
                      title="Redaguoti"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: theme.r.sm,
                        background: 'rgba(108,142,239,0.12)',
                        border: 'none',
                        color: '#6C8EEF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() =>
                        onDeleteService(sv.id).catch((e) =>
                          toast.error(e.message || 'Nepavyko pašalinti.')
                        )
                      }
                      title="Pašalinti"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: theme.r.sm,
                        background: 'rgba(199,80,80,0.12)',
                        border: 'none',
                        color: theme.c.err,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {fServices.length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 30 }}>
                  Paslaugų nėra
                </p>
              )}
            </div>
            <Modal
              open={svcModal}
              onClose={closeSvc}
              title={editService ? 'Redaguoti paslaugą' : 'Nauja paslauga'}
              wide
            >
              <form onSubmit={svcForm.handleSubmit(saveSvc)} noValidate>
                <Input
                  label="Pavadinimas"
                  required
                  icon={ClipboardList}
                  error={vErr.name?.message}
                  {...svcForm.register('name')}
                />
                <div
                  className="rb-grid-2"
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}
                >
                  <Input
                    label="Kategorija"
                    required
                    icon={Tag}
                    list="rb-service-categories"
                    error={vErr.category?.message}
                    {...svcForm.register('category')}
                  />
                  <Input
                    label="Kaina (€)"
                    required
                    type="number"
                    min={0}
                    step={1}
                    icon={Euro}
                    error={vErr.price?.message}
                    {...svcForm.register('price')}
                  />
                  <Input
                    label="Trukmė (min)"
                    required
                    type="number"
                    min={5}
                    step={5}
                    icon={Clock}
                    error={vErr.duration?.message}
                    {...svcForm.register('duration')}
                  />
                </div>
                <datalist id="rb-service-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <div style={{ marginBottom: 18 }}>
                  <label
                    htmlFor="rb-service-description"
                    style={{
                      display: 'block',
                      fontFamily: theme.f.b,
                      fontSize: 13,
                      fontWeight: 600,
                      color: theme.c.char,
                      marginBottom: 5,
                    }}
                  >
                    Aprašas
                  </label>
                  <textarea
                    id="rb-service-description"
                    rows={3}
                    {...svcForm.register('description')}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      border: `1.5px solid ${vErr.description ? theme.c.err : theme.c.border}`,
                      borderRadius: theme.r.md,
                      fontFamily: theme.f.body,
                      fontSize: 14,
                      resize: 'vertical',
                      background: theme.c.warmWh,
                      color: theme.c.char,
                    }}
                  />
                  {vErr.description && (
                    <p role="alert" style={{ fontSize: 12, color: theme.c.err, marginTop: 3 }}>
                      {vErr.description.message}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <label style={{ color: theme.c.char }}>Aktyvi:</label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={svcActive}
                    onClick={() => setSvcActive((a) => !a)}
                    style={{
                      width: 48,
                      height: 26,
                      borderRadius: 13,
                      background: svcActive ? theme.c.sage : theme.c.border,
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'white',
                        position: 'absolute',
                        top: 2,
                        left: svcActive ? 24 : 2,
                        transition: 'left 0.2s',
                      }}
                    />
                  </button>
                  <span style={{ fontSize: 12, color: theme.c.slate }}>
                    Išjungta paslauga nerodoma pacientams; esami vizitai išlieka.
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <Btn variant="secondary" type="button" onClick={closeSvc}>
                    Atšaukti
                  </Btn>
                  <Btn
                    variant="primary"
                    type="submit"
                    icon={<Save size={16} />}
                    disabled={svcForm.formState.isSubmitting}
                  >
                    {editService ? 'Išsaugoti' : 'Pridėti'}
                  </Btn>
                </div>
              </form>
            </Modal>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminPanel;
