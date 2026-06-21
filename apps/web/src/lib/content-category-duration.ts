export const PODCAST_MIN_DURATION_SECONDS = 480; // 8 minutes
export const AUDIOBOOK_MIN_DURATION_SECONDS = 900; // 15 minutes

export const PODCAST_SHORT_CONFIRMATION_MESSAGE =
  'This is shorter than most podcasts on SoundBridge, which are typically 8 minutes or more. Are you sure this is a podcast?';

export const AUDIOBOOK_DURATION_ERROR =
  'This does not meet the typical length for an audiobook. Audiobooks on SoundBridge are usually at least 15 minutes long. If this is a music track, please select Music as the category instead, or upload a longer recording.';

export const AUDIO_DURATION_PENDING_ERROR =
  'Please wait for the audio file to finish processing before uploading.';

export type UploadContentCategory = 'music' | 'podcast' | 'mixtape' | 'audio_book';

export function isShortPodcastDuration(durationSeconds: number): boolean {
  return Number.isFinite(durationSeconds) && durationSeconds > 0 && durationSeconds < PODCAST_MIN_DURATION_SECONDS;
}

/** Hard validation — audiobook minimum only. Podcast uses client confirmation instead. */
export function validateContentCategoryDuration(
  contentType: UploadContentCategory | string | undefined,
  durationSeconds: number,
): { valid: true } | { valid: false; message: string } {
  const normalized =
    contentType === 'podcast' || contentType === 'audio_book' || contentType === 'mixtape'
      ? contentType
      : 'music';

  if (normalized === 'mixtape' || normalized === 'music' || normalized === 'podcast') {
    return { valid: true };
  }

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return { valid: false, message: AUDIO_DURATION_PENDING_ERROR };
  }

  if (normalized === 'audio_book' && durationSeconds < AUDIOBOOK_MIN_DURATION_SECONDS) {
    return { valid: false, message: AUDIOBOOK_DURATION_ERROR };
  }

  return { valid: true };
}
