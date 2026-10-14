import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const { t } = useI18n();
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (message, { tone = 'success', action = null, ms = 3500 } = {}) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { id, message, tone, action }]);
      setTimeout(() => dismiss(id), ms);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-md animate-slide-up items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
              toast.tone === 'error' ? 'bg-red-600' : 'bg-gray-900'
            }`}
          >
            <span className="flex-1">{toast.message}</span>
            {toast.action}
            <button type="button" onClick={() => dismiss(toast.id)} className="text-white/70 hover:text-white" aria-label={t('common.close')}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
