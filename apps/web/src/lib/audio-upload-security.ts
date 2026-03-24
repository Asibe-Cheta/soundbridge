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

export const MAX_AUDIO_FILE_SIZE_BYTES = 50 * 1024 * 1024;

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

export function validateAudioUploadInput(file: File): { valid: true } | { valid: false; message: string } {
  const extension = getFileExtension(file.name);
  const mime = (file.type || '').toLowerCase();

  if (file.size <= 0) {
    return { valid: false, message: 'File is empty.' };
  }

  if (file.size > MAX_AUDIO_FILE_SIZE_BYTES) {
    return { valid: false, message: 'Audio file too large. Maximum allowed size is 50MB.' };
  }

  if (!ALLOWED_AUDIO_EXTENSIONS.has(extension)) {
    return { valid: false, message: 'Invalid audio file extension. Allowed: .mp3, .wav, .m4a, .flac, .ogg' };
  }

  if (mime && !ALLOWED_AUDIO_MIME_TYPES.has(mime)) {
    return { valid: false, message: `Invalid audio MIME type: ${mime}` };
  }

  return { valid: true };
}
