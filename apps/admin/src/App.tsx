import { useEffect, useState } from 'react';
import { Login } from './components/Login';
import { AgendaPage } from './components/AgendaPage';
import { NotificationsPage } from './components/NotificationsPage';
import { PhotosPage } from './components/PhotosPage';
import { FaqPage } from './components/FaqPage';
import { SupportPage } from './components/SupportPage';
import { DiningPage } from './components/DiningPage';
import { LocationsPage } from './components/LocationsPage';
import { MapsPage } from './components/MapsPage';
import { WeatherPage } from './components/WeatherPage';
import { DataPage } from './components/DataPage';
import { AttendeesPage } from './components/AttendeesPage';
import { getCurrentSession, signOut, type AdminSession } from './auth';
import { setToken } from './api';
import { config } from './config';

type Tab =
  | 'agenda'
  | 'attendees'
  | 'dining'
  | 'locations'
  | 'notifications'
  | 'photos'
  | 'faq'
  | 'maps'
  | 'weather'
  | 'support'
  | 'data';

const TABS: { id: Tab; label: string }[] = [
  { id: 'agenda', label: 'Agenda' },
  { id: 'attendees', label: 'Attendees' },
  { id: 'dining', label: 'Dining' },
  { id: 'locations', label: 'Locations' },
  { id: 'maps', label: 'Maps' },
  { id: 'weather', label: 'Weather' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'photos', label: 'Photos' },
  { id: 'faq', label: 'FAQ' },
  { id: 'support', label: 'Support' },
  { id: 'data', label: 'Import/Export' },
];

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
      <nav className="container"
        style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 0, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? '' : 'secondary'} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <main className="container">
        {tab === 'agenda' && <AgendaPage />}
        {tab === 'attendees' && <AttendeesPage />}
        {tab === 'dining' && <DiningPage />}
        {tab === 'locations' && <LocationsPage />}
        {tab === 'maps' && <MapsPage />}
        {tab === 'weather' && <WeatherPage />}
        {tab === 'notifications' && <NotificationsPage />}
        {tab === 'photos' && <PhotosPage />}
        {tab === 'faq' && <FaqPage />}
        {tab === 'support' && <SupportPage />}
        {tab === 'data' && <DataPage />}
      </main>
    </>
  );
}
