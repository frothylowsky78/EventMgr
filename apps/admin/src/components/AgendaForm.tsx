import { useState } from 'react';
import { AGENDA_CATEGORIES, type AgendaItem, type AgendaItemCreate } from '@eventmgr/shared-types';

interface Props {
  initial?: AgendaItem;
  onSubmit: (input: AgendaItemCreate) => Promise<void>;
  onCancel: () => void;
}

export function AgendaForm({ initial, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<AgendaItemCreate>({
    title: initial?.title ?? '',
    date: initial?.date ?? '',
    startTime: initial?.startTime ?? '',
    endTime: initial?.endTime ?? '',
    locationId: initial?.locationId ?? '',
    category: initial?.category ?? 'general_session',
    description: initial?.description ?? '',
    speaker: initial?.speaker ?? '',
    dressCode: initial?.dressCode ?? '',
    required: initial?.required ?? false,
    published: initial?.published ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof AgendaItemCreate>(k: K, v: AgendaItemCreate[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2 style={{ marginTop: 0 }}>{initial ? 'Edit agenda item' : 'New agenda item'}</h2>

      <label>Title</label>
      <input value={form.title} onChange={(e) => set('title', e.target.value)} required />

      <div className="row">
        <div>
          <label>Date</label>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
        </div>
        <div>
          <label>Start time</label>
          <input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} required />
        </div>
        <div>
          <label>End time</label>
          <input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
        </div>
      </div>

      <div className="row">
        <div>
          <label>Category</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value as AgendaItemCreate['category'])}>
            {AGENDA_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Location ID</label>
          <input value={form.locationId} onChange={(e) => set('locationId', e.target.value)} />
        </div>
        <div>
          <label>Speaker / host</label>
          <input value={form.speaker} onChange={(e) => set('speaker', e.target.value)} />
        </div>
      </div>

      <label>Description</label>
      <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />

      <div className="row" style={{ marginTop: 12 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={form.required}
            onChange={(e) => set('required', e.target.checked)} /> Required
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={form.published}
            onChange={(e) => set('published', e.target.checked)} /> Published (visible to attendees)
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
