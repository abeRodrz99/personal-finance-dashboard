import type { ReactNode } from 'react';
import './Card.css';

interface CardProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Card({ title, actions, children }: CardProps) {
  return (
    <section className="card">
      <div className="cardHeader">
        <h2 className="cardTitle">{title}</h2>
        {actions && <div className="cardActions">{actions}</div>}
      </div>
      <div className="cardBody">{children}</div>
    </section>
  );
}
