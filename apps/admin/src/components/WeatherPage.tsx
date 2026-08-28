import { useEffect, useState } from 'react';
import type { WeatherDay, WeatherLocation, WeatherNote } from '@eventmgr/shared-types';
import { adminApi } from '../api';
import { FORECAST_HORIZON_DAYS, fetchForecast, searchLocations, type GeocodeResult } from '../openMeteo';

export function WeatherPage() {
  const [tempF, setTempF] = useState('');
  const [condition, setCondition] = useState('');
  const [daily, setDaily] = useState<WeatherDay[]>([]);
  const [notes, setNotes] = useState<WeatherNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  // --- Forecast source (Open-Meteo) ---
  const [location, setLocation] = useState<WeatherLocation | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [sourceMsg, setSourceMsg] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getWeather()
      .then((w) => {
        setTempF(w.current?.tempF != null ? String(w.current.tempF) : '');
        setCondition(w.current?.condition ?? '');
        setDaily(w.daily ?? []);
        setNotes(w.notes ?? []);
        setLocation(w.location ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function updateDay(i: number, patch: Partial<WeatherDay>) {
    setDaily(daily.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setSourceMsg(null);
    setSearching(true);
    try {
      const found = await searchLocations(query);
      setResults(found);
      if (found.length === 0) setSourceMsg('No places matched that search.');
    } catch (err) {
      setSourceMsg(err instanceof Error ? err.message : 'Location search failed');
    } finally {
      setSearching(false);
    }
  }

  function choose(r: GeocodeResult) {
    setLocation({ name: r.name, latitude: r.latitude, longitude: r.longitude });
    setResults([]);
    setQuery('');
    setSourceMsg(null);
  }

  /** Pull the forecast and fill the fields below. Nothing is saved until "Save weather". */
  async function pullForecast() {
    if (!location) return;
    setSourceMsg(null);
    setFetching(true);
    try {
      const f = await fetchForecast(location);
      if (f.current) {
        setTempF(String(f.current.tempF));
        setCondition(f.current.condition);
      }
      setDaily(f.daily);
      setSourceMsg(
        `Filled ${f.daily.length} day(s) from Open-Meteo. Review, then Save weather.`
      );
    } catch (err) {
      setSourceMsg(err instanceof Error ? err.message : 'Forecast lookup failed');
    } finally {
      setFetching(false);
    }
  }

  async function save() {
    setMsg(null);
    try {
      await adminApi.upsertWeather({
        current: tempF ? { tempF: Number(tempF), condition } : null,
        daily,
        notes,
        location,
      });
      setMsg('Saved.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    }
  }

  if (loading) return <div className="card"><p className="muted">Loading…</p></div>;

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Weather</h2>

      <h3>Forecast source</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Pull current conditions and the daily forecast from Open-Meteo, then review and edit
        before saving. Forecasts only reach about {FORECAST_HORIZON_DAYS} days ahead — dates
        further out come back empty until they move inside that window.
      </p>

      {location && (
        <p style={{ margin: '8px 0' }}>
          <strong>{location.name}</strong>{' '}
          <span className="muted">
            ({location.latitude.toFixed(3)}, {location.longitude.toFixed(3)})
          </span>{' '}
          <button className="secondary" type="button" onClick={() => setLocation(null)}>
            Change
          </button>
        </p>
      )}

      {!location && (
        <form className="row" onSubmit={search}>
          <div style={{ flex: 1 }}>
            <label>Search location</label>
            <input
              value={query}
              placeholder="e.g. Coeur d'Alene"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div style={{ flex: '0 0 auto', alignSelf: 'end' }}>
            <button type="submit" disabled={searching || !query.trim()}>
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>
        </form>
      )}

      {results.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0' }}>
          {results.map((r) => (
            <li key={r.id} style={{ marginBottom: 4 }}>
              <button className="secondary" type="button" onClick={() => choose(r)}>
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: 8 }}>
        <button type="button" onClick={pullForecast} disabled={!location || fetching}>
          {fetching ? 'Fetching…' : 'Fetch forecast'}
        </button>
        {sourceMsg && <span className="muted" style={{ marginLeft: 12 }}>{sourceMsg}</span>}
      </div>

      <h3 style={{ marginTop: 20 }}>Current</h3>
      <div className="row">
        <div><label>Temp °F</label><input type="number" value={tempF} onChange={(e) => setTempF(e.target.value)} /></div>
        <div><label>Condition</label><input value={condition} onChange={(e) => setCondition(e.target.value)} /></div>
      </div>

      <h3 style={{ marginTop: 20 }}>Daily forecast</h3>
      {daily.map((d, i) => (
        <div className="row" key={i} style={{ marginBottom: 8 }}>
          <div><label>Date</label><input type="date" value={d.date} onChange={(e) => updateDay(i, { date: e.target.value })} /></div>
          <div><label>High</label><input type="number" value={d.highF} onChange={(e) => updateDay(i, { highF: Number(e.target.value) })} /></div>
          <div><label>Low</label><input type="number" value={d.lowF} onChange={(e) => updateDay(i, { lowF: Number(e.target.value) })} /></div>
          <div><label>Condition</label><input value={d.condition} onChange={(e) => updateDay(i, { condition: e.target.value })} /></div>
          <div style={{ flex: '0 0 auto', alignSelf: 'end' }}>
            <button className="secondary" type="button" onClick={() => setDaily(daily.filter((_, idx) => idx !== i))}>✕</button>
          </div>
        </div>
      ))}
      <button className="secondary" type="button"
        onClick={() => setDaily([...daily, { date: '', highF: 0, lowF: 0, condition: '' }])}>
        + Add day
      </button>

      <h3 style={{ marginTop: 20 }}>Alert notes</h3>
      {notes.map((n, i) => (
        <div key={n.id} style={{ marginBottom: 8 }}>
          <input value={n.title} placeholder="Title"
            onChange={(e) => setNotes(notes.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} />
          <textarea rows={2} value={n.body} placeholder="Message" style={{ marginTop: 4 }}
            onChange={(e) => setNotes(notes.map((x, idx) => idx === i ? { ...x, body: e.target.value } : x))} />
          <button className="secondary" type="button" onClick={() => setNotes(notes.filter((_, idx) => idx !== i))}>Remove</button>
        </div>
      ))}
      <button className="secondary" type="button"
        onClick={() => setNotes([...notes, { id: `wn_${Date.now()}`, title: '', body: '', createdAt: new Date().toISOString() }])}>
        + Add note
      </button>

      <div style={{ marginTop: 20 }}>
        <button onClick={save}>Save weather</button>
        {msg && <span className="muted" style={{ marginLeft: 12 }}>{msg}</span>}
      </div>
    </div>
  );
}
