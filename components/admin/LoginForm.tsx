'use client';

import { useState } from 'react';

export default function LoginForm({ configured }: { configured: boolean }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      if (res.ok) { window.location.href = '/admin'; return; }
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Could not sign in. Try again.');
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="adm-login">
      <form onSubmit={submit}>
        <span className="kicker">Money DNA</span>
        <h1 className="h1" style={{ fontSize: 26 }}>Admin sign in</h1>
        {configured ? (
          <>
            <label className="label" htmlFor="adm-pw">Password</label>
            <input id="adm-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            {error && <span className="error" role="alert">{error}</span>}
            <button type="submit" className="btn" style={{ flex: 'none', height: 48 }} disabled={!password || busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </>
        ) : (
          <p className="lead" style={{ fontSize: 14 }}>Admin access isn&apos;t set up yet. Add an <code>ADMIN_PASSWORD</code> environment variable in Coolify and redeploy.</p>
        )}
      </form>
    </main>
  );
}
