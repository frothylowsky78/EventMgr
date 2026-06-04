class MapPin {
  final String label;
  final String? note;
  const MapPin({required this.label, this.note});
  factory MapPin.fromJson(Map<String, dynamic> j) =>
      MapPin(label: j['label'] as String? ?? '', note: j['note'] as String?);
  Map<String, dynamic> toJson() => {'label': label, 'note': note};
}

class MapLocation {
  final String id;
  final String title;
  final String type;
  final String imageUrl;
  final String description;
  final String address;
  final double? latitude;
  final double? longitude;
  final List<MapPin> pins;

  const MapLocation({
    required this.id,
    required this.title,
    required this.type,
    this.imageUrl = '',
    this.description = '',
    this.address = '',
    this.latitude,
    this.longitude,
    this.pins = const [],
  });

  factory MapLocation.fromJson(Map<String, dynamic> j) => MapLocation(
        id: j['id'] as String,
        title: j['title'] as String? ?? '',
        type: j['type'] as String? ?? 'property',
        imageUrl: j['imageUrl'] as String? ?? '',
        description: j['description'] as String? ?? '',
        address: j['address'] as String? ?? '',
        latitude: (j['latitude'] as num?)?.toDouble(),
        longitude: (j['longitude'] as num?)?.toDouble(),
        pins: (j['pins'] as List?)
                ?.map((e) => MapPin.fromJson((e as Map).cast<String, dynamic>()))
                .toList() ??
            const [],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'type': type,
        'imageUrl': imageUrl,
        'description': description,
        'address': address,
        'latitude': latitude,
        'longitude': longitude,
        'pins': pins.map((e) => e.toJson()).toList(),
      };

  String get typeLabel => type.replaceAll('_', ' ');

  bool get hasCoordinates => latitude != null && longitude != null;
}
