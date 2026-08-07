import type { ReactNode } from 'react';
import './Grid.css';

export function Grid({ children }: { children: ReactNode }) {
  return <div className="grid">{children}</div>;
}
