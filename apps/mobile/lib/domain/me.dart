/// The authenticated attendee's own profile (GET /me) — registration status + editable fields.
class AttendeeMe {
  final String id;
  final String firstName;
  final String lastName;
  final String email;
  final String phone;
  final String company;
  final String title;
  final String city;
  /// Pre-signed GET URL issued by the API on each /me read; expires, so don't persist it long.
  final String profilePhotoUrl;
  /// Ids this attendee has blocked. The API enforces the block; this is what the unblock
  /// screen lists.
  final List<String> blockedAttendeeIds;
  final List<String> dietaryRestrictions;
  final String accessibilityNeeds;
  final bool directoryVisible;
  final bool contactSharingOptIn;
  final String registrationStatus; // not_started | in_progress | complete | submitted | past_due
  final List<String> completedRegistrationActions;

  const AttendeeMe({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.registrationStatus,
    required this.completedRegistrationActions,
    this.email = '',
    this.phone = '',
    this.company = '',
    this.title = '',
    this.city = '',
    this.profilePhotoUrl = '',
    this.blockedAttendeeIds = const [],
    this.dietaryRestrictions = const [],
    this.accessibilityNeeds = '',
    this.directoryVisible = true,
    this.contactSharingOptIn = false,
  });

  factory AttendeeMe.fromJson(Map<String, dynamic> j) => AttendeeMe(
        id: j['id'] as String,
        firstName: j['firstName'] as String? ?? '',
        lastName: j['lastName'] as String? ?? '',
        email: j['email'] as String? ?? '',
        phone: j['phone'] as String? ?? '',
        company: j['company'] as String? ?? '',
        title: j['title'] as String? ?? '',
        city: j['city'] as String? ?? '',
        profilePhotoUrl: j['profilePhotoUrl'] as String? ?? '',
        blockedAttendeeIds:
            (j['blockedAttendeeIds'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        dietaryRestrictions:
            (j['dietaryRestrictions'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        accessibilityNeeds: j['accessibilityNeeds'] as String? ?? '',
        directoryVisible: j['directoryVisible'] as bool? ?? true,
        contactSharingOptIn: j['contactSharingOptIn'] as bool? ?? false,
        registrationStatus: j['registrationStatus'] as String? ?? 'not_started',
        completedRegistrationActions:
            (j['completedRegistrationActions'] as List?)?.map((e) => e.toString()).toList() ??
                const [],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'firstName': firstName,
        'lastName': lastName,
        'email': email,
        'phone': phone,
        'company': company,
        'title': title,
        'city': city,
        'profilePhotoUrl': profilePhotoUrl,
        'blockedAttendeeIds': blockedAttendeeIds,
        'dietaryRestrictions': dietaryRestrictions,
        'accessibilityNeeds': accessibilityNeeds,
        'directoryVisible': directoryVisible,
        'contactSharingOptIn': contactSharingOptIn,
        'registrationStatus': registrationStatus,
        'completedRegistrationActions': completedRegistrationActions,
      };

  /// 'submitted' predates attendee self-service; imported CSVs may still carry it.
  bool get registrationComplete =>
      registrationStatus == 'complete' || registrationStatus == 'submitted';
}
