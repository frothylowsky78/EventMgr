import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'application/providers.dart';
import 'core/theme.dart';
import 'presentation/router.dart';

class EventApp extends ConsumerWidget {
  const EventApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    // Theme is derived from backend branding once the event loads (re-skins per event,
    // no release needed). Defaults apply until then / when offline with no cache.
    final branding = ref.watch(eventProvider).valueOrNull?.branding;

    return MaterialApp.router(
      title: 'Event',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.fromBranding(
        primary: branding?.primaryColor,
        secondary: branding?.secondaryColor,
      ),
      routerConfig: router,
    );
  }
}
