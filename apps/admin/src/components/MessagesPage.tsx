import { useEffect, useRef, useState } from 'react';
import type { Conversation, Message } from '@eventmgr/shared-types';
import { adminApi } from '../api';

/**
 * Staff inbox (CF-6). Reuses the attendee conversation endpoints: an admin token resolves
 * server-side to the shared per-event staff partition, so chat added no /admin/* routes.
 *
 * Polls rather than holding a socket — push is cut from v1, so there is nothing a socket
 * could surface that a 30s poll doesn't.
 */
const POLL_MS = 30_000;

export function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const list = await adminApi.listConversations();
      setConversations(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, []);

  if (selected) {
    return (
      <Thread
        conversation={selected}
        onBack={() => {
          setSelected(null);
          void load();
        }}
      />
    );
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Messages</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Conversations attendees have started with the event team. Refreshes every 30 seconds.
      </p>
      {loading && <p className="muted">Loading…</p>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && (
        <table>
          <thead><tr><th>From</th><th>Last message</th><th>When</th><th>Unread</th><th></th></tr></thead>
          <tbody>
            {conversations.map((c) => (
              <tr key={c.id}>
                <td>{c.participants.filter((p) => p.type !== 'staff').map((p) => p.name).join(', ') || '—'}</td>
                <td>{c.lastMessagePreview}</td>
                <td>{c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : '—'}</td>
                <td>{c.unreadCount > 0 ? <span className="tag">{c.unreadCount}</span> : ''}</td>
                <td><button className="secondary" onClick={() => setSelected(c)}>Open</button></td>
              </tr>
            ))}
            {conversations.length === 0 && (
              <tr><td colSpan={5} className="muted">No conversations yet.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Thread({ conversation, onBack }: { conversation: Conversation; onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      setMessages(await adminApi.conversationMessages(conversation.id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the conversation');
    }
  }

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.sendMessage(conversation.id, body.trim());
      setBody('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  }

  const who = conversation.participants
    .filter((p) => p.type !== 'staff')
    .map((p) => p.name)
    .join(', ');

  return (
    <div className="card">
      <button className="secondary" onClick={onBack}>← Back to messages</button>
      <h2>{who || 'Conversation'}</h2>

      <div style={{ maxHeight: 420, overflowY: 'auto', padding: 8, border: '1px solid #eee', borderRadius: 8 }}>
        {messages.length === 0 && <p className="muted">No messages yet.</p>}
        {messages.map((m) => {
          const fromStaff = m.senderType === 'staff';
          return (
            <div key={m.id} style={{ textAlign: fromStaff ? 'right' : 'left', marginBottom: 10 }}>
              <div style={{
                display: 'inline-block', maxWidth: '75%', padding: '8px 12px', borderRadius: 12,
                background: fromStaff ? '#1A2B4C' : '#eef0f4',
                color: fromStaff ? '#fff' : 'inherit', textAlign: 'left',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8 }}>
                  {fromStaff ? 'Event team' : m.senderName}
                </div>
                <div>{m.body}</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                  {new Date(m.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {error && <div className="error">{error}</div>}
      <form onSubmit={send} className="row" style={{ marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <input value={body} placeholder="Reply as the event team"
            onChange={(e) => setBody(e.target.value)} />
        </div>
        <div style={{ flex: '0 0 auto', alignSelf: 'end' }}>
          <button type="submit" disabled={busy || !body.trim()}>{busy ? 'Sending…' : 'Send'}</button>
        </div>
      </form>
    </div>
  );
}
