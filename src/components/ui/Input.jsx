import { forwardRef, useState, useId } from 'react';
import theme from '@/styles/theme';

/**
 * Tekstinis įvesties laukas.
 *
 * Palaiko du naudojimo būdus, nekeisdamas išvaizdos:
 *  - valdomas (controlled): perduodami `value` + `onChange` (kaip iki šiol);
 *  - react-hook-form: perduodamas `{...register('laukas')}` — `ref` persiunčiamas
 *    į vidinį <input>, o vidinė fokuso būsena (rėmelio spalva) išsaugoma sujungiant
 *    bibliotekos `onFocus`/`onBlur` su mūsų pačių rankenėlėmis.
 */
const Input = forwardRef(function Input(
  {
    label,
    type = 'text',
    value,
    onChange,
    onFocus,
    onBlur,
    placeholder,
    required,
    error,
    icon: Icon,
    style,
    ...rest
  },
  ref
) {
  const [focused, setFocused] = useState(false);
  const generatedId = useId();
  const inputId = rest.id || generatedId;

  return (
    <div style={{ marginBottom: 18, ...style }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            display: 'block',
            fontFamily: theme.f.body,
            fontSize: 13,
            fontWeight: 600,
            color: theme.c.char,
            marginBottom: 5,
          }}
        >
          {label}
          {required && <span style={{ color: theme.c.coral }}> *</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {Icon && (
          <Icon
            size={17}
            style={{
              position: 'absolute',
              left: 13,
              top: '50%',
              transform: 'translateY(-50%)',
              color: focused ? theme.c.sage : theme.c.slate,
              transition: 'color 0.2s',
            }}
          />
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? inputId + '-error' : undefined}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={{
            width: '100%',
            padding: Icon ? '11px 14px 11px 40px' : '11px 14px',
            border: `1.5px solid ${error ? theme.c.err : focused ? theme.c.sage : theme.c.border}`,
            borderRadius: theme.r.md,
            fontFamily: theme.f.body,
            fontSize: 14,
            background: theme.c.warmWh,
            color: theme.c.char,
            transition: 'all 0.2s',
          }}
          {...rest}
        />
      </div>
      {error && (
        <p
          id={inputId + '-error'}
          role="alert"
          style={{ fontSize: 12, color: theme.c.err, marginTop: 3 }}
        >
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
