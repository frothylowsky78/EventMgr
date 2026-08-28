import 'package:dio/dio.dart';

import '../core/config.dart';
import 'auth/cognito_service.dart';

/// Thin HTTP client over the backend API. Attaches the Cognito access token and
/// unwraps the `{ data }` / `{ error }` envelope.
class ApiClient {
  /// [dio] is injectable so tests can exercise this class (auth interceptor, envelope
  /// unwrapping, error mapping) against a fake adapter instead of the network.
  ApiClient(this._auth, {Dio? dio})
      : _dio = dio ??
            Dio(BaseOptions(
              baseUrl: AppConfig.apiUrl,
              connectTimeout: const Duration(seconds: 10),
              receiveTimeout: const Duration(seconds: 15),
            )) {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _auth.currentAccessToken();
        if (token != null) {
          options.headers['authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    ));
  }

  final Dio _dio;
  final CognitoService _auth;

  Future<dynamic> getData(String path) async {
    try {
      final res = await _dio.get(path);
      return res.data['data'];
    } on DioException catch (e) {
      throw _toApiError(e);
    }
  }

  Future<dynamic> postData(String path, [Object? body]) async {
    try {
      final res = await _dio.post(path, data: body);
      return res.data is Map ? res.data['data'] : null;
    } on DioException catch (e) {
      throw _toApiError(e);
    }
  }

  Future<dynamic> patchData(String path, [Object? body]) async {
    try {
      final res = await _dio.patch(path, data: body);
      return res.data is Map ? res.data['data'] : null;
    } on DioException catch (e) {
      throw _toApiError(e);
    }
  }

  Exception _toApiError(DioException e) {
    final res = e.response;
    final data = res?.data;

    // Our own envelope: { error: { code, message } }.
    if (data is Map && data['error'] is Map) {
      return Exception(data['error']['message']?.toString() ?? 'Request failed');
    }

    // No response at all — genuinely offline / timed out.
    final status = res?.statusCode;
    if (status == null) {
      return Exception('Network unavailable. Showing cached data if available.');
    }

    // API Gateway rejects before reaching a handler and answers {"message":"Unauthorized"},
    // which is not our envelope. Reporting that as a network error hid every auth failure.
    if (status == 401 || status == 403) {
      return Exception('Not authorized ($status). Try signing out and back in.');
    }
    final message = data is Map ? data['message']?.toString() : null;
    return Exception(
      message == null ? 'Request failed ($status).' : '$message ($status).',
    );
  }
}
