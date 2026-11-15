/**
 * Naujo slaptazodzio nustatymo puslapis (/atkurti-slaptazodi).
 * Vienkartinis raktas ir paskyros tipas skaitomi is URL fragmento (#...), kad nepatektu
 * i serverio zurnalus; forma tikrina slaptazodzio ilgi ir sutapima, tada kviecia API.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Btn, Card, Input } from '@/components/ui';
import { authService } from '@/services/api';
import theme from '@/styles/theme';

export default function ResetPassword() {
  const [credentials] = useState(() =>
    Object.fromEntries(new URLSearchParams(window.location.hash.slice(1)))
  );
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname);
  }, []);
  const valid =
    /^[a-f0-9]{64}$/.test(credentials.token || '') &&
    ['patient', 'specialist'].includes(credentials.role);
  // Siuncia nauja slaptazodi kartu su vienkartiniu raktu; po sekmes rodoma nuoroda prisijungti.
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) return setError('Slaptažodis turi būti bent 8 simbolių.');
    if (password !== confirmation) return setError('Slaptažodžiai nesutampa.');
    setBusy(true);
    try {
      await authService.resetPassword({ ...credentials, newPassword: password });
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main style={{ minHeight: '100vh', background: theme.c.cream, padding: '80px 20px' }}>
      <Card hover={false} style={{ maxWidth: 480, margin: '0 auto' }}>
        <h1 style={{ fontFamily: theme.f.display, marginBottom: 20 }}>Slaptažodžio atkūrimas</h1>
        {!valid ? (
          <p role="alert">
            Atkūrimo nuoroda neteisinga. Prisijungimo lange paprašykite naujos nuorodos.
          </p>
        ) : done ? (
          <p>Slaptažodis pakeistas. Dabar galite prisijungti nauju slaptažodžiu.</p>
        ) : (
          <form onSubmit={submit}>
            <Input
              label="Naujas slaptažodis"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              label="Pakartokite slaptažodį"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              required
            />
            {error && (
              <p role="alert" style={{ color: theme.c.err, marginBottom: 12 }}>
                {error}
              </p>
            )}
            <Btn type="submit" disabled={busy}>
              {busy ? 'Keičiama…' : 'Pakeisti slaptažodį'}
            </Btn>
          </form>
        )}
        <p style={{ marginTop: 24 }}>
          <Link to={credentials.role === 'specialist' ? '/specialistams' : '/prisijungimas'}>
            Grįžti į prisijungimą
          </Link>
        </p>
      </Card>
    </main>
  );
}
