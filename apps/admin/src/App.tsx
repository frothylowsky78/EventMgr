import { useEffect, useState } from 'react';
import { Login } from './components/Login';
import { AgendaPage } from './components/AgendaPage';
import { NotificationsPage } from './components/NotificationsPage';
import { getCurrentSession, signOut, type AdminSession } from './auth';
import { setToken } from './api';
import { config } from './config';

type Tab = 'agenda' | 'notifications';

export function App() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('agenda');

  useEffect(() => {
    getCurrentSession().then((s) => {
      if (s) {
        setToken(s.accessToken);
        setSession(s);
      }
      setReady(true);
    });
  }, []);

  function handleSignedIn(s: AdminSession) {
    setToken(s.accessToken);
    setSession(s);
  }

  function handleSignOut() {
    signOut();
    setToken(null);
    setSession(null);
  }

  if (!ready) return <div className="center"><p className="muted">Loading…</p></div>;
  if (!session) return <Login onSignedIn={handleSignedIn} />;

  return (
    <>
      <header className="app-header">
        <h1>EventMgr Admin · <span style={{ opacity: 0.7 }}>{config.env}</span></h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13 }}>{session.email}</span>
          <button className="secondary" onClick={handleSignOut}>Sign out</button>
        </div>
      </header>
      <nav className="container" style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 0 }}>
        <button className={tab === 'agenda' ? '' : 'secondary'} onClick={() => setTab('agenda')}>
          Agenda
        </button>
        <button className={tab === 'notifications' ? '' : 'secondary'}
          onClick={() => setTab('notifications')}>
          Notifications
        </button>
      </nav>
      <main className="container">
        {tab === 'agenda' ? <AgendaPage /> : <NotificationsPage />}
      </main>
    </>
  );
}
