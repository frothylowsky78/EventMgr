import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:eventmgr_mobile/application/auth_controller.dart';
import 'package:eventmgr_mobile/application/providers.dart';
import 'package:eventmgr_mobile/data/api_client.dart';
import 'package:eventmgr_mobile/data/auth/cognito_service.dart';
import 'package:eventmgr_mobile/data/local_cache.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Test harness: in-memory doubles for the three things the app can't do in a unit test —
/// the network, the Keychain, and Hive — plus a ProviderContainer wired to use them.
///
/// The doubles deliberately stop at the boundary. Real ApiClient, real repositories and real
/// providers run in tests, so the code under test is the code that ships.

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

/// One canned HTTP reply.
class FakeReply {
  const FakeReply(this.statusCode, this.body);

  /// `{ "data": ... }` — the envelope every real endpoint returns.
  factory FakeReply.data(Object? data) =>
      FakeReply(200, jsonEncode({'data': data}));

  /// `{ "error": { code, message } }` — our own error envelope.
  factory FakeReply.error(String message, {int status = 400, String code = 'VALIDATION'}) =>
      FakeReply(status, jsonEncode({'error': {'code': code, 'message': message}}));

  /// What API Gateway returns when the JWT authorizer rejects a request. Note this is *not*
  /// our envelope — mishandling it is what once disguised auth failures as network outages.
  factory FakeReply.unauthorized() =>
      FakeReply(401, jsonEncode({'message': 'Unauthorized'}));

  final int statusCode;
  final String body;
}

/// Dio adapter that answers from a handler instead of the network, and records every request
/// so tests can assert on headers and call counts.
class FakeAdapter implements HttpClientAdapter {
  FakeAdapter(this.handler);

  /// Return a reply for the given request, or throw to simulate a transport failure.
  final FakeReply Function(RequestOptions options) handler;

  final List<RequestOptions> requests = [];

  /// Paths requested so far, in order — handy for asserting a re-fetch happened.
  List<String> get paths => requests.map((r) => r.path).toList();

  int countFor(String path) => paths.where((p) => p == path).length;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    final reply = handler(options);
    return ResponseBody.fromString(
      reply.body,
      reply.statusCode,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

/// Builds a Dio pointed at [adapter]. `validateStatus` mirrors Dio's default so non-2xx
/// responses surface as DioException, exactly as in production.
Dio dioWith(FakeAdapter adapter) {
  final dio = Dio(BaseOptions(baseUrl: 'https://api.test'));
  dio.httpClientAdapter = adapter;
  return dio;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/// CognitoService double. Starts signed out; [signInWithAccessCode] flips it to signed in,
/// which is what drives the post-login re-fetch behaviour under test.
class FakeCognitoService extends CognitoService {
  FakeCognitoService({this.token, this.valid = false});

  String? token;
  bool valid;
  int signInCount = 0;

  @override
  Future<bool> hasValidSession() async => valid;

  @override
  Future<String?> currentAccessToken() async => token;

  @override
  Future<AuthTokens> signInWithAccessCode(String email, String accessCode) async {
    signInCount++;
    if (accessCode != 'GOOD') {
      throw Exception('Invalid email or access code.');
    }
    token = 'test-id-token';
    valid = true;
    return const AuthTokens(accessToken: 'test-access', idToken: 'test-id-token');
  }

  @override
  Future<void> signOut() async {
    token = null;
    valid = false;
  }
}

// ---------------------------------------------------------------------------
// Offline cache
// ---------------------------------------------------------------------------

/// LocalCache double backed by a map. Never touches Hive, so no init() and no file system.
class FakeLocalCache implements LocalCache {
  final Map<String, String> store = {};

  @override
  Future<void> init() async {}

  @override
  void putJson(String key, Object value) => store[key] = jsonEncode(value);

  @override
  Map<String, dynamic>? getMap(String key) {
    final raw = store[key];
    return raw == null ? null : jsonDecode(raw) as Map<String, dynamic>;
  }

  @override
  List<dynamic>? getList(String key) {
    final raw = store[key];
    return raw == null ? null : jsonDecode(raw) as List<dynamic>;
  }

  @override
  Future<void> clear() async => store.clear();
}

// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------

/// Everything a test needs, kept together so assertions can reach the doubles.
class Harness {
  Harness({
    required this.container,
    required this.adapter,
    required this.auth,
    required this.cache,
  });

  final ProviderContainer container;
  final FakeAdapter adapter;
  final FakeCognitoService auth;
  final FakeLocalCache cache;

  /// AuthController.\_bootstrap() is async, so status starts at `unknown` and settles a
  /// microtask later. Reading a data provider before that settles gets its in-flight request
  /// invalidated by the transition, and the discarded future never completes. Await this first.
  Future<void> ready() async {
    container.read(authControllerProvider);
    while (container.read(authControllerProvider).status == AuthStatus.unknown) {
      await Future<void>.delayed(Duration.zero);
    }
  }

  void dispose() => container.dispose();
}

/// Wires a ProviderContainer with the doubles above. The real apiClientProvider is used — it
/// is the thing that watches auth status — with only its transport swapped out.
Harness makeHarness({
  required FakeReply Function(RequestOptions options) onRequest,
  FakeCognitoService? auth,
  FakeLocalCache? cache,
}) {
  final adapter = FakeAdapter(onRequest);
  final fakeAuth = auth ?? FakeCognitoService();
  final fakeCache = cache ?? FakeLocalCache();

  final container = ProviderContainer(
    overrides: [
      localCacheProvider.overrideWithValue(fakeCache),
      cognitoServiceProvider.overrideWithValue(fakeAuth),
      apiClientProvider.overrideWith((ref) {
        // Mirror the production dependency: rebuild when the user becomes signed in, so the
        // re-fetch-after-login behaviour is exercised rather than assumed.
        ref.watch(authControllerProvider.select((s) => s.status == AuthStatus.signedIn));
        return ApiClient(ref.watch(cognitoServiceProvider), dio: dioWith(adapter));
      }),
    ],
  );

  return Harness(
    container: container,
    adapter: adapter,
    auth: fakeAuth,
    cache: fakeCache,
  );
}
