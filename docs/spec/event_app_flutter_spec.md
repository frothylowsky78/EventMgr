# Event App Specification — Flutter iOS & Android

## 1. Overview

Build a cross-platform mobile event app using Flutter for iOS and Android. The app will support a private, guest-facing event experience for approximately 100 attendees, with personalized schedules, registration details, agenda, activity descriptions, onsite notifications, attendee photos/yearbook, FAQ, travel information, help resources, maps/navigation, transportation details, dining information, feedback, weather, calendar sync, and photo sharing.

The app should be designed for VIP corporate or hosted group events where the attendee experience needs to feel polished, organized, and personalized.

---

## 2. Supported Platforms

- iOS
- Android

### Technical Requirement

- Flutter single codebase
- Responsive layouts for modern phones
- Tablet support is optional but preferred
- Backend should support real-time or near-real-time updates
- App should support event-specific branding, colors, logo, and imagery

---

## 3. User Roles

### 3.1 Attendee

Primary app user. Can view personalized event details, agenda, travel info, dining info, attendee directory, photos, FAQs, and receive notifications.

### 3.2 Event Admin / Planner

Manages app content, attendee data, schedules, push notifications, photo gallery moderation, FAQ, dining details, travel details, and help requests.

Admin functionality may be delivered through a web dashboard, CMS, Firebase console, Supabase admin, or another agreed content management tool.

---

## 4. Core App Features

## 4.1 Authentication & Access

### Requirements

- App should be private to registered attendees.
- Attendees should log in using one of the following:
  - Magic link email login
  - Email + event access code
  - Unique invite code
  - Admin-issued attendee profile login

### Attendee Profile Fields

Each attendee profile should support:

- First name
- Last name
- Email
- Mobile phone
- Company
- Title
- City/state
- Profile photo
- Guest/spouse name, if applicable
- Dietary restrictions
- Accessibility needs
- Travel details
- Assigned itinerary
- Activity selections
- Rooming / lodging information, if applicable
- Visibility preference for attendee directory

### Acceptance Criteria

- Only approved attendees can access the event app.
- Attendees are routed to their own personalized experience after login.
- Admin can revoke or disable access.

---

## 4.2 Home Dashboard

The home screen should give attendees a simple overview of the most important information.

### Content Blocks

- Event name
- Event dates
- Event location
- Hero image or event branding
- Next scheduled item
- Personalized upcoming itinerary
- Important announcements
- Registration deadline reminder
- Weather snapshot
- Quick links:
  - Agenda
  - My Itinerary
  - Travel
  - Dining
  - Photos
  - FAQ
  - Help

### Acceptance Criteria

- Attendee can see what is happening next within 1 tap.
- Urgent updates or announcements are visible from the home screen.
- App should still look polished if some optional modules are not used.

---

## 4.3 Registration Deadline

The app should display the registration deadline and any required pre-event actions.

### Requirements

- Show registration deadline date and time.
- Show countdown until deadline.
- Show status:
  - Not started
  - In progress
  - Submitted
  - Past due
- Support links to registration form or embedded registration workflow.
- Display required action items, such as:
  - Confirm attendance
  - Select activities
  - Submit dietary restrictions
  - Provide flight details
  - Upload profile photo
  - Confirm guest information

### Acceptance Criteria

- Attendee can clearly see whether they still need to complete registration.
- Admin can update deadlines without an app release.
- App can show different required items for different attendee types.

---

## 4.4 Agenda

The app should include the full event agenda.

### Agenda Item Fields

Each agenda item should support:

- Title
- Date
- Start time
- End time
- Location
- Category
  - General session
  - Meal
  - Activity
  - Transportation
  - Free time
  - Optional event
  - Private appointment
- Description
- Speaker/host
- Dress code
- Map/location link
- Required vs optional
- Capacity limit, if applicable
- Attendee eligibility
- Add-to-calendar option
- Push notification reminder setting

### User Features

- View agenda by day
- Filter by category
- Search agenda items
- Tap item for full details
- Favorite/save agenda items
- Add agenda item to device calendar
- See whether item is part of personal itinerary

### Acceptance Criteria

- Agenda can be updated dynamically by admin.
- Attendees can view the agenda by date and time.
- Optional activities are clearly labeled.
- Agenda items with changed times or locations can trigger push notifications.

---

## 4.5 Description of Activities

The app should include detailed descriptions for all planned activities.

### Activity Fields

- Activity title
- Date/time
- Description
- Location
- Duration
- What to wear
- What to bring
- Physical difficulty level
- Transportation instructions
- Weather considerations
- Capacity
- Host/contact person
- Included guests
- Optional signup link or signup status
- Cancellation policy or weather backup plan

### Acceptance Criteria

- Attendees can understand what each activity is and how to prepare.
- Admin can update activity details without resubmitting app.
- Activity detail pages should support images.

---

## 4.6 Personal Itinerary

Each attendee should have a personalized itinerary.

### Requirements

- Display attendee-specific schedule.
- Include assigned sessions, activities, meals, transfers, private appointments, and free time.
- Support different schedules by attendee type, group, or individual.
- Show location and map link for each item.
- Allow attendee to add itinerary items to calendar.
- Allow app notifications for upcoming itinerary items.

### Data Model

Each itinerary item should include:

- Attendee ID or group ID
- Agenda item ID, if linked
- Custom title
- Start/end time
- Location
- Description
- Transportation note
- Visibility setting
- Reminder setting

### Acceptance Criteria

- Each attendee only sees their own personalized itinerary.
- Shared agenda items can appear in many attendees' itineraries.
- Admin can assign itinerary items individually or by group.

---

## 4.7 Push Notifications

The app should support onsite and pre-event push notifications.

### Notification Types

- General announcements
- Agenda reminders
- Location changes
- Weather alerts
- Transportation reminders
- Dining reminders
- Activity-specific updates
- Emergency or urgent messages
- Registration deadline reminders

### Segmentation Requirements

Admin should be able to send notifications to:

- All attendees
- Specific individuals
- Groups
- Activity participants
- Arrivals/departures groups
- Attendees with incomplete registration
- Attendees with selected dietary restrictions
- Custom tags

### Notification Fields

- Title
- Message
- Send immediately or schedule
- Target audience
- Deep link destination in app
- Priority level
- Expiration time
- Read/unread status

### Acceptance Criteria

- Notifications can deep link to the relevant agenda item, travel detail, dining info, or announcement.
- Attendees receive notifications on iOS and Android.
- Admin can schedule notifications in advance.
- App should show an in-app notification center/history.

---

## 4.8 Attendee Photos / Yearbook

The app should include a yearbook-style attendee directory with photos.

### Attendee Card Fields

- Profile photo
- Name
- Company
- Title
- City/state
- Bio, optional
- LinkedIn URL, optional
- Guest/spouse name, optional
- Interests, optional
- Visibility preference

### Features

- Search by name
- Filter by company, city, group, or attendee type
- Tap to view full profile
- Opt-in contact sharing
- Admin can upload or edit attendee photos
- Attendee can upload or request to change profile photo, if enabled

### Privacy Requirements

- Attendee contact details should be opt-in only.
- Admin should be able to hide sensitive attendee information.
- Attendees should not be able to download the full attendee list unless explicitly enabled.

### Acceptance Criteria

- Attendees can browse and search the yearbook.
- Attendees without photos show polished initials/avatar placeholder.
- Admin can control which profile fields are visible.

---

## 4.9 FAQ

The app should include a searchable FAQ.

### FAQ Categories

- Event overview
- Travel
- Hotel / lodging
- Dining
- Activities
- Dress code
- Transportation
- Weather
- Registration
- Accessibility
- Emergency contacts
- App support

### Features

- Search FAQs
- Expand/collapse answers
- Admin-managed categories
- Link FAQ answers to agenda, travel, dining, or map items
- Mark important FAQs as featured

### Acceptance Criteria

- FAQ content can be updated dynamically.
- Search returns relevant FAQ items.
- Featured FAQs appear near the top.

---

## 4.10 Travel Information

The app should include all event travel information.

### Travel Content

- Airport information
- Recommended arrival/departure windows
- Hotel address
- Check-in/check-out times
- Parking information
- Ride-share pickup/drop-off instructions
- Packing recommendations
- Travel contact
- Flight submission instructions
- Local area notes

### Personalized Travel Info

For each attendee, the app should optionally display:

- Flight number
- Arrival date/time
- Departure date/time
- Airport transfer assignment
- Shuttle time
- Driver/contact
- Lodging assignment
- Room confirmation number, if applicable

### Acceptance Criteria

- General travel details are available to all attendees.
- Personalized travel details are only visible to the correct attendee.
- Admin can update transfer or travel instructions in real time.

---

## 4.11 Transportation

Transportation should be its own clear section or part of travel.

### Transportation Fields

- Transfer type
- Pickup date/time
- Pickup location
- Drop-off location
- Driver or vendor name
- Contact phone
- Shuttle group
- Vehicle description
- Notes
- Map link
- Status
  - Scheduled
  - Delayed
  - Changed
  - Completed

### Features

- Shuttle schedule
- Airport transfer assignments
- Ride-share pickup notes
- Push reminders before transportation events
- Transportation updates by group

### Acceptance Criteria

- Attendees can easily find their own transportation details.
- Admin can send transport-specific notifications.
- Transportation details can be personalized by attendee or group.

---

## 4.12 Maps & Navigation

The app should include property and local navigation support.

### Map Types

- Resort/property map
- Meeting room map
- Dining location map
- Activity location map
- Transportation pickup/drop-off map
- Local area map

### Features

- Static map image support
- Interactive map support, if available
- Pins for agenda/dining/activity locations
- External link to Apple Maps / Google Maps
- Walking directions, if available
- Indoor/property directions as text notes

### Acceptance Criteria

- Each agenda/dining/activity item can link to a location.
- Attendees can open external navigation from the app.
- Admin can update location labels and map pins.

---

## 4.13 Dining Information

The app should include dedicated dining information.

### Dining Item Fields

- Meal title
- Date
- Start/end time
- Location
- Description
- Menu
- Dress code
- Seating assignment, if applicable
- Dietary accommodation notes
- Host/contact
- Transportation instructions
- Map link
- Guest eligibility
- Private vs group meal

### Features

- View dining schedule by day
- View menus
- See dietary notes
- Show personal seating assignment, if applicable
- Notify attendees of meal reminders or location changes
- Support special dietary restriction flags for admin

### Dietary Restrictions

Attendee profiles should support:

- Vegetarian
- Vegan
- Gluten-free
- Dairy-free
- Nut allergy
- Shellfish allergy
- Kosher
- Halal
- Other custom notes

### Acceptance Criteria

- Attendees can see when and where meals occur.
- Menus can be updated by admin.
- Dietary information is stored securely and visible only to admin and the applicable attendee.
- Dining items can appear in the attendee's personal itinerary.

---

## 4.14 Photo Sharing & Event Gallery

The app should include shared event photo functionality.

### Photo Features

- Attendees can upload event photos.
- Attendees can browse event gallery.
- Photos can be grouped by:
  - Day
  - Activity
  - Meal
  - Album
  - Uploader
- Admin can create official albums.
- Admin can approve, hide, or delete photos.
- Attendees can like/favorite photos, optional.
- Attendees can download photos, optional.
- Admin can mark photos as featured.
- App should support both attendee-uploaded and official photographer-uploaded photos.

### Upload Requirements

- Upload from camera roll
- Capture photo from camera
- Compress images for mobile performance
- Preserve high-resolution original if desired
- Show upload progress
- Handle offline/poor connectivity gracefully
- Restrict supported file types to image formats

### Moderation

Admin should be able to:

- Require approval before public display
- Remove inappropriate photos
- Feature selected photos
- Assign photos to albums
- Download all event photos after the event

### Privacy Requirements

- Show clear upload terms or consent language.
- Admin can disable attendee uploads if needed.
- Admin can control whether photos are downloadable.

### Acceptance Criteria

- Attendees can upload photos successfully on iOS and Android.
- Photos are not visible publicly outside the private event app.
- Admin can moderate uploaded photos.
- Gallery loads quickly and uses thumbnails/lazy loading.

---

## 4.15 Help / Concierge

The app should include a help section for attendee support.

### Help Content

- Event contact phone
- Event contact email
- Emergency contact
- Hotel front desk
- Transportation contact
- App support contact
- Lost and found instructions
- Medical/emergency guidance
- Common help topics

### Help Request Feature

Preferred but optional for V1:

- Attendee can submit a help request.
- Help request fields:
  - Category
  - Message
  - Urgency
  - Optional photo attachment
  - Contact preference
- Admin can view, assign, and resolve help requests.

### Acceptance Criteria

- Attendees can find help contact info within 1 tap from home screen.
- Help requests, if implemented, notify admin or event staff.

---

## 4.16 Session / Activity Feedback

The app should allow basic feedback collection.

### Feedback Types

- Event feedback
- Session feedback
- Activity feedback
- Meal feedback
- Overall NPS

### Feedback Fields

- Rating
- Comments
- Would recommend
- Issue flag
- Optional anonymous mode

### Acceptance Criteria

- Admin can attach feedback form to agenda/activity/dining items.
- Attendee can submit feedback once per item.
- Admin can export results.

---

## 4.17 Weather

The app should include weather information relevant to the event location.

### Requirements

- Current weather
- Daily forecast during event dates
- Weather-aware packing recommendations
- Weather alerts or manual admin weather announcements
- Link weather info to outdoor activities

### Acceptance Criteria

- Weather appears on the home dashboard and travel/activity sections.
- Admin can add manual weather notes.
- Outdoor activity pages can show weather-specific preparation notes.

---

## 4.18 Calendar Sync

The app should allow attendees to add key items to their device calendar.

### Requirements

- Add individual agenda items to calendar
- Add full personal itinerary to calendar
- Support Apple Calendar, Google Calendar, and Outlook through standard calendar APIs / ICS export where feasible
- Calendar item should include:
  - Title
  - Start/end time
  - Location
  - Description
  - Reminder
  - Map link

### Acceptance Criteria

- Attendee can add one agenda item or their full itinerary.
- Calendar entries have correct local time zone.
- Changed event details should show an in-app warning that calendar items may need updating.

---

## 5. Admin / Content Management Requirements

The app requires an admin-managed content system.

### Admin Should Be Able To Manage

- Event branding
- Event dates and location
- Registration deadline
- Agenda items
- Activity descriptions
- Attendees
- Attendee photos
- Personal itineraries
- Travel details
- Transportation assignments
- Dining details
- FAQs
- Maps
- Push notifications
- Photo gallery moderation
- Help requests
- Feedback forms
- Weather notes

### Admin Import / Export

Admin should be able to import/export:

- Attendee list
- Personal itineraries
- Travel details
- Transportation assignments
- Dining seating / dietary notes
- Photo archive
- Feedback results

Preferred formats:

- CSV
- XLSX
- JSON

---

## 6. Data Model

## 6.1 Event

```json
{
  "id": "event_001",
  "name": "VIP Event",
  "startDate": "2026-09-12",
  "endDate": "2026-09-15",
  "locationName": "Event Resort",
  "address": "123 Main Street",
  "timezone": "America/Los_Angeles",
  "branding": {
    "logoUrl": "",
    "heroImageUrl": "",
    "primaryColor": "",
    "secondaryColor": ""
  }
}
```

## 6.2 Attendee

```json
{
  "id": "attendee_001",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "",
  "company": "",
  "title": "",
  "city": "",
  "profilePhotoUrl": "",
  "dietaryRestrictions": ["gluten-free"],
  "accessibilityNeeds": "",
  "guestName": "",
  "directoryVisible": true,
  "contactSharingOptIn": false,
  "tags": ["golf", "early_arrival"]
}
```

## 6.3 Agenda Item

```json
{
  "id": "agenda_001",
  "title": "Welcome Reception",
  "date": "2026-09-12",
  "startTime": "18:00",
  "endTime": "20:00",
  "locationId": "location_001",
  "category": "meal",
  "description": "",
  "dressCode": "Resort casual",
  "required": true,
  "capacity": null,
  "eligibleTags": []
}
```

## 6.4 Itinerary Item

```json
{
  "id": "itinerary_001",
  "attendeeId": "attendee_001",
  "agendaItemId": "agenda_001",
  "customTitle": "",
  "startDateTime": "2026-09-12T18:00:00-07:00",
  "endDateTime": "2026-09-12T20:00:00-07:00",
  "locationId": "location_001",
  "notes": ""
}
```

## 6.5 Dining Item

```json
{
  "id": "dining_001",
  "title": "Welcome Dinner",
  "date": "2026-09-12",
  "startTime": "19:00",
  "endTime": "21:00",
  "locationId": "location_002",
  "menu": ["Salad", "Salmon", "Vegetarian entree", "Dessert"],
  "dressCode": "Cocktail casual",
  "dietaryNotes": "Gluten-free and vegetarian options available",
  "seatingAssignmentEnabled": true
}
```

## 6.6 Travel Detail

```json
{
  "id": "travel_001",
  "attendeeId": "attendee_001",
  "arrivalFlight": "DL123",
  "arrivalDateTime": "2026-09-12T14:15:00-07:00",
  "departureFlight": "DL456",
  "departureDateTime": "2026-09-15T10:30:00-07:00",
  "transferGroup": "Shuttle A",
  "hotelConfirmation": ""
}
```

## 6.7 Photo

```json
{
  "id": "photo_001",
  "eventId": "event_001",
  "uploadedByAttendeeId": "attendee_001",
  "albumId": "album_001",
  "imageUrl": "",
  "thumbnailUrl": "",
  "caption": "",
  "status": "pending",
  "createdAt": "2026-09-12T20:30:00-07:00"
}
```

---

## 7. Recommended App Navigation

### Bottom Navigation

1. Home
2. Agenda
3. My Trip
4. Photos
5. More

### More Menu

- Attendees / Yearbook
- Dining
- Travel
- Transportation
- Maps
- FAQ
- Help
- Feedback
- Settings

---

## 8. Non-Functional Requirements

## 8.1 Performance

- Home screen should load in under 2 seconds on standard LTE.
- Photo gallery should use thumbnails and lazy loading.
- App should cache key event data for offline viewing.

## 8.2 Offline Support

The app should cache:

- Agenda
- Personal itinerary
- Travel info
- Dining info
- FAQ
- Help contacts
- Maps, if static

Photo upload can queue when offline and retry when connection returns.

## 8.3 Security

- Private event access only
- Encrypted authentication
- Role-based admin access
- Secure storage for personal and travel information
- Dietary/accessibility info treated as private
- Photo gallery only visible to authorized attendees
- Admin audit trail preferred

## 8.4 Privacy

- Attendee directory visibility must be configurable.
- Contact sharing must be opt-in.
- Photo upload terms should be shown before first upload.
- Personal travel details must not be visible to other attendees.
- Dietary restrictions must not be publicly visible.

## 8.5 Accessibility

- Support dynamic text sizing
- Screen reader labels
- Sufficient color contrast
- Large tap targets
- Avoid information conveyed only by color

---

## 9. Push Notification Deep Links

Notifications should be able to open directly to:

- Agenda item
- Itinerary item
- Dining item
- Transportation detail
- Travel detail
- Announcement
- Photo album
- FAQ item
- Help page

---

## 10. Analytics

Track the following:

- App installs
- Daily active users
- Login completion
- Agenda views
- Itinerary views
- Dining page views
- Travel page views
- Photo uploads
- Photo gallery views
- FAQ searches
- Help requests
- Push notification opens
- Feedback submissions

---

## 11. Suggested Tech Stack

### Front End

- Flutter
- Dart
- Riverpod, Bloc, or Provider for state management
- GoRouter or AutoRoute for routing

### Backend Options

Any of the following are acceptable:

- Firebase
  - Firebase Auth
  - Firestore
  - Cloud Storage
  - Cloud Functions
  - Firebase Cloud Messaging
- Supabase
  - Auth
  - Postgres
  - Storage
  - Edge Functions
  - Push notification integration
- Custom backend
  - REST or GraphQL API
  - PostgreSQL
  - S3-compatible storage
  - Admin CMS

### Recommended for Speed

Firebase is likely the fastest path for this use case because it supports auth, real-time updates, file storage, and push notifications in one ecosystem.

---

## 12. V1 Scope

The following should be included in V1:

- iOS and Android Flutter app
- Private attendee login
- Home dashboard
- Registration deadline
- Full agenda
- Activity detail pages
- Push notifications
- Attendee yearbook
- FAQ
- Travel info
- Transportation details
- Personal itinerary
- Help section
- Maps/navigation
- Dining information
- Photo sharing/gallery
- Feedback
- Weather
- Calendar sync
- Admin-managed content system

---

## 13. V1 Exclusions / Optional Later Features

These are not required for initial launch unless separately scoped:

- AI concierge assistant
- Live chat with staff
- Real-time attendee location / “who’s here now”
- In-app payments
- Gamification / leaderboards
- QR badge scanning
- Badge printing
- Full event website
- Native tablet app
- Multi-event SaaS admin platform
- Complex rooming-list optimization
- Automated flight tracking

---

## 14. QA Test Scenarios

### Login

- Valid attendee can log in.
- Invalid attendee cannot access the event.
- Disabled attendee cannot access the event.

### Agenda

- Agenda loads by day.
- Agenda item detail opens correctly.
- Changed location displays correctly.
- Calendar add works.

### Personal Itinerary

- Attendee sees only their own itinerary.
- Another attendee's itinerary is not visible.
- Itinerary items display in correct time zone.

### Push Notifications

- All-attendee notification delivers.
- Group-specific notification delivers only to target group.
- Notification deep link opens correct screen.
- Notification history appears in app.

### Yearbook

- Attendee profiles load.
- Search works.
- Hidden attendees do not appear.
- Placeholder avatars show when no photo exists.

### Travel & Transportation

- Personalized flight/transfer info appears only for correct attendee.
- Shuttle updates can be changed by admin.
- Transportation push reminder works.

### Dining

- Dining schedule loads.
- Menu displays correctly.
- Dietary notes are visible only where appropriate.
- Seating assignment appears for assigned attendee.

### Photos

- Attendee can upload photo.
- Photo goes into pending state if moderation is enabled.
- Approved photo appears in gallery.
- Rejected/hidden photo does not appear.
- Gallery lazy loads correctly.

### FAQ

- FAQ categories load.
- Search works.
- Featured FAQs appear first.

### Offline

- Agenda, itinerary, travel, dining, FAQ, and help contacts remain viewable offline.
- Photo upload queues and retries.

---

## 15. Open Decisions for Developer / Client

The developer should confirm the following before build:

1. Preferred backend: Firebase, Supabase, or custom backend
2. Admin interface: custom admin portal vs database/CMS management
3. Authentication method
4. Whether attendee-uploaded photos require approval before display
5. Whether attendees can edit their own profile photos
6. Whether calendar sync should be one-item-at-a-time or full-itinerary export
7. Whether travel details are imported manually or integrated with a travel system
8. Whether weather uses a live API or admin-entered forecast notes
9. Whether app will support one event only or multiple future events
10. Whether the app needs App Store / Play Store release or private distribution

---

## 16. Delivery Expectations

Developer should provide:

- Flutter source code
- iOS build
- Android build
- Backend configuration
- Admin content management workflow
- Push notification setup
- App icon and splash screen setup
- QA test plan
- Deployment instructions
- Data import templates
- Basic admin/user documentation

---

## 17. Success Criteria

The app is successful if:

- Attendees can easily find what they need during the event.
- Admin can update event content without a new app release.
- Personalized itinerary, travel, dining, and transportation information are accurate.
- Push notifications reliably reach targeted attendees.
- The photo gallery works smoothly and privately.
- The app reduces questions to event staff.
- The attendee experience feels premium, organized, and easy.

---

## 18. AWS Hosting & Backend Specification

The app may be hosted and operated on AWS instead of Firebase, Supabase, or a custom non-AWS backend. AWS should support the mobile app backend, admin content management, authentication, file/photo storage, APIs, push notification orchestration, monitoring, and deployment.

## 18.1 Recommended AWS Architecture

### Mobile App

- Flutter iOS and Android app
- Communicates with backend through secure HTTPS APIs
- Uses authenticated API calls for private attendee/event data
- Uses signed URLs or authenticated access for photo/media upload and download

### AWS Services

Recommended AWS stack:

- **Amazon Cognito**
  - Attendee authentication
  - Admin authentication
  - User pools
  - Hosted UI or custom login
  - Magic link / passwordless login if implemented through Lambda customization
  - Group-based roles such as `attendee`, `admin`, `staff`

- **Amazon API Gateway**
  - Public HTTPS API endpoint for the Flutter app and admin portal
  - Routes requests to Lambda or backend services
  - Handles authorization using Cognito JWT tokens

- **AWS Lambda**
  - Serverless backend logic
  - Registration status
  - Agenda retrieval
  - Personalized itinerary retrieval
  - Travel and transportation data
  - Dining data
  - FAQ data
  - Help requests
  - Feedback submissions
  - Notification targeting
  - Photo upload moderation workflows

- **Amazon DynamoDB**
  - Primary event data store
  - Attendees
  - Agenda
  - Activities
  - Personal itineraries
  - Dining
  - Travel
  - Transportation
  - FAQ
  - Help requests
  - Feedback
  - Notifications
  - Photo metadata

- **Amazon S3**
  - Event images
  - Attendee profile photos
  - Photo gallery uploads
  - Static map images
  - Branding assets
  - CSV/XLSX import files
  - Post-event photo archive exports

- **Amazon CloudFront**
  - CDN for images, public static assets, and optional admin portal hosting
  - Faster media delivery
  - Optional signed URLs/cookies for protected media

- **AWS Amplify Hosting**
  - Optional hosting for admin portal
  - CI/CD from GitHub
  - Static React/Next.js/Vue admin site, if used

- **Amazon Pinpoint or Amazon SNS**
  - Push notification campaigns and targeting
  - iOS APNs and Android FCM integration
  - Segmented messages by attendee, group, activity, travel group, or tag

- **Amazon EventBridge**
  - Scheduled jobs
  - Scheduled push notifications
  - Reminder triggers
  - Deadline reminders

- **Amazon CloudWatch**
  - Logs
  - Metrics
  - Alerts
  - Lambda/API monitoring

- **AWS IAM**
  - Least-privilege access controls
  - Separate roles for app backend, admin tools, deployment, and media processing

- **AWS WAF**
  - Optional API protection
  - Rate limiting
  - Basic web threat protection

- **AWS Secrets Manager / Systems Manager Parameter Store**
  - API secrets
  - Third-party weather API keys
  - Push notification credentials
  - Environment configuration

---

## 18.2 AWS Deployment Environments

The project should support separate environments:

- Development
- Staging
- Production

Each environment should have separate:

- Cognito user pool
- API Gateway endpoint
- Lambda functions
- DynamoDB tables
- S3 buckets
- CloudFront distribution, if needed
- Pinpoint/SNS configuration
- Environment variables/secrets

### Acceptance Criteria

- Developers can test safely in development/staging without affecting production event data.
- Production data is protected from accidental overwrite.
- App build can point to dev, staging, or production API endpoints.

---

## 18.3 AWS Authentication

### Attendee Authentication

Preferred methods:

1. Email magic link / passwordless login using Cognito + Lambda custom auth flow
2. Email + temporary access code
3. Email + one-time event invite code
4. Standard Cognito email/password login

### Admin Authentication

Admin users should authenticate separately from attendees.

Admin should support:

- MFA
- Role-based access
- Staff/admin permission levels
- Ability to disable users

### User Roles

Suggested Cognito groups:

- `attendee`
- `event_staff`
- `event_admin`
- `super_admin`

### Acceptance Criteria

- Attendees cannot access another attendee's private itinerary, travel, dining, or transportation details.
- Admins can access event management features only after authentication.
- JWT authorization is enforced at the API level.

---

## 18.4 AWS Data Storage Model

### DynamoDB Tables

Recommended table approach:

#### Option A: Single-Table Design

Use one primary `EventApp` table with partition/sort keys.

Example keys:

```text
PK = EVENT#event_001
SK = EVENT_PROFILE

PK = EVENT#event_001
SK = AGENDA#agenda_001

PK = EVENT#event_001
SK = DINING#dining_001

PK = ATTENDEE#attendee_001
SK = PROFILE

PK = ATTENDEE#attendee_001
SK = ITINERARY#2026-09-12T18:00:00

PK = ATTENDEE#attendee_001
SK = TRAVEL

PK = EVENT#event_001
SK = PHOTO#photo_001
```

#### Option B: Multi-Table Design

Use separate tables for:

- Events
- Attendees
- AgendaItems
- ItineraryItems
- DiningItems
- TravelDetails
- TransportationDetails
- FAQs
- Photos
- Notifications
- Feedback
- HelpRequests

For a first version, the multi-table design may be easier for a small development team. A single-table design may be better if the developer is experienced with DynamoDB access patterns.

### Acceptance Criteria

- Data model supports one event initially but should not prevent multi-event support later.
- Private attendee data is queryable only for the authenticated attendee or authorized admin.
- Tables use on-demand billing unless the developer recommends provisioned capacity.

---

## 18.5 File & Photo Storage on AWS

### S3 Buckets

Recommended buckets:

- `event-app-assets-{env}`
  - Branding
  - Static maps
  - Event images

- `event-app-profile-photos-{env}`
  - Attendee profile photos

- `event-app-gallery-{env}`
  - Attendee uploaded event photos
  - Official photographer uploads
  - Thumbnails
  - Moderated photo versions

- `event-app-imports-{env}`
  - CSV/XLSX admin uploads

- `event-app-exports-{env}`
  - Feedback exports
  - Photo archive exports
  - Attendee data exports

### Photo Upload Flow

1. Attendee requests upload URL from API.
2. API verifies attendee authorization.
3. Lambda returns pre-signed S3 upload URL.
4. Flutter app uploads photo directly to S3.
5. S3 event triggers Lambda.
6. Lambda creates thumbnail and metadata record.
7. Photo status is set to:
   - `pending` if moderation is enabled
   - `approved` if auto-approval is enabled
8. Gallery displays approved photos only.

### Media Processing

Optional:

- Lambda image resizing
- S3 object tagging
- Rekognition moderation check, if desired
- CloudFront CDN delivery

### Acceptance Criteria

- Photos upload directly to S3 without passing large files through Lambda.
- Gallery uses thumbnails for performance.
- Private photos are protected through signed URLs or authenticated API access.
- Admin can export/download all event photos after the event.

---

## 18.6 API Requirements on AWS

The backend should expose secure REST or GraphQL APIs.

### Recommended REST Endpoints

#### Auth / User

```text
GET /me
GET /me/itinerary
GET /me/travel
GET /me/transportation
GET /me/dining
PATCH /me/profile
POST /me/profile-photo/upload-url
```

#### Event Content

```text
GET /events/{eventId}
GET /events/{eventId}/agenda
GET /events/{eventId}/activities
GET /events/{eventId}/faq
GET /events/{eventId}/maps
GET /events/{eventId}/weather
GET /events/{eventId}/announcements
```

#### Dining

```text
GET /events/{eventId}/dining
GET /events/{eventId}/dining/{diningId}
```

#### Photos

```text
GET /events/{eventId}/photos
POST /events/{eventId}/photos/upload-url
POST /events/{eventId}/photos/{photoId}/like
DELETE /events/{eventId}/photos/{photoId}
```

#### Feedback

```text
POST /events/{eventId}/feedback
GET /me/feedback-submissions
```

#### Help

```text
GET /events/{eventId}/help
POST /events/{eventId}/help-requests
GET /me/help-requests
```

#### Admin

```text
POST /admin/events
PATCH /admin/events/{eventId}
POST /admin/events/{eventId}/attendees/import
GET /admin/events/{eventId}/attendees
PATCH /admin/attendees/{attendeeId}
POST /admin/events/{eventId}/agenda/import
POST /admin/events/{eventId}/notifications
PATCH /admin/photos/{photoId}/approve
PATCH /admin/photos/{photoId}/hide
GET /admin/events/{eventId}/feedback/export
GET /admin/events/{eventId}/photos/export
```

### API Acceptance Criteria

- All attendee APIs require Cognito authentication.
- Admin APIs require admin role.
- APIs enforce attendee-level data authorization.
- API responses are optimized for mobile payload size.
- API errors are returned in a consistent JSON format.

---

## 18.7 Push Notifications on AWS

Push notifications should be supported through Amazon Pinpoint or SNS with APNs and FCM.

### Requirements

- Register device token after login.
- Associate device token with attendee profile.
- Support multiple devices per attendee.
- Support push segments:
  - All attendees
  - Individual attendee
  - Group/tag
  - Activity participants
  - Travel group
  - Dining group
  - Incomplete registration
- Support scheduled notifications.
- Support immediate urgent notifications.
- Support notification history in the app.

### Notification Flow

1. Admin creates notification.
2. Notification target segment is selected.
3. Backend resolves attendee/device tokens.
4. Pinpoint/SNS sends APNs/FCM notification.
5. Notification record is stored in DynamoDB.
6. App opens deep link destination when notification is tapped.

### Acceptance Criteria

- Push notifications work on both iOS and Android.
- Notifications can deep link to app screens.
- Failed push deliveries are logged.
- Admin can send test notification before sending broadly.

---

## 18.8 Admin Portal on AWS

The admin portal may be a separate web app hosted on AWS Amplify Hosting or S3 + CloudFront.

### Admin Portal Features

Admin portal should allow event staff to manage:

- Event details
- Branding
- Registration deadline
- Attendees
- Attendee profile photos
- Agenda
- Activities
- Personal itineraries
- Travel details
- Transportation assignments
- Dining details
- FAQ
- Maps
- Announcements
- Push notifications
- Photo moderation
- Help requests
- Feedback exports
- Data imports/exports

### Recommended Admin Tech

- React, Next.js, Vue, or similar web framework
- Hosted through AWS Amplify Hosting or S3 + CloudFront
- Auth through Cognito
- API access through API Gateway

### Acceptance Criteria

- Event staff can manage content without a developer.
- CSV/XLSX import is available for attendees, travel, itinerary, dining, and transportation.
- Admin changes appear in the mobile app without app resubmission.

---

## 18.9 Infrastructure as Code

Developer should provide infrastructure as code.

Acceptable options:

- AWS CDK
- Terraform
- AWS SAM
- Serverless Framework

Preferred:

- AWS CDK or Terraform

Infrastructure code should define:

- Cognito
- API Gateway
- Lambda
- DynamoDB tables
- S3 buckets
- CloudFront
- Pinpoint/SNS configuration
- IAM roles and policies
- CloudWatch alarms
- Secrets/parameters
- Environment-specific deployment configuration

### Acceptance Criteria

- AWS infrastructure can be recreated from source control.
- Dev/staging/prod environments are consistently deployed.
- IAM permissions follow least-privilege principles.

---

## 18.10 Monitoring, Logging & Support

### Required

- CloudWatch logs for all Lambda functions
- API Gateway access logs
- CloudWatch metrics for API errors and latency
- Alerts for elevated error rates
- Alerts for failed photo processing
- Alerts for push notification failures
- S3 upload failure tracking

### Preferred

- AWS X-Ray tracing
- CloudWatch dashboard
- Dead-letter queues for failed async processing
- Admin audit log for content changes

### Acceptance Criteria

- Developer can troubleshoot failed login, failed upload, failed notification, and API errors.
- Production errors are visible without logging into user devices.
- Admin actions are traceable.

---

## 18.11 Backup, Retention & Post-Event Archive

### Requirements

- DynamoDB point-in-time recovery enabled for production.
- S3 versioning enabled for production media buckets.
- Defined post-event archive process.
- Ability to export:
  - Attendees
  - Itineraries
  - Feedback
  - Help requests
  - Photo gallery
  - Notification history

### Retention Policy

Developer/client should define:

- How long attendee personal data is retained
- How long travel data is retained
- How long photos remain available
- Whether attendees can access gallery after event
- Whether full event archive is downloaded and then deleted from AWS

### Acceptance Criteria

- Production event data can be recovered from accidental deletion.
- Post-event data export is available.
- Personal data retention is explicitly documented.

---

## 18.12 AWS Security Requirements

### Required

- HTTPS only
- Cognito JWT validation on all private APIs
- Role-based access control
- S3 buckets private by default
- No public write access to S3
- Pre-signed URLs for uploads/downloads where appropriate
- IAM least privilege
- Secrets stored in Secrets Manager or Parameter Store
- CloudWatch logging enabled
- Admin MFA
- CORS restricted to approved domains for admin portal

### Preferred

- AWS WAF for API/admin protection
- CloudTrail enabled
- GuardDuty enabled
- S3 malware scanning or moderation workflow for uploaded media
- Rekognition image moderation for attendee uploads, if desired

### Acceptance Criteria

- No private attendee, travel, dietary, or photo data is publicly accessible.
- Admin access is protected with MFA.
- Developer documents security configuration.

---

## 18.13 AWS Cost Considerations

The event size is relatively small, so a serverless AWS architecture should be cost-effective.

Expected cost drivers:

- S3 photo storage
- CloudFront media delivery
- Push notification volume
- Lambda/API Gateway requests
- DynamoDB reads/writes
- Admin portal hosting
- Logs retention

### Developer Should Provide

- Estimated monthly AWS cost for:
  - Development
  - Active event month
  - Post-event archive month
- Cost assumptions:
  - Number of attendees
  - Number of photos uploaded
  - Average image size
  - Push notification volume
  - Admin users
  - Data retention period

---

## 18.14 AWS-Specific Delivery Expectations

Developer should provide:

- AWS architecture diagram
- Infrastructure as code repository
- Environment setup instructions
- AWS deployment instructions
- Mobile app API environment configuration
- Admin portal deployment
- Cognito setup instructions
- APNs/FCM push notification setup documentation
- S3 bucket and media workflow documentation
- Data import templates
- Backup/export procedure
- Basic runbook for event staff
- Production launch checklist

---

## 18.15 AWS Production Launch Checklist

Before event launch:

- Production AWS environment deployed
- Cognito production user pool configured
- Admin MFA enabled
- iOS APNs configured
- Android FCM configured
- Push notifications tested on real devices
- API Gateway production endpoint configured
- S3 buckets private
- CloudFront distribution configured, if used
- DynamoDB point-in-time recovery enabled
- App points to production API
- Test attendee accounts created
- Admin portal tested
- Attendee import tested
- Travel import tested
- Dining import tested
- Photo upload tested
- Photo moderation tested
- Offline cache tested
- Calendar sync tested
- Deep links tested
- CloudWatch alerts configured
- Post-event export process tested

---

## 18.16 Admin Portal Ad-Hoc Push Notifications

The admin web app portal must support sending ad-hoc push notifications without developer involvement. This is required for onsite event operations where staff may need to quickly communicate schedule changes, reminders, transportation updates, weather changes, or urgent messages.

### Admin Notification Composer

The admin portal should include a push notification composer with the following fields:

- Notification title
- Notification body/message
- Target audience
- Optional deep link destination
- Priority level
  - Normal
  - Important
  - Urgent
- Send timing
  - Send now
  - Schedule for later
- Expiration time
- Optional related event module
  - Agenda item
  - Dining item
  - Transportation detail
  - Activity
  - Travel update
  - FAQ
  - Help page
  - Announcement
- Internal admin note, not visible to attendees

### Audience Targeting

Admin should be able to send ad-hoc notifications to:

- All attendees
- Individual attendee
- Multiple selected attendees
- Attendee group
- Custom tags
- Activity participants
- Dining group
- Transportation/shuttle group
- Arrival group
- Departure group
- Attendees with incomplete registration
- Attendees with missing travel details
- Attendees with specific lodging/hotel assignment
- Event staff only

### Notification Preview

Before sending, admin should see a preview showing:

- Approximate attendee count
- Target group description
- Notification title
- Notification message
- Deep link destination
- Scheduled send time, if applicable

### Test Send

Admin should be able to send a test notification to:

- Themselves
- Selected admin users
- A test attendee profile

### Send Confirmation

Before sending to attendees, the portal should require confirmation:

- “You are about to send this notification to X attendees.”
- For urgent/all-attendee notifications, require an extra confirmation step.

### Notification History

The admin portal should show a notification history table.

Fields:

- Title
- Message preview
- Created by
- Created at
- Sent at
- Target audience
- Estimated recipients
- Successful sends
- Failed sends
- Status
  - Draft
  - Scheduled
  - Sending
  - Sent
  - Failed
  - Cancelled
- Deep link destination

Admin should be able to:

- View details of past notifications
- Duplicate a previous notification
- Cancel a scheduled notification
- Resend a failed notification
- Export notification history

### In-App Notification Center

All ad-hoc push notifications should also appear in the attendee's in-app notification center.

Notification center items should include:

- Title
- Message
- Date/time
- Related module link
- Read/unread status
- Priority level

### AWS Backend Flow

1. Admin creates notification in the web portal.
2. Admin selects audience and optional deep link.
3. API Gateway receives request and validates Cognito admin JWT.
4. Lambda verifies admin role and event permission.
5. Lambda resolves target attendees from DynamoDB.
6. Lambda resolves device tokens associated with those attendees.
7. Notification record is written to DynamoDB.
8. If “send now,” Lambda triggers Amazon Pinpoint or SNS immediately.
9. If scheduled, EventBridge schedules the send workflow.
10. Send results are logged to DynamoDB and CloudWatch.
11. Attendee app receives APNs/FCM push notification.
12. Notification is added to in-app notification center.

### API Endpoints

Recommended admin notification endpoints:

```text
POST /admin/events/{eventId}/notifications
GET /admin/events/{eventId}/notifications
GET /admin/events/{eventId}/notifications/{notificationId}
POST /admin/events/{eventId}/notifications/{notificationId}/send-test
POST /admin/events/{eventId}/notifications/{notificationId}/send
POST /admin/events/{eventId}/notifications/{notificationId}/duplicate
POST /admin/events/{eventId}/notifications/{notificationId}/cancel
```

Recommended attendee notification endpoints:

```text
GET /me/notifications
PATCH /me/notifications/{notificationId}/read
PATCH /me/notifications/read-all
POST /me/device-tokens
DELETE /me/device-tokens/{deviceTokenId}
```

### Notification Data Model

```json
{
  "id": "notification_001",
  "eventId": "event_001",
  "title": "Dinner Location Changed",
  "body": "Tonight's dinner has moved to the Lakeview Terrace.",
  "targetType": "group",
  "targetCriteria": {
    "tags": ["welcome_dinner"],
    "attendeeIds": [],
    "transportationGroup": null,
    "activityId": null
  },
  "deepLink": {
    "type": "dining",
    "id": "dining_001"
  },
  "priority": "important",
  "status": "sent",
  "sendAt": "2026-09-12T17:00:00-07:00",
  "expiresAt": "2026-09-13T00:00:00-07:00",
  "createdByAdminId": "admin_001",
  "createdAt": "2026-09-12T16:45:00-07:00",
  "recipientCount": 100,
  "successCount": 98,
  "failureCount": 2
}
```

### Device Token Data Model

```json
{
  "id": "device_token_001",
  "attendeeId": "attendee_001",
  "eventId": "event_001",
  "platform": "ios",
  "deviceToken": "apns_or_fcm_token",
  "enabled": true,
  "createdAt": "2026-09-01T10:00:00-07:00",
  "lastSeenAt": "2026-09-12T09:00:00-07:00"
}
```

### Admin Permissions

Only authorized users should be able to create or send ad-hoc notifications.

Suggested permissions:

- `notifications:view`
- `notifications:create`
- `notifications:send_test`
- `notifications:send_all`
- `notifications:send_segment`
- `notifications:cancel`
- `notifications:export`

### Acceptance Criteria

- Admin can send an ad-hoc notification from the web portal without developer support.
- Admin can target all attendees, selected attendees, or defined groups/tags.
- Admin can preview recipient count before sending.
- Admin can send a test notification before sending broadly.
- Admin can send immediate or scheduled notifications.
- Urgent/all-attendee sends require confirmation.
- Notification deep links open the correct app screen.
- Notification appears in both native push and in-app notification center.
- Notification history is visible to admins.
- Failed sends are logged.
- Admin actions are auditable.


---

# Client feedback — July 24 2026

Received by email on 24 July 2026 and not folded into this spec until 28 August 2026.
Sequenced deliberately: content and UI changes first, the My Trip / Travel merge second, and
messaging last because it is the only item that adds backend surface area.

Nothing here re-opens push notifications. Push remains cut from v1 (see §18.16 and
`docs/open-questions.md`); messaging is poll-based for exactly that reason.

## CF-1 Attendees in the Home quick links

The attendee directory is currently reachable only from the More menu. Promote it to the Home
screen quick links beside Agenda, My Itinerary and Travel.

**Acceptance:** Attendees appears in the Home quick-link grid and opens the directory.

## CF-2 Directory grouped by market

Attendees should be grouped by market rather than presented as one flat list.

Markets: San Diego, Bay Area, Boulder, Seattle, Boston, UK, Investments, BioMed Realty,
Blackstone.

Implemented on the **existing `tags` field** — no new schema field. An attendee whose tags match
none of the markets appears under "Other". Tag matching is exact and case-sensitive
(`services/api/src/lib/audience.ts`), so market tags must be applied consistently at import.

**Acceptance:** The directory groups (or filters) by market; untagged attendees are reachable
under "Other"; no attendee disappears from the list.

## CF-3 Welcome message on Home

An optional welcome note from the host, shown near the top of the Home screen.

Adds `welcomeMessage` and `welcomeMessageAuthor` (both optional strings) to `EventProfile`,
editable in the admin Event page. Hidden entirely when empty.

**Acceptance:** Admin can set and clear the message; it renders on Home when present and takes
no vertical space when absent.

## CF-4 Event contacts

A list of named contacts (name, role, phone, email) on the Help screen, tappable to call or
email.

Adds an optional `eventContacts` array to `EventProfile`, editable in the admin Event page.
Uses `url_launcher` with `tel:` and `mailto:`; the Android `<queries>` block already declares
both intents, and `LSApplicationQueriesSchemes` already lists both schemes on iOS.

**Acceptance:** Contacts render on Help; tapping a phone opens the dialer and an email opens the
mail composer on both platforms.

## CF-5 Merge My Trip and Travel

Attendees see "My Trip" and "Travel" as separate destinations and expect one place for
everything about their trip.

Travel content folds into the My Trip tab as sections. `/travel` stays routable so existing
deep links and notification targets keep working, but Travel is removed from the More menu and
the Home quick links. `/home`, `/agenda` and `/itinerary` continue to render `HomeShell`, and
detail routes continue to use `context.push` so the back button behaves.

**Acceptance:** My Trip shows itinerary and travel together; `/travel` still resolves; back
navigation works from every entry point.

## CF-6 Attendee ↔ staff messaging

Attendees can message event staff and receive replies. Staff work from an inbox in the admin
portal.

## CF-7 Attendee ↔ attendee messaging

Attendees can message each other, restricted to attendees who are **both**
`directoryVisible` and `contactSharingOptIn` — the existing privacy flags are the gate, and no
new consent surface is introduced.

### Messaging design notes (CF-6 and CF-7)

**Polling, not WebSockets.** No API Gateway WebSocket API. With push cut from v1 a real-time
transport delivers nothing a user would notice: without a push notification, a message arriving
over a socket cannot reach a backgrounded app anyway. The app polls unread counts on foreground
and every 30s while a conversation is open.

**Single table.** Conversations and their messages live in the existing DynamoDB table following
the key patterns in `src/lib/keys.ts`. No second table.

**Endpoint budget.** The parent CloudFormation stack has limited headroom (500-resource cap; see
`CLAUDE.md`), so the endpoint set is deliberately small and the admin inbox reuses the attendee
endpoints wherever it can.

**Acceptance:** An attendee can start and continue a conversation with staff and with an
eligible attendee; unread counts appear as a badge; staff can reply from the admin portal;
attendees who have not opted in cannot be messaged.
