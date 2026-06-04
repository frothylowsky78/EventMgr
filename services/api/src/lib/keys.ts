/**
 * Single-table key helpers. See docs/data-model.md for the full key map.
 * Keeping all key construction here means access patterns are defined in one place.
 */

export const TABLE_NAME = process.env.TABLE_NAME ?? 'EventApp-dev';

export const eventPk = (eventId: string) => `EVENT#${eventId}`;
export const attendeePk = (attendeeId: string) => `ATTENDEE#${attendeeId}`;

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

  // --- Audit log ---
  audit: (eventId: string, ts: string, id: string) => ({
    PK: eventPk(eventId),
    SK: `AUDIT#${ts}#${id}`,
  }),
};
