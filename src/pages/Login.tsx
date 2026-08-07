import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

export function Login() {
  const { user, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [signedUp, setSignedUp] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const result = mode === 'in' ? await signIn(email, password) : await signUp(email, password);
    setPending(false);
    if (result.error) {
      setError(result.error);
    } else if (mode === 'up') {
      setSignedUp(true);
    }
  }

  return (
    <div className="loginPage">
      <div className="loginCard">
        <h1 className="loginTitle">Finance</h1>
        <p className="loginSubtitle">Net worth, holdings, and spending in one place.</p>

        {signedUp ? (
          <p className="loginNotice">
            Check your inbox at <strong>{email}</strong> to confirm your account, then sign in.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="loginForm">
            <div className="field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="formError">{error}</p>}
            <button type="submit" className="btnPrimary loginSubmit" disabled={pending}>
              {pending ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        )}

        {!signedUp && (
          <button type="button" className="loginSwitch" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
            {mode === 'in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        )}
      </div>
    </div>
  );
}
