import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/auth/cognito_service.dart';

enum AuthStatus { unknown, signedOut, signedIn, authenticating }

class AuthState {
  final AuthStatus status;
  final String? error;
  const AuthState(this.status, {this.error});
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._cognito) : super(const AuthState(AuthStatus.unknown)) {
    _bootstrap();
  }

  final CognitoService _cognito;

  Future<void> _bootstrap() async {
    final valid = await _cognito.hasValidSession();
    state = AuthState(valid ? AuthStatus.signedIn : AuthStatus.signedOut);
  }

  Future<void> signIn(String email, String accessCode) async {
    state = const AuthState(AuthStatus.authenticating);
    try {
      await _cognito.signInWithAccessCode(email, accessCode);
      state = const AuthState(AuthStatus.signedIn);
    } catch (e) {
      state = AuthState(AuthStatus.signedOut, error: _message(e));
    }
  }

  Future<void> signOut() async {
    await _cognito.signOut();
    state = const AuthState(AuthStatus.signedOut);
  }

  String _message(Object e) {
    final s = e.toString().replaceFirst('Exception: ', '');
    return s.isEmpty ? 'Sign-in failed. Check your email and access code.' : s;
  }
}
