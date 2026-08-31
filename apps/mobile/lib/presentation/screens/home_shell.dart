import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../application/providers.dart';

/// Bottom navigation per spec §7: Home · Agenda · My Itinerary · Photos · More.
/// (The spec calls the third tab "My Trip"; the UI uses "My Itinerary" to match the
/// Home quick link and the agenda detail button.)
/// Photos/More are premium placeholders in Phase 1 and fill in during P1.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key, required this.navigationShell});

  /// Owns the branch state and the IndexedStack. Built once by StatefulShellRoute and reused,
  /// which is what makes a tab switch a rebuild rather than a route transition.
  final StatefulNavigationShell navigationShell;

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> with WidgetsBindingObserver {

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Poll on foreground (docs/open-questions.md A13) — there is no push to wake us, so
    // returning to the app is the only signal that server-side state may have moved. Staff
    // approve a photo or publish an agenda item while the guest is elsewhere; without this the
    // change does not land until the app is killed and relaunched.
    if (state == AppLifecycleState.resumed) {
      ref.invalidate(unreadCountProvider);
      for (final p in _contentProviders) {
        ref.invalidate(p);
      }
    }
  }

  /// Everything a tab or a pushed screen renders from. Invalidating one it is not watching is
  /// free — Riverpod only refetches providers with live listeners.
  static final _contentProviders = [
    eventProvider,
    agendaProvider,
    itineraryProvider,
    galleryProvider,
    attendeesProvider,
    notificationsProvider,
    conversationsProvider,
  ];

  /// The tab's own data, refreshed as it comes into view. Branches stay mounted in the
  /// IndexedStack, so selecting one never rebuilds it on its own.
  void _onTabSelected(int i) {
    widget.navigationShell.goBranch(
      i,
      // Re-tapping the current tab pops it back to its root, the platform convention.
      initialLocation: i == widget.navigationShell.currentIndex,
    );
    switch (i) {
      case 0:
        ref.invalidate(eventProvider);
        ref.invalidate(itineraryProvider);
      case 1:
        ref.invalidate(agendaProvider);
      case 2:
        ref.invalidate(itineraryProvider);
      case 3:
        ref.invalidate(galleryProvider);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: widget.navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: widget.navigationShell.currentIndex,
        onDestinationSelected: _onTabSelected,
        destinations: [
          const NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: 'Home'),
          const NavigationDestination(
              icon: Icon(Icons.event_outlined),
              selectedIcon: Icon(Icons.event),
              label: 'Agenda'),
          const NavigationDestination(
              icon: Icon(Icons.luggage_outlined),
              selectedIcon: Icon(Icons.luggage),
              label: 'My Itinerary'),
          const NavigationDestination(
              icon: Icon(Icons.photo_library_outlined),
              label: 'Photos'),
          NavigationDestination(icon: _MoreIcon(), label: 'More'),
        ],
      ),
    );
  }
}

/// More-tab icon carrying the unread-message badge, so the count is visible from anywhere
/// rather than only after opening the More menu.
class _MoreIcon extends ConsumerWidget {
  const _MoreIcon();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unread = ref.watch(unreadCountProvider).valueOrNull ?? 0;
    if (unread == 0) return const Icon(Icons.more_horiz);
    return Badge(
      label: Text('$unread'),
      child: const Icon(Icons.more_horiz),
    );
  }
}
