import 'package:dio/dio.dart';

import '../core/config.dart';
import 'auth/cognito_service.dart';

/// Thin HTTP client over the backend API. Attaches the Cognito access token and
/// unwraps the `{ data }` / `{ error }` envelope.
class ApiClient {
  ApiClient(this._auth)
      : _dio = Dio(BaseOptions(
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

  Exception _toApiError(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['error'] is Map) {
      return Exception(data['error']['message']?.toString() ?? 'Request failed');
    }
    return Exception('Network error. Showing cached data if available.');
  }
}
