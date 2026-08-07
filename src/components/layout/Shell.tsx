import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../nav/ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';
import './Shell.css';

interface ShellProps {
  title: string;
  showBack?: boolean;
  headerExtra?: ReactNode;
  children: ReactNode;
}

export function Shell({ title, showBack, headerExtra, children }: ShellProps) {
  const { signOut } = useAuth();

  return (
    <div className="shell">
      <header className="shellHeader">
        <div className="shellHeaderLeft">
          {showBack && (
            <Link to="/" className="shellBack" aria-label="Back to dashboard">
              ←
            </Link>
          )}
          <h1 className="shellTitle">{title}</h1>
        </div>
        <div className="shellHeaderRight">
          {headerExtra}
          <ThemeToggle />
          <button type="button" className="shellSignOut" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>
      <main className="shellMain">{children}</main>
    </div>
  );
}
