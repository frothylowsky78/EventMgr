import { randomUUID } from 'node:crypto';

/** Short, prefixed, URL-safe id, e.g. agenda_3f9a1c2b. */
export const newId = (prefix: string): string =>
  `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
