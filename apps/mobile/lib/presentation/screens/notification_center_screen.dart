import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../application/providers.dart';
import '../widgets/refreshable_message.dart';
import '../../domain/notification_item.dart';

/// In-app notification center (spec §4.7, §18.16). Mirrors every push the attendee received,
/// with read/unread state and deep-link navigation.
class NotificationCenterScreen extends ConsumerWidget {
  const NotificationCenterScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(notificationsProvider);
    final repo = ref.read(notificationsRepositoryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: () async {
              await repo.markAllRead();
              ref.invalidate(notificationsProvider);
            },
            child: const Text('Mark all read'),
          ),
        ],
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) =>
            Center(child: Text('Could not load notifications.\n$e', textAlign: TextAlign.center)),
        data: (center) {
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(notificationsProvider);
              await ref.read(notificationsProvider.future);
            },
            child: center.items.isEmpty
                ? const RefreshableMessage('No notifications yet.')
                : ListView.separated(
                    itemCount: center.items.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (_, i) {
                      final n = center.items[i];
                      return _NotificationTile(
                        item: n,
                        onTap: () async {
                          await repo.markRead(n.notificationId);
                          ref.invalidate(notificationsProvider);
                          _followDeepLink(context, n);
                        },
                      );
                    },
                  ),
          );
        },
      ),
    );
  }

  void _followDeepLink(BuildContext context, NotificationItem n) {
    switch (n.deepLinkType) {
      case 'agenda':
        if (n.deepLinkId != null) context.push('/agenda/${n.deepLinkId}');
        break;
      case 'itinerary':
        context.go('/itinerary');
        break;
      case 'travel':
        // Travel content now lives in the My Itinerary tab (CF-5), but /travel stays routable so
        // notification deep links keep working. push, so back returns to the notification list.
        context.push('/travel');
        break;
      // dining / transportation / faq / help / photos land with their P1 slices.
      default:
        break;
    }
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.item, required this.onTap});
  final NotificationItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final when = DateFormat('MMM d • h:mm a').format(item.createdAtDt.toLocal());
    final isUrgent = item.priority == 'urgent';
    return ListTile(
      onTap: onTap,
      leading: Icon(
        isUrgent ? Icons.priority_high : Icons.notifications,
        color: isUrgent ? theme.colorScheme.error : theme.colorScheme.primary,
      ),
      title: Text(item.title,
          style: TextStyle(fontWeight: item.read ? FontWeight.w500 : FontWeight.bold)),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(item.body),
          const SizedBox(height: 4),
          Text(when, style: const TextStyle(fontSize: 12, color: Colors.black45)),
        ],
      ),
      trailing: item.read
          ? null
          : Container(
              width: 10,
              height: 10,
              decoration:
                  BoxDecoration(color: theme.colorScheme.secondary, shape: BoxShape.circle)),
      isThreeLine: true,
    );
  }
}
