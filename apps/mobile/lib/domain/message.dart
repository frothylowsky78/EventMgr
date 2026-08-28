/// Messaging models (CF-6/CF-7). Polled, not socket-based — see docs/open-questions.md A13.

class ConversationParticipant {
  final String type; // 'attendee' | 'staff'
  final String id;
  final String name;
  const ConversationParticipant({required this.type, required this.id, this.name = ''});

  factory ConversationParticipant.fromJson(Map<String, dynamic> j) => ConversationParticipant(
        type: j['type'] as String? ?? 'attendee',
        id: j['id'] as String? ?? '',
        name: j['name'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {'type': type, 'id': id, 'name': name};
}

class Conversation {
  final String id;
  final String eventId;
  final List<ConversationParticipant> participants;
  final String lastMessageAt;
  final String lastMessagePreview;
  final int unreadCount;

  const Conversation({
    required this.id,
    this.eventId = '',
    this.participants = const [],
    this.lastMessageAt = '',
    this.lastMessagePreview = '',
    this.unreadCount = 0,
  });

  factory Conversation.fromJson(Map<String, dynamic> j) => Conversation(
        id: j['id'] as String? ?? '',
        eventId: j['eventId'] as String? ?? '',
        participants: (j['participants'] as List?)
                ?.map((e) =>
                    ConversationParticipant.fromJson((e as Map).cast<String, dynamic>()))
                .toList() ??
            const [],
        lastMessageAt: j['lastMessageAt'] as String? ?? '',
        lastMessagePreview: j['lastMessagePreview'] as String? ?? '',
        unreadCount: (j['unreadCount'] as num?)?.toInt() ?? 0,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'eventId': eventId,
        'participants': participants.map((e) => e.toJson()).toList(),
        'lastMessageAt': lastMessageAt,
        'lastMessagePreview': lastMessagePreview,
        'unreadCount': unreadCount,
      };

  /// The other side of the thread, from this attendee's point of view.
  String titleFor(String? myAttendeeId) {
    final other = participants.where((p) => p.id != myAttendeeId);
    if (other.isEmpty) return 'Conversation';
    return other.map((p) => p.name.isEmpty ? 'Event team' : p.name).join(', ');
  }

  DateTime? get lastAt =>
      lastMessageAt.isEmpty ? null : DateTime.tryParse(lastMessageAt)?.toLocal();
}

class Message {
  final String id;
  final String conversationId;
  final String senderType;
  final String senderId;
  final String senderName;
  final String body;
  final String createdAt;

  const Message({
    required this.id,
    this.conversationId = '',
    this.senderType = 'attendee',
    this.senderId = '',
    this.senderName = '',
    this.body = '',
    this.createdAt = '',
  });

  factory Message.fromJson(Map<String, dynamic> j) => Message(
        id: j['id'] as String? ?? '',
        conversationId: j['conversationId'] as String? ?? '',
        senderType: j['senderType'] as String? ?? 'attendee',
        senderId: j['senderId'] as String? ?? '',
        senderName: j['senderName'] as String? ?? '',
        body: j['body'] as String? ?? '',
        createdAt: j['createdAt'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'conversationId': conversationId,
        'senderType': senderType,
        'senderId': senderId,
        'senderName': senderName,
        'body': body,
        'createdAt': createdAt,
      };

  DateTime? get sentAt => DateTime.tryParse(createdAt)?.toLocal();
}
