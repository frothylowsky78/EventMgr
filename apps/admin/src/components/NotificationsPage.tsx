import { useEffect, useState } from 'react';
import type { NotificationRecord } from '@eventmgr/shared-types';
import { adminApi } from '../api';
import { NotificationComposer } from './NotificationComposer';

export function NotificationsPage() {
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [composing, setComposing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await adminApi.listNotifications());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function act(fn: () => Promise<unknown>) {
    try {
      await fn();
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Action failed');
    }
  }

  if (composing) {
    return (
      <NotificationComposer
        onDone={() => {
          setComposing(false);
          void load();
        }}
      />
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Notifications</h2>
        <button onClick={() => setComposing(true)}>+ New notification</button>
      </div>

      {loading && <p className="muted">Loading…</p>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && (
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Title</th><th>Audience</th><th>Priority</th><th>Status</th>
              <th>Sent / Recipients</th><th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((n) => (
              <tr key={n.id}>
                <td>
                  {n.title}
                  <div className="muted" style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.body}
                  </div>
                </td>
                <td>{n.target.type.replace(/_/g, ' ')}</td>
                <td>{n.priority}</td>
                <td><span className="tag">{n.status}</span></td>
                <td>{n.status === 'sent' ? `${n.successCount}/${n.recipientCount}` : n.recipientCount}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="secondary" onClick={() => act(() => adminApi.duplicateNotification(n.id))}>
                    Duplicate
                  </button>
                  {(n.status === 'scheduled' || n.status === 'draft') && (
                    <button className="secondary" style={{ marginLeft: 6 }}
                      onClick={() => act(() => adminApi.cancelNotification(n.id))}>
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="muted">No notifications yet.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
