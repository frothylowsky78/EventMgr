import { useEffect, useState } from 'react';
import type { DiningItem, DiningItemCreate } from '@eventmgr/shared-types';
import { adminApi } from '../api';

type Mode = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; item: DiningItem };

export function DiningPage() {
  const [items, setItems] = useState<DiningItem[]>([]);
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listDining();
      data.sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dining');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (mode.kind !== 'list') {
    const initial = mode.kind === 'edit' ? mode.item : undefined;
    return (
      <DiningForm
        initial={initial}
        onCancel={() => setMode({ kind: 'list' })}
        onSubmit={async (input) => {
          if (initial) await adminApi.updateDining(initial.id, input);
          else await adminApi.createDining(input);
          setMode({ kind: 'list' });
          await load();
        }}
      />
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Dining</h2>
        <button onClick={() => setMode({ kind: 'create' })}>+ New dining</button>
      </div>
      {loading && <p className="muted">Loading…</p>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && (
        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Date</th><th>Time</th><th>Title</th><th>Seating</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.id}>
                <td>{d.date}</td>
                <td>{d.startTime}{d.endTime ? `–${d.endTime}` : ''}</td>
                <td>{d.title}</td>
                <td>{d.seatingAssignmentEnabled ? 'Assigned' : '—'}</td>
                <td>{d.published ? 'Published' : <span className="muted">Draft</span>}</td>
                <td><button className="secondary" onClick={() => setMode({ kind: 'edit', item: d })}>Edit</button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="muted">No dining items yet.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}

function DiningForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: DiningItem;
  onSubmit: (input: DiningItemCreate) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    date: initial?.date ?? '',
    startTime: initial?.startTime ?? '',
    endTime: initial?.endTime ?? '',
    description: initial?.description ?? '',
    menu: (initial?.menu ?? []).join(', '),
    dressCode: initial?.dressCode ?? '',
    dietaryNotes: initial?.dietaryNotes ?? '',
    seatingAssignmentEnabled: initial?.seatingAssignmentEnabled ?? false,
    published: initial?.published ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        title: form.title,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime || undefined,
        description: form.description || undefined,
        menu: form.menu.split(',').map((m) => m.trim()).filter(Boolean),
        dressCode: form.dressCode || undefined,
        dietaryNotes: form.dietaryNotes || undefined,
        seatingAssignmentEnabled: form.seatingAssignmentEnabled,
        published: form.published,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form, v: unknown) => setForm({ ...form, [k]: v });

  return (
    <form className="card" onSubmit={submit}>
      <h2 style={{ marginTop: 0 }}>{initial ? 'Edit dining' : 'New dining'}</h2>
      <label>Title</label>
      <input value={form.title} onChange={(e) => set('title', e.target.value)} required />
      <div className="row">
        <div><label>Date</label><input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required /></div>
        <div><label>Start</label><input type="time" step={900} value={form.startTime} onChange={(e) => set('startTime', e.target.value)} required /></div>
        <div><label>End</label><input type="time" step={900} value={form.endTime} onChange={(e) => set('endTime', e.target.value)} /></div>
      </div>
      <label>Menu (comma-separated)</label>
      <input value={form.menu} onChange={(e) => set('menu', e.target.value)} />
      <label>Description</label>
      <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
      <div className="row">
        <div><label>Dress code</label><input value={form.dressCode} onChange={(e) => set('dressCode', e.target.value)} /></div>
        <div><label>Dietary notes</label><input value={form.dietaryNotes} onChange={(e) => set('dietaryNotes', e.target.value)} /></div>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={form.seatingAssignmentEnabled}
            onChange={(e) => set('seatingAssignmentEnabled', e.target.checked)} /> Seating assignment
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={form.published}
            onChange={(e) => set('published', e.target.checked)} /> Published
        </label>
      </div>
      {error && <div className="error">{error}</div>}
      <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
