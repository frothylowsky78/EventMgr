import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../application/providers.dart';
import '../../domain/agenda_item.dart';
import '../widgets/refreshable_message.dart';

class AgendaScreen extends ConsumerWidget {
  const AgendaScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final agendaAsync = ref.watch(agendaProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Agenda')),
      body: agendaAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) =>
            Center(child: Text('Could not load agenda.\n$e', textAlign: TextAlign.center)),
        data: (items) {
          final byDay = <String, List<AgendaItem>>{};
          for (final it in items) {
            byDay.putIfAbsent(it.date, () => []).add(it);
          }
          final days = byDay.keys.toList()..sort();
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(agendaProvider);
              await ref.read(agendaProvider.future);
            },
            child: items.isEmpty
                ? const RefreshableMessage('Agenda coming soon.')
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: days.length,
                    itemBuilder: (_, i) {
                      final day = days[i];
                      final dayItems = byDay[day]!;
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Text(_dayLabel(day),
                                style: Theme.of(context).textTheme.titleMedium),
                          ),
                          for (final item in dayItems) _AgendaTile(item: item),
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

  static String _dayLabel(String date) {
    try {
      return DateFormat('EEEE, MMM d').format(DateTime.parse(date));
    } catch (_) {
      return date;
    }
  }
}

class _AgendaTile extends StatelessWidget {
  const _AgendaTile({required this.item});
  final AgendaItem item;

  @override
  Widget build(BuildContext context) {
    final time = item.endTime != null ? '${item.startTime}–${item.endTime}' : item.startTime;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Theme.of(context).colorScheme.secondary.withOpacity(0.18),
          child: Icon(_iconFor(item.category), color: Theme.of(context).colorScheme.primary),
        ),
        title: Text(item.title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text('$time · ${item.categoryLabel}'),
        trailing: item.required
            ? const Chip(
                label: Text('Required', style: TextStyle(fontSize: 11)),
                visualDensity: VisualDensity.compact)
            : const Icon(Icons.chevron_right),
        onTap: () => context.push('/agenda/${item.id}'),
      ),
    );
  }

  IconData _iconFor(String category) {
    switch (category) {
      case 'meal':
        return Icons.restaurant;
      case 'activity':
        return Icons.hiking;
      case 'transportation':
        return Icons.directions_bus;
      case 'free_time':
        return Icons.beach_access;
      case 'optional_event':
        return Icons.star_outline;
      case 'private_appointment':
        return Icons.lock_clock;
      default:
        return Icons.campaign_outlined;
    }
  }
}
