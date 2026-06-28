/**
 * S3 storage adapter.
 *
 * Implements the same interface as the local storage adapter:
 *   uploadImage(file), deleteImage(urlOrKey), getImageUrl(urlOrKey)
 *
 * Selected by services/storage.service.js when config.storage.driver === 's3'.
 *
 * Bucket layout:
 *   s3://${S3_BUCKET}/uploads/<timestamp>-<random>.<ext>
 *
 * If the bucket is public-read, we return the virtual-hosted URL.
 * Otherwise, getImageUrl() returns a 1-hour signed GET URL.
 */
const crypto = require('crypto');
const path = require('path');
const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand } =
  require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const { getS3, region } = require('./client');
const { withRetry, AwsError } = require('./retry');
const logger = require('../utils/logger');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};
const KEY_PREFIX = 'uploads/';

function bucket() {
  const name = process.env.S3_BUCKET;
  if (!name) throw new AwsError('S3_BUCKET env var is not set.', { status: 500 });
  return name;
}

function isPublicBucket() {
  return String(process.env.S3_PUBLIC_READ || 'true').toLowerCase() !== 'false';
}

function publicUrl(key) {
  return `https://${bucket()}.s3.${region()}.amazonaws.com/${encodeURI(key)}`;
}

/** Build a unique object key for an uploaded file. */
function buildKey(file) {
  const ext = EXT_BY_MIME[file.mimetype] || path.extname(file.originalname || '') || '.bin';
  return `${KEY_PREFIX}${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
}

/** Extract the S3 key from a URL we previously returned. */
function keyFromUrl(url) {
  if (!url) return null;
  if (url.startsWith(KEY_PREFIX)) return url;
  // virtual-hosted: https://bucket.s3.region.amazonaws.com/uploads/foo.jpg
  // path-style:    https://s3.region.amazonaws.com/bucket/uploads/foo.jpg
  try {
    const u = new URL(url);
    const path = decodeURIComponent(u.pathname.replace(/^\//, ''));
    if (u.hostname.startsWith(bucket() + '.')) return path;
    if (path.startsWith(bucket() + '/')) return path.slice(bucket().length + 1);
  } catch (_) { /* not a URL */ }
  return null;
}

async function uploadImage(file) {
  if (!file || !file.buffer || !file.buffer.length) return null;
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new AwsError('Unsupported image type.', { status: 400 });
  }
  const Key = buildKey(file);

  await withRetry(
    () =>
      getS3().send(
        new PutObjectCommand({
          Bucket: bucket(),
          Key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentLength: file.size,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      ),
    { label: 's3.put' }
  );

  logger.debug(`s3: uploaded ${Key} (${file.size} bytes)`);
  return isPublicBucket() ? publicUrl(Key) : Key;
}

async function deleteImage(urlOrKey) {
  const Key = keyFromUrl(urlOrKey);
  if (!Key) return false;
  try {
    await withRetry(
      () => getS3().send(new DeleteObjectCommand({ Bucket: bucket(), Key })),
      { label: 's3.delete', attempts: 2 }
    );
    return true;
  } catch (err) {
    logger.warn(`s3: delete failed for ${Key}: ${err.message}`);
    return false;
  }
}

async function getImageUrl(urlOrKey) {
  if (!urlOrKey) return null;
  if (isPublicBucket()) {
    const Key = keyFromUrl(urlOrKey);
    return Key ? publicUrl(Key) : urlOrKey;
  }
  // Private bucket — return a short-lived signed URL.
  const Key = keyFromUrl(urlOrKey);
  if (!Key) return urlOrKey;
  return getSignedUrl(getS3(), new GetObjectCommand({ Bucket: bucket(), Key }), { expiresIn: 3600 });
}

/** Used by /ready to confirm bucket reachability. */
async function ping() {
  await withRetry(() => getS3().send(new HeadBucketCommand({ Bucket: bucket() })), {
    label: 's3.head',
    attempts: 2,
  });
  return true;
}

module.exports = { driver: 's3', uploadImage, deleteImage, getImageUrl, ping };
