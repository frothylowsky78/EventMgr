/**
 * Agenda items store wall-clock date + time in the event's timezone (`2026-09-15` / `09:00`),
 * while itinerary items store ISO-8601 with an offset. Copying one to the other means resolving
 * what the offset actually was in that zone on that date.
 */

/** Offset like `-07:00` for `zone` at instant `at`. Falls back to UTC for an unknown zone. */
function zoneOffset(zone: string, at: Date): string {
  try {
    const name = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value;
    return /GMT([+-]\d{2}:\d{2})/.exec(name ?? '')?.[1] ?? '+00:00';
  } catch {
    return '+00:00';
  }
}

/**
 * `('2026-09-15', '09:00', 'America/Los_Angeles')` -> `'2026-09-15T09:00:00-07:00'`.
 *
 * Two passes because the offset depends on the instant and the instant depends on the offset:
 * pass one reads the zone as if the wall clock were UTC, pass two re-reads it at the resulting
 * instant. Only a wall-clock time inside a DST transition could still land on the wrong side,
 * and no event schedules sessions there.
 */
export function localToIso(date: string, time: string, zone: string): string {
  const naive = `${date}T${time.length === 5 ? `${time}:00` : time}`;
  const firstPass = zoneOffset(zone, new Date(`${naive}Z`));
  return `${naive}${zoneOffset(zone, new Date(`${naive}${firstPass}`))}`;
}
