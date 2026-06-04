/**
 * Minimal dependency-free CSV parser/serializer (RFC-4180-ish): handles quoted fields,
 * embedded commas/quotes/newlines, and CRLF/LF. Sufficient for the admin import/export
 * templates in tools/import-templates.
 */

export function parseCsv(input: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  const text = input.replace(/^﻿/, ''); // strip BOM
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      // Skip fully-empty lines.
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cols) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (cols[idx] ?? '').trim();
    });
    return obj;
  });
}

function escapeCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const lines = [columns.join(',')];
  for (const r of rows) {
    lines.push(columns.map((c) => escapeCell(r[c])).join(','));
  }
  return lines.join('\r\n');
}

/** Split a `;`-separated multi-value cell into a trimmed array (import templates use ';'). */
export const splitMulti = (cell: string): string[] =>
  (cell ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

export const parseBool = (cell: string): boolean => /^(true|yes|1)$/i.test((cell ?? '').trim());
