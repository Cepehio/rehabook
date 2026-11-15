/**
 * Toast pranešimai — neblokuojantys pranešimai be papildomų bibliotekų.
 *
 * Naudojimas:
 *   1) Apgaubti aplikaciją: <ToastProvider> ... </ToastProvider>
 *   2) Komponente: const toast = useToast(); toast.error('Klaida'); toast.success('Gerai');
 *
 * Klaidos toast'as gali turėti veiksmą (pvz. „Bandyti dar kartą") per `action`.
 */
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import theme from '@/styles/theme';

const ToastContext = createContext(null);

const VARIANTS = {
  success: { color: theme.c.ok, Icon: CheckCircle },
  error: { color: theme.c.err, Icon: AlertCircle },
  info: { color: theme.c.sage, Icon: Info },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (type, message, options = {}) => {
      const id = ++idRef.current;
      const duration = options.duration ?? 4500;
      setToasts((prev) => [...prev, { id, type, message, action: options.action }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const api = {
    notify: (message, opts) => notify('info', message, opts),
    success: (message, opts) => notify('success', message, opts),
    error: (message, opts) => notify('error', message, opts),
    info: (message, opts) => notify('info', message, opts),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          maxWidth: 380,
          width: 'calc(100vw - 40px)',
          pointerEvents: 'none',
        }}
        aria-live="polite"
        role="status"
      >
        {toasts.map((t) => {
          const { color, Icon } = VARIANTS[t.type] || VARIANTS.info;
          return (
            <div
              key={t.id}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                background: 'white',
                border: `1px solid ${color}33`,
                borderLeft: `4px solid ${color}`,
                borderRadius: theme.r.md,
                boxShadow: theme.sh.lg,
                padding: '12px 14px',
                fontFamily: theme.f.body,
                animation: 'toastIn 0.25s ease',
              }}
            >
              <Icon size={18} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1, fontSize: 13.5, color: theme.c.char, lineHeight: 1.45 }}>
                {t.message}
                {t.action && (
                  <button
                    onClick={() => {
                      t.action.onClick();
                      dismiss(t.id);
                    }}
                    style={{
                      display: 'block',
                      marginTop: 6,
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color,
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      fontFamily: theme.f.body,
                    }}
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}
                aria-label="Uždaryti"
              >
                <X size={15} color={theme.c.slate} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Toast API. Saugu naudoti net jei provideris neapgaubia (grąžina no-op),
 * kad komponentai nelūžtų testuose/izoliacijoje.
 */
export function useToast() {
  return (
    useContext(ToastContext) || {
      notify: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      dismiss: () => {},
    }
  );
}

export default ToastProvider;
