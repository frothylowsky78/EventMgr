import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../application/providers.dart';

import 'agenda_screen.dart';
import 'gallery_screen.dart';
import 'home_screen.dart';
import 'itinerary_screen.dart';
import 'more_menu_screen.dart';

/// Bottom navigation per spec §7: Home · Agenda · My Trip · Photos · More.
/// Photos/More are premium placeholders in Phase 1 and fill in during P1.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key, this.initialTab = 0});
  final int initialTab;

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> with WidgetsBindingObserver {
  late int _index = widget.initialTab;

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
    // Poll unread on foreground (docs/open-questions.md A13) — there is no push to wake us.
    if (state == AppLifecycleState.resumed) {
      ref.invalidate(unreadCountProvider);
    }
  }

  static const _tabs = <Widget>[
    HomeScreen(),
    AgendaScreen(),
    ItineraryScreen(),
    GalleryScreen(),
    MoreMenuScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _tabs),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
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
              label: 'My Trip'),
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
