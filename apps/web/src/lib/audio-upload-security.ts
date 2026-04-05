const ALLOWED_AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'flac', 'ogg']);
const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mp4',
  'audio/flac',
  'audio/ogg',
]);

export const MAX_AUDIO_FILE_SIZE_BYTES = 200 * 1024 * 1024;
export const DEFAULT_AUDIO_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

export function sanitizeFilenameBase(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, '');
  const normalized = withoutExtension
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return normalized || 'audio-file';
}

export function createSafeObjectKey(userId: string, originalFileName: string): string {
  const extension = getFileExtension(originalFileName);
  const safeBase = sanitizeFilenameBase(originalFileName);
  const timestamp = Date.now();
  const unique = Math.random().toString(36).slice(2, 10);
  return `audio/${userId}/${timestamp}-${safeBase}-${unique}.${extension || 'mp3'}`;
}

/** JSON body for presigned direct-to-R2 upload (avoids Vercel request body limits). */
export function validateAudioPresignPayload(body: {
  fileName?: unknown;
  fileSize?: unknown;
  contentType?: unknown;
  uploadContentType?: unknown;
  /** Mobile may send mixtape flag without uploadContentType string. */
  is_mixtape?: unknown;
  isMixtape?: unknown;
}): { valid: true; fileName: string; fileSize: number; contentType: string } | { valid: false; message: string } {
  const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
  const fileSize = typeof body.fileSize === 'number' && Number.isFinite(body.fileSize) ? body.fileSize : NaN;
  const contentType =
    typeof body.contentType === 'string' && body.contentType.trim()
      ? body.contentType.trim()
      : 'application/octet-stream';

  if (!fileName) {
    return { valid: false, message: 'fileName is required.' };
  }
  if (fileSize <= 0 || !Number.isInteger(fileSize)) {
    return { valid: false, message: 'fileSize must be a positive integer.' };
  }
  const uploadContentType =
    typeof body.uploadContentType === 'string' ? body.uploadContentType.trim().toLowerCase() : '';
  const isMixtape =
    uploadContentType === 'mixtape' ||
    body.is_mixtape === true ||
    body.isMixtape === true;
  const maxSize = isMixtape ? MAX_AUDIO_FILE_SIZE_BYTES : DEFAULT_AUDIO_FILE_SIZE_BYTES;
  if (fileSize > maxSize) {
    return {
      valid: false,
      message: isMixtape
        ? 'Audio file too large. Maximum allowed size is 200MB for mixtapes.'
        : 'Audio file too large. Maximum allowed size is 100MB.',
    };
  }

  const extension = getFileExtension(fileName);
  const mime = contentType.toLowerCase();

  if (!ALLOWED_AUDIO_EXTENSIONS.has(extension)) {
    return { valid: false, message: 'Invalid audio file extension. Allowed: .mp3, .wav, .m4a, .flac, .ogg' };
  }

  if (mime !== 'application/octet-stream' && !ALLOWED_AUDIO_MIME_TYPES.has(mime)) {
    return { valid: false, message: `Invalid audio MIME type: ${mime}` };
  }

  return { valid: true, fileName, fileSize, contentType };
}

export function validateAudioUploadInput(
  file: File,
  uploadContentType?: 'music' | 'podcast' | 'mixtape',
): { valid: true } | { valid: false; message: string } {
  const extension = getFileExtension(file.name);
  const mime = (file.type || '').toLowerCase();

  if (file.size <= 0) {
    return { valid: false, message: 'File is empty.' };
  }

  const maxSize = uploadContentType === 'mixtape' ? MAX_AUDIO_FILE_SIZE_BYTES : DEFAULT_AUDIO_FILE_SIZE_BYTES;
  if (file.size > maxSize) {
    return {
      valid: false,
      message:
        uploadContentType === 'mixtape'
          ? 'Audio file too large. Maximum allowed size is 200MB for mixtapes.'
          : 'Audio file too large. Maximum allowed size is 100MB.',
    };
  }

  if (!ALLOWED_AUDIO_EXTENSIONS.has(extension)) {
    return { valid: false, message: 'Invalid audio file extension. Allowed: .mp3, .wav, .m4a, .flac, .ogg' };
  }

  if (mime && !ALLOWED_AUDIO_MIME_TYPES.has(mime)) {
    return { valid: false, message: `Invalid audio MIME type: ${mime}` };
  }

  return { valid: true };
}
