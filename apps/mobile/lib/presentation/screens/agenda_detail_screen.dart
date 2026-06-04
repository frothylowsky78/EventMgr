import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../application/providers.dart';
import '../../domain/agenda_item.dart';

/// Agenda item detail — also the target of agenda deep links (e.g. push notifications).
class AgendaDetailScreen extends ConsumerWidget {
  const AgendaDetailScreen({super.key, required this.agendaId});
  final String agendaId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final agendaAsync = ref.watch(agendaProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Details')),
      body: agendaAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (items) {
          AgendaItem? item;
          for (final i in items) {
            if (i.id == agendaId) {
              item = i;
              break;
            }
          }
          if (item == null) {
            return const Center(child: Text('Item not found.'));
          }
          return _Detail(item: item);
        },
      ),
    );
  }
}

class _Detail extends StatelessWidget {
  const _Detail({required this.item});
  final AgendaItem item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final time = item.endTime != null
        ? '${item.startTime} – ${item.endTime}'
        : item.startTime;
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(item.title, style: theme.textTheme.headlineSmall),
        const SizedBox(height: 8),
        Chip(label: Text(item.categoryLabel)),
        const SizedBox(height: 16),
        _Field(icon: Icons.schedule, label: '${item.date} · $time'),
        if (item.speaker.isNotEmpty)
          _Field(icon: Icons.person_outline, label: item.speaker),
        if (item.dressCode.isNotEmpty)
          _Field(icon: Icons.checkroom, label: 'Dress code: ${item.dressCode}'),
        if (item.description.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(item.description, style: theme.textTheme.bodyLarge),
        ],
        const SizedBox(height: 24),
        OutlinedButton.icon(
          // Calendar sync wired in P1 (ICS export); placeholder keeps the slice premium.
          onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Add to calendar coming soon')),
          ),
          icon: const Icon(Icons.calendar_month),
          label: const Text('Add to calendar'),
        ),
      ],
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({required this.icon, required this.label});
  final IconData icon;
  final String label;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 10),
          Expanded(child: Text(label)),
        ],
      ),
    );
  }
}
