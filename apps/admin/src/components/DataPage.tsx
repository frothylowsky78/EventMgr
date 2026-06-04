import { useState } from 'react';
import { adminApi } from '../api';

const ATTENDEE_HEADER =
  'firstName,lastName,email,phone,company,title,city,dietaryRestrictions,accessibilityNeeds,guestName,tags,accessCode,directoryVisible,contactSharingOptIn';
const AGENDA_HEADER =
  'title,date,startTime,endTime,category,locationId,description,speaker,dressCode,required,capacity,eligibleTags,published';

export function DataPage() {
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Import / Export</h2>
      <ImportBlock
        title="Attendees"
        header={ATTENDEE_HEADER}
        hint="Multi-value cells (dietaryRestrictions, tags) use ';'. Re-importing an email updates that attendee."
        onImport={(csv) => adminApi.importAttendees(csv)}
      />
      <ImportBlock
        title="Agenda"
        header={AGENDA_HEADER}
        hint="category ∈ general_session, meal, activity, transportation, free_time, optional_event, private_appointment"
        onImport={(csv) => adminApi.importAgenda(csv)}
      />
      <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
      <h3>Exports</h3>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="secondary" onClick={() => adminApi.exportAttendees()}>Download attendees CSV</button>
        <button className="secondary" onClick={() => adminApi.exportFeedback('event')}>Download event feedback CSV</button>
      </div>
    </div>
  );
}

function ImportBlock({
  title,
  header,
  hint,
  onImport,
}: {
  title: string;
  header: string;
  hint: string;
  onImport: (csv: string) => Promise<{ imported: number; errors: { row: number; message: string }[] }>;
}) {
  const [csv, setCsv] = useState(header + '\n');
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | null) {
    if (file) setCsv(await file.text());
  }

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const r = await onImport(csv);
      setResult(`Imported ${r.imported}. ${r.errors.length ? `Errors: ` + r.errors.map((e) => `row ${e.row}: ${e.message}`).join('; ') : 'No errors.'}`);
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ marginBottom: 4 }}>{title}</h3>
      <p className="muted" style={{ marginTop: 0 }}>{hint}</p>
      <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      <textarea rows={5} value={csv} onChange={(e) => setCsv(e.target.value)}
        style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12 }} />
      <div style={{ marginTop: 8 }}>
        <button disabled={busy} onClick={run}>{busy ? 'Importing…' : `Import ${title.toLowerCase()}`}</button>
      </div>
      {result && <div className="muted" style={{ marginTop: 8 }}>{result}</div>}
    </div>
  );
}
