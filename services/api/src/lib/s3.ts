import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({});

export const GALLERY_BUCKET = process.env.GALLERY_BUCKET ?? '';

const UPLOAD_TTL = 300; // 5 min
const DOWNLOAD_TTL = 3600; // 1 hour

/** Allowed image content types for gallery uploads (spec restricts to images). */
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/webp']);
export const isImageType = (ct: string): boolean => IMAGE_TYPES.has(ct.toLowerCase());

export const extensionFor = (ct: string): string =>
  ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/webp': 'webp' }[
    ct.toLowerCase()
  ] ?? 'bin');

/** Pre-signed PUT so the app uploads directly to S3 (large files never pass through Lambda). */
export function presignUpload(key: string, contentType: string): Promise<string> {
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: GALLERY_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: UPLOAD_TTL }
  );
}

/** Pre-signed GET for private viewing of an approved photo / thumbnail. */
export function presignDownload(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: GALLERY_BUCKET, Key: key }), {
    expiresIn: DOWNLOAD_TTL,
  });
}
