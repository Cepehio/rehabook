import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Check, AlertCircle } from 'lucide-react';
import theme from '@/styles/theme';
import { Btn, Card, StatusBadge } from '@/components/ui';
import { visitCompletionSchema } from '@/utils/validation';
import { canTransition } from '../../../shared/booking.js';

const STATUS_OPTIONS = ['laukiamas', 'patvirtintas', 'įvykęs', 'atšauktas'];

/**
 * Vizito detalės + užbaigimo forma.
 * Specialistas užpildo diagnozę, procedūras, rekomendacijas, statusą ir sekantį
 * vizitą; išsaugojimas kviečia onUpdate (PATCH /visits/:id). Validacija — zod.
 *
 * Naudojama dviejose vietose: vizitų sąraše (inline) ir kalendoriaus modale.
 * Persikrauna su `key={visit.id}`, kad numatytosios reikšmės atsinaujintų.
 */
export default function VisitDetail({ visit, patient, onUpdate, inModal = false }) {
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(visitCompletionSchema),
    defaultValues: {
      status: visit.status || 'laukiamas',
      diagnosis: visit.diagnosis || '',
      procedures: visit.procedures || '',
      recommendations: visit.recommendations || '',
      nextVisit: visit.nextVisit || '',
      cancelReason: visit.cancelReason || '',
    },
  });

  // Issaugojimas per onUpdate (PATCH /api/visits/:id); sekme ir klaida rodomos formoje.
  const onSubmit = async (data) => {
    setErr('');
    setOk(false);
    try {
      await onUpdate(visit.id, data);
      setOk(true);
    } catch (e) {
      setErr(e.message || 'Nepavyko išsaugoti vizito.');
    }
  };

  const ta = {
    width: '100%',
    padding: '11px 14px',
    border: `1.5px solid ${theme.c.border}`,
    borderRadius: theme.r.md,
    fontFamily: theme.f.b,
    fontSize: 14,
    resize: 'vertical',
    background: theme.c.warmWh,
    color: theme.c.char,
  };
  const fieldLabel = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: theme.c.char,
    marginBottom: 5,
  };

  const body = (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          marginBottom: 20,
        }}
      >
        <div>
          <h3 style={{ fontFamily: theme.f.d, fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
            {visit.service}
          </h3>
          <p style={{ fontSize: 14, color: theme.c.slate }}>
            {patient ? patient.name + ' ' + patient.surname : ''} • {visit.date} • {visit.time}
          </p>
        </div>
        <StatusBadge status={visit.status} />
      </div>

      {ok && (
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
          Vizitas atnaujintas!
        </div>
      )}
      {err && (
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
          {err}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div style={{ marginBottom: 18 }}>
          <label style={fieldLabel}>Statusas</label>
          <select {...register('status')} style={{ ...ta, resize: 'none' }}>
            {STATUS_OPTIONS.filter((s) => canTransition(visit.status, s)).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {errors.status && (
            <p style={{ fontSize: 12, color: theme.c.err, marginTop: 3 }}>
              {errors.status.message}
            </p>
          )}
        </div>
        {watch('status') === 'atšauktas' && (
          <div style={{ marginBottom: 18 }}>
            <label style={fieldLabel}>Atšaukimo priežastis</label>
            <textarea required rows={2} maxLength={1000} {...register('cancelReason')} style={ta} />
          </div>
        )}
        <div
          className="rb-grid-2"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}
        >
          <div style={{ marginBottom: 18 }}>
            <label style={fieldLabel}>Diagnozė</label>
            <textarea rows={3} {...register('diagnosis')} style={ta} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={fieldLabel}>Procedūros</label>
            <textarea rows={3} {...register('procedures')} style={ta} />
          </div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={fieldLabel}>Rekomendacijos</label>
          <textarea rows={3} {...register('recommendations')} style={ta} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={fieldLabel}>Sekantis vizitas</label>
          <input type="date" {...register('nextVisit')} style={{ ...ta, resize: 'none' }} />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 16,
            borderTop: `1px solid ${theme.c.border}`,
          }}
        >
          <span
            style={{ fontFamily: theme.f.d, fontSize: 22, fontWeight: 700, color: theme.c.sage }}
          >
            €{visit.price}
          </span>
          <Btn variant="primary" type="submit" icon={<Save size={16} />} disabled={isSubmitting}>
            {isSubmitting ? 'Saugoma...' : 'Išsaugoti'}
          </Btn>
        </div>
      </form>
    </>
  );

  // Modale rodome be Card apvalkalo (Modal jau turi foną); sąraše — Card viduje.
  return inModal ? body : <Card hover={false}>{body}</Card>;
}
