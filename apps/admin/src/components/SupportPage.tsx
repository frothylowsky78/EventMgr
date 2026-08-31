import { useEffect, useState } from 'react';
import type { HelpRequest, HelpRequestStatus, ModerationReport } from '@eventmgr/shared-types';
import { adminApi } from '../api';

const STATUSES: HelpRequestStatus[] = ['open', 'assigned', 'resolved'];

export function SupportPage() {
  const [view, setView] = useState<'help' | 'feedback' | 'reports'>('help');
  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className={view === 'help' ? '' : 'secondary'} onClick={() => setView('help')}>
          Help requests
        </button>
        <button className={view === 'feedback' ? '' : 'secondary'} onClick={() => setView('feedback')}>
          Feedback
        </button>
        <button className={view === 'reports' ? '' : 'secondary'} onClick={() => setView('reports')}>
          Reported messages
        </button>
      </div>
      {view === 'help' && <HelpRequests />}
      {view === 'feedback' && <Feedback />}
      {view === 'reports' && <ReportedMessages />}
    </div>
  );
}

function HelpRequests() {
  const [status, setStatus] = useState<HelpRequestStatus>('open');
  const [items, setItems] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await adminApi.listHelpRequests(status));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function setReqStatus(r: HelpRequest, next: HelpRequestStatus) {
    try {
      await adminApi.updateHelpRequest(r.attendeeId, r.id, { status: next });
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Action failed');
    }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {STATUSES.map((s) => (
          <button key={s} className={s === status ? '' : 'secondary'} onClick={() => setStatus(s)}>{s}</button>
        ))}
      </div>
      {loading && <p className="muted">Loading…</p>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && (
        <table>
          <thead>
            <tr><th>Urgency</th><th>Category</th><th>Message</th><th>Created</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td>{r.urgency}</td>
                <td>{r.category}</td>
                <td>{r.message}</td>
                <td className="muted">{new Date(r.createdAt).toLocaleString()}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {r.status !== 'assigned' && (
                    <button className="secondary" onClick={() => setReqStatus(r, 'assigned')}>Assign</button>
                  )}
                  {r.status !== 'resolved' && (
                    <button style={{ marginLeft: 6 }} onClick={() => setReqStatus(r, 'resolved')}>Resolve</button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="muted">No {status} requests.</td></tr>}
          </tbody>
        </table>
      )}
    </>
  );
}

function Feedback() {
  const [targetId, setTargetId] = useState('event');
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof adminApi.listFeedback>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setSummary(await adminApi.listFeedback(targetId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={targetId} onChange={(e) => setTargetId(e.target.value)}
          placeholder="targetId (e.g. event or agenda_001)" />
        <button onClick={() => void load()}>Load</button>
      </div>
      {error && <div className="error">{error}</div>}
      {summary && (
        <>
          <p>
            <strong>{summary.count}</strong> response(s) · avg rating{' '}
            <strong>{summary.averageRating}</strong>
          </p>
          <table>
            <thead><tr><th>By</th><th>Rating</th><th>Comments</th><th>When</th></tr></thead>
            <tbody>
              {summary.items.map((f, i) => (
                <tr key={i}>
                  <td>{f.attendeeId}</td>
                  <td>{f.rating}</td>
                  <td>{f.comments}</td>
                  <td className="muted">{new Date(f.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {summary.items.length === 0 && <tr><td colSpan={4} className="muted">No feedback yet.</td></tr>}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}


/**
 * Reported direct messages (App Store guideline 1.2). Read-only: staff see who reported what
 * and can follow up in the Messages inbox — messages have no separate moderation action.
 */
function ReportedMessages() {
  const [items, setItems] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setItems(await adminApi.listReports('message'));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <div className="error">{error}</div>;
  if (items.length === 0) return <p className="muted">No reported messages.</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Reported</th>
          <th>Reason</th>
          <th>Message</th>
          <th>Reported by</th>
          <th>Conversation</th>
        </tr>
      </thead>
      <tbody>
        {items.map((r) => (
          <tr key={r.id}>
            <td>{new Date(r.createdAt).toLocaleString()}</td>
            <td>
              <strong>{r.reason}</strong>
              {r.note ? <div className="muted">{r.note}</div> : null}
            </td>
            <td>{r.summary}</td>
            <td className="muted">{r.reportedBy}</td>
            <td className="muted">{r.conversationId ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
