import { useEffect, useState } from 'react';
import type { MapLocation, MapLocationCreate, MapType } from '@eventmgr/shared-types';
import { adminApi } from '../api';

const TYPES: MapType[] = ['property', 'meeting_room', 'dining', 'activity', 'transportation', 'local_area'];
type Mode = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; item: MapLocation };

export function MapsPage() {
  const [items, setItems] = useState<MapLocation[]>([]);
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listMaps();
      data.sort((a, b) => a.order - b.order);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load maps');
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
      <MapForm
        initial={initial}
        onCancel={() => setMode({ kind: 'list' })}
        onSubmit={async (input) => {
          if (initial) await adminApi.updateMap(initial.id, input);
          else await adminApi.createMap(input);
          setMode({ kind: 'list' });
          await load();
        }}
      />
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Maps</h2>
        <button onClick={() => setMode({ kind: 'create' })}>+ New map</button>
      </div>
      {loading && <p className="muted">Loading…</p>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && (
        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Order</th><th>Title</th><th>Type</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id}>
                <td>{m.order}</td>
                <td>{m.title}</td>
                <td>{m.type.replace(/_/g, ' ')}</td>
                <td>{m.published ? 'Published' : <span className="muted">Draft</span>}</td>
                <td><button className="secondary" onClick={() => setMode({ kind: 'edit', item: m })}>Edit</button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="muted">No maps yet.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}

function MapForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: MapLocation;
  onSubmit: (input: MapLocationCreate) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    type: initial?.type ?? 'property',
    imageUrl: initial?.imageUrl ?? '',
    description: initial?.description ?? '',
    address: initial?.address ?? '',
    latitude: initial?.latitude?.toString() ?? '',
    longitude: initial?.longitude?.toString() ?? '',
    order: initial?.order ?? 0,
    published: initial?.published ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: unknown) => setForm({ ...form, [k]: v });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        title: form.title,
        type: form.type as MapType,
        imageUrl: form.imageUrl || undefined,
        description: form.description || undefined,
        address: form.address || undefined,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        order: Number(form.order),
        published: form.published,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2 style={{ marginTop: 0 }}>{initial ? 'Edit map' : 'New map'}</h2>
      <div className="row">
        <div><label>Title</label><input value={form.title} onChange={(e) => set('title', e.target.value)} required /></div>
        <div>
          <label>Type</label>
          <select value={form.type} onChange={(e) => set('type', e.target.value)}>
            {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div><label>Order</label><input type="number" value={form.order} onChange={(e) => set('order', Number(e.target.value))} /></div>
      </div>
      <label>Image</label>
      {initial ? (
        <MapImageUpload map={initial} />
      ) : (
        <p className="muted" style={{ margin: '0 0 8px' }}>
          Save the map first, then reopen it to upload an image.
        </p>
      )}
      <label>Image URL (external, optional)</label>
      <input value={form.imageUrl} placeholder="https://…"
        onChange={(e) => set('imageUrl', e.target.value)} />
      <p className="muted" style={{ margin: '4px 0 0' }}>
        An uploaded image takes precedence over this URL.
      </p>
      <label>Description</label>
      <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
      <label>Address</label>
      <input value={form.address} onChange={(e) => set('address', e.target.value)} />
      <div className="row">
        <div><label>Latitude</label><input value={form.latitude} onChange={(e) => set('latitude', e.target.value)} /></div>
        <div><label>Longitude</label><input value={form.longitude} onChange={(e) => set('longitude', e.target.value)} /></div>
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={form.published}
          onChange={(e) => set('published', e.target.checked)} /> Published
      </label>
      {error && <div className="error">{error}</div>}
      <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/**
 * Uploads a map image straight to the private assets bucket via a pre-signed PUT — the file
 * never passes through Lambda or the API. The stored key is swapped for a temporary signed URL
 * whenever maps are listed, so nothing needs a public bucket.
 */
function MapImageUpload({ map }: { map: MapLocation }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(map.imageUrl || null);

  async function upload(file: File) {
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      const ticket = await adminApi.requestMapImageUrl(map.id, file.type);
      const res = await fetch(ticket.uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': file.type },
        body: file,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      setPreview(URL.createObjectURL(file));
      setMsg('Uploaded. Reopen the list to see the stored image.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginBottom: 8 }}>
      {preview && (
        <img src={preview} alt={map.title}
          style={{ maxWidth: '100%', maxHeight: 200, display: 'block', marginBottom: 8,
                   borderRadius: 8, border: '1px solid #ddd' }} />
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {busy && <span className="muted" style={{ marginLeft: 8 }}>Uploading…</span>}
      {msg && <span className="muted" style={{ marginLeft: 8 }}>{msg}</span>}
      {error && <div className="error">{error}</div>}
    </div>
  );
}
