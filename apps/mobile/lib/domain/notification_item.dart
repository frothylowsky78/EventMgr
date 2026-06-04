/// In-app notification center item (mirrors the backend NotificationCenterItem).
class NotificationItem {
  final String notificationId;
  final String title;
  final String body;
  final String priority; // normal | important | urgent
  final String? deepLinkType;
  final String? deepLinkId;
  final String createdAt; // ISO-8601
  final bool read;

  const NotificationItem({
    required this.notificationId,
    required this.title,
    required this.body,
    required this.priority,
    required this.createdAt,
    required this.read,
    this.deepLinkType,
    this.deepLinkId,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> j) {
    final dl = (j['deepLink'] as Map?)?.cast<String, dynamic>();
    return NotificationItem(
      notificationId: j['notificationId'] as String,
      title: j['title'] as String? ?? '',
      body: j['body'] as String? ?? '',
      priority: j['priority'] as String? ?? 'normal',
      deepLinkType: dl?['type'] as String?,
      deepLinkId: dl?['id'] as String?,
      createdAt: j['createdAt'] as String? ?? '',
      read: j['read'] as bool? ?? false,
    );
  }

  DateTime get createdAtDt =>
      DateTime.tryParse(createdAt) ?? DateTime.fromMillisecondsSinceEpoch(0);
}

class NotificationCenter {
  final List<NotificationItem> items;
  final int unread;
  const NotificationCenter({required this.items, required this.unread});
}
