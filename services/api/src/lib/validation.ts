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

// --- Dining (spec §4.13) ---
export const diningCreateSchema = z.object({
  title: z.string().min(1).max(200),
  date: dateStr,
  startTime: timeStr,
  endTime: timeStr.optional(),
  locationId: z.string().optional(),
  description: z.string().max(5000).optional(),
  menu: z.array(z.string()).optional(),
  dressCode: z.string().max(200).optional(),
  dietaryNotes: z.string().max(2000).optional(),
  seatingAssignmentEnabled: z.boolean().optional(),
  mapLink: z.string().url().optional().or(z.literal('')),
  published: z.boolean().optional(),
});
export const diningUpdateSchema = diningCreateSchema.partial();

// --- Travel (spec §4.10) ---
export const travelUpsertSchema = z.object({
  arrivalFlight: z.string().max(50).optional(),
  arrivalDateTime: z.string().datetime({ offset: true }).optional().or(z.literal('')),
  departureFlight: z.string().max(50).optional(),
  departureDateTime: z.string().datetime({ offset: true }).optional().or(z.literal('')),
  transferGroup: z.string().max(100).optional(),
  hotelName: z.string().max(200).optional(),
  hotelConfirmation: z.string().max(100).optional(),
  checkInDate: dateStr.optional().or(z.literal('')),
  checkOutDate: dateStr.optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
});

// --- Transportation (spec §4.11) ---
const transportStatus = z.enum(['scheduled', 'delayed', 'changed', 'completed']);
export const transportationCreateSchema = z.object({
  attendeeId: z.string().min(1),
  transferType: z.string().min(1).max(200),
  group: z.string().max(100).optional(),
  pickupDateTime: z.string().datetime({ offset: true }).optional().or(z.literal('')),
  pickupLocation: z.string().max(300).optional(),
  dropoffLocation: z.string().max(300).optional(),
  vendor: z.string().max(200).optional(),
  contactPhone: z.string().max(50).optional(),
  vehicleDescription: z.string().max(300).optional(),
  notes: z.string().max(2000).optional(),
  mapLink: z.string().url().optional().or(z.literal('')),
  status: transportStatus.optional(),
});
export const transportationUpdateSchema = transportationCreateSchema
  .omit({ attendeeId: true })
  .partial();

// --- FAQ (spec §4.9) ---
const faqCategory = z.enum([
  'event_overview',
  'travel',
  'hotel',
  'dining',
  'activities',
  'dress_code',
  'transportation',
  'weather',
  'registration',
  'accessibility',
  'emergency',
  'app_support',
]);
export const faqCreateSchema = z.object({
  category: faqCategory,
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(5000),
  featured: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  published: z.boolean().optional(),
});
export const faqUpdateSchema = faqCreateSchema.partial();

// --- Weather (spec §4.17) ---
const weatherDay = z.object({
  date: dateStr,
  highF: z.number(),
  lowF: z.number(),
  condition: z.string().max(100),
  precipChance: z.number().min(0).max(100).optional(),
});
const weatherNote = z.object({
  id: z.string(),
  title: z.string().max(150),
  body: z.string().max(2000),
  createdAt: z.string(),
});
export const weatherUpsertSchema = z.object({
  current: z
    .object({ tempF: z.number(), condition: z.string().max(100) })
    .nullable()
    .optional(),
  daily: z.array(weatherDay).optional(),
  notes: z.array(weatherNote).optional(),
});

// --- Feedback (spec §4.16) ---
export const feedbackCreateSchema = z.object({
  type: z.enum(['event', 'session', 'activity', 'meal', 'nps']),
  targetId: z.string().min(1).max(100),
  rating: z.number().min(0).max(10),
  comments: z.string().max(2000).optional(),
  wouldRecommend: z.boolean().optional(),
  issueFlag: z.boolean().optional(),
  anonymous: z.boolean().optional(),
});

// --- Help (spec §4.15) ---
export const helpRequestCreateSchema = z.object({
  category: z.string().min(1).max(100),
  message: z.string().min(1).max(2000),
  urgency: z.enum(['low', 'normal', 'high']).optional(),
  contactPreference: z.string().max(200).optional(),
});
export const helpRequestUpdateSchema = z.object({
  status: z.enum(['open', 'assigned', 'resolved']).optional(),
  assignedTo: z.string().nullable().optional(),
});
export const helpContentUpsertSchema = z.object({
  contacts: z
    .array(
      z.object({
        label: z.string().max(150),
        phone: z.string().max(50).optional(),
        email: z.string().max(200).optional(),
        note: z.string().max(300).optional(),
      })
    )
    .optional(),
  topics: z
    .array(z.object({ title: z.string().max(200), body: z.string().max(2000) }))
    .optional(),
  emergencyText: z.string().max(1000).optional(),
  lostAndFound: z.string().max(1000).optional(),
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
