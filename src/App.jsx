/**
 * RehaBook — Pagrindinis aplikacijos komponentas
 *
 * Maršrutizavimas valdomas per react-router-dom <Routes>.
 * Globalūs stiliai importuojami per CSS (main.jsx → globals.css).
 * Duomenys užkraunami iš tikro backend API (per services/api.js) pagal rolę.
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import theme from '@/styles/theme';

// Išdėstymas
import { Navbar } from '@/components/layout';

// Autentifikacija
import { PatientAuth, SpecialistAuth, AdminAuth } from '@/features/auth';
import RequireRole from '@/components/RequireRole';

// Viešieji puslapiai
import { HomePage } from '@/pages/public';
import { ServicesPage } from '@/pages/public';
import { SpecialistsPage } from '@/pages/public';

// Funkcionalumas
import { BookingPage } from '@/features/booking';

// Rolių zonos kraunamos tingiai (React.lazy): jų kodas (diagramos, kalendorius, PDF)
// atsisiunčiamas tik prisijungus, todėl viešų puslapių pradinis paketas lieka mažas.
const PatientDashboard = lazy(() => import('@/pages/patient/PatientDashboard'));
const SpecDash = lazy(() => import('@/pages/specialist/SpecialistDashboard'));
const AdminPanel = lazy(() => import('@/pages/admin/AdminPanel'));

// API
import {
  specialistService,
  patientService,
  serviceService,
  visitService,
  authService,
  getStoredSession,
  getAllPages,
  withCurrentSession,
} from '@/services/api';
import ResetPassword from '@/features/auth/ResetPassword';
import { useToast } from '@/components/ui';

// ─── Tingiai kraunamos zonos užsklanda (ta pati spalvų paletė) ───
function PageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme.c.cream,
        color: theme.c.slate,
        fontFamily: theme.f.body,
        fontSize: 15,
      }}
    >
      Kraunama…
    </div>
  );
}

// ─── Viešasis išdėstymas su Navbar ───
function PublicLayout({ children, scrolled, navigate }) {
  const location = useLocation();
  const pageMap = {
    '/': 'home',
    '/paslaugos': 'services',
    '/specialistai': 'specialists',
    '/registracija': 'booking',
  };
  const currentPage = pageMap[location.pathname] || 'home';

  const handleSetPage = (id) => {
    const routeMap = {
      home: '/',
      services: '/paslaugos',
      specialists: '/specialistai',
      booking: '/registracija',
    };
    navigate(routeMap[id] || '/');
  };

  const handleSetAppMode = (mode) => {
    const modeRoutes = { patientAuth: '/prisijungimas', specAuth: '/specialistams' };
    navigate(modeRoutes[mode] || '/');
  };

  return (
    <div style={{ fontFamily: theme.f.body, background: theme.c.cream, minHeight: '100vh' }}>
      <Navbar
        currentPage={currentPage}
        setPage={handleSetPage}
        scrolled={scrolled}
        setAppMode={handleSetAppMode}
      />
      <main id="main-content" role="main">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const toast = useToast();

  // ─── Duomenų būsena (užkraunama iš API) ───
  const [specialists, setSpecialists] = useState([]);
  const [patients, setPatients] = useState([]);
  const [visits, setVisits] = useState([]);
  const [services, setServices] = useState([]); // admin paslaugų katalogas (su neaktyviomis)
  const [specialistsLoading, setSpecialistsLoading] = useState(true);

  // ─── Autentifikacijos būsena (atstatoma iš sesijos po perkrovimo — 9.2) ───
  const [loggedPatient, setLoggedPatient] = useState(() => {
    const s = getStoredSession();
    return s?.user?.role === 'patient' ? s.user : null;
  });
  const [loggedSpec, setLoggedSpec] = useState(() => {
    const s = getStoredSession();
    return s?.user?.role === 'specialist' ? s.user : null;
  });

  // ─── UI būsena ───
  const [scrolled, setScrolled] = useState(false);
  const [bookingSvc, setBookingSvc] = useState(null);

  const navigate = useNavigate();

  // Viešas specialistų sąrašas užkraunamas iškart (naudoja vieši puslapiai ir registracija)
  const loadSpecialists = () => {
    setSpecialistsLoading(true);
    return specialistService
      .getAll()
      .then(setSpecialists)
      .catch(() =>
        toast.error('Nepavyko užkrauti specialistų.', {
          action: { label: 'Bandyti dar kartą', onClick: loadSpecialists },
        })
      )
      .finally(() => setSpecialistsLoading(false));
  };

  useEffect(() => {
    loadSpecialists();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Pakeitus maršrutą puslapis slenkamas į viršų
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  useEffect(() => {
    const sessionEnded = (event) => {
      setLoggedPatient(null);
      setLoggedSpec(null);
      setPatients([]);
      setVisits([]);
      setServices([]);
      setSpecialists([]);
      loadSpecialists();
      const route =
        { specialist: '/specialistams', admin: '/admin/prisijungimas' }[event.detail?.role] ||
        '/prisijungimas';
      navigate(route, { replace: true });
    };
    window.addEventListener('rehabook-session-ended', sessionEnded);
    return () => window.removeEventListener('rehabook-session-ended', sessionEnded);
  }, [navigate]);

  // ─── Duomenų užkrovimas pagal rolę ───
  const loadPatientVisits = (patientId) =>
    visitService
      .getByPatient(patientId)
      .then(withCurrentSession(setVisits))
      .catch(
        withCurrentSession(() => {
          setVisits([]);
          toast.error('Nepavyko užkrauti vizitų.');
        })
      );

  const loadSpecialistData = (specialistId) =>
    visitService
      .getBySpecialist(specialistId)
      .then(
        withCurrentSession((vs) => {
          setVisits(vs);
          // Pacientų masyvas sudaromas iš vizituose įdėtų santraukų (vardų atvaizdavimui)
          const map = new Map();
          vs.forEach((v) => v.patient && map.set(v.patient.id, v.patient));
          setPatients([...map.values()]);
        })
      )
      .catch(
        withCurrentSession(() => {
          setVisits([]);
          setPatients([]);
          toast.error('Nepavyko užkrauti specialisto duomenų.');
        })
      );

  const loadAdminData = () => {
    // Sąrašai grąžinami su puslapiavimu ({ data, ... }); admin skydeliui imame daug įrašų
    getAllPages(patientService.getAll)
      .then(withCurrentSession(setPatients))
      .catch(
        withCurrentSession(() => {
          setPatients([]);
          toast.error('Nepavyko užkrauti pacientų.');
        })
      );
    getAllPages(visitService.getAll)
      .then(withCurrentSession(setVisits))
      .catch(
        withCurrentSession(() => {
          setVisits([]);
          toast.error('Nepavyko užkrauti vizitų.');
        })
      );
    specialistService
      .getAdmin()
      .then(withCurrentSession(setSpecialists))
      .catch(withCurrentSession(() => toast.error('Nepavyko užkrauti specialistų.')));
    serviceService
      .getAdmin()
      .then(withCurrentSession(setServices))
      .catch(
        withCurrentSession(() => {
          setServices([]);
          toast.error('Nepavyko užkrauti paslaugų.');
        })
      );
  };

  // Sesijos atstatymas po perkrovimo: užkraunami atitinkamos rolės duomenys
  useEffect(() => {
    const s = getStoredSession();
    if (!s) return;
    if (s.user.role === 'patient') loadPatientVisits(s.user.id);
    else if (s.user.role === 'specialist') loadSpecialistData(s.user.id);
    else if (s.user.role === 'admin') loadAdminData();
  }, []);

  // ─── Autentifikacijos pagalbininkai ───
  const handlePatientLogin = (user) => {
    setVisits([]);
    setPatients([]);
    setServices([]);
    setLoggedSpec(null);
    setLoggedPatient(user);
    loadPatientVisits(user.id);
    const next = new URLSearchParams(location.search).get('next');
    navigate(next === '/registracija' ? next : '/paskyra');
  };

  const handleAdminLogin = () => {
    setVisits([]);
    setPatients([]);
    setServices([]);
    setLoggedSpec(null);
    setLoggedPatient(null);
    loadAdminData();
    navigate('/admin');
  };

  const handleSpecialistLogin = (user) => {
    setVisits([]);
    setPatients([]);
    setServices([]);
    setLoggedPatient(null);
    setLoggedSpec(user);
    loadSpecialistData(user.id);
    navigate('/specialistas');
  };

  const logout = () => {
    authService.logout();
    setVisits([]);
    setPatients([]);
    setServices([]);
    setLoggedPatient(null);
    setLoggedSpec(null);
    setSpecialists([]);
    loadSpecialists();
  };

  // ─── Vizitų veiksmai ───
  const handleCancelVisit = async (visitId, reason) => {
    try {
      const updated = await visitService.cancel(visitId, reason);
      setVisits((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      toast.success('Vizitas atšauktas.');
    } catch (e) {
      toast.error(e.message || 'Nepavyko atšaukti vizito.');
      throw e;
    }
  };

  // Specialisto vizito atnaujinimas (diagnozė, statusas ir kt.). Backend grąžina
  // tik paslaugą įdėjus, tad sujungiame su esamu įrašu (kad išliktų paciento santrauka).
  const handleUpdateVisit = async (visitId, data) => {
    const updated = await visitService.update(visitId, data);
    setVisits((prev) => prev.map((v) => (v.id === updated.id ? { ...v, ...updated } : v)));
    toast.success('Vizitas atnaujintas.');
    return updated;
  };

  // ─── Admin: specialistų CRUD ───
  const handleSaveSpecialist = async (payload, editId) => {
    if (editId) {
      const updated = await specialistService.update(editId, payload);
      setSpecialists((prev) => prev.map((s) => (s.id === editId ? updated : s)));
    } else {
      const created = await specialistService.create(payload);
      setSpecialists((prev) => [...prev, created]);
    }
    toast.success('Specialistas išsaugotas.');
  };
  const handleDeleteSpecialist = async (id) => {
    await specialistService.remove(id);
    setSpecialists((prev) => prev.filter((s) => s.id !== id));
    toast.success('Specialistas pašalintas.');
  };

  // ─── Admin: paslaugų CRUD ───
  const handleSaveService = async (payload, editId) => {
    if (editId) {
      const updated = await serviceService.update(editId, payload);
      setServices((prev) => prev.map((s) => (s.id === editId ? updated : s)));
    } else {
      const created = await serviceService.create(payload);
      setServices((prev) => [...prev, created]);
    }
    toast.success('Paslauga išsaugota.');
  };
  const handleDeleteService = async (id) => {
    await serviceService.remove(id);
    setServices((prev) => prev.filter((s) => s.id !== id));
    toast.success('Paslauga pašalinta.');
  };
  const handleToggleService = async (id) => {
    const updated = await serviceService.toggle(id);
    setServices((prev) => prev.map((s) => (s.id === id ? updated : s)));
    toast.success(updated.active ? 'Paslauga įjungta.' : 'Paslauga išjungta.');
  };

  // ─── Admin: pacientų CRUD ───
  const handleSavePatient = async (payload, editId) => {
    if (editId) {
      const updated = await patientService.update(editId, payload);
      setPatients((prev) => prev.map((p) => (p.id === editId ? updated : p)));
    } else {
      const created = await patientService.create(payload);
      setPatients((prev) => [...prev, created]);
    }
    toast.success('Pacientas išsaugotas.');
  };
  const handleDeletePatient = async (id) => {
    await patientService.remove(id);
    setPatients((prev) => prev.filter((p) => p.id !== id));
    toast.success('Pacientas pašalintas.');
  };

  // ─── Navigacijos pagalbininkai ───
  const handleSetPage = (id) => {
    const routeMap = {
      home: '/',
      services: '/paslaugos',
      specialists: '/specialistai',
      booking: '/registracija',
    };
    if (id !== 'booking') setBookingSvc(null);
    navigate(routeMap[id] || '/');
  };

  const handleSetBookingSvc = (svc) => {
    setBookingSvc(svc);
    navigate('/registracija');
  };

  return (
    <Routes>
      <Route path="/atkurti-slaptazodi" element={<ResetPassword />} />
      {/* ═══ Viešieji puslapiai ═══ */}
      <Route
        path="/"
        element={
          <PublicLayout scrolled={scrolled} setPage={handleSetPage} navigate={navigate}>
            <HomePage setPage={handleSetPage} />
          </PublicLayout>
        }
      />

      <Route
        path="/paslaugos"
        element={
          <PublicLayout scrolled={scrolled} setPage={handleSetPage} navigate={navigate}>
            <ServicesPage setPage={handleSetPage} setBookingSvc={handleSetBookingSvc} />
          </PublicLayout>
        }
      />

      <Route
        path="/specialistai"
        element={
          <PublicLayout scrolled={scrolled} setPage={handleSetPage} navigate={navigate}>
            <SpecialistsPage
              specialists={specialists}
              setPage={handleSetPage}
              loading={specialistsLoading}
            />
          </PublicLayout>
        }
      />

      <Route
        path="/registracija"
        element={
          <PublicLayout scrolled={scrolled} setPage={handleSetPage} navigate={navigate}>
            <BookingPage preSelSvc={bookingSvc} specialists={specialists} />
          </PublicLayout>
        }
      />

      {/* ═══ Paciento autentifikacija ═══ */}
      <Route
        path="/prisijungimas"
        element={<PatientAuth onLogin={handlePatientLogin} onClose={() => navigate('/')} />}
      />

      {/* ═══ Paciento paskyra (apsaugota — tik patient rolė) ═══ */}
      <Route
        path="/paskyra"
        element={
          <RequireRole role="patient">
            <Suspense fallback={<PageLoader />}>
              <PatientDashboard
                patient={loggedPatient || getStoredSession()?.user}
                visits={visits}
                specialists={specialists}
                onCancel={handleCancelVisit}
                onBooked={() => loadPatientVisits((loggedPatient || getStoredSession()?.user)?.id)}
                onLogout={() => {
                  logout();
                  setLoggedPatient(null);
                  navigate('/');
                }}
                setAppMode={(mode) => {
                  if (mode === 'public') navigate('/');
                }}
              />
            </Suspense>
          </RequireRole>
        }
      />

      {/* ═══ Specialisto autentifikacija ═══ */}
      <Route
        path="/specialistams"
        element={<SpecialistAuth onLogin={handleSpecialistLogin} onClose={() => navigate('/')} />}
      />

      {/* ═══ Specialisto zona (apsaugota — tik specialist rolė) ═══ */}
      <Route
        path="/specialistas"
        element={
          <RequireRole role="specialist">
            <Suspense fallback={<PageLoader />}>
              <SpecDash
                specialist={loggedSpec || getStoredSession()?.user}
                specialists={specialists}
                setSpecialists={setSpecialists}
                visits={visits}
                patients={patients}
                onUpdateVisit={handleUpdateVisit}
                onLogout={() => {
                  logout();
                  setLoggedSpec(null);
                  navigate('/');
                }}
              />
            </Suspense>
          </RequireRole>
        }
      />

      {/* ═══ Administratoriaus prisijungimas (atskiras kelias) ═══ */}
      <Route
        path="/admin/prisijungimas"
        element={<AdminAuth onLogin={handleAdminLogin} onClose={() => navigate('/')} />}
      />

      {/* ═══ Administratorius (apsaugota — tik admin rolė) ═══ */}
      <Route
        path="/admin"
        element={
          <RequireRole role="admin">
            <Suspense fallback={<PageLoader />}>
              <AdminPanel
                specialists={specialists}
                onSaveSpecialist={handleSaveSpecialist}
                onDeleteSpecialist={handleDeleteSpecialist}
                patients={patients}
                onSavePatient={handleSavePatient}
                onDeletePatient={handleDeletePatient}
                services={services}
                onSaveService={handleSaveService}
                onDeleteService={handleDeleteService}
                onToggleService={handleToggleService}
                visits={visits}
                onLogout={() => {
                  logout();
                  navigate('/');
                }}
              />
            </Suspense>
          </RequireRole>
        }
      />

      {/* ═══ 404 ═══ */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
