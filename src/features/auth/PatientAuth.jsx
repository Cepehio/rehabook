import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Lock, Phone, AlertCircle, HelpCircle, X } from 'lucide-react';
import theme from '@/styles/theme';
import { Btn, Input } from '@/components/ui';
import { authService } from '@/services/api';
import { patientLoginSchema, patientRegisterSchema } from '@/utils/validation';
import ForgotPassword from './ForgotPassword';

/**
 * Paciento autentifikacijos langas.
 * Apima prisijungimą, registraciją ir slaptažodžio atkūrimą.
 * Formų validacija: react-hook-form + zod (klaidos rodomos po laukais).
 * Administratorius jungiasi per atskirą kelią (/admin/prisijungimas).
 */
export default function PatientAuth({ onLogin, onClose }) {
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');

  const loginForm = useForm({
    resolver: zodResolver(patientLoginSchema),
    defaultValues: { email: '', password: '' },
  });
  const registerForm = useForm({
    resolver: zodResolver(patientRegisterSchema),
    defaultValues: { name: '', surname: '', email: '', password: '', phone: '', birthDate: '' },
  });

  const switchMode = (id) => {
    setMode(id);
    setError('');
  };

  const handleLogin = async (data) => {
    setError('');
    try {
      const { user } = await authService.loginPatient(data.email, data.password);
      onLogin(user);
    } catch (e) {
      setError(e.message || 'Neteisingas el. paštas arba slaptažodis.');
    }
  };

  const handleRegister = async (data) => {
    setError('');
    try {
      const { user } = await authService.registerPatient({
        name: data.name,
        surname: data.surname,
        email: data.email,
        password: data.password,
        phone: data.phone,
        birthDate: data.birthDate,
      });
      onLogin(user);
    } catch (e) {
      setError(e.message || 'Nepavyko užsiregistruoti.');
    }
  };

  if (mode === 'forgot') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg,${theme.c.cream},${theme.c.sagePl}40)`, padding: 24 }}>
        <div className="rb-auth-card" style={{ background: 'white', borderRadius: theme.r.xl, padding: 36, maxWidth: 440, width: '100%', boxShadow: theme.sh.xl }}>
          <ForgotPassword onBack={() => switchMode('login')} />
        </div>
      </div>
    );
  }

  const loginErrors = loginForm.formState.errors;
  const registerErrors = registerForm.formState.errors;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg,${theme.c.cream},${theme.c.sagePl}40)`, padding: 24 }}>
      <div className="rb-auth-card" style={{ background: 'white', borderRadius: theme.r.xl, padding: 36, maxWidth: 440, width: '100%', boxShadow: theme.sh.xl, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} aria-label="Uždaryti">
          <X size={20} color={theme.c.slate} />
        </button>

        {/* Antraštė */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg,${theme.c.sage},${theme.c.sageDk})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <User size={26} color="white" />
          </div>
          <h2 style={{ fontFamily: theme.f.display, fontSize: 24, fontWeight: 600 }}>
            {mode === 'login' ? 'Prisijungimas' : 'Registracija'}
          </h2>
          <p style={{ fontSize: 13, color: theme.c.slate, marginTop: 4 }}>RehaBook pacientų portalas</p>
        </div>

        {/* Režimo skirtukai */}
        <div style={{ display: 'flex', background: theme.c.creamDk, borderRadius: theme.r.full, padding: 3, marginBottom: 20, justifyContent: 'center' }}>
          {[{ id: 'login', label: 'Prisijungti' }, { id: 'register', label: 'Registruotis' }].map(tab => (
            <button key={tab.id} type="button" onClick={() => switchMode(tab.id)}
              style={{ flex: 1, padding: 8, borderRadius: theme.r.full, border: 'none', background: mode === tab.id ? 'white' : 'transparent', fontSize: 14, fontWeight: mode === tab.id ? 600 : 400, cursor: 'pointer', fontFamily: theme.f.body }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Klaida */}
        {error && (
          <div style={{ background: theme.c.err + '10', border: `1px solid ${theme.c.err}30`, borderRadius: theme.r.md, padding: '10px 14px', marginBottom: 14, color: theme.c.err, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} />{error}
          </div>
        )}

        {/* Formos */}
        {mode === 'login' ? (
          <form onSubmit={loginForm.handleSubmit(handleLogin)} noValidate>
            <Input label="El. paštas" placeholder="jusu@pastas.lt" icon={Mail} required error={loginErrors.email?.message} {...loginForm.register('email')} />
            <Input label="Slaptažodis" type="password" placeholder="••••••" icon={Lock} required error={loginErrors.password?.message} {...loginForm.register('password')} />
            <Btn variant="primary" size="lg" type="submit" style={{ width: '100%', marginTop: 4, justifyContent: 'center' }} disabled={loginForm.formState.isSubmitting}>{loginForm.formState.isSubmitting ? 'Jungiamasi...' : 'Prisijungti'}</Btn>
            <button type="button" onClick={() => switchMode('forgot')} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: theme.c.sage, fontSize: 13, cursor: 'pointer', fontFamily: theme.f.body, margin: '14px auto 0', padding: 0 }}>
              <HelpCircle size={14} />Pamiršote slaptažodį?
            </button>
          </form>
        ) : (
          <form onSubmit={registerForm.handleSubmit(handleRegister)} noValidate>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Input label="Vardas" required icon={User} error={registerErrors.name?.message} {...registerForm.register('name')} />
              <Input label="Pavardė" required icon={User} error={registerErrors.surname?.message} {...registerForm.register('surname')} />
            </div>
            <Input label="El. paštas" required icon={Mail} error={registerErrors.email?.message} {...registerForm.register('email')} />
            <Input label="Slaptažodis" type="password" required icon={Lock} placeholder="Min. 8 simboliai" error={registerErrors.password?.message} {...registerForm.register('password')} />
            <Input label="Telefonas" icon={Phone} error={registerErrors.phone?.message} {...registerForm.register('phone')} />
            <Input label="Gimimo data" type="date" error={registerErrors.birthDate?.message} {...registerForm.register('birthDate')} />
            <Btn variant="primary" size="lg" type="submit" style={{ width: '100%', marginTop: 4, justifyContent: 'center' }} disabled={registerForm.formState.isSubmitting}>{registerForm.formState.isSubmitting ? 'Registruojama...' : 'Registruotis'}</Btn>
          </form>
        )}
      </div>
    </div>
  );
}
