import { z } from 'zod';
import { ApiException } from './http';

export const agendaCategory = z.enum([
  'general_session',
  'meal',
  'activity',
  'transportation',
  'free_time',
  'optional_event',
  'private_appointment',
]);

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const timeStr = z.string().regex(/^\d{2}:\d{2}$/, 'expected HH:mm');

export const agendaCreateSchema = z.object({
  title: z.string().min(1).max(200),
  date: dateStr,
  startTime: timeStr,
  endTime: timeStr.optional(),
  locationId: z.string().optional(),
  category: agendaCategory,
  description: z.string().max(5000).optional(),
  speaker: z.string().max(200).optional(),
  dressCode: z.string().max(200).optional(),
  mapLink: z.string().url().optional().or(z.literal('')),
  required: z.boolean().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  eligibleTags: z.array(z.string()).optional(),
  reminderEnabled: z.boolean().optional(),
  published: z.boolean().optional(),
});

export const agendaUpdateSchema = agendaCreateSchema.partial();

export function parseBody<T>(schema: z.ZodSchema<T>, raw: string | undefined): T {
  let json: unknown;
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    throw new ApiException('VALIDATION', 'Body is not valid JSON');
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ApiException('VALIDATION', 'Request validation failed', {
      issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  return result.data;
}
