import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../application/providers.dart';
import '../../domain/attendee_card.dart';
import '../widgets/moderation.dart';

/// Yearbook / attendee directory (spec §4.8). Only directory-visible attendees appear, with a
/// polished initials avatar when there's no photo.
class YearbookScreen extends ConsumerStatefulWidget {
  const YearbookScreen({super.key});

  @override
  ConsumerState<YearbookScreen> createState() => _YearbookScreenState();
}

/// Markets from the client feedback (CF-2), in display order. Kept in sync with MARKETS in
/// packages/shared-types; the API only ever sends tags drawn from that list.
const _markets = <String>[
  'San Diego',
  'Bay Area',
  'Boulder',
  'Seattle',
  'Boston',
  'UK',
  'Investments',
  'BioMed Realty',
  'Blackstone',
];
const _otherGroup = 'Other';

class _YearbookScreenState extends ConsumerState<YearbookScreen> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(attendeesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Attendees')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Search by name, company, or city',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (v) => setState(() => _query = v.trim()),
            ),
          ),
          Expanded(
            child: async.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Could not load attendees.\n$e',
                  textAlign: TextAlign.center)),
              data: (cards) {
                final filtered = _query.isEmpty
                    ? cards
                    : cards.where((c) => c.matches(_query)).toList();
                if (filtered.isEmpty) {
                  return const Center(child: Text('No matching attendees.'));
                }

                // Group by market (CF-2). An attendee tagged with several markets appears
                // under each; one tagged with none appears under "Other" so nobody is lost.
                final groups = <String, List<AttendeeCard>>{};
                for (final c in filtered) {
                  final markets = c.markets.where(_markets.contains).toList();
                  for (final m in markets.isEmpty ? [_otherGroup] : markets) {
                    groups.putIfAbsent(m, () => []).add(c);
                  }
                }
                final ordered = [
                  ..._markets.where(groups.containsKey),
                  if (groups.containsKey(_otherGroup)) _otherGroup,
                ];

                return ListView.builder(
                  itemCount: ordered.length,
                  itemBuilder: (_, gi) {
                    final name = ordered[gi];
                    final members = groups[name]!;
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
                          child: Text(
                            '$name  ·  ${members.length}',
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  color: Theme.of(context).colorScheme.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                        ),
                        for (final c in members) _AttendeeTile(card: c),
                        const Divider(height: 1),
                      ],
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _AttendeeTile extends ConsumerWidget {
  const _AttendeeTile({required this.card});
  final AttendeeCard card;

  /// Only offered when the attendee has opted in (CF-7). The server enforces this too — this
  /// just avoids showing an action that would be refused.
  Future<void> _message(BuildContext context, WidgetRef ref) async {
    final body = await _messageSheet(context, card.fullName);
    if (body == null || body.trim().isEmpty) return;
    try {
      final conv = await ref
          .read(messagesRepositoryProvider)
          .start(withAttendeeId: card.id, body: body.trim());
      ref.invalidate(conversationsProvider);
      if (context.mounted) context.push('/messages/${conv.id}');
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  /// Attendee detail sheet — also the guideline 1.2 block entry point.
  void _openDetail(BuildContext context, WidgetRef ref) {
    final isMe = card.id == ref.read(meProvider).valueOrNull?.id;
    showModalBottomSheet<void>(
      context: context,
      builder: (sheetCtx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ListTile(
              title: Text(card.fullName,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              subtitle: Text([card.title, card.company, card.city]
                  .where((v) => v.isNotEmpty)
                  .join(' · ')),
            ),
            if (card.messageable && !isMe)
              ListTile(
                leading: const Icon(Icons.forum_outlined),
                title: Text('Message ${card.firstName}'),
                onTap: () {
                  Navigator.pop(sheetCtx);
                  _message(context, ref);
                },
              ),
            if (!isMe)
              ListTile(
                leading: const Icon(Icons.block),
                title: Text('Block ${card.firstName}'),
                onTap: () {
                  Navigator.pop(sheetCtx);
                  _block(context, ref);
                },
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _block(BuildContext context, WidgetRef ref) async {
    if (!await confirmBlock(context, card.fullName) || !context.mounted) return;
    try {
      await ref.read(supportRepositoryProvider).block(card.id);
      ref.invalidate(attendeesProvider);
      ref.invalidate(galleryProvider);
      ref.invalidate(conversationsProvider);
      ref.invalidate(meProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Blocked ${card.fullName}.')));
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Could not block: $e')));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final subtitle = [card.title, card.company]
        .where((s) => s.isNotEmpty)
        .join(' · ');
    return ListTile(
      onTap: () => _openDetail(context, ref),
      leading: CircleAvatar(
        backgroundColor: scheme.primary.withOpacity(0.12),
        foregroundColor: scheme.primary,
        backgroundImage: card.profilePhotoUrl.isNotEmpty
            ? CachedNetworkImageProvider(card.profilePhotoUrl)
            : null,
        child: card.profilePhotoUrl.isEmpty
            ? Text(card.initials, style: const TextStyle(fontWeight: FontWeight.bold))
            : null,
      ),
      title: Text(card.fullName, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: subtitle.isEmpty ? null : Text(subtitle),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (card.city.isNotEmpty)
            Text(card.city, style: const TextStyle(fontSize: 12, color: Colors.black54)),
          // Not on your own row: the server rejects self-messaging, so offering it here would
          // only produce an error the guest can't act on.
          if (card.messageable && card.id != ref.watch(meProvider).valueOrNull?.id)
            IconButton(
              tooltip: 'Message ${card.fullName}',
              icon: const Icon(Icons.forum_outlined),
              onPressed: () => _message(context, ref),
            ),
        ],
      ),
    );
  }
}

/// Composer for starting a thread with another attendee.
Future<String?> _messageSheet(BuildContext context, String name) {
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
          Text('Message $name', style: Theme.of(ctx).textTheme.titleMedium),
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
