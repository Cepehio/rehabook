import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ChevronLeft } from 'lucide-react';
import theme from '@/styles/theme';
import { Btn, Input } from '@/components/ui';
import { authService } from '@/services/api';
import { forgotPasswordSchema } from '@/utils/validation';

/**
 * Slaptažodžio atkūrimo komponentas (react-hook-form + zod).
 * Naudojamas tiek pacientų, tiek specialistų prisijungimo languose.
 */
export default function ForgotPassword({ onBack, role = 'patient' }) {
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });

  // Atsakymas vienodas egzistuojanciai ir neegzistuojanciai paskyrai (neatskleidziama, ar el. pastas registruotas).
  const onSubmit = async ({ email }) => {
    setError('');
    try {
      await authService.requestPasswordReset(email, role);
      setSentTo(email);
    } catch (e) {
      setError(e.message || 'Nepavyko pateikti užklausos. Bandykite dar kartą.');
    }
  };

  if (sentTo) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: theme.c.ok + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <Mail size={26} color={theme.c.ok} />
        </div>
        <h3 style={{ fontFamily: theme.f.display, fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          Užklausa priimta
        </h3>
        <p style={{ fontSize: 14, color: theme.c.slate, marginBottom: 20 }}>
          Jei paskyra su adresu <strong>{sentTo}</strong> yra registruota, jai parengta vienkartinė
          atkūrimo nuoroda. Patikrinkite pašto dėžutę.
        </p>
        <Btn variant="ghost" onClick={onBack} icon={<ChevronLeft size={16} />}>
          Grįžti į prisijungimą
        </Btn>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <button
        type="button"
        onClick={onBack}
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
          marginBottom: 16,
        }}
      >
        <ChevronLeft size={14} />
        Grįžti
      </button>
      <h3 style={{ fontFamily: theme.f.display, fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
        Pamiršote slaptažodį?
      </h3>
      <p style={{ fontSize: 14, color: theme.c.slate, marginBottom: 20 }}>
        Įveskite savo el. pašto adresą ir atsiųsime slaptažodžio atkūrimo nuorodą.
      </p>
      <Input
        label="El. paštas"
        placeholder="jusu@pastas.lt"
        icon={Mail}
        required
        error={errors.email?.message}
        {...register('email')}
      />
      {error && (
        <p role="alert" style={{ color: theme.c.err }}>
          {error}
        </p>
      )}
      <Btn
        variant="primary"
        size="lg"
        type="submit"
        style={{ width: '100%', marginTop: 4, justifyContent: 'center' }}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Siunčiama...' : 'Siųsti atkūrimo nuorodą'}
      </Btn>
    </form>
  );
}
