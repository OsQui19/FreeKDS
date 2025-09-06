import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ConfirmCtx = createContext({ confirm: async () => false });

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false, title: '', message: '', resolve: null, confirmText: 'Yes', cancelText: 'Cancel', variant: 'danger' });

  const confirm = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title: opts.title || 'Please confirm',
        message,
        resolve,
        confirmText: opts.confirmText || 'Yes',
        cancelText: opts.cancelText || 'Cancel',
        variant: opts.variant || 'danger',
      });
    });
  }, []);

  const close = (result) => {
    const { resolve } = state;
    setState((s) => ({ ...s, open: false }));
    if (typeof resolve === 'function') resolve(!!result);
  };

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmCtx.Provider value={value}>
      {children}
      {state.open && (
        <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{state.title}</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => close(false)}></button>
              </div>
              <div className="modal-body">
                <p className="m-0">{state.message}</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => close(false)}>{state.cancelText}</button>
                <button type="button" className={`btn btn-${state.variant}`} onClick={() => close(true)}>{state.confirmText}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmCtx);
}

