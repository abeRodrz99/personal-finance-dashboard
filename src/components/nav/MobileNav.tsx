import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog } from '../primitives/Dialog';
import { useAuth } from '../../contexts/AuthContext';
import './MobileNav.css';

const LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/accounts', label: 'Accounts' },
  { to: '/goals', label: 'Goals' },
  { to: '/holdings', label: 'Holdings' },
  { to: '/categories', label: 'Categories' },
  { to: '/notes', label: 'Notes' },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();

  return (
    <>
      <button
        type="button"
        className="hamburgerBtn showOnMobile"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <svg viewBox="0 0 24 24" className="hamburgerIcon" aria-hidden="true">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Menu">
        <nav className="mobileNavList">
          {LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="mobileNavLink" onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            className="mobileNavLink mobileNavSignOut"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
          >
            Sign out
          </button>
        </nav>
      </Dialog>
    </>
  );
}
