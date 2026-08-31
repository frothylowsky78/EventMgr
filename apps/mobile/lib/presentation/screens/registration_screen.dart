import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../application/providers.dart';
import '../../domain/event.dart';
import '../../domain/me.dart';

/// Registration deadline + required action items (spec §4.3).
///
/// Every tile is actionable: known ids route to the screen that satisfies them, unknown ids fall
/// back to a "mark as done" sheet. Nothing here is a dead end — a guest can always clear an item,
/// even one the server could not auto-complete (no dietary restrictions to enter, say).
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
    // A passed deadline with work outstanding is not a countdown problem — the guest can no
    // longer fix it alone, so send them to staff instead of showing negative time.
    final overdue = !complete && dt != null && dt.toLocal().isBefore(DateTime.now());
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
                Expanded(
                  child: Text(_statusLabel(me?.registrationStatus, complete),
                      style: Theme.of(context).textTheme.titleMedium),
                ),
              ],
            ),
            if (dt != null) ...[
              const SizedBox(height: 12),
              Text('Deadline: ${DateFormat('EEE, MMM d • h:mm a').format(dt.toLocal())}'),
              if (overdue) ...[
                const SizedBox(height: 8),
                Text('Registration deadline has passed — please contact event staff',
                    style: TextStyle(color: scheme.error, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerLeft,
                  child: FilledButton.icon(
                    onPressed: () => context.push('/help'),
                    icon: const Icon(Icons.support_agent),
                    label: const Text('Contact event staff'),
                  ),
                ),
              ] else if (!complete && countdown != null) ...[
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
    if (diff.isNegative) return null; // handled by the overdue branch
    final days = diff.inDays;
    final hours = diff.inHours % 24;
    if (days > 0) return '$days day${days == 1 ? '' : 's'}, $hours hr left';
    return '${diff.inHours} hr left';
  }
}

/// Where a known action id sends the guest. Ids not listed here fall back to the
/// "mark as done" sheet, so an admin can add an action without a client release.
const _destinations = <String, String>{
  'select_activities': '/agenda',
  'dietary': '/profile',
  'photo': '/profile',
  'flight': '/travel',
};

class _ActionTile extends ConsumerStatefulWidget {
  const _ActionTile({required this.action, required this.done});
  final RegistrationAction action;
  final bool done;

  @override
  ConsumerState<_ActionTile> createState() => _ActionTileState();
}

class _ActionTileState extends ConsumerState<_ActionTile> {
  bool _busy = false;

  RegistrationAction get action => widget.action;

  Future<void> _markDone({bool done = true}) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await ref.read(supportRepositoryProvider).completeRegistrationAction(action.id, done: done);
      // The Home banner reads registrationComplete off this provider.
      ref.invalidate(meProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(done ? '${action.label} — done.' : 'Marked as not done.')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Could not update: $e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirmAttendance() async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(action.label),
        content: const Text('Confirm that you plan to attend?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Not yet')),
          FilledButton(
              onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Confirm')),
        ],
      ),
    );
    if (yes == true) await _markDone();
  }

  /// Fallback for action ids this build doesn't know about.
  Future<void> _openUnknownSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      builder: (sheetCtx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(20),
              child: Text(action.label,
                  style: Theme.of(sheetCtx).textTheme.titleMedium),
            ),
            ListTile(
              leading: const Icon(Icons.check_circle_outline),
              title: Text(widget.done ? 'Mark as not done' : 'Mark as done'),
              onTap: () {
                Navigator.pop(sheetCtx);
                _markDone(done: !widget.done);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _onTap() {
    if (action.id == 'confirm_attendance') {
      _confirmAttendance();
      return;
    }
    final destination = _destinations[action.id];
    if (destination != null) {
      context.push(destination);
      return;
    }
    _openUnknownSheet();
  }

  @override
  Widget build(BuildContext context) {
    final done = widget.done;
    // Tiles that navigate away still need a way to be cleared by hand: auto-completion can't
    // fire for a guest who has no dietary restrictions and so never edits the field.
    final navigates = _destinations.containsKey(action.id);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        onTap: _busy ? null : _onTap,
        leading: Icon(done ? Icons.check_circle : Icons.radio_button_unchecked,
            color: done ? Colors.green : Colors.grey),
        title: Text(action.label,
            style: TextStyle(
                decoration: done ? TextDecoration.lineThrough : null,
                color: done ? Colors.black54 : null)),
        trailing: _busy
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
            : navigates
                ? IconButton(
                    tooltip: done ? 'Mark as not done' : 'Mark as done',
                    icon: Icon(done ? Icons.undo : Icons.check),
                    onPressed: () => _markDone(done: !done),
                  )
                : const Icon(Icons.chevron_right),
      ),
    );
  }
}
