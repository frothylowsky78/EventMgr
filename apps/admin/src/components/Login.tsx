import { useState } from 'react';
import { signIn, isAdmin, type AdminSession } from '../auth';

export function Login({ onSignedIn }: { onSignedIn: (s: AdminSession) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const session = await signIn(email, password, needsNewPassword ? newPassword : undefined);
      if (!isAdmin(session)) {
        setError('This account does not have admin access.');
        return;
      }
      onSignedIn(session);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      if (msg === 'NEW_PASSWORD_REQUIRED') {
        setNeedsNewPassword(true);
        setError('Please set a new password to continue.');
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center">
      <form className="card" style={{ width: 360 }} onSubmit={submit}>
        <h1 style={{ marginTop: 0 }}>EventMgr Admin</h1>
        <p className="muted">Sign in to manage event content.</p>

        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} autoComplete="username"
          onChange={(e) => setEmail(e.target.value)} required />

        <label htmlFor="password">Password</label>
        <input id="password" type="password" value={password} autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)} required />

        {needsNewPassword && (
          <>
            <label htmlFor="newPassword">New password</label>
            <input id="newPassword" type="password" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} required />
          </>
        )}

        {error && <div className="error">{error}</div>}

        <div style={{ marginTop: 16 }}>
          <button type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}
