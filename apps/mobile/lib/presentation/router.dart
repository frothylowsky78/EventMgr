import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../application/auth_controller.dart';
import '../application/providers.dart';
import 'screens/agenda_detail_screen.dart';
import 'screens/home_shell.dart';
import 'screens/login_screen.dart';
import 'screens/notification_center_screen.dart';

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
    ],
  );
});

/// Bridges the Riverpod auth state into GoRouter's refresh mechanism.
class _AuthListenable extends ChangeNotifier {
  _AuthListenable(Ref ref) {
    ref.listen(authControllerProvider, (_, __) => notifyListeners());
  }
}
