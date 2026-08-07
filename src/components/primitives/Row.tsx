import type { ReactNode } from 'react';
import './Row.css';

interface RowProps {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  trailing: ReactNode;
  onEdit?: () => void;
}

export function Row({ leading, title, subtitle, trailing, onEdit }: RowProps) {
  return (
    <div className="row">
      {leading && <div className="rowLeading">{leading}</div>}
      <div className="rowMain">
        <span className="rowTitle">{title}</span>
        {subtitle && <span className="rowSubtitle">{subtitle}</span>}
      </div>
      <div className="rowTrailing tabular">{trailing}</div>
      {onEdit && (
        <button type="button" className="rowEdit" onClick={onEdit}>
          Edit
        </button>
      )}
    </div>
  );
}
