import 'package:eventmgr_mobile/data/api_client.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/harness.dart';

/// ApiClient behaviour: the auth header, the `{ data }` envelope, and error mapping.
///
/// Error mapping matters more than it looks. It once reported every non-enveloped response as
/// "Network error", which turned API Gateway's 401 into an apparent outage and hid the real
/// cause of the "nothing loads after sign-in" bug.
void main() {
  group('auth header', () {
    test('attaches the stored token as a bearer', () async {
      final auth = FakeCognitoService(token: 'id-token-123', valid: true);
      final adapter = FakeAdapter((_) => FakeReply.data({'ok': true}));
      final client = ApiClient(auth, dio: dioWith(adapter));

      await client.getData('/me');

      expect(adapter.requests.single.headers['authorization'], 'Bearer id-token-123');
    });

    test('sends no authorization header when signed out', () async {
      final adapter = FakeAdapter((_) => FakeReply.data({'ok': true}));
      final client = ApiClient(FakeCognitoService(), dio: dioWith(adapter));

      await client.getData('/me');

      expect(adapter.requests.single.headers.containsKey('authorization'), isFalse);
    });
  });

  group('envelope', () {
    test('getData unwraps { data }', () async {
      final adapter = FakeAdapter((_) => FakeReply.data([1, 2, 3]));
      final client = ApiClient(FakeCognitoService(), dio: dioWith(adapter));

      expect(await client.getData('/events/event_001/agenda'), [1, 2, 3]);
    });
  });

  group('error mapping', () {
    Future<String> messageFor(FakeReply reply) async {
      final client = ApiClient(FakeCognitoService(), dio: dioWith(FakeAdapter((_) => reply)));
      try {
        await client.getData('/anything');
        fail('expected the request to throw');
      } catch (e) {
        return e.toString();
      }
    }

    test('API Gateway 401 reports authorization, not a network failure', () async {
      final message = await messageFor(FakeReply.unauthorized());

      expect(message, contains('401'));
      expect(message.toLowerCase(), contains('not authorized'));
      // The regression: a rejected token must never be described as a network problem.
      expect(message.toLowerCase(), isNot(contains('network')));
    });

    test('403 is reported as an authorization failure too', () async {
      final message = await messageFor(const FakeReply(403, '{"message":"Forbidden"}'));

      expect(message, contains('403'));
      expect(message.toLowerCase(), contains('not authorized'));
    });

    test('our own error envelope surfaces the server message', () async {
      final message = await messageFor(FakeReply.error('eventId is required'));

      expect(message, contains('eventId is required'));
    });

    test('other statuses pass through the server message and the code', () async {
      final message = await messageFor(const FakeReply(500, '{"message":"Internal Server Error"}'));

      expect(message, contains('Internal Server Error'));
      expect(message, contains('500'));
    });

    test('a transport failure is the only thing called a network problem', () async {
      final adapter = FakeAdapter((_) => throw Exception('connection refused'));
      final client = ApiClient(FakeCognitoService(), dio: dioWith(adapter));

      try {
        await client.getData('/anything');
        fail('expected the request to throw');
      } catch (e) {
        expect(e.toString().toLowerCase(), contains('network unavailable'));
      }
    });
  });
}
