import { useEffect, useState } from 'react';
import type { WeatherDay, WeatherNote } from '@eventmgr/shared-types';
import { adminApi } from '../api';

export function WeatherPage() {
  const [tempF, setTempF] = useState('');
  const [condition, setCondition] = useState('');
  const [daily, setDaily] = useState<WeatherDay[]>([]);
  const [notes, setNotes] = useState<WeatherNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getWeather()
      .then((w) => {
        setTempF(w.current?.tempF != null ? String(w.current.tempF) : '');
        setCondition(w.current?.condition ?? '');
        setDaily(w.daily ?? []);
        setNotes(w.notes ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function updateDay(i: number, patch: Partial<WeatherDay>) {
    setDaily(daily.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  async function save() {
    setMsg(null);
    try {
      await adminApi.upsertWeather({
        current: tempF ? { tempF: Number(tempF), condition } : null,
        daily,
        notes,
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

      <h3>Current</h3>
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
