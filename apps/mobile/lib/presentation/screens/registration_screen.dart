import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../application/providers.dart';
import '../../domain/event.dart';
import '../../domain/me.dart';

/// Registration deadline + required action items (spec §4.3).
class RegistrationScreen extends ConsumerWidget {
  const RegistrationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventAsync = ref.watch(eventProvider);
    final meAsync = ref.watch(meProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Registration')),
      body: eventAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (event) {
          final me = meAsync.valueOrNull;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _DeadlineCard(deadline: event.registrationDeadline, me: me),
              const SizedBox(height: 16),
              if (event.registrationActions.isNotEmpty) ...[
                Text('Required before the event',
                    style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                for (final a in event.registrationActions)
                  _ActionTile(
                    action: a,
                    done: me?.completedRegistrationActions.contains(a.id) ?? false,
                  ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _DeadlineCard extends StatelessWidget {
  const _DeadlineCard({required this.deadline, required this.me});
  final String? deadline;
  final AttendeeMe? me;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final dt = deadline == null ? null : DateTime.tryParse(deadline!);
    final complete = me?.registrationComplete ?? false;
    final countdown = _countdown(dt);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(complete ? Icons.check_circle : Icons.assignment_outlined,
                    color: complete ? Colors.green : scheme.primary),
                const SizedBox(width: 10),
                Text(_statusLabel(me?.registrationStatus, complete),
                    style: Theme.of(context).textTheme.titleMedium),
              ],
            ),
            if (dt != null) ...[
              const SizedBox(height: 12),
              Text('Deadline: ${DateFormat('EEE, MMM d • h:mm a').format(dt.toLocal())}'),
              if (!complete && countdown != null) ...[
                const SizedBox(height: 4),
                Text(countdown,
                    style: TextStyle(color: scheme.error, fontWeight: FontWeight.w600)),
              ],
            ],
          ],
        ),
      ),
    );
  }

  static String _statusLabel(String? status, bool complete) {
    if (complete) return 'Registration complete';
    switch (status) {
      case 'in_progress':
        return 'Registration in progress';
      case 'past_due':
        return 'Registration past due';
      default:
        return 'Registration not started';
    }
  }

  static String? _countdown(DateTime? dt) {
    if (dt == null) return null;
    final diff = dt.difference(DateTime.now());
    if (diff.isNegative) return 'Deadline has passed';
    final days = diff.inDays;
    final hours = diff.inHours % 24;
    if (days > 0) return '$days day${days == 1 ? '' : 's'}, $hours hr left';
    return '${diff.inHours} hr left';
  }
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({required this.action, required this.done});
  final RegistrationAction action;
  final bool done;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(done ? Icons.check_circle : Icons.radio_button_unchecked,
            color: done ? Colors.green : Colors.grey),
        title: Text(action.label,
            style: TextStyle(
                decoration: done ? TextDecoration.lineThrough : null,
                color: done ? Colors.black54 : null)),
      ),
    );
  }
}
