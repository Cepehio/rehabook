import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, Mail, Lock, Key, Phone, AlertCircle, HelpCircle, X } from 'lucide-react';
import theme from '@/styles/theme';
import { Btn, Input } from '@/components/ui';
import { authService } from '@/services/api';
import { specialistLoginSchema } from '@/utils/validation';
import ForgotPassword from './ForgotPassword';

/**
 * Specialisto autentifikacijos langas.
 * Prisijungimui reikalingas licencijos numeris; validacija — react-hook-form + zod.
 * Naujus specialistus kuria administratorius (atskiros viešos registracijos nėra).
 */
export default function SpecialistAuth({ onLogin, onClose }) {
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');

  const loginForm = useForm({
    resolver: zodResolver(specialistLoginSchema),
    defaultValues: { email: '', password: '', license: '' },
  });

  const switchMode = (id) => {
    setMode(id);
    setError('');
  };

  // Prisijungimas su el. pastu, slaptazodziu ir licencija; API grazina JWT ir naudotojo duomenis.
  const handleLogin = async (data) => {
    setError('');
    try {
      const { user } = await authService.loginSpecialist(data.email, data.password, data.license);
      onLogin(user);
    } catch (e) {
      setError(e.message || 'Neteisingi duomenys arba licencijos numeris.');
    }
  };

  if (mode === 'forgot') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(160deg,${theme.c.sageDk},#3a4a35)`,
          padding: 24,
        }}
      >
        <div
          className="rb-auth-card"
          style={{
            background: 'white',
            borderRadius: theme.r.xl,
            padding: 36,
            maxWidth: 460,
            width: '100%',
            boxShadow: theme.sh.xl,
          }}
        >
          <ForgotPassword role="specialist" onBack={() => switchMode('login')} />
        </div>
      </div>
    );
  }

  const errors = loginForm.formState.errors;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(160deg,${theme.c.sageDk},#3a4a35)`,
        padding: 24,
      }}
    >
      <div
        className="rb-auth-card"
        style={{
          background: 'white',
          borderRadius: theme.r.xl,
          padding: 36,
          maxWidth: 460,
          width: '100%',
          boxShadow: theme.sh.xl,
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
          }}
          aria-label="Uždaryti"
        >
          <X size={20} color={theme.c.slate} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: `linear-gradient(135deg,${theme.c.sage},${theme.c.sageDk})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
            }}
          >
            <Briefcase size={26} color="white" />
          </div>
          <h2 style={{ fontFamily: theme.f.display, fontSize: 24, fontWeight: 600 }}>
            {mode === 'login' ? 'Specialisto prisijungimas' : 'Specialisto registracija'}
          </h2>
        </div>

        <div
          style={{
            display: 'flex',
            background: theme.c.creamDk,
            borderRadius: theme.r.full,
            padding: 3,
            marginBottom: 20,
            justifyContent: 'center',
          }}
        >
          {[
            { id: 'login', label: 'Prisijungti' },
            { id: 'register', label: 'Registruotis' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchMode(tab.id)}
              style={{
                flex: 1,
                padding: 8,
                borderRadius: theme.r.full,
                border: 'none',
                background: mode === tab.id ? 'white' : 'transparent',
                fontSize: 14,
                fontWeight: mode === tab.id ? 600 : 400,
                cursor: 'pointer',
                fontFamily: theme.f.body,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div
            style={{
              background: theme.c.err + '10',
              border: `1px solid ${theme.c.err}30`,
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
            {error}
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={loginForm.handleSubmit(handleLogin)} noValidate>
            <Input
              label="El. paštas"
              icon={Mail}
              required
              error={errors.email?.message}
              {...loginForm.register('email')}
            />
            <Input
              label="Slaptažodis"
              type="password"
              icon={Lock}
              required
              error={errors.password?.message}
              {...loginForm.register('password')}
            />
            <Input
              label="Licencijos numeris"
              icon={Key}
              required
              error={errors.license?.message}
              {...loginForm.register('license')}
            />
            <Btn
              variant="primary"
              size="lg"
              type="submit"
              style={{ width: '100%', marginTop: 4, justifyContent: 'center' }}
              disabled={loginForm.formState.isSubmitting}
            >
              {loginForm.formState.isSubmitting ? 'Jungiamasi...' : 'Prisijungti'}
            </Btn>
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                color: theme.c.sage,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: theme.f.body,
                margin: '14px auto 0',
              }}
            >
              <HelpCircle size={14} />
              Pamiršote slaptažodį?
            </button>
          </form>
        ) : (
          <div>
            <div
              style={{
                background: theme.c.sagePl + '30',
                border: `1px solid ${theme.c.sage}30`,
                borderRadius: theme.r.md,
                padding: '14px 16px',
                fontSize: 13,
                color: theme.c.charLt,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <Briefcase size={18} color={theme.c.sage} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <span>
                  Specialistų paskyras kuria administratorius. Kreipkitės į kliniką dėl prieigos
                  suteikimo.
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: '8px 28px',
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: `1px solid ${theme.c.sage}25`,
                  }}
                >
                  <a
                    href="tel:+37052345678"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: theme.c.charLt,
                      textDecoration: 'none',
                    }}
                  >
                    <Phone size={15} color={theme.c.sage} />
                    +370 5 234 5678
                  </a>
                  <a
                    href="mailto:info@rehabook.lt"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: theme.c.charLt,
                      textDecoration: 'none',
                    }}
                  >
                    <Mail size={15} color={theme.c.sage} />
                    info@rehabook.lt
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
