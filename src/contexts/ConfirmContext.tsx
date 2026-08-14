import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Dialog } from '../components/primitives/Dialog';
import './ConfirmContext.css';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  /** false renders the confirm button as the normal primary (green) style instead of red. */
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirmDialog = useCallback<ConfirmFn>((opts) => {
    const options: ConfirmOptions = typeof opts === 'string' ? { message: opts } : opts;
    setPending(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function resolve(value: boolean) {
    setPending(null);
    resolver.current?.(value);
    resolver.current = null;
  }

  return (
    <ConfirmContext.Provider value={confirmDialog}>
      {children}
      <Dialog open={pending !== null} onClose={() => resolve(false)} title={pending?.title ?? 'Are you sure?'}>
        {pending && (
          <div className="confirmBody">
            <p className="confirmMessage">{pending.message}</p>
            <div className="formActions">
              <button type="button" className="btnGhost" onClick={() => resolve(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={pending.danger === false ? 'btnPrimary' : 'btnDangerSolid'}
                onClick={() => resolve(true)}
              >
                {pending.confirmLabel ?? 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  );
}

/** Drop-in async replacement for window.confirm(), styled to match the app. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}