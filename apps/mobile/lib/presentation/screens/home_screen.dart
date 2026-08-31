import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../application/providers.dart';
import '../../domain/agenda_item.dart';
import '../../domain/event.dart';
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
                  background: _Hero(
                    url: event.branding.heroImageUrl,
                    logoUrl: event.branding.logoUrl,
                  ),
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
                  const SizedBox(height: 16),
                  _WelcomeCard(event: event),
                  const _RegistrationBanner(),
                  const _WeatherSnapshot(),
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

class _RegistrationBanner extends ConsumerWidget {
  const _RegistrationBanner();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(meProvider).valueOrNull;
    if (me == null || me.registrationComplete) return const SizedBox.shrink();
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Card(
        color: scheme.secondary.withOpacity(0.12),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => context.push('/registration'),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Icon(Icons.how_to_reg, color: scheme.primary),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text('Finish your registration',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                ),
                const Icon(Icons.chevron_right),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _WeatherSnapshot extends ConsumerWidget {
  const _WeatherSnapshot();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final w = ref.watch(weatherProvider).valueOrNull;
    if (w == null || !w.hasData) return const SizedBox.shrink();
    final scheme = Theme.of(context).colorScheme;
    final hasAlert = w.notes.isNotEmpty;
    final subtitle = w.currentTempF != null
        ? '${w.currentTempF!.round()}°F · ${w.currentCondition ?? ''}'
        : (w.daily.isNotEmpty ? w.daily.first.condition : '');
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.push('/weather'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Icon(hasAlert ? Icons.warning_amber : Icons.wb_sunny,
                  color: hasAlert ? Colors.orange : scheme.secondary),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  hasAlert ? w.notes.first.title : 'Weather · $subtitle',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
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
          onPressed: () => context.push('/notifications'),
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

/// Backdrop for the collapsing SliverAppBar: the event's hero photo when one is configured,
/// the brand gradient otherwise, always under a scrim that keeps the title readable.
class _Hero extends StatelessWidget {
  const _Hero({required this.url, required this.logoUrl});
  final String url;
  final String logoUrl;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final gradient = _brandGradient(scheme);

    return Stack(
      // Non-positioned children fill the flexible space, at both expanded and collapsed heights.
      fit: StackFit.expand,
      children: [
        if (url.isEmpty)
          gradient
        else
          CachedNetworkImage(
            imageUrl: url,
            fit: BoxFit.cover,
            // The gradient stands in while loading and if the image never arrives, so the hero
            // is never a blank box behind the event name.
            placeholder: (_, __) => gradient,
            errorWidget: (_, __, ___) => gradient,
          ),
        // Scrim over whatever is behind it. Darkened at BOTH ends, not just the bottom: the
        // logo sits top-left, and on a photo with a bright sky there (this event's hero is
        // luma ~210 up there) a white logo on an undarkened top is invisible. The middle stays
        // clear so the photo still reads as a photo.
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Colors.black45, Colors.transparent, Colors.black54],
              stops: [0.0, 0.4, 1.0],
            ),
          ),
        ),
        if (logoUrl.isNotEmpty)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Flexible(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxHeight: 36),
                        child: CachedNetworkImage(
                          imageUrl: logoUrl,
                          fit: BoxFit.contain,
                          alignment: Alignment.centerLeft,
                          // Branding is decoration: a missing logo leaves the hero clean rather
                          // than showing a spinner or a broken-image glyph over the photo.
                          placeholder: (_, __) => const SizedBox.shrink(),
                          errorWidget: (_, __, ___) => const SizedBox.shrink(),
                        ),
                      ),
                    ),
                    // Reserves the notification bell's corner so a wide logo cannot run under it.
                    const SizedBox(width: 56),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _brandGradient(ColorScheme scheme) => DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [scheme.primary, scheme.secondary],
          ),
        ),
      );
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
    // Agenda is supplementary here: it names linked itinerary items and provides the fallback
    // when the attendee has nothing personal scheduled. Its loading/error state must not block.
    final agenda = ref.watch(agendaProvider).valueOrNull ?? const <AgendaItem>[];
    return itinAsync.when(
      loading: () => const Card(
          child: Padding(
              padding: EdgeInsets.all(16),
              child: LinearProgressIndicator())),
      error: (_, __) => const SizedBox.shrink(),
      data: (items) {
        final now = DateTime.now();
        final next = _findNext(items, now);
        if (next != null) {
          // Same title resolution as itinerary_screen: linked agenda items show their real name.
          final agendaTitles = <String, String>{for (final a in agenda) a.id: a.title};
          return _card(
            title: next.customTitle ?? agendaTitles[next.agendaItemId] ?? 'Scheduled item',
            start: next.start,
            onTap: () => context.go('/itinerary'),
          );
        }

        final upcoming = _findNextAgenda(agenda, now);
        if (upcoming != null) {
          return _card(
            title: upcoming.$1.title,
            start: upcoming.$2,
            onTap: () => context.push('/agenda/${upcoming.$1.id}'),
          );
        }

        return const Card(
          child: ListTile(
            leading: Icon(Icons.check_circle_outline),
            title: Text('Nothing scheduled next'),
            subtitle: Text('Enjoy your free time.'),
          ),
        );
      },
    );
  }

  Widget _card({
    required String title,
    required DateTime start,
    required VoidCallback onTap,
  }) =>
      Card(
        child: ListTile(
          leading: const Icon(Icons.schedule),
          title: Text(title),
          subtitle: Text(DateFormat('EEE • h:mm a').format(start)),
          trailing: const Icon(Icons.chevron_right),
          onTap: onTap,
        ),
      );

  ItineraryItem? _findNext(List<ItineraryItem> items, DateTime now) {
    for (final it in items) {
      if (it.start.isAfter(now)) return it;
    }
    return null;
  }

  /// Earliest agenda item still ahead of [now], paired with its parsed start.
  (AgendaItem, DateTime)? _findNextAgenda(List<AgendaItem> items, DateTime now) {
    (AgendaItem, DateTime)? best;
    for (final a in items) {
      final start = _agendaStart(a);
      if (start == null || !start.isAfter(now)) continue;
      if (best == null || start.isBefore(best.$2)) best = (a, start);
    }
    return best;
  }

  /// Agenda items carry date and start time as separate strings; malformed rows are skipped.
  static DateTime? _agendaStart(AgendaItem a) {
    try {
      return DateTime.parse('${a.date} ${a.startTime}');
    } catch (_) {
      return null;
    }
  }
}

class _QuickLinks extends StatelessWidget {
  const _QuickLinks();
  @override
  Widget build(BuildContext context) {
    final links = <(_QL, VoidCallback)>[
      (const _QL('Agenda', Icons.event), () => context.go('/agenda')),
      (const _QL('My Itinerary', Icons.luggage), () => context.go('/itinerary')),
      (const _QL('Attendees', Icons.people_outline), () => context.push('/attendees')),
      (const _QL('Dining', Icons.restaurant), () => context.push('/dining')),
      (const _QL('Transport', Icons.directions_bus), () => context.push('/transportation')),
      (const _QL('Notifications', Icons.notifications), () => context.push('/notifications')),
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

/// Host welcome note (CF-3). Renders nothing at all when unset, so the layout is unchanged for
/// events that don't use it.
class _WelcomeCard extends StatelessWidget {
  const _WelcomeCard({required this.event});
  final EventProfile event;

  @override
  Widget build(BuildContext context) {
    if (event.welcomeMessage.trim().isEmpty) return const SizedBox.shrink();
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Icon(Icons.waving_hand_outlined, size: 20, color: theme.colorScheme.primary),
              const SizedBox(width: 8),
              Text('Welcome', style: theme.textTheme.titleMedium),
            ]),
            const SizedBox(height: 8),
            Text(event.welcomeMessage, style: theme.textTheme.bodyMedium),
            if (event.welcomeMessageAuthor.trim().isNotEmpty) ...[
              const SizedBox(height: 8),
              Text('— ${event.welcomeMessageAuthor}',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(fontStyle: FontStyle.italic, color: Colors.black54)),
            ],
          ],
        ),
      ),
    );
  }
}
