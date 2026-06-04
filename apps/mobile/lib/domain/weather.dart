class WeatherDay {
  final String date;
  final num highF;
  final num lowF;
  final String condition;
  final num? precipChance;
  const WeatherDay({
    required this.date,
    required this.highF,
    required this.lowF,
    required this.condition,
    this.precipChance,
  });

  factory WeatherDay.fromJson(Map<String, dynamic> j) => WeatherDay(
        date: j['date'] as String? ?? '',
        highF: (j['highF'] as num?) ?? 0,
        lowF: (j['lowF'] as num?) ?? 0,
        condition: j['condition'] as String? ?? '',
        precipChance: j['precipChance'] as num?,
      );

  Map<String, dynamic> toJson() => {
        'date': date,
        'highF': highF,
        'lowF': lowF,
        'condition': condition,
        'precipChance': precipChance,
      };
}

class WeatherNote {
  final String id;
  final String title;
  final String body;
  final String createdAt;
  const WeatherNote({
    required this.id,
    required this.title,
    required this.body,
    required this.createdAt,
  });

  factory WeatherNote.fromJson(Map<String, dynamic> j) => WeatherNote(
        id: j['id'] as String? ?? '',
        title: j['title'] as String? ?? '',
        body: j['body'] as String? ?? '',
        createdAt: j['createdAt'] as String? ?? '',
      );

  Map<String, dynamic> toJson() =>
      {'id': id, 'title': title, 'body': body, 'createdAt': createdAt};
}

class WeatherInfo {
  final num? currentTempF;
  final String? currentCondition;
  final List<WeatherDay> daily;
  final List<WeatherNote> notes;

  const WeatherInfo({
    this.currentTempF,
    this.currentCondition,
    this.daily = const [],
    this.notes = const [],
  });

  factory WeatherInfo.fromJson(Map<String, dynamic> j) {
    final cur = (j['current'] as Map?)?.cast<String, dynamic>();
    return WeatherInfo(
      currentTempF: cur?['tempF'] as num?,
      currentCondition: cur?['condition'] as String?,
      daily: (j['daily'] as List?)
              ?.map((e) => WeatherDay.fromJson((e as Map).cast<String, dynamic>()))
              .toList() ??
          const [],
      notes: (j['notes'] as List?)
              ?.map((e) => WeatherNote.fromJson((e as Map).cast<String, dynamic>()))
              .toList() ??
          const [],
    );
  }

  Map<String, dynamic> toJson() => {
        'current': currentTempF == null
            ? null
            : {'tempF': currentTempF, 'condition': currentCondition},
        'daily': daily.map((e) => e.toJson()).toList(),
        'notes': notes.map((e) => e.toJson()).toList(),
      };

  bool get hasData => currentTempF != null || daily.isNotEmpty || notes.isNotEmpty;
}
