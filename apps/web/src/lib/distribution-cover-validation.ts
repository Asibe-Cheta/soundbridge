import { DISTRIBUTION_COVER_ART_MIN_PX } from '@/src/lib/distribution-config';

export type CoverArtValidationResult =
  | { ok: true; width: number; height: number }
  | { ok: false; error: string };

/** Parse PNG/JPEG dimensions from buffer (no native deps). */
function dimensionsFromBuffer(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) return null;

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2) break;
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + length;
    }
  }

  return null;
}

export async function validateDistributionCoverArtUrl(
  coverUrl: string | null | undefined,
): Promise<CoverArtValidationResult> {
  const url = coverUrl?.trim();
  if (!url) {
    return {
      ok: false,
      error: 'Distribution cover art is required (minimum 1400×1400 pixels, square).',
    };
  }

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  } catch {
    return { ok: false, error: 'Could not download cover art for validation.' };
  }

  if (!response.ok) {
    return { ok: false, error: 'Cover art URL is not accessible.' };
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (
    contentType &&
    !contentType.includes('image/jpeg') &&
    !contentType.includes('image/jpg') &&
    !contentType.includes('image/png')
  ) {
    return { ok: false, error: 'Cover art must be JPEG or PNG.' };
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 15 * 1024 * 1024) {
    return { ok: false, error: 'Cover art file is too large.' };
  }

  const dims = dimensionsFromBuffer(buffer);
  if (!dims || dims.width < 1 || dims.height < 1) {
    return { ok: false, error: 'Could not read cover art dimensions.' };
  }

  if (dims.width !== dims.height) {
    return {
      ok: false,
      error: `Cover art must be square. Your image is ${dims.width}×${dims.height}.`,
    };
  }

  if (dims.width < DISTRIBUTION_COVER_ART_MIN_PX || dims.height < DISTRIBUTION_COVER_ART_MIN_PX) {
    return {
      ok: false,
      error: `Cover art must be at least ${DISTRIBUTION_COVER_ART_MIN_PX}×${DISTRIBUTION_COVER_ART_MIN_PX} pixels (Apple Music minimum). Your image is ${dims.width}×${dims.height}.`,
    };
  }

  return { ok: true, width: dims.width, height: dims.height };
}
