class AgendaItem {
  final String id;
  final String eventId;
  final String title;
  final String date; // YYYY-MM-DD
  final String startTime; // HH:mm
  final String? endTime;
  final String? locationId;
  final String? locationName;
  final String category;
  final String description;
  final String speaker;
  final String dressCode;
  final String mapLink;
  final bool required;
  final int? capacity;
  final List<String> eligibleTags;
  final bool reminderEnabled;

  const AgendaItem({
    required this.id,
    required this.eventId,
    required this.title,
    required this.date,
    required this.startTime,
    required this.category,
    this.endTime,
    this.locationId,
    this.locationName,
    this.description = '',
    this.speaker = '',
    this.dressCode = '',
    this.mapLink = '',
    this.required = false,
    this.capacity,
    this.eligibleTags = const [],
    this.reminderEnabled = true,
  });

  factory AgendaItem.fromJson(Map<String, dynamic> j) => AgendaItem(
        id: j['id'] as String,
        eventId: j['eventId'] as String? ?? '',
        title: j['title'] as String? ?? '',
        date: j['date'] as String? ?? '',
        startTime: j['startTime'] as String? ?? '',
        endTime: j['endTime'] as String?,
        locationId: j['locationId'] as String?,
        locationName: j['locationName'] as String?,
        category: j['category'] as String? ?? 'general_session',
        description: j['description'] as String? ?? '',
        speaker: j['speaker'] as String? ?? '',
        dressCode: j['dressCode'] as String? ?? '',
        mapLink: j['mapLink'] as String? ?? '',
        required: j['required'] as bool? ?? false,
        capacity: j['capacity'] as int?,
        eligibleTags:
            (j['eligibleTags'] as List?)?.map((e) => e.toString()).toList() ??
                const [],
        reminderEnabled: j['reminderEnabled'] as bool? ?? true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'eventId': eventId,
        'title': title,
        'date': date,
        'startTime': startTime,
        'endTime': endTime,
        'locationId': locationId,
        'locationName': locationName,
        'category': category,
        'description': description,
        'speaker': speaker,
        'dressCode': dressCode,
        'mapLink': mapLink,
        'required': required,
        'capacity': capacity,
        'eligibleTags': eligibleTags,
        'reminderEnabled': reminderEnabled,
      };

  String get categoryLabel => category.replaceAll('_', ' ');
}
