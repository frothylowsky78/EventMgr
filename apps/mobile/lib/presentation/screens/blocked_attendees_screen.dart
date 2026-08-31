import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../application/providers.dart';
import '../../domain/attendee_card.dart';

/// Blocking is reversible, but until now only from the server (App Store guideline 1.2 asks for
/// the block, not for a way back). This is the way back: everyone the attendee has blocked, by
/// name, each with an unblock action.
class BlockedAttendeesScreen extends ConsumerWidget {
  const BlockedAttendeesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(blockedAttendeesProvider);
    final me = ref.watch(meProvider).valueOrNull;

    return Scaffold(
      appBar: AppBar(title: const Text('Blocked attendees')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text('Could not load your blocked list.\n$e',
                textAlign: TextAlign.center),
          ),
        ),
        data: (cards) {
          final blockedIds = me?.blockedAttendeeIds ?? const <String>[];
          if (blockedIds.isEmpty) {
            return const Center(child: Text("You haven't blocked anyone"));
          }

          // An attendee who left the directory after being blocked resolves to no card. They
          // still need to be unblockable, so they get a row without a name rather than
          // vanishing from the only screen that can undo this.
          final resolved = {for (final c in cards) c.id: c};
          final rows = blockedIds.map((id) => (id, resolved[id])).toList();

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(meProvider);
              await ref.read(blockedAttendeesProvider.future);
            },
            child: ListView.separated(
              itemCount: rows.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) {
                final (id, card) = rows[i];
                return _BlockedRow(attendeeId: id, card: card);
              },
            ),
          );
        },
      ),
    );
  }
}

class _BlockedRow extends ConsumerStatefulWidget {
  const _BlockedRow({required this.attendeeId, this.card});
  final String attendeeId;
  final AttendeeCard? card;

  @override
  ConsumerState<_BlockedRow> createState() => _BlockedRowState();
}

class _BlockedRowState extends ConsumerState<_BlockedRow> {
  bool _busy = false;

  String get _name => (widget.card?.fullName.trim().isNotEmpty ?? false)
      ? widget.card!.fullName
      : 'Blocked attendee';

  Future<void> _unblock() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Unblock $_name?'),
        content: const Text(
          "You'll see their photos and directory entry again, and either of you can message "
          'the other.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Unblock')),
        ],
      ),
    );
    if (ok != true || !mounted) return;

    setState(() => _busy = true);
    try {
      await ref.read(supportRepositoryProvider).unblock(widget.attendeeId);
      // Everything the block was filtering has to come back.
      ref.invalidate(meProvider);
      ref.invalidate(attendeesProvider);
      ref.invalidate(galleryProvider);
      ref.invalidate(conversationsProvider);
      ref.invalidate(unreadCountProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Unblocked $_name.')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Could not unblock: $e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final card = widget.card;
    final photoUrl = card?.profilePhotoUrl ?? '';
    final subtitle = card == null
        ? null
        : [card.title, card.company].where((s) => s.isNotEmpty).join(' · ');

    return ListTile(
      leading: CircleAvatar(
        backgroundColor: scheme.primary.withValues(alpha: 0.12),
        foregroundColor: scheme.primary,
        backgroundImage:
            photoUrl.isNotEmpty ? CachedNetworkImageProvider(photoUrl) : null,
        child: photoUrl.isEmpty
            ? Text(card?.initials ?? '?',
                style: const TextStyle(fontWeight: FontWeight.bold))
            : null,
      ),
      title: Text(_name, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: (subtitle == null || subtitle.isEmpty) ? null : Text(subtitle),
      trailing: _busy
          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
          : TextButton(onPressed: _unblock, child: const Text('Unblock')),
    );
  }
}
