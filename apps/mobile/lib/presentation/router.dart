import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../application/auth_controller.dart';
import '../application/providers.dart';
import 'screens/agenda_screen.dart';
import 'screens/agenda_detail_screen.dart';
import 'screens/gallery_screen.dart';
import 'screens/home_screen.dart';
import 'screens/itinerary_screen.dart';
import 'screens/more_menu_screen.dart';
import 'screens/blocked_attendees_screen.dart';
import 'screens/home_shell.dart';
import 'screens/dining_screen.dart';
import 'screens/faq_screen.dart';
import 'screens/feedback_screen.dart';
import 'screens/help_screen.dart';
import 'screens/login_screen.dart';
import 'screens/conversation_screen.dart';
import 'screens/maps_screen.dart';
import 'screens/messages_screen.dart';
import 'screens/notification_center_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/registration_screen.dart';
import 'screens/transportation_screen.dart';
import 'screens/travel_screen.dart';
import 'screens/weather_screen.dart';
import 'screens/yearbook_screen.dart';

/// App router. Redirects to /login when signed out; supports deep links to agenda items
/// (the foundation for notification deep linking).
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/home',
    refreshListenable: _AuthListenable(ref),
    redirect: (context, state) {
      final status = ref.read(authControllerProvider).status;
      final loggingIn = state.matchedLocation == '/login';
      if (status == AuthStatus.unknown) return null;
      final signedIn = status == AuthStatus.signedIn;
      if (!signedIn) return loggingIn ? null : '/login';
      if (signedIn && loggingIn) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),

      // One persistent shell across all five tabs.
      //
      // Previously /home, /agenda and /itinerary each built their own HomeShell, so any
      // context.go to them — the Home quick links, the Up next card — tore one shell down and
      // built another. That is a full route transition: two nav bars on screen mid-slide, and
      // because GalleryScreen sits in both shells' IndexedStacks, its Hero widgets matched
      // across the two routes and the photos flew across the screen.
      //
      // StatefulShellRoute keeps a single shell and swaps branches in place. goBranch does no
      // route transition at all, and context.go('/agenda') now selects that branch rather than
      // constructing a second shell.
      StatefulShellRoute(
        builder: (_, __, navigationShell) => HomeShell(navigationShell: navigationShell),
        // The default indexedStack constructor gives no access to the individual children, and
        // Heroes in an offscreen branch would still be eligible to fly during a push from the
        // visible one. Building the stack here lets each branch be sealed with HeroMode.
        navigatorContainerBuilder: (_, navigationShell, children) => IndexedStack(
          index: navigationShell.currentIndex,
          children: [
            for (var i = 0; i < children.length; i++)
              HeroMode(
                enabled: i == navigationShell.currentIndex,
                child: children[i],
              ),
          ],
        ),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/agenda', builder: (_, __) => const AgendaScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/itinerary', builder: (_, __) => const ItineraryScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/photos', builder: (_, __) => const GalleryScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/more', builder: (_, __) => const MoreMenuScreen()),
          ]),
        ],
      ),
      GoRoute(
        path: '/agenda/:id',
        builder: (_, state) =>
            AgendaDetailScreen(agendaId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/notifications',
        builder: (_, __) => const NotificationCenterScreen(),
      ),
      GoRoute(path: '/travel', builder: (_, __) => const TravelScreen()),
      GoRoute(path: '/messages', builder: (_, __) => const MessagesScreen()),
      GoRoute(
        path: '/messages/:id',
        builder: (_, state) =>
            ConversationScreen(conversationId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/transportation', builder: (_, __) => const TransportationScreen()),
      GoRoute(path: '/dining', builder: (_, __) => const DiningScreen()),
      GoRoute(path: '/faq', builder: (_, __) => const FaqScreen()),
      GoRoute(path: '/attendees', builder: (_, __) => const YearbookScreen()),
      GoRoute(path: '/weather', builder: (_, __) => const WeatherScreen()),
      GoRoute(path: '/help', builder: (_, __) => const HelpScreen()),
      GoRoute(path: '/feedback', builder: (_, __) => const FeedbackScreen()),
      GoRoute(path: '/registration', builder: (_, __) => const RegistrationScreen()),
      GoRoute(path: '/maps', builder: (_, __) => const MapsScreen()),
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      GoRoute(
          path: '/blocked',
          builder: (_, __) => const BlockedAttendeesScreen()),
    ],
  );
});

/// Bridges the Riverpod auth state into GoRouter's refresh mechanism.
class _AuthListenable extends ChangeNotifier {
  _AuthListenable(Ref ref) {
    ref.listen(authControllerProvider, (_, __) => notifyListeners());
  }
}
