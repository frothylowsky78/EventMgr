import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../../core/config.dart';
import '../../domain/photo.dart';
import '../api_client.dart';

/// Event gallery: list approved photos + the pre-signed S3 upload flow.
class PhotosRepository {
  PhotosRepository(this._api);
  final ApiClient _api;

  // A bare Dio (no auth interceptor) for the direct-to-S3 PUT; the pre-signed URL is
  // self-authorizing and must not carry an Authorization header.
  final Dio _raw = Dio();

  Future<List<Photo>> fetch() async {
    final data = await _api.getData('/events/${AppConfig.eventId}/photos');
    return (data as List)
        .map((e) => Photo.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<void> like(String photoId) =>
      _api.postData('/events/${AppConfig.eventId}/photos/$photoId/like');

  /// Flags a photo for staff review (App Store guideline 1.2). Idempotent per reporter.
  Future<void> report(String photoId, String reason, {String? note}) =>
      _api.postData('/events/${AppConfig.eventId}/photos/$photoId/report', {
        'reason': reason,
        if (note != null && note.isNotEmpty) 'note': note,
      });

  /// Full upload: request a ticket, PUT the bytes straight to S3.
  Future<PhotoUploadTicket> upload({
    required Uint8List bytes,
    required String contentType,
    String? caption,
  }) async {
    final data = await _api.postData('/events/${AppConfig.eventId}/photos/upload-url', {
      'contentType': contentType,
      if (caption != null && caption.isNotEmpty) 'caption': caption,
    });
    final ticket = PhotoUploadTicket.fromJson((data as Map).cast<String, dynamic>());

    await _raw.put(
      ticket.uploadUrl,
      data: Stream.fromIterable([bytes]),
      options: Options(
        headers: {
          'Content-Type': contentType,
          Headers.contentLengthHeader: bytes.length,
        },
      ),
    );
    return ticket;
  }
}
