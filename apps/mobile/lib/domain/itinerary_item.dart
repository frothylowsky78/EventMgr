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
      };

  DateTime get start => DateTime.parse(startDateTime);
  DateTime? get end => endDateTime == null ? null : DateTime.parse(endDateTime!);
}
