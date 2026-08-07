import { useEffect, useRef, type ReactNode } from 'react';
import './Dialog.css';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Dialog({ open, onClose, title, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialogHeader">
        <h3 className="dialogTitle">{title}</h3>
        <button type="button" className="dialogClose" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="dialogBody">{children}</div>
    </dialog>
  );
}
