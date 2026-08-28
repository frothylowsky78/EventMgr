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

export interface RegistrationAction {
  id: string;
  label: string;
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
  /** Pre-event action items shown on the registration card (spec §4.3). */
  registrationActions: RegistrationAction[];
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

export interface ItineraryItemCreate {
  agendaItemId?: string;
  customTitle?: string;
  startDateTime: string;
  endDateTime?: string;
  locationId?: string;
  notes?: string;
  transportationNote?: string;
  reminderEnabled?: boolean;
  visibility?: 'private' | 'shared';
}
export type ItineraryItemUpdate = Partial<ItineraryItemCreate>;

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
  /** IDs of completed registration actions (subset of event.registrationActions). */
  completedRegistrationActions: string[];
  tags: string[];
  enabled: boolean;
}

/** Admin patch of an attendee record. Tags drive notification targeting (see NotificationTarget). */
export interface AttendeeUpdate {
  tags?: string[];
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

// ---------------------------------------------------------------------------
// FAQ (spec §4.9)
// ---------------------------------------------------------------------------
export type FaqCategory =
  | 'event_overview'
  | 'travel'
  | 'hotel'
  | 'dining'
  | 'activities'
  | 'dress_code'
  | 'transportation'
  | 'weather'
  | 'registration'
  | 'accessibility'
  | 'emergency'
  | 'app_support';

export interface FaqItem {
  id: string;
  eventId: string;
  category: FaqCategory;
  question: string;
  answer: string;
  featured: boolean;
  order: number;
  published: boolean;
}

export interface FaqItemCreate {
  category: FaqCategory;
  question: string;
  answer: string;
  featured?: boolean;
  order?: number;
  published?: boolean;
}
export type FaqItemUpdate = Partial<FaqItemCreate>;

export const FAQ_CATEGORIES: FaqCategory[] = [
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
];

// ---------------------------------------------------------------------------
// Weather (spec §4.17)
// ---------------------------------------------------------------------------
export interface WeatherDay {
  date: string; // YYYY-MM-DD
  highF: number;
  lowF: number;
  condition: string;
  precipChance?: number;
}

export interface WeatherNote {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

/** Geocoded place the forecast was pulled for. Remembered so staff can re-fetch. */
export interface WeatherLocation {
  name: string;
  latitude: number;
  longitude: number;
}

export interface WeatherInfo {
  current?: { tempF: number; condition: string } | null;
  daily: WeatherDay[];
  notes: WeatherNote[];
  location?: WeatherLocation | null;
  updatedAt?: string;
}

export interface WeatherUpsert {
  current?: { tempF: number; condition: string } | null;
  daily?: WeatherDay[];
  notes?: WeatherNote[];
  location?: WeatherLocation | null;
}

// ---------------------------------------------------------------------------
// Feedback (spec §4.16)
// ---------------------------------------------------------------------------
export type FeedbackType = 'event' | 'session' | 'activity' | 'meal' | 'nps';

export interface FeedbackSubmission {
  id: string;
  eventId: string;
  attendeeId: string;
  type: FeedbackType;
  /** Target item id (agenda/dining/activity); 'event' for overall feedback. */
  targetId: string;
  rating: number; // 1–5 (or 0–10 for NPS)
  comments?: string;
  wouldRecommend?: boolean;
  issueFlag?: boolean;
  anonymous: boolean;
  createdAt: string;
}

export interface FeedbackCreate {
  type: FeedbackType;
  targetId: string;
  rating: number;
  comments?: string;
  wouldRecommend?: boolean;
  issueFlag?: boolean;
  anonymous?: boolean;
}

// ---------------------------------------------------------------------------
// Help / concierge (spec §4.15)
// ---------------------------------------------------------------------------
export interface HelpContact {
  label: string;
  phone?: string;
  email?: string;
  note?: string;
}

export interface HelpContent {
  eventId: string;
  contacts: HelpContact[];
  topics: { title: string; body: string }[];
  emergencyText?: string;
  lostAndFound?: string;
}

export type HelpRequestStatus = 'open' | 'assigned' | 'resolved';
export type HelpUrgency = 'low' | 'normal' | 'high';

export interface HelpRequest {
  id: string;
  eventId: string;
  attendeeId: string;
  category: string;
  message: string;
  urgency: HelpUrgency;
  contactPreference?: string;
  photoKey?: string | null;
  status: HelpRequestStatus;
  assignedTo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HelpRequestCreate {
  category: string;
  message: string;
  urgency?: HelpUrgency;
  contactPreference?: string;
}

export interface HelpRequestUpdate {
  status?: HelpRequestStatus;
  assignedTo?: string | null;
}

// ---------------------------------------------------------------------------
// Maps & navigation (spec §4.12)
// ---------------------------------------------------------------------------
export type MapType =
  | 'property'
  | 'meeting_room'
  | 'dining'
  | 'activity'
  | 'transportation'
  | 'local_area';

export interface MapPin {
  label: string;
  note?: string;
}

export interface MapLocation {
  id: string;
  eventId: string;
  title: string;
  type: MapType;
  imageUrl?: string; // static map image (S3 asset)
  description?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  pins: MapPin[];
  order: number;
  published: boolean;
}

export interface MapLocationCreate {
  title: string;
  type: MapType;
  imageUrl?: string;
  description?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  pins?: MapPin[];
  order?: number;
  published?: boolean;
}
export type MapLocationUpdate = Partial<MapLocationCreate>;

// ---------------------------------------------------------------------------
// Profile self-service (spec §4.1, §4.8)
// ---------------------------------------------------------------------------
/** Attendee-editable subset of their own profile. */
export interface ProfileUpdate {
  phone?: string;
  company?: string;
  title?: string;
  city?: string;
  bio?: string;
  linkedinUrl?: string;
  dietaryRestrictions?: string[];
  accessibilityNeeds?: string;
  guestName?: string;
  directoryVisible?: boolean;
  contactSharingOptIn?: boolean;
}

export interface UploadTicket {
  uploadUrl: string;
  key: string;
}
