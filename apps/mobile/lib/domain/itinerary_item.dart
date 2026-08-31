class ItineraryItem {
  final String id;
  final String attendeeId;
  final String? agendaItemId;
  final String? customTitle;
  final String startDateTime; // ISO-8601 with offset
  final String? endDateTime;
  final String? locationId;
  final String notes;
  final bool reminderEnabled;
  /// 'attendee' if the guest added it themselves; only those can be removed in-app.
  final String source;

  const ItineraryItem({
    required this.id,
    required this.attendeeId,
    required this.startDateTime,
    this.agendaItemId,
    this.customTitle,
    this.endDateTime,
    this.locationId,
    this.notes = '',
    this.reminderEnabled = true,
    this.source = 'admin',
  });

  factory ItineraryItem.fromJson(Map<String, dynamic> j) => ItineraryItem(
        id: j['id'] as String,
        attendeeId: j['attendeeId'] as String? ?? '',
        agendaItemId: j['agendaItemId'] as String?,
        customTitle: j['customTitle'] as String?,
        startDateTime: j['startDateTime'] as String? ?? '',
        endDateTime: j['endDateTime'] as String?,
        locationId: j['locationId'] as String?,
        notes: j['notes'] as String? ?? '',
        reminderEnabled: j['reminderEnabled'] as bool? ?? true,
        source: j['source'] as String? ?? 'admin',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'attendeeId': attendeeId,
        'agendaItemId': agendaItemId,
        'customTitle': customTitle,
        'startDateTime': startDateTime,
        'endDateTime': endDateTime,
        'locationId': locationId,
        'notes': notes,
        'reminderEnabled': reminderEnabled,
        'source': source,
      };

  // startDateTime/endDateTime carry a UTC offset, and Dart returns a UTC DateTime for those.
  // Convert to the device timezone so times render as the attendee's local wall clock —
  // the same thing travel/transportation/notification screens already do at their call sites.
  bool get removableByAttendee => source == 'attendee';

  DateTime get start => DateTime.parse(startDateTime).toLocal();
  DateTime? get end =>
      endDateTime == null ? null : DateTime.parse(endDateTime!).toLocal();
}
