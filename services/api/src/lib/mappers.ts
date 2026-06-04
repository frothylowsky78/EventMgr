import type { AgendaItem, Attendee, EventProfile, ItineraryItem } from '@eventmgr/shared-types';

/**
 * Map raw DynamoDB items (which carry PK/SK/GSI* attributes) to clean domain shapes
 * returned by the API. Keeping projection logic here ensures private fields and storage
 * keys never leak through the API surface.
 */

type Item = Record<string, any>;

export const toEvent = (i: Item): EventProfile => ({
  id: i.id,
  name: i.name,
  startDate: i.startDate,
  endDate: i.endDate,
  locationName: i.locationName,
  address: i.address,
  timezone: i.timezone,
  registrationDeadline: i.registrationDeadline ?? null,
  branding: {
    logoUrl: i.branding?.logoUrl ?? '',
    heroImageUrl: i.branding?.heroImageUrl ?? '',
    primaryColor: i.branding?.primaryColor ?? '',
    secondaryColor: i.branding?.secondaryColor ?? '',
  },
});

export const toAgendaItem = (i: Item): AgendaItem => ({
  id: i.id,
  eventId: i.eventId,
  title: i.title,
  date: i.date,
  startTime: i.startTime,
  endTime: i.endTime,
  locationId: i.locationId ?? null,
  category: i.category,
  description: i.description ?? '',
  speaker: i.speaker ?? '',
  dressCode: i.dressCode ?? '',
  mapLink: i.mapLink ?? '',
  required: Boolean(i.required),
  capacity: i.capacity ?? null,
  eligibleTags: i.eligibleTags ?? [],
  reminderEnabled: i.reminderEnabled ?? true,
  published: i.published ?? true,
});

export const toItineraryItem = (i: Item): ItineraryItem => ({
  id: i.id,
  attendeeId: i.attendeeId,
  agendaItemId: i.agendaItemId ?? null,
  customTitle: i.customTitle ?? null,
  startDateTime: i.startDateTime,
  endDateTime: i.endDateTime,
  locationId: i.locationId ?? null,
  notes: i.notes ?? '',
  transportationNote: i.transportationNote ?? '',
  reminderEnabled: i.reminderEnabled ?? true,
  visibility: i.visibility ?? 'private',
});

/** Full attendee — only for the owner (/me) or admins. */
export const toAttendee = (i: Item): Attendee => ({
  id: i.id,
  eventId: i.eventId,
  firstName: i.firstName,
  lastName: i.lastName,
  email: i.email,
  phone: i.phone ?? '',
  company: i.company ?? '',
  title: i.title ?? '',
  city: i.city ?? '',
  profilePhotoUrl: i.profilePhotoUrl ?? '',
  dietaryRestrictions: i.dietaryRestrictions ?? [],
  accessibilityNeeds: i.accessibilityNeeds ?? '',
  guestName: i.guestName ?? '',
  directoryVisible: i.directoryVisible ?? true,
  contactSharingOptIn: i.contactSharingOptIn ?? false,
  registrationStatus: i.registrationStatus ?? 'not_started',
  tags: i.tags ?? [],
  enabled: i.enabled ?? true,
});
