import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../application/auth_controller.dart';
import '../../application/providers.dart';
import '../../domain/itinerary_item.dart';
import '../widgets/refreshable_message.dart';
import 'travel_screen.dart';

/// "My Itinerary" — the attendee's personalized itinerary (own data only, enforced
/// server-side). Called "My Trip" in the spec and in CF-5.
class ItineraryScreen extends ConsumerWidget {
  const ItineraryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final itinAsync = ref.watch(itineraryProvider);
    // Travel is supplementary: read it without letting its loading/error state block the
    // schedule. valueOrNull is null while loading or on failure, and the section just hides.
    final travel = ref.watch(travelProvider).valueOrNull;
    // Resolve linked agenda titles so shared items show their real name.
    final agendaTitles = <String, String>{
      for (final a in ref.watch(agendaProvider).valueOrNull ?? const []) a.id: a.title,
    };
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Itinerary'),
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
        error: (e, _) =>
            Center(child: Text('Could not load your itinerary.\n$e', textAlign: TextAlign.center)),
        data: (items) {
          final hasTravel = travel != null && !travel.isEmpty;

          final byDay = <String, List<ItineraryItem>>{};
          for (final it in items) {
            final day = DateFormat('yyyy-MM-dd').format(it.start);
            byDay.putIfAbsent(day, () => []).add(it);
          }
          final days = byDay.keys.toList()..sort();
          final theme = Theme.of(context);

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(itineraryProvider);
              ref.invalidate(travelProvider);
              await ref.read(itineraryProvider.future);
            },
            child: (items.isEmpty && !hasTravel)
                ? const RefreshableMessage('Your trip details will appear here.')
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Travel folded into this tab (CF-5) — one place for everything about the trip.
                      if (hasTravel) ...[
                        Text('Travel', style: theme.textTheme.titleLarge),
                        const SizedBox(height: 8),
                        TravelSections(travel: travel),
                        const SizedBox(height: 16),
                      ],
                      if (items.isNotEmpty) ...[
                        Text('Schedule', style: theme.textTheme.titleLarge),
                        for (final day in days) ...[
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Text(
                              DateFormat('EEEE, MMM d').format(DateTime.parse(day)),
                              style: theme.textTheme.titleMedium,
                            ),
                          ),
                          for (final item in byDay[day]!)
                            _ItineraryTile(
                              item: item,
                              title: item.customTitle ??
                                  agendaTitles[item.agendaItemId] ??
                                  'Scheduled item',
                            ),
                          const SizedBox(height: 8),
                        ],
                      ] else
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child:
                              Text('Nothing scheduled for you yet.', textAlign: TextAlign.center),
                        ),
                    ],
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
            Text(start, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          ],
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text([
          time,
          if (item.notes.isNotEmpty) item.notes,
        ].join(' · ')),
      ),
    );
  }
}
