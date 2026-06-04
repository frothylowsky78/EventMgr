class HelpContact {
  final String label;
  final String? phone;
  final String? email;
  final String? note;
  const HelpContact({required this.label, this.phone, this.email, this.note});

  factory HelpContact.fromJson(Map<String, dynamic> j) => HelpContact(
        label: j['label'] as String? ?? '',
        phone: j['phone'] as String?,
        email: j['email'] as String?,
        note: j['note'] as String?,
      );

  Map<String, dynamic> toJson() =>
      {'label': label, 'phone': phone, 'email': email, 'note': note};
}

class HelpTopic {
  final String title;
  final String body;
  const HelpTopic({required this.title, required this.body});
  factory HelpTopic.fromJson(Map<String, dynamic> j) =>
      HelpTopic(title: j['title'] as String? ?? '', body: j['body'] as String? ?? '');
  Map<String, dynamic> toJson() => {'title': title, 'body': body};
}

class HelpContent {
  final List<HelpContact> contacts;
  final List<HelpTopic> topics;
  final String emergencyText;
  final String lostAndFound;

  const HelpContent({
    this.contacts = const [],
    this.topics = const [],
    this.emergencyText = '',
    this.lostAndFound = '',
  });

  factory HelpContent.fromJson(Map<String, dynamic> j) => HelpContent(
        contacts: (j['contacts'] as List?)
                ?.map((e) => HelpContact.fromJson((e as Map).cast<String, dynamic>()))
                .toList() ??
            const [],
        topics: (j['topics'] as List?)
                ?.map((e) => HelpTopic.fromJson((e as Map).cast<String, dynamic>()))
                .toList() ??
            const [],
        emergencyText: j['emergencyText'] as String? ?? '',
        lostAndFound: j['lostAndFound'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {
        'contacts': contacts.map((e) => e.toJson()).toList(),
        'topics': topics.map((e) => e.toJson()).toList(),
        'emergencyText': emergencyText,
        'lostAndFound': lostAndFound,
      };
}

class HelpRequest {
  final String id;
  final String category;
  final String message;
  final String urgency;
  final String status;
  final String createdAt;
  const HelpRequest({
    required this.id,
    required this.category,
    required this.message,
    required this.urgency,
    required this.status,
    required this.createdAt,
  });

  factory HelpRequest.fromJson(Map<String, dynamic> j) => HelpRequest(
        id: j['id'] as String,
        category: j['category'] as String? ?? '',
        message: j['message'] as String? ?? '',
        urgency: j['urgency'] as String? ?? 'normal',
        status: j['status'] as String? ?? 'open',
        createdAt: j['createdAt'] as String? ?? '',
      );
}
