import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../application/auth_controller.dart';
import '../../application/providers.dart';
import '../../domain/itinerary_item.dart';

/// "My Trip" — the attendee's personalized itinerary (own data only, enforced server-side).
class ItineraryScreen extends ConsumerWidget {
  const ItineraryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final itinAsync = ref.watch(itineraryProvider);
    // Resolve linked agenda titles so shared items show their real name.
    final agendaTitles = <String, String>{
      for (final a in ref.watch(agendaProvider).valueOrNull ?? const [])
        a.id: a.title,
    };
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Trip'),
        actions: [
          IconButton(
            tooltip: 'Sign out',
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authControllerProvider.notifier).signOut(),
          ),
        ],
      ),
      body: itinAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Could not load your itinerary.\n$e',
            textAlign: TextAlign.center)),
        data: (items) {
          if (items.isEmpty) {
            return const Center(
                child: Text('Your personal itinerary will appear here.'));
          }
          final byDay = <String, List<ItineraryItem>>{};
          for (final it in items) {
            final day = DateFormat('yyyy-MM-dd').format(it.start);
            byDay.putIfAbsent(day, () => []).add(it);
          }
          final days = byDay.keys.toList()..sort();
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(itineraryProvider);
              await ref.read(itineraryProvider.future);
            },
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: days.length,
              itemBuilder: (_, i) {
                final dayItems = byDay[days[i]]!;
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        DateFormat('EEEE, MMM d')
                            .format(DateTime.parse(days[i])),
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    for (final item in dayItems)
                      _ItineraryTile(
                        item: item,
                        title: item.customTitle ??
                            agendaTitles[item.agendaItemId] ??
                            'Scheduled item',
                      ),
                    const SizedBox(height: 8),
                  ],
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _ItineraryTile extends StatelessWidget {
  const _ItineraryTile({required this.item, required this.title});
  final ItineraryItem item;
  final String title;

  @override
  Widget build(BuildContext context) {
    final start = DateFormat('h:mm a').format(item.start);
    final end = item.end != null ? DateFormat('h:mm a').format(item.end!) : null;
    final time = end != null ? '$start – $end' : start;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(start,
                style: const TextStyle(
                    fontWeight: FontWeight.bold, fontSize: 13)),
          ],
        ),
        title: Text(title,
            style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text([
          time,
          if (item.notes.isNotEmpty) item.notes,
        ].join(' · ')),
      ),
    );
  }
}
