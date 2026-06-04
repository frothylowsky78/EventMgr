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

// --- Notifications (spec §18.16) ---
const deepLinkSchema = z.object({
  type: z.enum([
    'agenda',
    'itinerary',
    'dining',
    'transportation',
    'travel',
    'announcement',
    'photos',
    'faq',
    'help',
  ]),
  id: z.string().optional(),
});

const targetSchema = z.object({
  type: z.enum([
    'all',
    'individuals',
    'tag',
    'activity',
    'transportation',
    'dining',
    'incomplete_registration',
    'missing_travel',
    'staff',
  ]),
  criteria: z
    .object({
      attendeeIds: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      activityId: z.string().nullable().optional(),
      transportationGroup: z.string().nullable().optional(),
      diningId: z.string().nullable().optional(),
    })
    .optional(),
});

export const notificationCreateSchema = z
  .object({
    title: z.string().min(1).max(150),
    body: z.string().min(1).max(2000),
    target: targetSchema,
    deepLink: deepLinkSchema.nullable().optional(),
    priority: z.enum(['normal', 'important', 'urgent']).optional(),
    sendMode: z.enum(['now', 'scheduled']).optional(),
    sendAt: z.string().datetime({ offset: true }).nullable().optional(),
    expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
    internalNote: z.string().max(1000).optional(),
  })
  .refine((d) => d.sendMode !== 'scheduled' || Boolean(d.sendAt), {
    message: 'sendAt is required when sendMode is "scheduled"',
    path: ['sendAt'],
  });

export const previewSchema = z.object({ target: targetSchema });

export const deviceTokenSchema = z.object({
  platform: z.enum(['ios', 'android']),
  deviceToken: z.string().min(1).max(512),
});

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
