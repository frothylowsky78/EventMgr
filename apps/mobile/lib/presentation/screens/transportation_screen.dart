import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../application/providers.dart';
import '../../domain/transportation_item.dart';

class TransportationScreen extends ConsumerWidget {
  const TransportationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(transportationProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Transportation')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Could not load transportation.\n$e',
            textAlign: TextAlign.center)),
        data: (items) {
          if (items.isEmpty) {
            return const Center(
                child: Padding(
              padding: EdgeInsets.all(24),
              child: Text('Your transportation assignments will appear here.',
                  textAlign: TextAlign.center),
            ));
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(transportationProvider);
              await ref.read(transportationProvider.future);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [for (final t in items) _TransportCard(item: t)],
            ),
          );
        },
      ),
    );
  }
}

class _TransportCard extends StatelessWidget {
  const _TransportCard({required this.item});
  final TransportationItem item;

  Color _statusColor(BuildContext context) {
    switch (item.status) {
      case 'delayed':
      case 'changed':
        return Theme.of(context).colorScheme.error;
      case 'completed':
        return Colors.grey;
      default:
        return Colors.green;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pickup = item.pickup;
    final when = pickup != null
        ? DateFormat('EEE, MMM d • h:mm a').format(pickup.toLocal())
        : null;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                    child: Text(item.transferType,
                        style: theme.textTheme.titleMedium)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: _statusColor(context).withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(item.status,
                      style: TextStyle(
                          color: _statusColor(context),
                          fontWeight: FontWeight.w600,
                          fontSize: 12)),
                ),
              ],
            ),
            if (when != null) ...[
              const SizedBox(height: 6),
              _row(Icons.schedule, when),
            ],
            if ((item.pickupLocation ?? '').isNotEmpty)
              _row(Icons.place, 'Pickup: ${item.pickupLocation}'),
            if ((item.dropoffLocation ?? '').isNotEmpty)
              _row(Icons.flag, 'Drop-off: ${item.dropoffLocation}'),
            if (item.group.isNotEmpty) _row(Icons.groups, 'Group: ${item.group}'),
            if ((item.vehicleDescription ?? '').isNotEmpty)
              _row(Icons.directions_car, item.vehicleDescription!),
            if ((item.vendor ?? '').isNotEmpty || (item.contactPhone ?? '').isNotEmpty)
              _row(Icons.call,
                  [item.vendor, item.contactPhone].where((s) => (s ?? '').isNotEmpty).join(' · ')),
            if ((item.notes ?? '').isNotEmpty) _row(Icons.notes, item.notes!),
          ],
        ),
      ),
    );
  }

  Widget _row(IconData icon, String text) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 18),
            const SizedBox(width: 10),
            Expanded(child: Text(text)),
          ],
        ),
      );
}
