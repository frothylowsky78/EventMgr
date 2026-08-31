import 'dart:async';

import 'package:amazon_cognito_identity_dart_2/cognito.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../core/config.dart';

/// The only sign-in message a guest ever sees for a failed attempt.
///
/// Deliberately identical for every cause — unknown email, wrong code, disabled account,
/// exhausted attempts. Cognito already suppresses user-existence errors
/// (preventUserExistenceErrors on both clients), and saying "no such user" here would hand
/// that back: anyone could probe the guest list one email at a time.
const String signInFailedMessage =
    "That email and access code didn't match. Please check both and try again.";

/// The one case worth distinguishing, because the guest can act on it.
const String offlineMessage = 'You appear to be offline.';

/// A sign-in failure already reduced to text that is safe to show a guest.
///
/// Cognito's own exceptions stringify to things like `CognitoUser"CUSTOM_CHALLENGE"`, which is
/// both meaningless to a guest and a leak. Nothing outside this file should ever construct one
/// from raw error text.
class AuthFailure implements Exception {
  const AuthFailure(this.message);
  final String message;

  @override
  String toString() => message;
}

/// Network trouble rather than bad credentials. Matched on the message because the flow can
/// fail as a SocketException, a TimeoutException or the Cognito client's own wrapper.
bool _looksOffline(Object e) {
  if (e is TimeoutException) return true;
  final s = e.toString().toLowerCase();
  return s.contains('socketexception') ||
      s.contains('failed host lookup') ||
      s.contains('network is unreachable') ||
      s.contains('no address associated with hostname') ||
      s.contains('connection refused') ||
      s.contains('connection closed') ||
      s.contains('connection timed out') ||
      s.contains('networkerror');
}

/// Tokens returned after a successful login.
class AuthTokens {
  final String accessToken;
  final String idToken;
  final String? refreshToken;
  const AuthTokens({
    required this.accessToken,
    required this.idToken,
    this.refreshToken,
  });
}

/// Wraps Cognito email + access-code (CUSTOM_AUTH) passwordless login and token persistence.
class CognitoService {
  CognitoService({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;
  // Built lazily: constructing the service must not require valid config. Nothing needs the
  // pool until a sign-in actually happens, and tests subclass this to supply canned tokens.
  late final CognitoUserPool _pool =
      CognitoUserPool(AppConfig.userPoolId, AppConfig.appClientId);

  static const _kAccess = 'access_token';
  static const _kId = 'id_token';
  static const _kRefresh = 'refresh_token';
  static const _kEmail = 'email';

  /// Performs the custom-auth flow: initiate, then answer the access-code challenge.
  ///
  /// Every failure path ends as an [AuthFailure] carrying one of the two constants above. The
  /// underlying error is logged and then dropped, so no Cognito text can reach the UI.
  Future<AuthTokens> signInWithAccessCode(String email, String accessCode) async {
    try {
      final user = CognitoUser(email, _pool);
      user.authenticationFlowType = 'CUSTOM_AUTH';

      final authDetails = AuthenticationDetails(username: email);

      CognitoUserSession? session;
      try {
        // For CUSTOM_AUTH this returns a challenge rather than a session.
        session = await user.initiateAuth(authDetails);
      } on CognitoUserCustomChallengeException {
        // Answering can itself raise CUSTOM_CHALLENGE again: that is what Cognito does for an
        // unknown email once user-existence errors are suppressed, and also for a wrong code
        // with attempts remaining. Neither is distinguishable, and neither is a session — the
        // outer catch turns both into the same message.
        session = await user.sendCustomChallengeAnswer(accessCode.trim());
      }

      if (session == null || !session.isValid()) {
        throw const AuthFailure(signInFailedMessage);
      }

      final tokens = AuthTokens(
        accessToken: session.getAccessToken().getJwtToken() ?? '',
        idToken: session.getIdToken().getJwtToken() ?? '',
        refreshToken: session.getRefreshToken()?.getToken(),
      );
      await _persist(email, tokens);
      return tokens;
    } on AuthFailure {
      rethrow;
    } catch (e) {
      // The only place the real cause is recorded. debugPrint is stripped from release logs
      // that users can read, and the text never reaches the widget tree.
      debugPrint('Sign-in failed: $e');
      throw AuthFailure(_looksOffline(e) ? offlineMessage : signInFailedMessage);
    }
  }

  Future<void> _persist(String email, AuthTokens t) async {
    await _storage.write(key: _kAccess, value: t.accessToken);
    await _storage.write(key: _kId, value: t.idToken);
    if (t.refreshToken != null) {
      await _storage.write(key: _kRefresh, value: t.refreshToken);
    }
    await _storage.write(key: _kEmail, value: email);
  }

  Future<String?> currentAccessToken() => _storage.read(key: _kId);

  Future<bool> hasValidSession() async {
    final access = await _storage.read(key: _kAccess);
    if (access == null) return false;
    // Lightweight expiry check on the JWT exp claim.
    try {
      final token = CognitoAccessToken(access);
      final exp = token.getExpiration();
      return exp != null &&
          exp * 1000 > DateTime.now().millisecondsSinceEpoch;
    } catch (_) {
      return false;
    }
  }

  Future<void> signOut() async {
    await _storage.delete(key: _kAccess);
    await _storage.delete(key: _kId);
    await _storage.delete(key: _kRefresh);
    await _storage.delete(key: _kEmail);
  }
}
