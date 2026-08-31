import { useEffect, useState } from 'react';
import type { Photo, PhotoStatus } from '@eventmgr/shared-types';
import { adminApi } from '../api';

/** 'reported' is not a status — it spans every status (App Store guideline 1.2). */
type Tab = PhotoStatus | 'reported';

const TABS: Tab[] = ['pending', 'approved', 'hidden', 'rejected', 'reported'];

export function PhotosPage() {
  const [status, setStatus] = useState<Tab>('pending');
  const [items, setItems] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(
        status === 'reported'
          ? await adminApi.listReportedPhotos()
          : await adminApi.listPhotos(status)
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function moderate(photo: Photo, patch: Parameters<typeof adminApi.moderatePhoto>[1]) {
    try {
      await adminApi.moderatePhoto(photo.id, patch);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Action failed');
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Photo moderation</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {TABS.map((t) => (
            <button key={t} className={t === status ? '' : 'secondary'} onClick={() => setStatus(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="muted">Loading…</p>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginTop: 14 }}>
          {items.map((p) => (
            <div key={p.id} className="card" style={{ padding: 10 }}>
              {p.thumbnailUrl ? (
                <img src={p.thumbnailUrl} alt={p.caption ?? ''}
                  style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 8 }} />
              ) : (
                <div style={{ height: 150, background: '#eee', borderRadius: 8, display: 'grid', placeItems: 'center' }}
                  className="muted">processing…</div>
              )}
              {p.reported && (
                <div style={{ color: '#b3261e', fontSize: 12, fontWeight: 600, marginTop: 6 }}>
                  ⚠ Reported ×{p.reportCount ?? 1}
                </div>
              )}
              {p.caption && <div style={{ fontSize: 13, marginTop: 6 }}>{p.caption}</div>}
              <div className="muted" style={{ fontSize: 12, margin: '4px 0' }}>
                {p.featured ? '★ featured · ' : ''}{p.likeCount} likes
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {p.status !== 'approved' && (
                  <button onClick={() => moderate(p, { status: 'approved' })}>Approve</button>
                )}
                {p.status !== 'hidden' && (
                  <button className="secondary" onClick={() => moderate(p, { status: 'hidden' })}>Hide</button>
                )}
                {p.status !== 'rejected' && (
                  <button className="secondary" onClick={() => moderate(p, { status: 'rejected' })}>Reject</button>
                )}
                <button className="secondary" onClick={() => moderate(p, { featured: !p.featured })}>
                  {p.featured ? 'Unfeature' : 'Feature'}
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="muted">
              {status === 'reported' ? 'No reported photos.' : `No ${status} photos.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
