import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Shield, Mail, Lock, AlertCircle, X } from 'lucide-react';
import theme from '@/styles/theme';
import { Btn, Input } from '@/components/ui';
import { authService } from '@/services/api';
import { adminLoginSchema } from '@/utils/validation';

/**
 * Administratoriaus prisijungimo langas — atskiras kelias
 * (/admin/prisijungimas) vietoj įėjimo per paciento langą.
 * Formos validacija: react-hook-form + zod.
 */
export default function AdminAuth({ onLogin, onClose }) {
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async ({ email, password }) => {
    setError('');
    try {
      await authService.loginAdmin(email, password);
      onLogin();
    } catch (e) {
      setError(e.message || 'Neteisingi administratoriaus duomenys.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg,${theme.c.char},${theme.c.sageDk})`, padding: 24 }}>
      <div className="rb-auth-card" style={{ background: 'white', borderRadius: theme.r.xl, padding: 36, maxWidth: 440, width: '100%', boxShadow: theme.sh.xl, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} aria-label="Uždaryti">
          <X size={20} color={theme.c.slate} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg,${theme.c.sage},${theme.c.sageDk})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Shield size={26} color="white" />
          </div>
          <h2 style={{ fontFamily: theme.f.display, fontSize: 24, fontWeight: 600 }}>Administratoriaus prisijungimas</h2>
          <p style={{ fontSize: 13, color: theme.c.slate, marginTop: 4 }}>RehaBook valdymo skydelis</p>
        </div>

        {error && (
          <div style={{ background: theme.c.err + '10', border: `1px solid ${theme.c.err}30`, borderRadius: theme.r.md, padding: '10px 14px', marginBottom: 14, color: theme.c.err, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} />{error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input label="El. paštas" icon={Mail} required placeholder="el. pašto adresas" error={errors.email?.message} {...register('email')} />
          <Input label="Slaptažodis" type="password" icon={Lock} required placeholder="••••••" error={errors.password?.message} {...register('password')} />
          <Btn variant="primary" size="lg" type="submit" style={{ width: '100%', marginTop: 4, justifyContent: 'center' }} disabled={isSubmitting}>
            {isSubmitting ? 'Jungiamasi...' : 'Prisijungti'}
          </Btn>
        </form>
      </div>
    </div>
  );
}
