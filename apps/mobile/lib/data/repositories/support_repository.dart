import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../../core/config.dart';
import '../../domain/help.dart';
import '../../domain/me.dart';
import '../api_client.dart';
import '../local_cache.dart';

/// Interaction modules: self profile (registration), help (contacts + requests), feedback.
class SupportRepository {
  SupportRepository(this._api, this._cache);
  final ApiClient _api;
  final LocalCache _cache;

  String get _eventId => AppConfig.eventId;

  // --- Me (registration status) ---
  static const _meKey = 'me:profile';

  AttendeeMe? cachedMe() {
    final m = _cache.getMap(_meKey);
    return m == null ? null : AttendeeMe.fromJson(m);
  }

  Future<AttendeeMe> fetchMe() async {
    final data = await _api.getData('/me');
    final me = AttendeeMe.fromJson((data as Map).cast<String, dynamic>());
    _cache.putJson(_meKey, me.toJson());
    return me;
  }

  final Dio _raw = Dio();

  Future<AttendeeMe> updateProfile(Map<String, dynamic> patch) async {
    final data = await _api.patchData('/me/profile', patch);
    final me = AttendeeMe.fromJson((data as Map).cast<String, dynamic>());
    _cache.putJson(_meKey, me.toJson());
    return me;
  }

  /// Blocking (App Store guideline 1.2). The server hides the other attendee's photos,
  /// directory row and messages in both directions. Both calls are idempotent.
  Future<void> block(String attendeeId) => _api.postData('/me/blocks/$attendeeId');
  Future<void> unblock(String attendeeId) => _api.deleteData('/me/blocks/$attendeeId');

  /// Requests a pre-signed URL and uploads the profile photo straight to S3.
  Future<void> uploadProfilePhoto({
    required Uint8List bytes,
    required String contentType,
  }) async {
    final data = await _api.postData('/me/profile-photo/upload-url', {'contentType': contentType});
    final uploadUrl = (data as Map)['uploadUrl'] as String;
    await _raw.put(
      uploadUrl,
      data: Stream.fromIterable([bytes]),
      options: Options(headers: {
        'Content-Type': contentType,
        Headers.contentLengthHeader: bytes.length,
      }),
    );
  }

  // --- Help (cached for offline per spec §8.2) ---
  static const _helpKey = 'help:content';

  HelpContent? cachedHelp() {
    final m = _cache.getMap(_helpKey);
    return m == null ? null : HelpContent.fromJson(m);
  }

  Future<HelpContent> fetchHelp() async {
    final data = await _api.getData('/events/$_eventId/help');
    final help = HelpContent.fromJson((data as Map).cast<String, dynamic>());
    _cache.putJson(_helpKey, help.toJson());
    return help;
  }

  Future<List<HelpRequest>> myHelpRequests() async {
    final data = await _api.getData('/me/help-requests');
    return (data as List)
        .map((e) => HelpRequest.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<void> submitHelpRequest({
    required String category,
    required String message,
    String urgency = 'normal',
    String? contactPreference,
  }) =>
      _api.postData('/events/$_eventId/help-requests', {
        'category': category,
        'message': message,
        'urgency': urgency,
        if (contactPreference != null && contactPreference.isNotEmpty)
          'contactPreference': contactPreference,
      });

  // --- Feedback ---
  Future<Set<String>> myFeedbackTargetIds() async {
    final data = await _api.getData('/me/feedback-submissions');
    return (data as List)
        .map((e) => (e as Map)['targetId'].toString())
        .toSet();
  }

  Future<void> submitFeedback({
    required String type,
    required String targetId,
    required num rating,
    String? comments,
    bool? wouldRecommend,
    bool? issueFlag,
    bool anonymous = false,
  }) =>
      _api.postData('/events/$_eventId/feedback', {
        'type': type,
        'targetId': targetId,
        'rating': rating,
        if (comments != null && comments.isNotEmpty) 'comments': comments,
        if (wouldRecommend != null) 'wouldRecommend': wouldRecommend,
        if (issueFlag != null) 'issueFlag': issueFlag,
        'anonymous': anonymous,
      });
}
