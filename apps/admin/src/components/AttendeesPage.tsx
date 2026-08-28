import { useEffect, useState } from 'react';
import type {
  Attendee,
  AttendeeUpdate,
  ItineraryItem,
  TransportationItem,
  TravelDetail,
} from '@eventmgr/shared-types';
import { adminApi } from '../api';

export function AttendeesPage() {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [selected, setSelected] = useState<Attendee | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .listAttendees()
      .then((a) => setAttendees(a.sort((x, y) => x.lastName.localeCompare(y.lastName))))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load attendees'))
      .finally(() => setLoading(false));
  }, []);

  /** Every tag already in use, for reuse suggestions. Tag matching is case-sensitive. */
  const allTags = [...new Set(attendees.flatMap((a) => a.tags))].sort();

  function applySaved(updated: Attendee) {
    setAttendees((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setSelected(updated);
  }

  if (selected) {
    return (
      <AttendeeDetail
        attendee={selected}
        allTags={allTags}
        onSaved={applySaved}
        onBack={() => setSelected(null)}
      />
    );
  }

  const filtered = query
    ? attendees.filter((a) =>
        `${a.firstName} ${a.lastName} ${a.company} ${a.email}`.toLowerCase().includes(query.toLowerCase())
      )
    : attendees;

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Attendees</h2>
      <input placeholder="Search name, company, email" value={query}
        onChange={(e) => setQuery(e.target.value)} style={{ marginBottom: 12 }} />
      {loading && <p className="muted">Loading…</p>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && (
        <table>
          <thead><tr><th>Name</th><th>Company</th><th>Email</th><th>Registration</th><th>Tags</th><th></th></tr></thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td>{a.firstName} {a.lastName}</td>
                <td>{a.company}</td>
                <td>{a.email}</td>
                <td>{a.registrationStatus.replace(/_/g, ' ')}</td>
                <td>{a.tags.length ? a.tags.join(', ') : <span className="muted">—</span>}</td>
                <td><button className="secondary" onClick={() => setSelected(a)}>Manage</button></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="muted">No attendees.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AttendeeDetail({
  attendee,
  allTags,
  onSaved,
  onBack,
}: {
  attendee: Attendee;
  allTags: string[];
  onSaved: (a: Attendee) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <button className="secondary" onClick={onBack}>← Back to attendees</button>
      <h2>{attendee.firstName} {attendee.lastName} <span className="muted" style={{ fontSize: 14 }}>{attendee.email}</span></h2>
      <TagsSection attendee={attendee} allTags={allTags} onSaved={onSaved} />
      <ItinerarySection attendeeId={attendee.id} />
      <TravelSection attendeeId={attendee.id} />
      <TransportationSection attendeeId={attendee.id} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tags — drive notification audience targeting (services/api/src/lib/audience.ts)
// ---------------------------------------------------------------------------
function TagsSection({
  attendee,
  allTags,
  onSaved,
}: {
  attendee: Attendee;
  allTags: string[];
  onSaved: (a: Attendee) => void;
}) {
  const [tags, setTags] = useState<string[]>(attendee.tags);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    tags.length !== attendee.tags.length || tags.some((t, i) => t !== attendee.tags[i]);

  function add() {
    const value = draft.trim();
    if (!value || tags.includes(value)) {
      setDraft('');
      return;
    }
    setTags([...tags, value]);
    setDraft('');
    setMsg(null);
  }

  async function save() {
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      const patch: AttendeeUpdate = { tags };
      const updated = await adminApi.updateAttendee(attendee.id, patch);
      setTags(updated.tags);
      onSaved(updated);
      setMsg('Tags saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  // Existing tags this attendee doesn't have yet — offered for reuse, since audience
  // matching is exact and a near-miss silently targets nobody.
  const suggestions = allTags.filter((t) => !tags.includes(t));

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Tags</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Used to target notifications. Matching is exact and case-sensitive — reuse an existing
        tag rather than inventing a variant.
      </p>

      <div style={{ margin: '8px 0' }}>
        {tags.length === 0 && <span className="muted">No tags.</span>}
        {tags.map((t) => (
          <span key={t} className="tag" style={{ marginRight: 6 }}>
            {t}{' '}
            <button
              className="secondary"
              type="button"
              aria-label={`Remove ${t}`}
              onClick={() => setTags(tags.filter((x) => x !== t))}
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      <div className="row">
        <div style={{ flex: 1 }}>
          <label>Add tag</label>
          <input
            list="attendee-tag-options"
            value={draft}
            placeholder="e.g. golf"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          />
          <datalist id="attendee-tag-options">
            {suggestions.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div style={{ flex: '0 0 auto', alignSelf: 'end' }}>
          <button className="secondary" type="button" onClick={add} disabled={!draft.trim()}>
            Add
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <button type="button" onClick={save} disabled={busy || !dirty}>
          {busy ? 'Saving…' : 'Save tags'}
        </button>
        {msg && <span className="muted" style={{ marginLeft: 12 }}>{msg}</span>}
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Itinerary
// ---------------------------------------------------------------------------
function ItinerarySection({ attendeeId }: { attendeeId: string }) {
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [notes, setNotes] = useState('');

  async function load() {
    setItems((await adminApi.getItinerary(attendeeId)).sort((a, b) => a.startDateTime.localeCompare(b.startDateTime)));
  }
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [attendeeId]);

  async function add() {
    if (!title || !start) return;
    await adminApi.createItinerary(attendeeId, {
      customTitle: title,
      startDateTime: new Date(start).toISOString(),
      endDateTime: end ? new Date(end).toISOString() : undefined,
      notes: notes || undefined,
    });
    setTitle(''); setStart(''); setEnd(''); setNotes(''); setAdding(false);
    await load();
  }
  async function remove(id: string) {
    if (!window.confirm('Delete this itinerary item?')) return;
    await adminApi.deleteItinerary(attendeeId, id);
    await load();
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Itinerary</h3>
        <button onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Add item'}</button>
      </div>
      {adding && (
        <div style={{ marginTop: 12 }}>
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="row">
            <div><label>Start</label><input type="datetime-local" step={900} value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><label>End</label><input type="datetime-local" step={900} value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <label>Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div style={{ marginTop: 10 }}><button onClick={add}>Save item</button></div>
        </div>
      )}
      <table style={{ marginTop: 12 }}>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td>{new Date(it.startDateTime).toLocaleString()}</td>
              <td>{it.customTitle ?? it.agendaItemId ?? 'Item'}</td>
              <td>{it.notes}</td>
              <td><button className="secondary" onClick={() => remove(it.id)}>Delete</button></td>
            </tr>
          ))}
          {items.length === 0 && <tr><td className="muted">No itinerary items.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Travel
// ---------------------------------------------------------------------------
function TravelSection({ attendeeId }: { attendeeId: string }) {
  const [t, setT] = useState<TravelDetail | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: keyof TravelDetail, v: string) => setT({ ...(t ?? blankTravel(attendeeId)), [k]: v } as TravelDetail);

  useEffect(() => {
    adminApi.getTravel(attendeeId).then((d) => setT(d ?? blankTravel(attendeeId)));
  }, [attendeeId]);

  async function save() {
    if (!t) return;
    setMsg(null);
    const { attendeeId: _a, eventId: _e, ...upsert } = t;
    await adminApi.upsertTravel(attendeeId, upsert);
    setMsg('Saved.');
  }

  if (!t) return null;
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>Travel</h3>
      <div className="row">
        <div><label>Arrival flight</label><input value={t.arrivalFlight ?? ''} onChange={(e) => set('arrivalFlight', e.target.value)} /></div>
        <div><label>Arrival (ISO)</label><input value={t.arrivalDateTime ?? ''} placeholder="2026-09-12T14:15:00-07:00" onChange={(e) => set('arrivalDateTime', e.target.value)} /></div>
      </div>
      <div className="row">
        <div><label>Departure flight</label><input value={t.departureFlight ?? ''} onChange={(e) => set('departureFlight', e.target.value)} /></div>
        <div><label>Departure (ISO)</label><input value={t.departureDateTime ?? ''} onChange={(e) => set('departureDateTime', e.target.value)} /></div>
      </div>
      <div className="row">
        <div><label>Transfer group</label><input value={t.transferGroup ?? ''} onChange={(e) => set('transferGroup', e.target.value)} /></div>
        <div><label>Hotel</label><input value={t.hotelName ?? ''} onChange={(e) => set('hotelName', e.target.value)} /></div>
        <div><label>Confirmation</label><input value={t.hotelConfirmation ?? ''} onChange={(e) => set('hotelConfirmation', e.target.value)} /></div>
      </div>
      <div style={{ marginTop: 10 }}>
        <button onClick={save}>Save travel</button>
        {msg && <span className="muted" style={{ marginLeft: 12 }}>{msg}</span>}
      </div>
    </div>
  );
}

function blankTravel(attendeeId: string): TravelDetail {
  return { attendeeId, eventId: '' };
}

// ---------------------------------------------------------------------------
// Transportation
// ---------------------------------------------------------------------------
function TransportationSection({ attendeeId }: { attendeeId: string }) {
  const [items, setItems] = useState<TransportationItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ transferType: '', group: '', pickupDateTime: '', pickupLocation: '', dropoffLocation: '' });

  async function load() {
    setItems(await adminApi.getTransportation(attendeeId));
  }
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [attendeeId]);

  async function add() {
    if (!form.transferType) return;
    await adminApi.createTransportation({
      attendeeId,
      transferType: form.transferType,
      group: form.group || undefined,
      pickupDateTime: form.pickupDateTime ? new Date(form.pickupDateTime).toISOString() : undefined,
      pickupLocation: form.pickupLocation || undefined,
      dropoffLocation: form.dropoffLocation || undefined,
    });
    setForm({ transferType: '', group: '', pickupDateTime: '', pickupLocation: '', dropoffLocation: '' });
    setAdding(false);
    await load();
  }

  async function setStatus(t: TransportationItem, status: TransportationItem['status']) {
    await adminApi.updateTransportation(attendeeId, t.id, { status });
    await load();
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Transportation</h3>
        <button onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Add'}</button>
      </div>
      {adding && (
        <div style={{ marginTop: 12 }}>
          <div className="row">
            <div><label>Transfer type</label><input value={form.transferType} onChange={(e) => setForm({ ...form, transferType: e.target.value })} /></div>
            <div><label>Group</label><input value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} /></div>
            <div><label>Pickup time</label><input type="datetime-local" value={form.pickupDateTime} onChange={(e) => setForm({ ...form, pickupDateTime: e.target.value })} /></div>
          </div>
          <div className="row">
            <div><label>Pickup location</label><input value={form.pickupLocation} onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })} /></div>
            <div><label>Drop-off</label><input value={form.dropoffLocation} onChange={(e) => setForm({ ...form, dropoffLocation: e.target.value })} /></div>
          </div>
          <div style={{ marginTop: 10 }}><button onClick={add}>Save</button></div>
        </div>
      )}
      <table style={{ marginTop: 12 }}>
        <tbody>
          {items.map((t) => (
            <tr key={t.id}>
              <td>{t.transferType}{t.group ? ` · ${t.group}` : ''}</td>
              <td>{t.pickupDateTime ? new Date(t.pickupDateTime).toLocaleString() : ''}</td>
              <td><span className="tag">{t.status}</span></td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="secondary" onClick={() => setStatus(t, 'delayed')}>Delay</button>
                <button className="secondary" style={{ marginLeft: 6 }} onClick={() => setStatus(t, 'completed')}>Complete</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && <tr><td className="muted">No transportation.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
