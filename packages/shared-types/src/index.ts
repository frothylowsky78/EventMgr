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
