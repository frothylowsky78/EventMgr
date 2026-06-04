import '../../domain/notification_item.dart';
import '../api_client.dart';
import '../local_cache.dart';

/// In-app notification center + push device registration.
class NotificationsRepository {
  NotificationsRepository(this._api, this._cache);
  final ApiClient _api;
  final LocalCache _cache;

  static const _key = 'notifications:me';

  NotificationCenter cached() {
    final list = _cache.getList(_key);
    if (list == null) return const NotificationCenter(items: [], unread: 0);
    final items = list
        .map((e) => NotificationItem.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
    return NotificationCenter(
      items: items,
      unread: items.where((i) => !i.read).length,
    );
  }

  Future<NotificationCenter> fetch() async {
    final data = await _api.getData('/me/notifications') as Map<String, dynamic>;
    final items = (data['items'] as List)
        .map((e) => NotificationItem.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
    _cache.putJson(_key, items.map((e) => {
          'notificationId': e.notificationId,
          'title': e.title,
          'body': e.body,
          'priority': e.priority,
          'deepLink': e.deepLinkType == null
              ? null
              : {'type': e.deepLinkType, 'id': e.deepLinkId},
          'createdAt': e.createdAt,
          'read': e.read,
        }).toList());
    return NotificationCenter(items: items, unread: data['unread'] as int? ?? 0);
  }

  Future<void> markRead(String notificationId) =>
      _api.patchData('/me/notifications/$notificationId/read');

  Future<void> markAllRead() => _api.patchData('/me/notifications/read-all');

  /// Registers an APNs/FCM device token so this attendee can receive push.
  /// Call once the platform push token is available (see push setup in README).
  Future<void> registerDeviceToken(String platform, String token) =>
      _api.postData('/me/device-tokens', {'platform': platform, 'deviceToken': token});
}
