class DiningSeat {
  final String? table;
  final String? seat;
  final String? note;
  const DiningSeat({this.table, this.seat, this.note});

  factory DiningSeat.fromJson(Map<String, dynamic> j) => DiningSeat(
        table: j['table'] as String?,
        seat: j['seat'] as String?,
        note: j['note'] as String?,
      );

  String get label {
    final parts = <String>[
      if ((table ?? '').isNotEmpty) 'Table $table',
      if ((seat ?? '').isNotEmpty) 'Seat $seat',
    ];
    return parts.join(' · ');
  }
}

class DiningItem {
  final String id;
  final String title;
  final String date;
  final String startTime;
  final String? endTime;
  final String description;
  final String? locationName;
  final List<String> menu;
  final String dressCode;
  final String dietaryNotes;
  final bool seatingAssignmentEnabled;
  final DiningSeat? seating;

  const DiningItem({
    required this.id,
    required this.title,
    required this.date,
    required this.startTime,
    this.endTime,
    this.description = '',
    this.locationName,
    this.menu = const [],
    this.dressCode = '',
    this.dietaryNotes = '',
    this.seatingAssignmentEnabled = false,
    this.seating,
  });

  factory DiningItem.fromJson(Map<String, dynamic> j) => DiningItem(
        id: j['id'] as String,
        title: j['title'] as String? ?? '',
        date: j['date'] as String? ?? '',
        startTime: j['startTime'] as String? ?? '',
        endTime: j['endTime'] as String?,
        description: j['description'] as String? ?? '',
        locationName: j['locationName'] as String?,
        menu: (j['menu'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        dressCode: j['dressCode'] as String? ?? '',
        dietaryNotes: j['dietaryNotes'] as String? ?? '',
        seatingAssignmentEnabled: j['seatingAssignmentEnabled'] as bool? ?? false,
        seating: (j['seating'] as Map?) == null
            ? null
            : DiningSeat.fromJson((j['seating'] as Map).cast<String, dynamic>()),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'date': date,
        'startTime': startTime,
        'endTime': endTime,
        'description': description,
        'locationName': locationName,
        'menu': menu,
        'dressCode': dressCode,
        'dietaryNotes': dietaryNotes,
        'seatingAssignmentEnabled': seatingAssignmentEnabled,
        'seating': seating == null
            ? null
            : {'table': seating!.table, 'seat': seating!.seat, 'note': seating!.note},
      };
}
