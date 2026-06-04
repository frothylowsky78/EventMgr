import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../application/providers.dart';
import '../../domain/attendee_card.dart';

/// Yearbook / attendee directory (spec §4.8). Only directory-visible attendees appear, with a
/// polished initials avatar when there's no photo.
class YearbookScreen extends ConsumerStatefulWidget {
  const YearbookScreen({super.key});

  @override
  ConsumerState<YearbookScreen> createState() => _YearbookScreenState();
}

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
                return ListView.separated(
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (_, i) => _AttendeeTile(card: filtered[i]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _AttendeeTile extends StatelessWidget {
  const _AttendeeTile({required this.card});
  final AttendeeCard card;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final subtitle = [card.title, card.company]
        .where((s) => s.isNotEmpty)
        .join(' · ');
    return ListTile(
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
      trailing: card.city.isEmpty
          ? null
          : Text(card.city, style: const TextStyle(fontSize: 12, color: Colors.black54)),
    );
  }
}
