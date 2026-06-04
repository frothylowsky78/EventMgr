import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../application/providers.dart';
import '../../domain/weather.dart';

class WeatherScreen extends ConsumerWidget {
  const WeatherScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(weatherProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Weather')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Could not load weather.\n$e',
            textAlign: TextAlign.center)),
        data: (w) {
          if (!w.hasData) {
            return const Center(child: Text('Weather details coming soon.'));
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(weatherProvider);
              await ref.read(weatherProvider.future);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (w.currentTempF != null) _Current(w: w),
                for (final note in w.notes) _Note(note: note),
                if (w.daily.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text('Forecast', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  for (final d in w.daily) _DayRow(day: d),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _Current extends StatelessWidget {
  const _Current({required this.w});
  final WeatherInfo w;
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Icon(Icons.wb_sunny, size: 48, color: scheme.secondary),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${w.currentTempF!.round()}°F',
                    style: Theme.of(context).textTheme.headlineMedium),
                Text(w.currentCondition ?? '',
                    style: const TextStyle(color: Colors.black54)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({required this.note});
  final WeatherNote note;
  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.amber.shade50,
      margin: const EdgeInsets.only(top: 12),
      child: ListTile(
        leading: const Icon(Icons.warning_amber, color: Colors.orange),
        title: Text(note.title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(note.body),
      ),
    );
  }
}

class _DayRow extends StatelessWidget {
  const _DayRow({required this.day});
  final WeatherDay day;
  @override
  Widget build(BuildContext context) {
    final label = _fmt(day.date);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(label),
        subtitle: Text(day.condition +
            (day.precipChance != null ? ' · ${day.precipChance!.round()}% precip' : '')),
        trailing: Text('${day.highF.round()}° / ${day.lowF.round()}°',
            style: const TextStyle(fontWeight: FontWeight.w600)),
      ),
    );
  }

  static String _fmt(String date) {
    try {
      return DateFormat('EEEE, MMM d').format(DateTime.parse(date));
    } catch (_) {
      return date;
    }
  }
}
