import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({});

export const GALLERY_BUCKET = process.env.GALLERY_BUCKET ?? '';
export const PROFILE_BUCKET = process.env.PROFILE_BUCKET ?? '';

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
