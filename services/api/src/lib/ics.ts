/** Minimal RFC-5545 iCalendar generation for calendar export (spec §4.18). */

function escapeText(s: string): string {
  return (s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** ISO-8601 (with offset) -> UTC basic format YYYYMMDDTHHMMSSZ. */
function toIcsUtc(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export interface IcsEvent {
  uid: string;
  start: string; // ISO-8601 with offset
  end?: string;
  summary: string;
  location?: string;
  description?: string;
}

export function buildIcs(calendarName: string, events: IcsEvent[]): string {
  const stamp = toIcsUtc(new Date().toISOString());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventMgr//Event App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  for (const e of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART:${toIcsUtc(e.start)}`);
    if (e.end) lines.push(`DTEND:${toIcsUtc(e.end)}`);
    lines.push(`SUMMARY:${escapeText(e.summary)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
