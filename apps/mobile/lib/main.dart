import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'application/providers.dart';
import 'data/local_cache.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize the offline cache before the app reads any data.
  final cache = LocalCache();
  await cache.init();

  runApp(
    ProviderScope(
      overrides: [localCacheProvider.overrideWithValue(cache)],
      child: const EventApp(),
    ),
  );
}
