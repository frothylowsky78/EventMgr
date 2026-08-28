/**
 * Single-table key helpers. See docs/data-model.md for the full key map.
 * Keeping all key construction here means access patterns are defined in one place.
 */

export const TABLE_NAME = process.env.TABLE_NAME ?? 'EventApp-dev';

export const eventPk = (eventId: string) => `EVENT#${eventId}`;
export const attendeePk = (attendeeId: string) => `ATTENDEE#${attendeeId}`;

// Messaging principals. An attendee's conversations hang off their own partition; staff share
// one per-event partition, so any admin sees the same inbox.
export const attendeePrincipal = attendeePk;
export const staffPrincipal = (eventId: string) => `STAFF#${eventId}`;

export const keys = {
  eventProfile: (eventId: string) => ({
    PK: eventPk(eventId),
    SK: 'PROFILE',
  }),

  agendaItem: (eventId: string, agendaId: string) => ({
    PK: eventPk(eventId),
    SK: `AGENDA#${agendaId}`,
  }),

  /** GSI1 partition listing all agenda items for an event, ordered by date#startTime. */
  agendaList: (eventId: string) => ({
    GSI1PK: `EVENT#${eventId}#AGENDA`,
  }),

  agendaGsi1Sk: (date: string, startTime: string, agendaId: string) =>
    `${date}#${startTime}#${agendaId}`,

  attendeeProfile: (attendeeId: string) => ({
    PK: attendeePk(attendeeId),
    SK: 'PROFILE',
  }),

  attendeeByEmail: (emailLower: string) => ({
    GSI2PK: `EMAIL#${emailLower}`,
  }),

  attendeeList: (eventId: string) => ({
    GSI1PK: `EVENT#${eventId}#ATTENDEE`,
  }),

  itineraryPrefix: 'ITINERARY#',
  itineraryItem: (attendeeId: string, startDateTime: string, itemId: string) => ({
    PK: attendeePk(attendeeId),
    SK: `ITINERARY#${startDateTime}#${itemId}`,
  }),

  accessCodeByHash: (codeHash: string) => ({
    GSI2PK: `CODE#${codeHash}`,
  }),

  // --- Notifications (event-scoped record + history listing) ---
  notification: (eventId: string, notificationId: string) => ({
    PK: eventPk(eventId),
    SK: `NOTIF#${notificationId}`,
  }),
  notificationList: (eventId: string) => ({
    GSI1PK: `EVENT#${eventId}#NOTIF`,
  }),

  // --- Device tokens (per attendee; one row per device) ---
  devicePrefix: 'DEVICE#',
  deviceToken: (attendeeId: string, tokenId: string) => ({
    PK: attendeePk(attendeeId),
    SK: `DEVICE#${tokenId}`,
  }),

  // --- Notification receipts (in-app center, one per attendee per notification) ---
  receiptPrefix: 'NOTIFRX#',
  notificationReceipt: (attendeeId: string, notificationId: string) => ({
    PK: attendeePk(attendeeId),
    SK: `NOTIFRX#${notificationId}`,
  }),

  // --- Dining (event-scoped item + GSI1 listing) ---
  diningItem: (eventId: string, diningId: string) => ({
    PK: eventPk(eventId),
    SK: `DINING#${diningId}`,
  }),
  diningList: (eventId: string) => ({
    GSI1PK: `EVENT#${eventId}#DINING`,
  }),
  diningGsi1Sk: (date: string, startTime: string, diningId: string) =>
    `${date}#${startTime}#${diningId}`,

  // --- Personal dining seat (per attendee; GSI1 lists all seats for a dining item) ---
  diningSeatPrefix: 'DININGSEAT#',
  diningSeat: (attendeeId: string, diningId: string) => ({
    PK: attendeePk(attendeeId),
    SK: `DININGSEAT#${diningId}`,
  }),
  diningSeatByItem: (eventId: string, diningId: string) => ({
    GSI1PK: `EVENT#${eventId}#DININGSEAT#${diningId}`,
  }),

  // --- Travel (one per attendee) ---
  travel: (attendeeId: string) => ({
    PK: attendeePk(attendeeId),
    SK: 'TRAVEL',
  }),

  // --- Transportation (per attendee; GSI1 lists a group across attendees) ---
  transportPrefix: 'TRANSPORT#',
  transportation: (attendeeId: string, transportId: string) => ({
    PK: attendeePk(attendeeId),
    SK: `TRANSPORT#${transportId}`,
  }),
  transportationByGroup: (eventId: string, group: string) => ({
    GSI1PK: `EVENT#${eventId}#TRANSPORT#${group}`,
  }),

  // --- Photos (event-scoped; GSI1 lists by status, GSI2 lists by album) ---
  photo: (eventId: string, photoId: string) => ({
    PK: eventPk(eventId),
    SK: `PHOTO#${photoId}`,
  }),
  photoByStatus: (eventId: string, status: string) => ({
    GSI1PK: `EVENT#${eventId}#PHOTO#${status}`,
  }),
  photoByAlbum: (albumId: string) => ({
    GSI2PK: `ALBUM#${albumId}`,
  }),

  // --- FAQ (event-scoped; GSI1 lists by category#order) ---
  faqItem: (eventId: string, faqId: string) => ({
    PK: eventPk(eventId),
    SK: `FAQ#${faqId}`,
  }),
  faqList: (eventId: string) => ({
    GSI1PK: `EVENT#${eventId}#FAQ`,
  }),
  faqGsi1Sk: (category: string, order: number) =>
    `${category}#${String(order).padStart(4, '0')}`,

  // --- Weather (one per event) ---
  weather: (eventId: string) => ({
    PK: eventPk(eventId),
    SK: 'WEATHER',
  }),

  // --- Feedback (per attendee, one per target; GSI1 lists a target's feedback for an event) ---
  feedbackPrefix: 'FEEDBACK#',
  feedback: (attendeeId: string, targetId: string) => ({
    PK: attendeePk(attendeeId),
    SK: `FEEDBACK#${targetId}`,
  }),
  feedbackByTarget: (eventId: string, targetId: string) => ({
    GSI1PK: `EVENT#${eventId}#FEEDBACK#${targetId}`,
  }),

  // --- Help content (one per event) + help requests (per attendee; GSI1 by status) ---
  helpContent: (eventId: string) => ({
    PK: eventPk(eventId),
    SK: 'HELP',
  }),
  helpRequestPrefix: 'HELP#',
  helpRequest: (attendeeId: string, requestId: string) => ({
    PK: attendeePk(attendeeId),
    SK: `HELP#${requestId}`,
  }),
  helpRequestByStatus: (eventId: string, status: string) => ({
    GSI1PK: `EVENT#${eventId}#HELP#${status}`,
  }),

  // --- Locations (event-scoped venues/rooms; GSI1 lists by display order) ---
  location: (eventId: string, locationId: string) => ({
    PK: eventPk(eventId),
    SK: `LOCATION#${locationId}`,
  }),
  locationList: (eventId: string) => ({
    GSI1PK: `EVENT#${eventId}#LOCATION`,
  }),
  locationGsi1Sk: (order: number) => String(order).padStart(4, '0'),

  // --- Maps (event-scoped; GSI1 lists by order) ---
  mapLocation: (eventId: string, mapId: string) => ({
    PK: eventPk(eventId),
    SK: `MAP#${mapId}`,
  }),
  mapList: (eventId: string) => ({
    GSI1PK: `EVENT#${eventId}#MAP`,
  }),
  mapGsi1Sk: (order: number) => String(order).padStart(4, '0'),

  // --- Messaging (spec CF-6/CF-7). Polled, not socket-based; see docs/open-questions.md A13.
  // A conversation's messages live under the conversation partition; each participant also
  // gets a lightweight pointer row so "my conversations" and the unread badge are one query.
  conversation: (conversationId: string) => ({
    PK: `CONV#${conversationId}`,
    SK: 'META',
  }),
  messagePrefix: 'MSG#',
  message: (conversationId: string, createdAt: string, messageId: string) => ({
    PK: `CONV#${conversationId}`,
    SK: `MSG#${createdAt}#${messageId}`,
  }),
  /** Participant pointer. `principal` is attendeePrincipal() or staffPrincipal(). */
  conversationRef: (principal: string, conversationId: string) => ({
    PK: principal,
    SK: `CONV#${conversationId}`,
  }),
  conversationRefPrefix: 'CONV#',

  // --- Audit log ---
  audit: (eventId: string, ts: string, id: string) => ({
    PK: eventPk(eventId),
    SK: `AUDIT#${ts}#${id}`,
  }),
};
