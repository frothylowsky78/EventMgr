import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../application/providers.dart';
import '../../domain/travel_detail.dart';

class TravelScreen extends ConsumerWidget {
  const TravelScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(travelProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Travel')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Could not load travel.\n$e',
            textAlign: TextAlign.center)),
        data: (travel) {
          if (travel == null || travel.isEmpty) {
            return const Center(
                child: Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                'Your personal travel details will appear here once they are assigned.',
                textAlign: TextAlign.center,
              ),
            ));
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(travelProvider);
              await ref.read(travelProvider.future);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _Section(title: 'Arrival', children: [
                  _row(Icons.flight_land, 'Flight', travel.arrivalFlight),
                  _row(Icons.schedule, 'Arrives', _fmt(travel.arrivalDateTime)),
                ]),
                _Section(title: 'Departure', children: [
                  _row(Icons.flight_takeoff, 'Flight', travel.departureFlight),
                  _row(Icons.schedule, 'Departs', _fmt(travel.departureDateTime)),
                ]),
                _Section(title: 'Lodging', children: [
                  _row(Icons.hotel, 'Hotel', travel.hotelName),
                  _row(Icons.confirmation_number_outlined, 'Confirmation',
                      travel.hotelConfirmation),
                  _row(Icons.login, 'Check-in', travel.checkInDate),
                  _row(Icons.logout, 'Check-out', travel.checkOutDate),
                ]),
                _Section(title: 'Transfer', children: [
                  _row(Icons.directions_bus, 'Group', travel.transferGroup),
                  if ((travel.notes ?? '').isNotEmpty)
                    _row(Icons.notes, 'Notes', travel.notes),
                ]),
              ],
            ),
          );
        },
      ),
    );
  }

  static Widget _row(IconData icon, String label, String? value) {
    if (value == null || value.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18),
          const SizedBox(width: 10),
          SizedBox(width: 110, child: Text(label,
              style: const TextStyle(color: Colors.black54))),
          Expanded(child: Text(value,
              style: const TextStyle(fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }

  static String? _fmt(String? iso) {
    if (iso == null || iso.isEmpty) return null;
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    return DateFormat('EEE, MMM d • h:mm a').format(dt.toLocal());
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final visible = children.where((w) => w is! SizedBox).toList();
    if (visible.isEmpty) return const SizedBox.shrink();
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 4),
            ...children,
          ],
        ),
      ),
    );
  }
}
