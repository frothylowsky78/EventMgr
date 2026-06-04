import { useEffect, useState } from 'react';
import { FAQ_CATEGORIES, type FaqCategory, type FaqItem, type FaqItemCreate } from '@eventmgr/shared-types';
import { adminApi } from '../api';

type Mode = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; item: FaqItem };

export function FaqPage() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listFaq();
      data.sort((a, b) => `${a.category}${a.order}`.localeCompare(`${b.category}${b.order}`));
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load FAQ');
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
      <FaqForm
        initial={initial}
        onCancel={() => setMode({ kind: 'list' })}
        onSubmit={async (input) => {
          if (initial) await adminApi.updateFaq(initial.id, input);
          else await adminApi.createFaq(input);
          setMode({ kind: 'list' });
          await load();
        }}
      />
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>FAQ</h2>
        <button onClick={() => setMode({ kind: 'create' })}>+ New FAQ</button>
      </div>
      {loading && <p className="muted">Loading…</p>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && (
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr><th>Category</th><th>Question</th><th>Featured</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((f) => (
              <tr key={f.id}>
                <td>{f.category.replace(/_/g, ' ')}</td>
                <td>{f.question}</td>
                <td>{f.featured ? '★' : ''}</td>
                <td>{f.published ? 'Published' : <span className="muted">Draft</span>}</td>
                <td><button className="secondary" onClick={() => setMode({ kind: 'edit', item: f })}>Edit</button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="muted">No FAQs yet.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}

function FaqForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: FaqItem;
  onSubmit: (input: FaqItemCreate) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FaqItemCreate>({
    category: initial?.category ?? 'event_overview',
    question: initial?.question ?? '',
    answer: initial?.answer ?? '',
    featured: initial?.featured ?? false,
    order: initial?.order ?? 0,
    published: initial?.published ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
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
      <h2 style={{ marginTop: 0 }}>{initial ? 'Edit FAQ' : 'New FAQ'}</h2>
      <div className="row">
        <div>
          <label>Category</label>
          <select value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as FaqCategory })}>
            {FAQ_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div>
          <label>Order</label>
          <input type="number" value={form.order}
            onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
        </div>
      </div>
      <label>Question</label>
      <input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} required />
      <label>Answer</label>
      <textarea rows={4} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} required />
      <div className="row" style={{ marginTop: 12 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Published
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
