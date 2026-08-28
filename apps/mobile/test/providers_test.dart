import 'package:eventmgr_mobile/application/auth_controller.dart';
import 'package:eventmgr_mobile/application/providers.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/harness.dart';

const _itineraryJson = [
  {
    'id': 'itinerary_001',
    'attendeeId': 'attendee_001',
    'startDateTime': '2026-09-12T18:00:00-07:00',
    'endDateTime': '2026-09-12T20:00:00-07:00',
    'notes': 'Table 4',
  },
];

void main() {
  group('re-fetch after sign-in', () {
    // The bug this pins down: on a cold start the providers fetched while signed out, cached
    // the 401, and never re-ran when auth flipped. Every screen sat on that stale error until
    // the app was restarted. Reproduced reliably on Android before the fix.
    test('a provider that failed while signed out succeeds after signing in', () async {
      final auth = FakeCognitoService();
      final h = makeHarness(
        auth: auth,
        // Exactly what the real stack does: no token -> API Gateway 401.
        onRequest: (options) => options.headers.containsKey('authorization')
            ? FakeReply.data(_itineraryJson)
            : FakeReply.unauthorized(),
      );
      addTearDown(h.dispose);
      await h.ready();

      // Signed out: the fetch fails and there is no cache to fall back on.
      await expectLater(
        h.container.read(itineraryProvider.future),
        throwsA(isA<Exception>()),
      );

      await h.container.read(authControllerProvider.notifier).signIn('jane@example.com', 'GOOD');

      // No restart, no manual invalidation — the provider must re-run on its own.
      final items = await h.container.read(itineraryProvider.future);
      expect(items, hasLength(1));
      expect(items.single.notes, 'Table 4');
      expect(h.adapter.countFor('/me/itinerary'), 2, reason: 'should have re-fetched once');
    });

    test('signing out re-runs providers as well', () async {
      final auth = FakeCognitoService(token: 'id-token', valid: true);
      final h = makeHarness(
        auth: auth,
        onRequest: (options) => options.headers.containsKey('authorization')
            ? FakeReply.data(_itineraryJson)
            : FakeReply.unauthorized(),
      );
      addTearDown(h.dispose);
      await h.ready();

      expect(await h.container.read(itineraryProvider.future), hasLength(1));
      final before = h.adapter.countFor('/me/itinerary');

      await h.container.read(authControllerProvider.notifier).signOut();
      await h.container.read(itineraryProvider.future);

      expect(h.adapter.countFor('/me/itinerary'), greaterThan(before),
          reason: 'sign-out should invalidate the data providers too');
      expect(h.adapter.requests.last.headers.containsKey('authorization'), isFalse,
          reason: 'the re-fetch should go out unauthenticated');
    });

    // Documents current behaviour rather than endorsing it: signOut() clears the Cognito
    // tokens but not the Hive cache, so the previous attendee's itinerary is still served
    // from disk after signing out. On a shared device that leaks personal data. Left as-is
    // because changing it is a product decision, not a test fix.
    test('KNOWN GAP: cached personal data survives sign-out', () async {
      final h = makeHarness(
        auth: FakeCognitoService(token: 'id-token', valid: true),
        onRequest: (options) => options.headers.containsKey('authorization')
            ? FakeReply.data(_itineraryJson)
            : FakeReply.unauthorized(),
      );
      addTearDown(h.dispose);
      await h.ready();

      await h.container.read(itineraryProvider.future);
      await h.container.read(authControllerProvider.notifier).signOut();

      final afterSignOut = await h.container.read(itineraryProvider.future);
      expect(afterSignOut, hasLength(1),
          reason: 'cache still holds the signed-out user data — see comment above');
    });

    test('a failed sign-in does not trigger a pointless re-fetch', () async {
      final h = makeHarness(
        auth: FakeCognitoService(),
        onRequest: (_) => FakeReply.unauthorized(),
      );
      addTearDown(h.dispose);
      await h.ready();

      await expectLater(
        h.container.read(itineraryProvider.future),
        throwsA(isA<Exception>()),
      );
      final before = h.adapter.countFor('/me/itinerary');

      // Wrong access code: status goes authenticating -> signedOut, never signedIn.
      await h.container.read(authControllerProvider.notifier).signIn('jane@example.com', 'WRONG');
      expect(h.container.read(authControllerProvider).status, AuthStatus.signedOut);

      expect(h.adapter.countFor('/me/itinerary'), before,
          reason: 'selecting on the signed-in flag should avoid a doomed extra round trip');
    });
  });

  group('offline fallback', () {
    test('a cached itinerary is served when the network fails', () async {
      final cache = FakeLocalCache()..putJson('itinerary:me', _itineraryJson);
      final h = makeHarness(
        cache: cache,
        auth: FakeCognitoService(token: 'id-token', valid: true),
        onRequest: (_) => throw Exception('offline'),
      );
      addTearDown(h.dispose);
      await h.ready();

      final items = await h.container.read(itineraryProvider.future);
      expect(items, hasLength(1));
      expect(items.single.id, 'itinerary_001');
    });

    test('a successful fetch populates the cache for next time', () async {
      final h = makeHarness(
        auth: FakeCognitoService(token: 'id-token', valid: true),
        onRequest: (_) => FakeReply.data(_itineraryJson),
      );
      addTearDown(h.dispose);
      await h.ready();

      await h.container.read(itineraryProvider.future);

      expect(h.cache.store.containsKey('itinerary:me'), isTrue);
    });

    test('an empty cache lets the failure surface', () async {
      final h = makeHarness(
        auth: FakeCognitoService(token: 'id-token', valid: true),
        onRequest: (_) => throw Exception('offline'),
      );
      addTearDown(h.dispose);
      await h.ready();

      await expectLater(
        h.container.read(itineraryProvider.future),
        throwsA(isA<Exception>()),
      );
    });
  });
}
