class Photo {
  final String id;
  final String uploadedByAttendeeId;
  final String caption;
  final String status; // pending | approved | hidden | rejected
  final bool featured;
  final int likeCount;
  final String createdAt;
  final String? imageUrl; // presigned, time-limited
  final String? thumbnailUrl;

  const Photo({
    required this.id,
    required this.uploadedByAttendeeId,
    required this.caption,
    required this.status,
    required this.featured,
    required this.likeCount,
    required this.createdAt,
    this.imageUrl,
    this.thumbnailUrl,
  });

  factory Photo.fromJson(Map<String, dynamic> j) => Photo(
        id: j['id'] as String,
        uploadedByAttendeeId: j['uploadedByAttendeeId'] as String? ?? '',
        caption: j['caption'] as String? ?? '',
        status: j['status'] as String? ?? 'approved',
        featured: j['featured'] as bool? ?? false,
        likeCount: j['likeCount'] as int? ?? 0,
        createdAt: j['createdAt'] as String? ?? '',
        imageUrl: j['imageUrl'] as String?,
        thumbnailUrl: j['thumbnailUrl'] as String?,
      );
}

/// Result of requesting an upload URL (pre-signed S3 PUT).
class PhotoUploadTicket {
  final String photoId;
  final String uploadUrl;
  final String status;
  const PhotoUploadTicket({
    required this.photoId,
    required this.uploadUrl,
    required this.status,
  });

  factory PhotoUploadTicket.fromJson(Map<String, dynamic> j) => PhotoUploadTicket(
        photoId: j['photoId'] as String,
        uploadUrl: j['uploadUrl'] as String,
        status: j['status'] as String? ?? 'pending',
      );
}
