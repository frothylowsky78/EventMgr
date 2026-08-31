import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../application/providers.dart';
import '../widgets/refreshable_message.dart';
import '../../domain/message.dart';

/// Conversation list (CF-6/CF-7). Pull to refresh; there is no live socket by design — with
/// push cut from v1 a socket could not wake a backgrounded app anyway.
class MessagesScreen extends ConsumerWidget {
  const MessagesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(conversationsProvider);
    final myId = ref.watch(meProvider).valueOrNull?.id;

    return Scaffold(
      appBar: AppBar(title: const Text('Messages')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _startWithStaff(context, ref),
        icon: const Icon(Icons.support_agent),
        label: const Text('Message staff'),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
            child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text('Could not load messages.\n$e', textAlign: TextAlign.center),
        )),
        data: (conversations) {
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(conversationsProvider);
              ref.invalidate(unreadCountProvider);
              await ref.read(conversationsProvider.future);
            },
            child: conversations.isEmpty
                ? const RefreshableMessage(
                    'No messages yet.\nTap "Message staff" to ask the event team anything.')
                : ListView.separated(
                    itemCount: conversations.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (_, i) =>
                        _ConversationTile(conversation: conversations[i], myAttendeeId: myId),
                  ),
          );
        },
      ),
    );
  }

  Future<void> _startWithStaff(BuildContext context, WidgetRef ref) async {
    final body = await _composeSheet(context, 'Message the event team');
    if (body == null || body.trim().isEmpty) return;
    try {
      final conv = await ref.read(messagesRepositoryProvider).start(body: body.trim());
      ref.invalidate(conversationsProvider);
      ref.invalidate(unreadCountProvider);
      if (context.mounted) context.push('/messages/${conv.id}');
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }
}

/// Shared composer sheet for starting a thread.
Future<String?> _composeSheet(BuildContext context, String title) {
  final controller = TextEditingController();
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    builder: (ctx) => Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(ctx).textTheme.titleMedium),
          const SizedBox(height: 12),
          TextField(
            controller: controller,
            autofocus: true,
            maxLines: 4,
            maxLength: 4000,
            decoration: const InputDecoration(
              hintText: 'Type your message',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
              onPressed: () => Navigator.of(ctx).pop(controller.text),
              icon: const Icon(Icons.send),
              label: const Text('Send'),
            ),
          ),
        ],
      ),
    ),
  );
}

class _ConversationTile extends StatelessWidget {
  const _ConversationTile({required this.conversation, required this.myAttendeeId});
  final Conversation conversation;
  final String? myAttendeeId;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final at = conversation.lastAt;
    final unread = conversation.unreadCount;
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: scheme.primary.withValues(alpha: 0.12),
        foregroundColor: scheme.primary,
        child: Icon(
          conversation.participants.any((p) => p.type == 'staff' && p.id != myAttendeeId)
              ? Icons.support_agent
              : Icons.person_outline,
        ),
      ),
      title: Text(
        conversation.titleFor(myAttendeeId),
        style: TextStyle(fontWeight: unread > 0 ? FontWeight.bold : FontWeight.w600),
      ),
      subtitle: Text(conversation.lastMessagePreview, maxLines: 1, overflow: TextOverflow.ellipsis),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (at != null)
            Text(DateFormat('MMM d').format(at),
                style: const TextStyle(fontSize: 12, color: Colors.black54)),
          if (unread > 0) ...[
            const SizedBox(height: 4),
            Badge(label: Text('$unread')),
          ],
        ],
      ),
      onTap: () => context.push('/messages/${conversation.id}'),
    );
  }
}
