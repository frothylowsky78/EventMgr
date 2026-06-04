/**
 * Shared domain types and API envelopes for the EventMgr platform.
 * Consumed by the API (services/api) and the admin portal (apps/admin).
 * The Flutter app mirrors these shapes in apps/mobile/lib/domain.
 */

// ---------------------------------------------------------------------------
// API envelopes
// ---------------------------------------------------------------------------
export interface ApiSuccess<T> {
  data: T;
}

export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'INTERNAL';

export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ---------------------------------------------------------------------------
// Auth / roles
// ---------------------------------------------------------------------------
export type Role = 'attendee' | 'event_staff' | 'event_admin' | 'super_admin';

export interface AuthContext {
  /** Cognito subject (sub). */
  userId: string;
  email?: string;
  /** Present for attendee tokens; injected by PreTokenGeneration as custom:attendeeId. */
  attendeeId?: string;
  eventId?: string;
  roles: Role[];
}

// ---------------------------------------------------------------------------
// Domain entities
// ---------------------------------------------------------------------------
export interface Branding {
  logoUrl: string;
  heroImageUrl: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface EventProfile {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  locationName: string;
  address: string;
  timezone: string; // IANA, e.g. America/Los_Angeles
  registrationDeadline?: string | null; // ISO-8601
  branding: Branding;
}

export type AgendaCategory =
  | 'general_session'
  | 'meal'
  | 'activity'
  | 'transportation'
  | 'free_time'
  | 'optional_event'
  | 'private_appointment';

export interface AgendaItem {
  id: string;
  eventId: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string; // HH:mm
  locationId?: string | null;
  category: AgendaCategory;
  description?: string;
  speaker?: string;
  dressCode?: string;
  mapLink?: string;
  required: boolean;
  capacity?: number | null;
  eligibleTags: string[];
  reminderEnabled: boolean;
  published: boolean;
}

export interface ItineraryItem {
  id: string;
  attendeeId: string;
  agendaItemId?: string | null;
  customTitle?: string | null;
  startDateTime: string; // ISO-8601 with offset
  endDateTime?: string; // ISO-8601 with offset
  locationId?: string | null;
  notes?: string;
  transportationNote?: string;
  reminderEnabled: boolean;
  visibility: 'private' | 'shared';
}

export type RegistrationStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'past_due';

export interface Attendee {
  id: string;
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  city?: string;
  profilePhotoUrl?: string;
  dietaryRestrictions: string[];
  accessibilityNeeds?: string;
  guestName?: string;
  directoryVisible: boolean;
  contactSharingOptIn: boolean;
  registrationStatus: RegistrationStatus;
  tags: string[];
  enabled: boolean;
}

/** Public yearbook projection — excludes private fields (phone, dietary, accessibility). */
export interface AttendeeCard {
  id: string;
  firstName: string;
  lastName: string;
  company?: string;
  title?: string;
  city?: string;
  profilePhotoUrl?: string;
  guestName?: string;
}

// ---------------------------------------------------------------------------
// Request payloads (admin)
// ---------------------------------------------------------------------------
export interface AgendaItemCreate {
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  locationId?: string;
  category: AgendaCategory;
  description?: string;
  speaker?: string;
  dressCode?: string;
  mapLink?: string;
  required?: boolean;
  capacity?: number | null;
  eligibleTags?: string[];
  reminderEnabled?: boolean;
  published?: boolean;
}

export type AgendaItemUpdate = Partial<AgendaItemCreate>;

export const AGENDA_CATEGORIES: AgendaCategory[] = [
  'general_session',
  'meal',
  'activity',
  'transportation',
  'free_time',
  'optional_event',
  'private_appointment',
];

// ---------------------------------------------------------------------------
// Push notifications (spec §4.7, §18.7, §18.16)
// ---------------------------------------------------------------------------
export type NotificationPriority = 'normal' | 'important' | 'urgent';

export type NotificationStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'cancelled';

/** Deep-link destinations a notification can open (spec §9). */
export type DeepLinkType =
  | 'agenda'
  | 'itinerary'
  | 'dining'
  | 'transportation'
  | 'travel'
  | 'announcement'
  | 'photos'
  | 'faq'
  | 'help';

export interface DeepLink {
  type: DeepLinkType;
  id?: string;
}

/** How an audience is selected. Not all are resolvable from attendee fields yet — see API. */
export type NotificationTargetType =
  | 'all'
  | 'individuals'
  | 'tag'
  | 'activity'
  | 'transportation'
  | 'dining'
  | 'incomplete_registration'
  | 'missing_travel'
  | 'staff';

export interface NotificationTargetCriteria {
  attendeeIds?: string[];
  tags?: string[];
  activityId?: string | null;
  transportationGroup?: string | null;
  diningId?: string | null;
}

export interface NotificationTarget {
  type: NotificationTargetType;
  criteria?: NotificationTargetCriteria;
}

export interface NotificationRecord {
  id: string;
  eventId: string;
  title: string;
  body: string;
  target: NotificationTarget;
  deepLink?: DeepLink | null;
  priority: NotificationPriority;
  status: NotificationStatus;
  sendMode: 'now' | 'scheduled';
  sendAt?: string | null; // ISO-8601, required when scheduled
  expiresAt?: string | null;
  internalNote?: string;
  createdByAdminId: string;
  createdAt: string;
  updatedAt: string;
  recipientCount: number;
  successCount: number;
  failureCount: number;
}

/** Admin compose payload. */
export interface NotificationCreate {
  title: string;
  body: string;
  target: NotificationTarget;
  deepLink?: DeepLink | null;
  priority?: NotificationPriority;
  sendMode?: 'now' | 'scheduled';
  sendAt?: string | null;
  expiresAt?: string | null;
  internalNote?: string;
}

/** Audience preview shown before sending (spec §18.16 Notification Preview). */
export interface AudiencePreview {
  recipientCount: number;
  description: string;
}

/** In-app notification center item (per attendee). */
export interface NotificationCenterItem {
  notificationId: string;
  title: string;
  body: string;
  deepLink?: DeepLink | null;
  priority: NotificationPriority;
  createdAt: string;
  read: boolean;
}

export type DevicePlatform = 'ios' | 'android';

export interface DeviceTokenRecord {
  id: string;
  attendeeId: string;
  eventId: string;
  platform: DevicePlatform;
  deviceToken: string;
  enabled: boolean;
  createdAt: string;
  lastSeenAt: string;
}

export interface DeviceTokenRegister {
  platform: DevicePlatform;
  deviceToken: string;
}

// ---------------------------------------------------------------------------
// Dining (spec §4.13)
// ---------------------------------------------------------------------------
export interface DiningItem {
  id: string;
  eventId: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string;
  locationId?: string | null;
  description?: string;
  menu: string[];
  dressCode?: string;
  dietaryNotes?: string;
  seatingAssignmentEnabled: boolean;
  mapLink?: string;
  published: boolean;
}

export interface DiningItemCreate {
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  locationId?: string;
  description?: string;
  menu?: string[];
  dressCode?: string;
  dietaryNotes?: string;
  seatingAssignmentEnabled?: boolean;
  mapLink?: string;
  published?: boolean;
}
export type DiningItemUpdate = Partial<DiningItemCreate>;

/** A diner's personal seat for a dining item (private to the attendee + admins). */
export interface DiningSeat {
  diningId: string;
  attendeeId: string;
  table?: string;
  seat?: string;
  note?: string;
}

/** Dining item with the caller's personal seating merged in (GET /me/dining). */
export interface PersonalDiningItem extends DiningItem {
  seating?: DiningSeat | null;
}

// ---------------------------------------------------------------------------
// Travel (spec §4.10) — personal, owner/admin only
// ---------------------------------------------------------------------------
export interface TravelDetail {
  attendeeId: string;
  eventId: string;
  arrivalFlight?: string;
  arrivalDateTime?: string; // ISO-8601
  departureFlight?: string;
  departureDateTime?: string; // ISO-8601
  transferGroup?: string;
  hotelName?: string;
  hotelConfirmation?: string;
  checkInDate?: string;
  checkOutDate?: string;
  notes?: string;
}
export type TravelDetailUpsert = Omit<TravelDetail, 'attendeeId' | 'eventId'>;

// ---------------------------------------------------------------------------
// Transportation (spec §4.11) — per-attendee/group assignment
// ---------------------------------------------------------------------------
export type TransportationStatus = 'scheduled' | 'delayed' | 'changed' | 'completed';

export interface TransportationItem {
  id: string;
  eventId: string;
  attendeeId: string;
  transferType: string; // e.g. "Airport arrival shuttle"
  group?: string; // shuttle group label
  pickupDateTime?: string; // ISO-8601
  pickupLocation?: string;
  dropoffLocation?: string;
  vendor?: string;
  contactPhone?: string;
  vehicleDescription?: string;
  notes?: string;
  mapLink?: string;
  status: TransportationStatus;
}

export interface TransportationCreate {
  attendeeId: string;
  transferType: string;
  group?: string;
  pickupDateTime?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  vendor?: string;
  contactPhone?: string;
  vehicleDescription?: string;
  notes?: string;
  mapLink?: string;
  status?: TransportationStatus;
}
export type TransportationUpdate = Partial<Omit<TransportationCreate, 'attendeeId'>>;

// ---------------------------------------------------------------------------
// Photos & gallery (spec §4.14, §18.5)
// ---------------------------------------------------------------------------
export type PhotoStatus = 'pending' | 'approved' | 'hidden' | 'rejected';

export interface Photo {
  id: string;
  eventId: string;
  uploadedByAttendeeId: string;
  albumId?: string | null;
  caption?: string;
  status: PhotoStatus;
  featured: boolean;
  likeCount: number;
  contentType: string;
  createdAt: string;
  /** Presigned, time-limited URLs (only populated on read responses). */
  imageUrl?: string;
  thumbnailUrl?: string;
}

export interface PhotoUploadRequest {
  contentType: string;
  caption?: string;
  albumId?: string;
}

export interface PhotoUploadTicket {
  photoId: string;
  uploadUrl: string;
  /** Echo of the moderation decision the photo will land in once uploaded. */
  status: PhotoStatus;
}

/** Admin patch for moderation (spec §18.5). */
export interface PhotoModeration {
  status?: PhotoStatus;
  featured?: boolean;
  albumId?: string | null;
}
