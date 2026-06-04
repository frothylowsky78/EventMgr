import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../application/providers.dart';
import '../../domain/itinerary_item.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventAsync = ref.watch(eventProvider);
    final theme = Theme.of(context);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(eventProvider);
          ref.invalidate(itineraryProvider);
          await ref.read(eventProvider.future);
        },
        child: eventAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => _ErrorState(message: '$e'),
          data: (event) => CustomScrollView(
            slivers: [
              SliverAppBar(
                expandedHeight: 200,
                pinned: true,
                actions: const [_NotificationBell()],
                flexibleSpace: FlexibleSpaceBar(
                  title: Text(event.name,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          shadows: [Shadow(blurRadius: 8, color: Colors.black54)])),
                  background: _Hero(url: event.branding.heroImageUrl),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverList.list(children: [
                  _InfoRow(
                      icon: Icons.calendar_today_outlined,
                      text: _dateRange(event.startDate, event.endDate)),
                  const SizedBox(height: 8),
                  _InfoRow(
                      icon: Icons.place_outlined,
                      text: '${event.locationName}\n${event.address}'),
                  const SizedBox(height: 20),
                  Text('Up next', style: theme.textTheme.titleLarge),
                  const SizedBox(height: 8),
                  const _NextItem(),
                  const SizedBox(height: 24),
                  Text('Quick links', style: theme.textTheme.titleLarge),
                  const SizedBox(height: 12),
                  const _QuickLinks(),
                ]),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static String _dateRange(String start, String end) {
    try {
      final fmt = DateFormat('MMM d, yyyy');
      final s = fmt.format(DateTime.parse(start));
      final e = fmt.format(DateTime.parse(end));
      return '$s – $e';
    } catch (_) {
      return '$start – $end';
    }
  }
}

class _NotificationBell extends ConsumerWidget {
  const _NotificationBell();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unread = ref.watch(notificationsProvider).valueOrNull?.unread ?? 0;
    return Stack(
      alignment: Alignment.center,
      children: [
        IconButton(
          icon: const Icon(Icons.notifications_outlined),
          tooltip: 'Notifications',
          onPressed: () => context.go('/notifications'),
        ),
        if (unread > 0)
          Positioned(
            right: 8,
            top: 8,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.error,
                  shape: BoxShape.circle),
              constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
              child: Text('$unread',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontSize: 10)),
            ),
          ),
      ],
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({required this.url});
  final String url;
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [scheme.primary, scheme.secondary],
        ),
      ),
      child: const DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.transparent, Colors.black38],
          ),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.text});
  final IconData icon;
  final String text;
  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary),
        const SizedBox(width: 10),
        Expanded(child: Text(text)),
      ],
    );
  }
}

class _NextItem extends ConsumerWidget {
  const _NextItem();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final itinAsync = ref.watch(itineraryProvider);
    return itinAsync.when(
      loading: () => const Card(
          child: Padding(
              padding: EdgeInsets.all(16),
              child: LinearProgressIndicator())),
      error: (_, __) => const SizedBox.shrink(),
      data: (items) {
        final next = _findNext(items);
        if (next == null) {
          return const Card(
            child: ListTile(
              leading: Icon(Icons.check_circle_outline),
              title: Text('Nothing scheduled next'),
              subtitle: Text('Enjoy your free time.'),
            ),
          );
        }
        final time = DateFormat('EEE • h:mm a').format(next.start);
        return Card(
          child: ListTile(
            leading: const Icon(Icons.schedule),
            title: Text(next.customTitle ?? 'Itinerary item'),
            subtitle: Text(time),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.go('/itinerary'),
          ),
        );
      },
    );
  }

  ItineraryItem? _findNext(List<ItineraryItem> items) {
    final now = DateTime.now();
    for (final it in items) {
      if (it.start.isAfter(now)) return it;
    }
    return items.isNotEmpty ? items.last : null;
  }
}

class _QuickLinks extends StatelessWidget {
  const _QuickLinks();
  @override
  Widget build(BuildContext context) {
    final links = <(_QL, VoidCallback)>[
      (const _QL('Agenda', Icons.event), () => context.go('/agenda')),
      (const _QL('My Itinerary', Icons.luggage), () => context.go('/itinerary')),
      (const _QL('Travel', Icons.flight_takeoff), () {}),
      (const _QL('Dining', Icons.restaurant), () {}),
      (const _QL('Photos', Icons.photo_library), () {}),
      (const _QL('Help', Icons.support_agent), () {}),
    ];
    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.1,
      children: [
        for (final (ql, onTap) in links)
          Card(
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: onTap,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(ql.icon,
                      color: Theme.of(context).colorScheme.primary, size: 28),
                  const SizedBox(height: 8),
                  Text(ql.label, style: const TextStyle(fontSize: 13)),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _QL {
  final String label;
  final IconData icon;
  const _QL(this.label, this.icon);
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        const SizedBox(height: 120),
        const Icon(Icons.cloud_off, size: 48, color: Colors.black38),
        const SizedBox(height: 12),
        const Center(child: Text('Could not load the event.')),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Text(message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.black45, fontSize: 12)),
        ),
      ],
    );
  }
}
