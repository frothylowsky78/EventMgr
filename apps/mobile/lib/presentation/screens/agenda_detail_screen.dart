import 'package:add_2_calendar/add_2_calendar.dart' as cal;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../application/providers.dart';
import '../../domain/agenda_item.dart';
import '../../domain/itinerary_item.dart';
import 'feedback_screen.dart';

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

class _Detail extends ConsumerStatefulWidget {
  const _Detail({required this.item});
  final AgendaItem item;

  @override
  ConsumerState<_Detail> createState() => _DetailState();
}

class _DetailState extends ConsumerState<_Detail> {
  /// Set while an add/remove is in flight so the button can't be double-fired.
  bool _busy = false;

  AgendaItem get item => widget.item;

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
        if ((item.locationName ?? '').isNotEmpty)
          _Field(icon: Icons.place_outlined, label: item.locationName!),
        if (item.speaker.isNotEmpty)
          _Field(icon: Icons.person_outline, label: item.speaker),
        if (item.dressCode.isNotEmpty)
          _Field(icon: Icons.checkroom, label: 'Dress code: ${item.dressCode}'),
        if (item.description.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(item.description, style: theme.textTheme.bodyLarge),
        ],
        const SizedBox(height: 24),
        _itineraryButton(),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: () => _addToCalendar(context),
          icon: const Icon(Icons.calendar_month),
          label: const Text('Add to calendar'),
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(
            builder: (_) => FeedbackScreen(
              type: 'session',
              targetId: item.id,
              title: 'Feedback: ${item.title}',
            ),
          )),
          icon: const Icon(Icons.rate_review_outlined),
          label: const Text('Leave feedback'),
        ),
      ],
    );
  }

  /// Reflects the attendee's itinerary: not there -> add; added by them -> tap to remove;
  /// assigned by staff -> shown as present but not removable.
  Widget _itineraryButton() {
    final mine = ref.watch(itineraryProvider).valueOrNull;
    ItineraryItem? existing;
    for (final it in mine ?? const <ItineraryItem>[]) {
      if (it.agendaItemId == item.id) {
        existing = it;
        break;
      }
    }

    if (existing == null) {
      return FilledButton.icon(
        onPressed: _busy ? null : _addToItinerary,
        icon: const Icon(Icons.playlist_add),
        label: const Text('Add to my itinerary'),
      );
    }

    final removable = existing.removableByAttendee;
    final itemId = existing.id;
    return FilledButton.tonalIcon(
      onPressed: (_busy || !removable) ? null : () => _removeFromItinerary(itemId),
      icon: const Icon(Icons.check),
      label: const Text('In my itinerary'),
    );
  }

  Future<void> _addToItinerary() async {
    setState(() => _busy = true);
    try {
      await ref.read(itineraryRepositoryProvider).add(item.id);
      ref.invalidate(itineraryProvider);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Could not add to your itinerary: $e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _removeFromItinerary(String itemId) async {
    setState(() => _busy = true);
    try {
      await ref.read(itineraryRepositoryProvider).remove(itemId);
      ref.invalidate(itineraryProvider);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Could not remove it: $e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _addToCalendar(BuildContext context) {
    final start = _parse(item.date, item.startTime);
    if (start == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('This item has no scheduled time.')),
      );
      return;
    }
    final end = _parse(item.date, item.endTime) ?? start.add(const Duration(hours: 1));
    cal.Add2Calendar.addEvent2Cal(cal.Event(
      title: item.title,
      description: item.description,
      location: (item.locationName?.isNotEmpty ?? false) ? item.locationName : item.mapLink,
      startDate: start,
      endDate: end,
    ));
  }

  /// Builds a local DateTime from "YYYY-MM-DD" + "HH:mm" (device timezone).
  static DateTime? _parse(String date, String? time) {
    if (time == null || time.isEmpty) return null;
    final d = DateTime.tryParse(date);
    final parts = time.split(':');
    if (d == null || parts.length != 2) return null;
    return DateTime(d.year, d.month, d.day,
        int.tryParse(parts[0]) ?? 0, int.tryParse(parts[1]) ?? 0);
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
