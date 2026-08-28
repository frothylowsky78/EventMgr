import { useEffect, useState } from 'react';
import type { EventLocation, EventLocationCreate } from '@eventmgr/shared-types';
import { adminApi } from '../api';

/**
 * Named places (ballroom, terrace, clubhouse) that agenda and dining items point at.
 * The chosen name is copied onto each item when it's saved, so guests see a real place
 * instead of an id.
 */
export function LocationsPage() {
  const [items, setItems] = useState<EventLocation[]>([]);
  const [mode, setMode] = useState<{ kind: 'list' } | { kind: 'new' } | { kind: 'edit'; item: EventLocation }>({ kind: 'list' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    adminApi
      .listLocations()
      .then((l) => setItems([...l].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load locations'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function submit(input: EventLocationCreate) {
    if (mode.kind === 'edit') await adminApi.updateLocation(mode.item.id, input);
    else await adminApi.createLocation(input);
    setMode({ kind: 'list' });
    load();
  }

  if (mode.kind !== 'list') {
    return (
      <LocationForm
        initial={mode.kind === 'edit' ? mode.item : undefined}
        onSubmit={submit}
        onCancel={() => setMode({ kind: 'list' })}
      />
    );
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Locations</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Agenda and dining items pick from this list. Unpublished locations stay out of those
        dropdowns but keep working on items that already reference them.
      </p>
      <button onClick={() => setMode({ kind: 'new' })}>+ New location</button>
      {loading && <p className="muted">Loading…</p>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && (
        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Order</th><th>Name</th><th>Detail</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id}>
                <td>{l.order}</td>
                <td>{l.name}</td>
                <td>{l.detail || <span className="muted">—</span>}</td>
                <td>{l.published ? 'Published' : <span className="muted">Draft</span>}</td>
                <td><button className="secondary" onClick={() => setMode({ kind: 'edit', item: l })}>Edit</button></td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="muted">No locations yet.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function LocationForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: EventLocation;
  onSubmit: (input: EventLocationCreate) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<EventLocationCreate>({
    name: initial?.name ?? '',
    detail: initial?.detail ?? '',
    address: initial?.address ?? '',
    mapLink: initial?.mapLink ?? '',
    order: initial?.order ?? 0,
    published: initial?.published ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof EventLocationCreate, v: unknown) => setForm({ ...form, [k]: v });

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
      <h2 style={{ marginTop: 0 }}>{initial ? 'Edit location' : 'New location'}</h2>

      <label>Name</label>
      <input value={form.name} placeholder="e.g. Grand Ballroom"
        onChange={(e) => set('name', e.target.value)} required />

      <label>Detail</label>
      <input value={form.detail} placeholder="e.g. 2nd floor, north wing"
        onChange={(e) => set('detail', e.target.value)} />

      <label>Address</label>
      <input value={form.address} onChange={(e) => set('address', e.target.value)} />

      <label>Map link</label>
      <input type="url" value={form.mapLink} placeholder="https://maps.google.com/…"
        onChange={(e) => set('mapLink', e.target.value)} />

      <div className="row">
        <div>
          <label>Order</label>
          <input type="number" value={form.order}
            onChange={(e) => set('order', Number(e.target.value))} />
        </div>
        <div style={{ alignSelf: 'end' }}>
          <label>
            <input type="checkbox" checked={form.published}
              onChange={(e) => set('published', e.target.checked)} /> Published
          </label>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      <div className="row" style={{ marginTop: 12 }}>
        <div style={{ flex: '0 0 auto' }}>
          <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save location'}</button>
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <button className="secondary" type="button" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </form>
  );
}

/**
 * Shared location `<select>` for the agenda and dining forms. Keeps an unpublished or deleted
 * location that an item already references selectable, so editing an item can't silently
 * clear its location.
 */
export function LocationSelect({
  value,
  onChange,
  locations,
}: {
  value: string;
  onChange: (locationId: string) => void;
  locations: EventLocation[];
}) {
  const options = locations.filter((l) => l.published || l.id === value);
  const orphaned = value && !locations.some((l) => l.id === value);

  return (
    <>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— None —</option>
        {options.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}{l.detail ? ` (${l.detail})` : ''}{l.published ? '' : ' — draft'}
          </option>
        ))}
        {orphaned && <option value={value}>Unknown location ({value})</option>}
      </select>
      {locations.length === 0 && (
        <p className="muted" style={{ marginTop: 4 }}>
          No locations defined yet — add them on the Locations tab.
        </p>
      )}
    </>
  );
}
