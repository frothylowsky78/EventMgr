import { useEffect, useState } from 'react';
import type { EventContact, EventProfile, RegistrationAction } from '@eventmgr/shared-types';
import { adminApi } from '../api';

/**
 * Event profile editor. Everything here drives the mobile home screen — name, venue, dates,
 * hero image and the theme colors (apps/mobile/lib/app.dart feeds primary/secondary into the
 * theme), so the client can rebrand without an app release.
 *
 * Image URLs are plain text inputs for v1; there is no upload UI here by design.
 */
export function EventPage() {
  const [form, setForm] = useState<EventProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getEvent()
      .then(setForm)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load the event'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card"><p className="muted">Loading…</p></div>;
  if (!form) return <div className="card"><div className="error">{error ?? 'No event.'}</div></div>;

  const set = <K extends keyof EventProfile>(k: K, v: EventProfile[K]) =>
    setForm({ ...form, [k]: v });
  const setBrand = (k: keyof EventProfile['branding'], v: string) =>
    setForm({ ...form, branding: { ...form.branding, [k]: v } });

  function updateContact(i: number, patch: Partial<EventContact>) {
    if (!form) return;
    set(
      'eventContacts',
      (form.eventContacts ?? []).map((c, idx) => (idx === i ? { ...c, ...patch } : c))
    );
  }

  function updateAction(i: number, patch: Partial<RegistrationAction>) {
    if (!form) return;
    set(
      'registrationActions',
      form.registrationActions.map((a, idx) => (idx === i ? { ...a, ...patch } : a))
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      const { id: _id, ...patch } = form;
      const saved = await adminApi.updateEvent(patch);
      setForm(saved);
      setMsg('Saved. Attendees see this on their next refresh.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={save}>
      <h2 style={{ marginTop: 0 }}>Event</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Drives the mobile home screen. Colors apply to the app theme.
      </p>

      <label>Event name</label>
      <input value={form.name} onChange={(e) => set('name', e.target.value)} required />

      <div className="row">
        <div>
          <label>Start date</label>
          <input type="date" value={form.startDate}
            onChange={(e) => set('startDate', e.target.value)} required />
        </div>
        <div>
          <label>End date</label>
          <input type="date" value={form.endDate}
            onChange={(e) => set('endDate', e.target.value)} required />
        </div>
      </div>

      <label>Venue</label>
      <input value={form.locationName} onChange={(e) => set('locationName', e.target.value)} />

      <label>Address</label>
      <input value={form.address} onChange={(e) => set('address', e.target.value)} />

      <label>Timezone (IANA)</label>
      <input value={form.timezone} placeholder="America/Los_Angeles"
        onChange={(e) => set('timezone', e.target.value)} />
      <p className="muted" style={{ margin: '4px 0 0' }}>
        Must be a canonical IANA zone, e.g. America/Los_Angeles. Aliases like "PST" are rejected.
      </p>

      <label style={{ marginTop: 12, display: 'block' }}>Registration deadline</label>
      <input
        type="datetime-local"
        step={900}
        value={toLocalInput(form.registrationDeadline)}
        onChange={(e) =>
          set('registrationDeadline', e.target.value ? new Date(e.target.value).toISOString() : null)
        }
      />

      <h3 style={{ marginTop: 20 }}>Welcome message</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Shown near the top of the mobile Home screen. Leave blank to hide the card entirely.
      </p>
      <label>Message</label>
      <textarea rows={3} value={form.welcomeMessage ?? ''}
        onChange={(e) => set('welcomeMessage', e.target.value)} />
      <label>Signed by</label>
      <input value={form.welcomeMessageAuthor ?? ''} placeholder="e.g. Jen Alvarez, Event Director"
        onChange={(e) => set('welcomeMessageAuthor', e.target.value)} />

      <h3 style={{ marginTop: 20 }}>Event contacts</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Shown on the Help screen. Attendees tap to call or email.
      </p>
      {(form.eventContacts ?? []).map((c, i) => (
        <div className="row" key={i} style={{ marginBottom: 8 }}>
          <div><label>Name</label>
            <input value={c.name} onChange={(e) => updateContact(i, { name: e.target.value })} /></div>
          <div><label>Role</label>
            <input value={c.role ?? ''} onChange={(e) => updateContact(i, { role: e.target.value })} /></div>
          <div><label>Phone</label>
            <input value={c.phone ?? ''} onChange={(e) => updateContact(i, { phone: e.target.value })} /></div>
          <div><label>Email</label>
            <input value={c.email ?? ''} onChange={(e) => updateContact(i, { email: e.target.value })} /></div>
          <div style={{ flex: '0 0 auto', alignSelf: 'end' }}>
            <button className="secondary" type="button"
              onClick={() => set('eventContacts', (form.eventContacts ?? []).filter((_, idx) => idx !== i))}>
              ✕
            </button>
          </div>
        </div>
      ))}
      <button className="secondary" type="button"
        onClick={() => set('eventContacts', [...(form.eventContacts ?? []), { name: '' }])}>
        + Add contact
      </button>

      <h3 style={{ marginTop: 20 }}>Branding</h3>
      <label>Logo URL</label>
      <input value={form.branding.logoUrl} placeholder="https://…"
        onChange={(e) => setBrand('logoUrl', e.target.value)} />

      <label>Hero image URL</label>
      <input value={form.branding.heroImageUrl} placeholder="https://…"
        onChange={(e) => setBrand('heroImageUrl', e.target.value)} />

      <div className="row">
        <div>
          <label>Primary color</label>
          <ColorField value={form.branding.primaryColor}
            onChange={(v) => setBrand('primaryColor', v)} />
        </div>
        <div>
          <label>Secondary color</label>
          <ColorField value={form.branding.secondaryColor}
            onChange={(v) => setBrand('secondaryColor', v)} />
        </div>
      </div>

      <h3 style={{ marginTop: 20 }}>Registration actions</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        The checklist on the attendee registration card.
      </p>
      {form.registrationActions.map((a, i) => (
        <div className="row" key={i} style={{ marginBottom: 8 }}>
          <div>
            <label>Id</label>
            <input value={a.id} onChange={(e) => updateAction(i, { id: e.target.value })} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Label</label>
            <input value={a.label} onChange={(e) => updateAction(i, { label: e.target.value })} />
          </div>
          <div style={{ flex: '0 0 auto', alignSelf: 'end' }}>
            <button className="secondary" type="button"
              onClick={() =>
                set('registrationActions', form.registrationActions.filter((_, idx) => idx !== i))
              }>
              ✕
            </button>
          </div>
        </div>
      ))}
      <button className="secondary" type="button"
        onClick={() => set('registrationActions', [...form.registrationActions, { id: '', label: '' }])}>
        + Add action
      </button>

      <div style={{ marginTop: 20 }}>
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save event'}</button>
        {msg && <span className="muted" style={{ marginLeft: 12 }}>{msg}</span>}
      </div>
      {error && <div className="error">{error}</div>}
    </form>
  );
}

/**
 * Native color picker plus a hex box. The picker alone can't express an empty value or let
 * someone paste a brand hex, and the API requires hex either way.
 */
function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const valid = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        type="color"
        value={valid ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 44, height: 34, padding: 2 }}
      />
      <input value={value} placeholder="#1A2B4C" onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** ISO-8601 -> the `datetime-local` shape, in the browser's timezone. */
function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
