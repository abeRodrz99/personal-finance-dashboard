import { useTheme } from '../../contexts/ThemeContext';
import './ThemeToggle.css';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className="themeToggle"
      onClick={toggle}
      aria-label={next === 'light' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={next === 'light' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" className="themeToggleIcon" aria-hidden="true">
          <circle cx="12" cy="12" r="4.4" />
          <g>
            <line x1="12" y1="1.6" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22.4" />
            <line x1="1.6" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="22.4" y2="12" />
            <line x1="4.7" y1="4.7" x2="6.4" y2="6.4" />
            <line x1="17.6" y1="17.6" x2="19.3" y2="19.3" />
            <line x1="4.7" y1="19.3" x2="6.4" y2="17.6" />
            <line x1="17.6" y1="6.4" x2="19.3" y2="4.7" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="themeToggleIconFilled" aria-hidden="true">
          <path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.9 8.9 0 1 0 11.1 11.1Z" />
        </svg>
      )}
    </button>
  );
}
