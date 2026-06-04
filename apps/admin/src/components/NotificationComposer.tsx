import { useState } from 'react';
import type {
  AudiencePreview,
  NotificationCreate,
  NotificationPriority,
  NotificationTarget,
  NotificationTargetType,
} from '@eventmgr/shared-types';
import { adminApi } from '../api';

// Target types resolvable today (others arrive with the dining/travel/transport slices).
const TARGET_TYPES: { value: NotificationTargetType; label: string }[] = [
  { value: 'all', label: 'All attendees' },
  { value: 'tag', label: 'By tag' },
  { value: 'individuals', label: 'Selected attendees' },
  { value: 'incomplete_registration', label: 'Incomplete registration' },
];

const PRIORITIES: NotificationPriority[] = ['normal', 'important', 'urgent'];

export function NotificationComposer({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<NotificationPriority>('normal');
  const [targetType, setTargetType] = useState<NotificationTargetType>('all');
  const [tags, setTags] = useState('');
  const [attendeeIds, setAttendeeIds] = useState('');
  const [scheduled, setScheduled] = useState(false);
  const [sendAt, setSendAt] = useState('');
  const [internalNote, setInternalNote] = useState('');

  const [preview, setPreview] = useState<AudiencePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function buildTarget(): NotificationTarget {
    const criteria: NotificationTarget['criteria'] = {};
    if (targetType === 'tag') {
      criteria.tags = tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
    if (targetType === 'individuals') {
      criteria.attendeeIds = attendeeIds.split(',').map((t) => t.trim()).filter(Boolean);
    }
    return { type: targetType, criteria };
  }

  function buildPayload(): NotificationCreate {
    return {
      title,
      body,
      target: buildTarget(),
      priority,
      sendMode: scheduled ? 'scheduled' : 'now',
      sendAt: scheduled && sendAt ? new Date(sendAt).toISOString() : null,
      internalNote: internalNote || undefined,
    };
  }

  async function doPreview() {
    setError(null);
    setBusy(true);
    try {
      setPreview(await adminApi.previewAudience(buildTarget()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview failed');
    } finally {
      setBusy(false);
    }
  }

  async function createAndSend() {
    setError(null);
    // Confirmation, with an extra step for urgent / all-attendee sends (spec §18.16).
    const count = preview?.recipientCount;
    const countLabel = count != null ? `${count} attendee(s)` : 'the selected audience';
    if (!window.confirm(`Send "${title}" to ${countLabel}?`)) return;
    if ((priority === 'urgent' || targetType === 'all') &&
        !window.confirm('This is an urgent / all-attendee send. Confirm once more?')) {
      return;
    }

    setBusy(true);
    try {
      const created = await adminApi.createNotification(buildPayload());
      if (scheduled) {
        await adminApi.sendNotification(created.id); // registers the schedule
      } else {
        await adminApi.sendNotification(created.id);
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  }

  async function createTest() {
    setError(null);
    setBusy(true);
    try {
      const created = await adminApi.createNotification(buildPayload());
      await adminApi.sendTest(created.id);
      window.alert('Test sent to your attendee profile (and devices, if registered).');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Test send failed');
    } finally {
      setBusy(false);
    }
  }

  const valid = title.trim() && body.trim() && (!scheduled || sendAt);

  return (
    <form className="card" onSubmit={(e) => e.preventDefault()}>
      <h2 style={{ marginTop: 0 }}>New notification</h2>

      <label>Title</label>
      <input value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} required />

      <label>Message</label>
      <textarea rows={3} value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} required />

      <div className="row">
        <div>
          <label>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as NotificationPriority)}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label>Audience</label>
          <select value={targetType}
            onChange={(e) => { setTargetType(e.target.value as NotificationTargetType); setPreview(null); }}>
            {TARGET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {targetType === 'tag' && (
        <>
          <label>Tags (comma-separated)</label>
          <input value={tags} placeholder="golf, early_arrival" onChange={(e) => setTags(e.target.value)} />
        </>
      )}
      {targetType === 'individuals' && (
        <>
          <label>Attendee IDs (comma-separated)</label>
          <input value={attendeeIds} placeholder="attendee_001, attendee_002"
            onChange={(e) => setAttendeeIds(e.target.value)} />
        </>
      )}

      <div className="row" style={{ marginTop: 12 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={scheduled}
            onChange={(e) => setScheduled(e.target.checked)} /> Schedule for later
        </label>
        {scheduled && (
          <div>
            <label>Send at</label>
            <input type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} />
          </div>
        )}
      </div>

      <label>Internal note (not shown to attendees)</label>
      <input value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />

      {preview && (
        <div className="card" style={{ marginTop: 14, background: '#f1f6ff' }}>
          <strong>Preview:</strong> {preview.recipientCount} recipient(s) — {preview.description}
        </div>
      )}
      {error && <div className="error">{error}</div>}

      <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button type="button" className="secondary" disabled={busy} onClick={doPreview}>Preview audience</button>
        <button type="button" className="secondary" disabled={busy || !valid} onClick={createTest}>Send test</button>
        <button type="button" disabled={busy || !valid} onClick={createAndSend}>
          {scheduled ? 'Schedule send' : 'Send now'}
        </button>
        <button type="button" className="secondary" disabled={busy} onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}
