/**
 * Seeds one event, sample agenda, and a test attendee with an itinerary + access code.
 * Usage:
 *   TABLE_NAME=EventApp-dev npm run seed
 *   DYNAMODB_ENDPOINT=http://localhost:8000 TABLE_NAME=EventApp-local npm run seed
 *
 * Prints the test attendee email + access code so you can log in immediately.
 */
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../src/lib/dynamo';
import { TABLE_NAME, keys } from '../src/lib/keys';
import { hashAccessCode } from '../src/lib/accessCode';

const EVENT_ID = 'event_001';
const ATTENDEE_ID = 'attendee_001';
const EMAIL = 'jane@example.com';
const ACCESS_CODE = 'VIP2026';

async function put(item: Record<string, unknown>) {
  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
}

async function main() {
  // Event profile
  await put({
    ...keys.eventProfile(EVENT_ID),
    entity: 'Event',
    id: EVENT_ID,
    name: 'VIP Summit 2026',
    startDate: '2026-09-12',
    endDate: '2026-09-15',
    locationName: 'Cliffside Resort & Spa',
    address: '123 Ocean Drive, Big Sur, CA',
    timezone: 'America/Los_Angeles',
    registrationDeadline: '2026-08-15T23:59:00-07:00',
    branding: {
      logoUrl: '',
      heroImageUrl: '',
      primaryColor: '#1A2B4C',
      secondaryColor: '#C9A227',
    },
  });

  // Agenda items
  const agenda = [
    {
      id: 'agenda_001',
      title: 'Welcome Reception',
      date: '2026-09-12',
      startTime: '18:00',
      endTime: '20:00',
      category: 'meal',
      description: 'Kick off the summit with cocktails and hors d’oeuvres.',
      dressCode: 'Resort casual',
      required: true,
    },
    {
      id: 'agenda_002',
      title: 'Opening Keynote',
      date: '2026-09-13',
      startTime: '09:00',
      endTime: '10:00',
      category: 'general_session',
      description: 'Vision and roadmap for the year ahead.',
      speaker: 'CEO',
      required: true,
    },
    {
      id: 'agenda_003',
      title: 'Coastal Golf Outing',
      date: '2026-09-13',
      startTime: '13:00',
      endTime: '17:00',
      category: 'activity',
      description: '18 holes on the championship course. Optional.',
      required: false,
      eligibleTags: ['golf'],
    },
  ];

  for (const a of agenda) {
    await put({
      ...keys.agendaItem(EVENT_ID, a.id),
      GSI1PK: keys.agendaList(EVENT_ID).GSI1PK,
      GSI1SK: keys.agendaGsi1Sk(a.date, a.startTime, a.id),
      entity: 'AgendaItem',
      eventId: EVENT_ID,
      published: true,
      reminderEnabled: true,
      eligibleTags: [],
      ...a,
    });
  }

  // Test attendee (with access-code hash + email lookup index + token claims source)
  await put({
    ...keys.attendeeProfile(ATTENDEE_ID),
    ...keys.attendeeList(EVENT_ID),
    GSI1SK: 'Smith#Jane',
    GSI2PK: keys.attendeeByEmail(EMAIL).GSI2PK,
    GSI2SK: 'ATTENDEE',
    entity: 'Attendee',
    id: ATTENDEE_ID,
    eventId: EVENT_ID,
    firstName: 'Jane',
    lastName: 'Smith',
    email: EMAIL,
    company: 'Acme Corp',
    title: 'VP Product',
    city: 'Seattle, WA',
    dietaryRestrictions: ['gluten-free'],
    directoryVisible: true,
    contactSharingOptIn: false,
    registrationStatus: 'in_progress',
    tags: ['golf', 'early_arrival'],
    enabled: true,
    accessCodeHash: hashAccessCode(EMAIL, ACCESS_CODE),
  });

  // Personal itinerary (welcome reception + golf)
  const itinerary = [
    {
      id: 'itinerary_001',
      agendaItemId: 'agenda_001',
      startDateTime: '2026-09-12T18:00:00-07:00',
      endDateTime: '2026-09-12T20:00:00-07:00',
      customTitle: null,
      notes: 'Table 4',
    },
    {
      id: 'itinerary_002',
      agendaItemId: 'agenda_003',
      startDateTime: '2026-09-13T13:00:00-07:00',
      endDateTime: '2026-09-13T17:00:00-07:00',
      customTitle: null,
      notes: 'Cart 7',
    },
  ];
  for (const it of itinerary) {
    await put({
      ...keys.itineraryItem(ATTENDEE_ID, it.startDateTime, it.id),
      entity: 'ItineraryItem',
      attendeeId: ATTENDEE_ID,
      reminderEnabled: true,
      visibility: 'private',
      ...it,
    });
  }

  // Dining item + personal seat for the test attendee.
  const DINING_ID = 'dining_001';
  await put({
    ...keys.diningItem(EVENT_ID, DINING_ID),
    GSI1PK: keys.diningList(EVENT_ID).GSI1PK,
    GSI1SK: keys.diningGsi1Sk('2026-09-12', '19:00', DINING_ID),
    entity: 'DiningItem',
    id: DINING_ID,
    eventId: EVENT_ID,
    title: 'Welcome Dinner',
    date: '2026-09-12',
    startTime: '19:00',
    endTime: '21:00',
    description: 'Seated dinner on the Lakeview Terrace.',
    menu: ['Heirloom tomato salad', 'Pan-seared salmon', 'Vegetarian risotto', 'Vanilla panna cotta'],
    dressCode: 'Cocktail casual',
    dietaryNotes: 'Gluten-free and vegetarian options available on request.',
    seatingAssignmentEnabled: true,
    published: true,
  });
  await put({
    ...keys.diningSeat(ATTENDEE_ID, DINING_ID),
    GSI1PK: keys.diningSeatByItem(EVENT_ID, DINING_ID).GSI1PK,
    GSI1SK: ATTENDEE_ID,
    entity: 'DiningSeat',
    diningId: DINING_ID,
    eventId: EVENT_ID,
    attendeeId: ATTENDEE_ID,
    table: '4',
    seat: '2',
    note: 'Gluten-free meal pre-ordered',
  });

  // Personal travel detail.
  await put({
    ...keys.travel(ATTENDEE_ID),
    entity: 'TravelDetail',
    attendeeId: ATTENDEE_ID,
    eventId: EVENT_ID,
    arrivalFlight: 'DL123',
    arrivalDateTime: '2026-09-12T14:15:00-07:00',
    departureFlight: 'DL456',
    departureDateTime: '2026-09-15T10:30:00-07:00',
    transferGroup: 'Shuttle A',
    hotelName: 'Cliffside Resort & Spa',
    hotelConfirmation: 'CR-88231',
    checkInDate: '2026-09-12',
    checkOutDate: '2026-09-15',
  });

  // Transportation assignment (group A) for the test attendee.
  const TRANSPORT_ID = 'transport_001';
  await put({
    ...keys.transportation(ATTENDEE_ID, TRANSPORT_ID),
    GSI1PK: keys.transportationByGroup(EVENT_ID, 'Shuttle A').GSI1PK,
    GSI1SK: `2026-09-12T15:00:00-07:00#${ATTENDEE_ID}`,
    entity: 'TransportationItem',
    id: TRANSPORT_ID,
    eventId: EVENT_ID,
    attendeeId: ATTENDEE_ID,
    transferType: 'Airport arrival shuttle',
    group: 'Shuttle A',
    pickupDateTime: '2026-09-12T15:00:00-07:00',
    pickupLocation: 'SFO — Terminal 2, Door 5',
    dropoffLocation: 'Cliffside Resort & Spa',
    vendor: 'Coastal Black Car',
    contactPhone: '+1-831-555-0190',
    vehicleDescription: 'Black Mercedes Sprinter — "VIP Summit"',
    status: 'scheduled',
  });

  // Sample notification (sent) + in-app receipt for the test attendee.
  const NOTIF_ID = 'notif_seed001';
  const notifTs = '2026-09-12T16:45:00-07:00';
  await put({
    ...keys.notification(EVENT_ID, NOTIF_ID),
    GSI1PK: keys.notificationList(EVENT_ID).GSI1PK,
    GSI1SK: notifTs,
    entity: 'Notification',
    id: NOTIF_ID,
    eventId: EVENT_ID,
    title: 'Welcome to VIP Summit 2026',
    body: 'Your itinerary is ready — tap My Trip to see what is next.',
    target: { type: 'all', criteria: {} },
    deepLink: { type: 'itinerary' },
    priority: 'normal',
    status: 'sent',
    sendMode: 'now',
    sendAt: notifTs,
    createdByAdminId: 'admin_seed',
    createdAt: notifTs,
    updatedAt: notifTs,
    recipientCount: 1,
    successCount: 1,
    failureCount: 0,
  });
  await put({
    ...keys.notificationReceipt(ATTENDEE_ID, NOTIF_ID),
    entity: 'NotificationReceipt',
    notificationId: NOTIF_ID,
    attendeeId: ATTENDEE_ID,
    eventId: EVENT_ID,
    title: 'Welcome to VIP Summit 2026',
    body: 'Your itinerary is ready — tap My Trip to see what is next.',
    deepLink: { type: 'itinerary' },
    priority: 'normal',
    read: false,
    createdAt: notifTs,
  });

  console.log('Seed complete.');
  console.log(`  Table:       ${TABLE_NAME}`);
  console.log(`  Event:       ${EVENT_ID}`);
  console.log(`  Test login:  email=${EMAIL}  accessCode=${ACCESS_CODE}`);
  console.log('  (Create a matching Cognito user with custom:attendeeId=' + ATTENDEE_ID + ')');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
