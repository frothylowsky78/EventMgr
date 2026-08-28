import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../application/providers.dart';
import '../../domain/dining_item.dart';

class DiningScreen extends ConsumerWidget {
  const DiningScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(diningProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Dining')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Could not load dining.\n$e',
            textAlign: TextAlign.center)),
        data: (items) {
          if (items.isEmpty) {
            return const Center(child: Text('Dining details coming soon.'));
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(diningProvider);
              await ref.read(diningProvider.future);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [for (final d in items) _DiningCard(item: d)],
            ),
          );
        },
      ),
    );
  }
}

class _DiningCard extends StatelessWidget {
  const _DiningCard({required this.item});
  final DiningItem item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final day = _fmtDay(item.date);
    final time = item.endTime != null
        ? '${item.startTime}–${item.endTime}'
        : item.startTime;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(item.title, style: theme.textTheme.titleMedium),
            const SizedBox(height: 4),
            Text('$day · $time', style: const TextStyle(color: Colors.black54)),
            if ((item.locationName ?? '').isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Row(children: [
                  const Icon(Icons.place_outlined, size: 18, color: Colors.black54),
                  const SizedBox(width: 6),
                  Expanded(child: Text(item.locationName!,
                      style: const TextStyle(color: Colors.black54))),
                ]),
              ),
            if (item.seating != null && item.seating!.label.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: theme.colorScheme.secondary.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.event_seat, size: 18),
                    const SizedBox(width: 6),
                    Text('Your seat: ${item.seating!.label}',
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ],
            if (item.description.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(item.description),
            ],
            if (item.menu.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text('Menu', style: theme.textTheme.labelLarge),
              const SizedBox(height: 4),
              ...item.menu.map((m) => Padding(
                    padding: const EdgeInsets.only(bottom: 2),
                    child: Text('• $m'),
                  )),
            ],
            if (item.dietaryNotes.isNotEmpty) ...[
              const SizedBox(height: 10),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.eco_outlined, size: 18, color: Colors.green),
                  const SizedBox(width: 6),
                  Expanded(child: Text(item.dietaryNotes,
                      style: const TextStyle(fontStyle: FontStyle.italic))),
                ],
              ),
            ],
            if (item.dressCode.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text('Dress code: ${item.dressCode}',
                  style: const TextStyle(color: Colors.black54)),
            ],
          ],
        ),
      ),
    );
  }

  static String _fmtDay(String date) {
    try {
      return DateFormat('EEEE, MMM d').format(DateTime.parse(date));
    } catch (_) {
      return date;
    }
  }
}
