class AttendeeCard {
  final String id;
  final String firstName;
  final String lastName;
  final String company;
  final String title;
  final String city;
  final String profilePhotoUrl;
  final String guestName;
  /// Market tags for directory grouping (CF-2). Internal tags are filtered out server-side.
  final List<String> markets;
  /// Whether this attendee accepts messages from other guests (CF-7).
  final bool messageable;

  const AttendeeCard({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.company = '',
    this.title = '',
    this.city = '',
    this.profilePhotoUrl = '',
    this.guestName = '',
    this.markets = const [],
    this.messageable = false,
  });

  factory AttendeeCard.fromJson(Map<String, dynamic> j) => AttendeeCard(
        id: j['id'] as String,
        firstName: j['firstName'] as String? ?? '',
        lastName: j['lastName'] as String? ?? '',
        company: j['company'] as String? ?? '',
        title: j['title'] as String? ?? '',
        city: j['city'] as String? ?? '',
        profilePhotoUrl: j['profilePhotoUrl'] as String? ?? '',
        guestName: j['guestName'] as String? ?? '',
        markets:
            (j['markets'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        messageable: j['messageable'] as bool? ?? false,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'firstName': firstName,
        'lastName': lastName,
        'company': company,
        'title': title,
        'city': city,
        'profilePhotoUrl': profilePhotoUrl,
        'guestName': guestName,
        'markets': markets,
        'messageable': messageable,
      };

  String get fullName => '$firstName $lastName'.trim();

  String get initials {
    final f = firstName.isNotEmpty ? firstName[0] : '';
    final l = lastName.isNotEmpty ? lastName[0] : '';
    final i = '$f$l'.toUpperCase();
    return i.isEmpty ? '?' : i;
  }

  bool matches(String q) {
    final s = q.toLowerCase();
    return fullName.toLowerCase().contains(s) ||
        company.toLowerCase().contains(s) ||
        city.toLowerCase().contains(s);
  }
}
