/// The authenticated attendee's own profile (GET /me) — used for registration status.
class AttendeeMe {
  final String id;
  final String firstName;
  final String lastName;
  final String registrationStatus; // not_started | in_progress | submitted | past_due
  final List<String> completedRegistrationActions;

  const AttendeeMe({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.registrationStatus,
    required this.completedRegistrationActions,
  });

  factory AttendeeMe.fromJson(Map<String, dynamic> j) => AttendeeMe(
        id: j['id'] as String,
        firstName: j['firstName'] as String? ?? '',
        lastName: j['lastName'] as String? ?? '',
        registrationStatus: j['registrationStatus'] as String? ?? 'not_started',
        completedRegistrationActions:
            (j['completedRegistrationActions'] as List?)?.map((e) => e.toString()).toList() ??
                const [],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'firstName': firstName,
        'lastName': lastName,
        'registrationStatus': registrationStatus,
        'completedRegistrationActions': completedRegistrationActions,
      };

  bool get registrationComplete => registrationStatus == 'submitted';
}
