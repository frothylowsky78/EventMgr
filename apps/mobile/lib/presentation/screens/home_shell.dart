import 'package:flutter/material.dart';

import 'agenda_screen.dart';
import 'home_screen.dart';
import 'itinerary_screen.dart';
import 'placeholder_screen.dart';

/// Bottom navigation per spec §7: Home · Agenda · My Trip · Photos · More.
/// Photos/More are premium placeholders in Phase 1 and fill in during P1.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key, this.initialTab = 0});
  final int initialTab;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  late int _index = widget.initialTab;

  static const _tabs = <Widget>[
    HomeScreen(),
    AgendaScreen(),
    ItineraryScreen(),
    PlaceholderScreen(title: 'Photos', icon: Icons.photo_library_outlined),
    PlaceholderScreen(title: 'More', icon: Icons.more_horiz),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _tabs),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: 'Home'),
          NavigationDestination(
              icon: Icon(Icons.event_outlined),
              selectedIcon: Icon(Icons.event),
              label: 'Agenda'),
          NavigationDestination(
              icon: Icon(Icons.luggage_outlined),
              selectedIcon: Icon(Icons.luggage),
              label: 'My Trip'),
          NavigationDestination(
              icon: Icon(Icons.photo_library_outlined),
              label: 'Photos'),
          NavigationDestination(icon: Icon(Icons.more_horiz), label: 'More'),
        ],
      ),
    );
  }
}
