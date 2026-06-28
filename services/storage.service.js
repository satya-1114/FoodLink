/**
 * Storage service — single abstraction over file storage.
 *
 * Controllers and services use this module; they MUST NOT import multer,
 * `fs`, or any cloud SDK directly.
 *
 * Multer middleware (`singleImageUpload`) is shared across drivers — it
 * always uses memoryStorage(), so the buffer is handed to whichever
 * persistence adapter is active (local disk or S3).
 *
 * The persistence trio (`uploadImage`, `deleteImage`, `getImageUrl`)
 * delegates to the driver selected by `config.storage.driver`:
 *   - 'local'  → bundled local disk implementation under public/uploads/
 *   - 's3'     → aws/storage.adapter.js
 */
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const logger = require('../utils/logger');
const config = require('../config');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
const PUBLIC_PREFIX = '/uploads';
const MAX_BYTES = (config.constants && config.constants.MAX_UPLOAD_SIZE) || 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/* ----------------------- Multer middleware ----------------------- */

function singleImageUpload(fieldName) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BYTES, files: 1 },
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_MIME.has(file.mimetype)) {
        return cb(new Error('Unsupported image type. Use JPG, PNG, WEBP, or GIF.'));
      }
      return cb(null, true);
    },
  }).single(fieldName);

  return function (req, res, next) {
    upload(req, res, (err) => {
      if (!err) return next();
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Image is too large (max 5 MB).'
          : err.message || 'Image upload failed.';
      const friendly = new Error(message);
      friendly.status = 400;
      friendly.expose = true;
      return next(friendly);
    });
  };
}

/* ----------------------- Local implementation ----------------------- */

const localImpl = {
  driver: 'local',
  async uploadImage(file) {
    if (!file || !file.buffer || !file.buffer.length) return null;
    if (!ALLOWED_MIME.has(file.mimetype)) throw new Error('Unsupported image type.');
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const ext = EXT_BY_MIME[file.mimetype] || path.extname(file.originalname || '') || '.bin';
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    await fs.writeFile(path.join(UPLOAD_DIR, filename), file.buffer);
    logger.debug(`storage(local): saved ${filename} (${file.size} bytes)`);
    return `${PUBLIC_PREFIX}/${filename}`;
  },
  async deleteImage(url) {
    if (!url || !url.startsWith(`${PUBLIC_PREFIX}/`)) return false;
    const filename = url.slice(PUBLIC_PREFIX.length + 1);
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return false;
    try {
      await fs.unlink(path.join(UPLOAD_DIR, filename));
      return true;
    } catch (err) {
      if (err.code !== 'ENOENT') logger.warn('storage(local): delete failed', err.message);
      return false;
    }
  },
  getImageUrl(urlOrKey) { return urlOrKey || null; },
  async ping() { await fs.mkdir(UPLOAD_DIR, { recursive: true }); return true; },
};

/* ----------------------- Driver selection ----------------------- */

const driverName = (config.storage && config.storage.driver) || 'local';
const impl = driverName === 's3' ? require('../aws/storage.adapter') : localImpl;
logger.info(`storage: driver=${impl.driver}`);

module.exports = {
  singleImageUpload,
  uploadImage: (...a) => impl.uploadImage(...a),
  deleteImage: (...a) => impl.deleteImage(...a),
  getImageUrl: (...a) => impl.getImageUrl(...a),
  ping: () => impl.ping(),
  driver: impl.driver,
  _config: { UPLOAD_DIR, PUBLIC_PREFIX, MAX_BYTES, ALLOWED_MIME },
};
