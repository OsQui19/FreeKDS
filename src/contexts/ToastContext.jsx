import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastCtx = createContext({ toasts: [], push: () => {}, remove: () => {} });

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    const toast = { id, message, variant: opts.variant || 'success', timeout: opts.timeout ?? 3000 };
    setToasts((t) => [...t, toast]);
    if (toast.timeout) {
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), toast.timeout);
    }
    return id;
  }, []);
  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const value = useMemo(() => ({ toasts, push, remove }), [toasts, push, remove]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1080 }}>
        {toasts.map((t) => (
          <div key={t.id} className={`toast show text-bg-${t.variant} mb-2`} role="alert" aria-live="assertive" aria-atomic="true">
            <div className="toast-body d-flex align-items-center">
              <div>{t.message}</div>
              <button type="button" className="btn-close btn-close-white ms-auto" onClick={() => remove(t.id)} aria-label="Close"></button>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

