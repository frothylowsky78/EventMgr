import 'package:amazon_cognito_identity_dart_2/cognito.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../core/config.dart';

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
  final CognitoUserPool _pool =
      CognitoUserPool(AppConfig.userPoolId, AppConfig.appClientId);

  static const _kAccess = 'access_token';
  static const _kId = 'id_token';
  static const _kRefresh = 'refresh_token';
  static const _kEmail = 'email';

  /// Performs the custom-auth flow: initiate, then answer the access-code challenge.
  Future<AuthTokens> signInWithAccessCode(String email, String accessCode) async {
    final user = CognitoUser(email, _pool);
    user.authenticationFlowType = 'CUSTOM_AUTH';

    final authDetails = AuthenticationDetails(username: email);

    CognitoUserSession? session;
    try {
      // For CUSTOM_AUTH this returns a challenge rather than a session.
      session = await user.initiateAuth(authDetails);
    } on CognitoUserCustomChallengeException {
      session = await user.sendCustomChallengeAnswer(accessCode.trim());
    }

    if (session == null || !session.isValid()) {
      throw Exception('Invalid email or access code.');
    }

    final tokens = AuthTokens(
      accessToken: session.getAccessToken().getJwtToken() ?? '',
      idToken: session.getIdToken().getJwtToken() ?? '',
      refreshToken: session.getRefreshToken()?.getToken(),
    );
    await _persist(email, tokens);
    return tokens;
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
