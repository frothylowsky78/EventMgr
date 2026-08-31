import '../../core/config.dart';
import '../../domain/message.dart';
import '../api_client.dart';

/// Conversations and messages. Deliberately uncached: unlike the agenda, a stale thread is
/// worse than an empty one, and these screens are only useful online anyway.
class MessagesRepository {
  MessagesRepository(this._api);
  final ApiClient _api;

  Future<List<Conversation>> conversations() async {
    final data = await _api.getData('/me/conversations');
    return (data as List)
        .map((e) => Conversation.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<List<Message>> messages(String conversationId) async {
    final data = await _api.getData('/me/conversations/$conversationId/messages');
    return (data as List)
        .map((e) => Message.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<void> send(String conversationId, String body) =>
      _api.postData('/me/conversations/$conversationId/messages', {'body': body});

  /// Flags a message for staff review (App Store guideline 1.2). Idempotent per reporter.
  Future<void> reportMessage(
    String conversationId,
    String messageId,
    String reason, {
    String? note,
  }) =>
      _api.postData(
        '/events/${AppConfig.eventId}/conversations/$conversationId/messages/$messageId/report',
        {
          'reason': reason,
          if (note != null && note.isNotEmpty) 'note': note,
        },
      );

  /// Omit [withAttendeeId] to start a thread with event staff.
  Future<Conversation> start({String? withAttendeeId, required String body}) async {
    final data = await _api.postData('/me/conversations', {
      if (withAttendeeId != null) 'withAttendeeId': withAttendeeId,
      'body': body,
    });
    return Conversation.fromJson((data as Map).cast<String, dynamic>());
  }

  Future<int> unreadCount() async {
    final data = await _api.getData('/me/unread-count');
    return ((data as Map)['unread'] as num?)?.toInt() ?? 0;
  }
}
