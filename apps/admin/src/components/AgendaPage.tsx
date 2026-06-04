import { useEffect, useState } from 'react';
import type { AgendaItem, AgendaItemCreate } from '@eventmgr/shared-types';
import { adminApi } from '../api';
import { AgendaForm } from './AgendaForm';

type Mode = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; item: AgendaItem };

export function AgendaPage() {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listAgenda();
      data.sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load agenda');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(input: AgendaItemCreate) {
    await adminApi.createAgenda(input);
    setMode({ kind: 'list' });
    await load();
  }

  async function update(id: string, input: AgendaItemCreate) {
    await adminApi.updateAgenda(id, input);
    setMode({ kind: 'list' });
    await load();
  }

  if (mode.kind === 'create') {
    return <AgendaForm onSubmit={create} onCancel={() => setMode({ kind: 'list' })} />;
  }
  if (mode.kind === 'edit') {
    const item = mode.item;
    return (
      <AgendaForm
        initial={item}
        onSubmit={(input) => update(item.id, input)}
        onCancel={() => setMode({ kind: 'list' })}
      />
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Agenda</h2>
        <button onClick={() => setMode({ kind: 'create' })}>+ New item</button>
      </div>

      {loading && <p className="muted">Loading…</p>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && (
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Date</th><th>Time</th><th>Title</th><th>Category</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td>{it.date}</td>
                <td>{it.startTime}{it.endTime ? `–${it.endTime}` : ''}</td>
                <td>{it.title}{it.required && <span className="tag" style={{ marginLeft: 8 }}>required</span>}</td>
                <td>{it.category.replace(/_/g, ' ')}</td>
                <td>{it.published ? 'Published' : <span className="muted">Draft</span>}</td>
                <td><button className="secondary" onClick={() => setMode({ kind: 'edit', item: it })}>Edit</button></td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="muted">No agenda items yet.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
