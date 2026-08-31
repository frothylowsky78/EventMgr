import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({});

export const GALLERY_BUCKET = process.env.GALLERY_BUCKET ?? '';
export const PROFILE_BUCKET = process.env.PROFILE_BUCKET ?? '';
export const ASSETS_BUCKET = process.env.ASSETS_BUCKET ?? '';

const UPLOAD_TTL = 300; // 5 min
const DOWNLOAD_TTL = 3600; // 1 hour

/** Allowed image content types for uploads (spec restricts to images). */
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/webp']);
export const isImageType = (ct: string): boolean => IMAGE_TYPES.has(ct.toLowerCase());

export const extensionFor = (ct: string): string =>
  ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/webp': 'webp' }[
    ct.toLowerCase()
  ] ?? 'bin');

/** Pre-signed PUT to a given bucket (large files never pass through Lambda). */
export function presignUploadTo(bucket: string, key: string, contentType: string): Promise<string> {
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn: UPLOAD_TTL }
  );
}

/** Pre-signed GET from a given bucket for private viewing. */
export function presignDownloadFrom(bucket: string, key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: DOWNLOAD_TTL,
  });
}

// Gallery-bucket convenience wrappers (kept for existing photo handlers).
export const presignUpload = (key: string, contentType: string) =>
  presignUploadTo(GALLERY_BUCKET, key, contentType);
export const presignDownload = (key: string) => presignDownloadFrom(GALLERY_BUCKET, key);

/**
 * Map images live in the private assets bucket, so a stored key must become a temporary signed
 * URL on read. Falls back to `current` when there's no key — admins can still paste an external
 * image URL instead of uploading one.
 */
export const presignAssetIfKey = async (
  key: string | undefined,
  current: string | undefined
): Promise<string> => (key ? presignDownloadFrom(ASSETS_BUCKET, key) : (current ?? ''));

/**
 * Profile photos live in the private profile-photos bucket, so the stored key must become a
 * temporary signed URL on read (upload records `profilePhotoKey`; nothing sets a URL).
 * Falls back to `current` when there's no key, so attendees without a photo stay at ''.
 */
export const presignProfileIfKey = async (
  key: string | undefined,
  current: string | undefined
): Promise<string> => (key ? presignDownloadFrom(PROFILE_BUCKET, key) : (current ?? ''));
