import type {
  AgendaItem,
  Attendee,
  AttendeeCard,
  DeviceTokenRecord,
  DiningItem,
  DiningSeat,
  EventProfile,
  FaqItem,
  ItineraryItem,
  NotificationCenterItem,
  NotificationRecord,
  Photo,
  TransportationItem,
  TravelDetail,
  WeatherInfo,
} from '@eventmgr/shared-types';

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

export const toNotification = (i: Item): NotificationRecord => ({
  id: i.id,
  eventId: i.eventId,
  title: i.title,
  body: i.body,
  target: i.target ?? { type: 'all', criteria: {} },
  deepLink: i.deepLink ?? null,
  priority: i.priority ?? 'normal',
  status: i.status ?? 'draft',
  sendMode: i.sendMode ?? 'now',
  sendAt: i.sendAt ?? null,
  expiresAt: i.expiresAt ?? null,
  internalNote: i.internalNote ?? '',
  createdByAdminId: i.createdByAdminId ?? '',
  createdAt: i.createdAt,
  updatedAt: i.updatedAt ?? i.createdAt,
  recipientCount: i.recipientCount ?? 0,
  successCount: i.successCount ?? 0,
  failureCount: i.failureCount ?? 0,
});

export const toDeviceToken = (i: Item): DeviceTokenRecord => ({
  id: i.id,
  attendeeId: i.attendeeId,
  eventId: i.eventId,
  platform: i.platform,
  deviceToken: i.deviceToken,
  enabled: i.enabled ?? true,
  createdAt: i.createdAt,
  lastSeenAt: i.lastSeenAt ?? i.createdAt,
});

export const toCenterItem = (i: Item): NotificationCenterItem => ({
  notificationId: i.notificationId,
  title: i.title,
  body: i.body,
  deepLink: i.deepLink ?? null,
  priority: i.priority ?? 'normal',
  createdAt: i.createdAt,
  read: i.read ?? false,
});

export const toDiningItem = (i: Item): DiningItem => ({
  id: i.id,
  eventId: i.eventId,
  title: i.title,
  date: i.date,
  startTime: i.startTime,
  endTime: i.endTime,
  locationId: i.locationId ?? null,
  description: i.description ?? '',
  menu: i.menu ?? [],
  dressCode: i.dressCode ?? '',
  dietaryNotes: i.dietaryNotes ?? '',
  seatingAssignmentEnabled: i.seatingAssignmentEnabled ?? false,
  mapLink: i.mapLink ?? '',
  published: i.published ?? true,
});

export const toDiningSeat = (i: Item): DiningSeat => ({
  diningId: i.diningId,
  attendeeId: i.attendeeId,
  table: i.table ?? '',
  seat: i.seat ?? '',
  note: i.note ?? '',
});

export const toTravelDetail = (i: Item): TravelDetail => ({
  attendeeId: i.attendeeId,
  eventId: i.eventId,
  arrivalFlight: i.arrivalFlight ?? '',
  arrivalDateTime: i.arrivalDateTime ?? '',
  departureFlight: i.departureFlight ?? '',
  departureDateTime: i.departureDateTime ?? '',
  transferGroup: i.transferGroup ?? '',
  hotelName: i.hotelName ?? '',
  hotelConfirmation: i.hotelConfirmation ?? '',
  checkInDate: i.checkInDate ?? '',
  checkOutDate: i.checkOutDate ?? '',
  notes: i.notes ?? '',
});

export const toTransportationItem = (i: Item): TransportationItem => ({
  id: i.id,
  eventId: i.eventId,
  attendeeId: i.attendeeId,
  transferType: i.transferType ?? '',
  group: i.group ?? '',
  pickupDateTime: i.pickupDateTime ?? '',
  pickupLocation: i.pickupLocation ?? '',
  dropoffLocation: i.dropoffLocation ?? '',
  vendor: i.vendor ?? '',
  contactPhone: i.contactPhone ?? '',
  vehicleDescription: i.vehicleDescription ?? '',
  notes: i.notes ?? '',
  mapLink: i.mapLink ?? '',
  status: i.status ?? 'scheduled',
});

export const toPhoto = (i: Item): Photo => ({
  id: i.id,
  eventId: i.eventId,
  uploadedByAttendeeId: i.uploadedByAttendeeId,
  albumId: i.albumId ?? null,
  caption: i.caption ?? '',
  status: i.status ?? 'pending',
  featured: i.featured ?? false,
  likeCount: i.likeCount ?? 0,
  contentType: i.contentType ?? 'image/jpeg',
  createdAt: i.createdAt,
});

export const toFaqItem = (i: Item): FaqItem => ({
  id: i.id,
  eventId: i.eventId,
  category: i.category,
  question: i.question,
  answer: i.answer,
  featured: i.featured ?? false,
  order: i.order ?? 0,
  published: i.published ?? true,
});

export const toWeather = (i: Item): WeatherInfo => ({
  current: i.current ?? null,
  daily: i.daily ?? [],
  notes: i.notes ?? [],
  updatedAt: i.updatedAt,
});

/** Public yearbook card — excludes private fields (phone, dietary, accessibility, email). */
export const toAttendeeCard = (i: Item): AttendeeCard => ({
  id: i.id,
  firstName: i.firstName,
  lastName: i.lastName,
  company: i.company ?? '',
  title: i.title ?? '',
  city: i.city ?? '',
  profilePhotoUrl: i.profilePhotoUrl ?? '',
  guestName: i.guestName ?? '',
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
