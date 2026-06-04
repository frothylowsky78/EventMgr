import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../application/auth_controller.dart';
import '../application/providers.dart';
import 'screens/agenda_detail_screen.dart';
import 'screens/home_shell.dart';
import 'screens/dining_screen.dart';
import 'screens/faq_screen.dart';
import 'screens/feedback_screen.dart';
import 'screens/help_screen.dart';
import 'screens/login_screen.dart';
import 'screens/notification_center_screen.dart';
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
      GoRoute(path: '/home', builder: (_, __) => const HomeShell(initialTab: 0)),
      GoRoute(path: '/agenda', builder: (_, __) => const HomeShell(initialTab: 1)),
      GoRoute(path: '/itinerary', builder: (_, __) => const HomeShell(initialTab: 2)),
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
      GoRoute(path: '/transportation', builder: (_, __) => const TransportationScreen()),
      GoRoute(path: '/dining', builder: (_, __) => const DiningScreen()),
      GoRoute(path: '/faq', builder: (_, __) => const FaqScreen()),
      GoRoute(path: '/attendees', builder: (_, __) => const YearbookScreen()),
      GoRoute(path: '/weather', builder: (_, __) => const WeatherScreen()),
      GoRoute(path: '/help', builder: (_, __) => const HelpScreen()),
      GoRoute(path: '/feedback', builder: (_, __) => const FeedbackScreen()),
      GoRoute(path: '/registration', builder: (_, __) => const RegistrationScreen()),
    ],
  );
});

/// Bridges the Riverpod auth state into GoRouter's refresh mechanism.
class _AuthListenable extends ChangeNotifier {
  _AuthListenable(Ref ref) {
    ref.listen(authControllerProvider, (_, __) => notifyListeners());
  }
}
