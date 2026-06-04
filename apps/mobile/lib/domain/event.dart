/// Event profile + branding, loaded from the backend. Drives runtime theming.
class Branding {
  final String logoUrl;
  final String heroImageUrl;
  final String primaryColor;
  final String secondaryColor;

  const Branding({
    this.logoUrl = '',
    this.heroImageUrl = '',
    this.primaryColor = '',
    this.secondaryColor = '',
  });

  factory Branding.fromJson(Map<String, dynamic> j) => Branding(
        logoUrl: j['logoUrl'] as String? ?? '',
        heroImageUrl: j['heroImageUrl'] as String? ?? '',
        primaryColor: j['primaryColor'] as String? ?? '',
        secondaryColor: j['secondaryColor'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {
        'logoUrl': logoUrl,
        'heroImageUrl': heroImageUrl,
        'primaryColor': primaryColor,
        'secondaryColor': secondaryColor,
      };
}

class RegistrationAction {
  final String id;
  final String label;
  const RegistrationAction({required this.id, required this.label});

  factory RegistrationAction.fromJson(Map<String, dynamic> j) =>
      RegistrationAction(id: j['id'] as String? ?? '', label: j['label'] as String? ?? '');
  Map<String, dynamic> toJson() => {'id': id, 'label': label};
}

class EventProfile {
  final String id;
  final String name;
  final String startDate;
  final String endDate;
  final String locationName;
  final String address;
  final String timezone;
  final String? registrationDeadline;
  final List<RegistrationAction> registrationActions;
  final Branding branding;

  const EventProfile({
    required this.id,
    required this.name,
    required this.startDate,
    required this.endDate,
    required this.locationName,
    required this.address,
    required this.timezone,
    required this.branding,
    this.registrationDeadline,
    this.registrationActions = const [],
  });

  factory EventProfile.fromJson(Map<String, dynamic> j) => EventProfile(
        id: j['id'] as String,
        name: j['name'] as String? ?? '',
        startDate: j['startDate'] as String? ?? '',
        endDate: j['endDate'] as String? ?? '',
        locationName: j['locationName'] as String? ?? '',
        address: j['address'] as String? ?? '',
        timezone: j['timezone'] as String? ?? 'UTC',
        registrationDeadline: j['registrationDeadline'] as String?,
        registrationActions: (j['registrationActions'] as List?)
                ?.map((e) => RegistrationAction.fromJson((e as Map).cast<String, dynamic>()))
                .toList() ??
            const [],
        branding: Branding.fromJson(
            (j['branding'] as Map?)?.cast<String, dynamic>() ?? const {}),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'startDate': startDate,
        'endDate': endDate,
        'locationName': locationName,
        'address': address,
        'timezone': timezone,
        'registrationDeadline': registrationDeadline,
        'registrationActions': registrationActions.map((e) => e.toJson()).toList(),
        'branding': branding.toJson(),
      };
}
