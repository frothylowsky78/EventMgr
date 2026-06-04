/// Environment configuration injected at build time:
///   flutter run --dart-define=ENV=dev \
///     --dart-define=API_URL=... --dart-define=USER_POOL_ID=... \
///     --dart-define=APP_CLIENT_ID=... --dart-define=REGION=us-west-2 \
///     --dart-define=EVENT_ID=event_001
///
/// Values come from the matching CDK stack outputs. Nothing event-specific is hardcoded.
class AppConfig {
  static const String env = String.fromEnvironment('ENV', defaultValue: 'dev');
  static const String apiUrl = String.fromEnvironment('API_URL');
  static const String region =
      String.fromEnvironment('REGION', defaultValue: 'us-west-2');
  static const String userPoolId = String.fromEnvironment('USER_POOL_ID');
  static const String appClientId = String.fromEnvironment('APP_CLIENT_ID');

  /// The single event shown by the app in Phase 1 (multi-event ready backend).
  static const String eventId =
      String.fromEnvironment('EVENT_ID', defaultValue: 'event_001');

  static bool get isConfigured =>
      apiUrl.isNotEmpty && userPoolId.isNotEmpty && appClientId.isNotEmpty;
}
