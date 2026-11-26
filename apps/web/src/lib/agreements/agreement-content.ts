import crypto from 'crypto';
import { TALK2DAN_AGREEMENT_TEXT } from './templates/talk2dan';

export class AgreementTemplateNotFoundError extends Error {}

/**
 * Templates live as plain TS string constants, not files read at runtime.
 * A dynamically-built fs path (content/agreements/<key>.md) isn't visible
 * to Vercel's build-time file tracer, so it silently goes missing from the
 * deployed serverless function -- a plain import is bundled like any other
 * code and can't have that failure mode. Editing wording still means no
 * logic changes, just editing the string in templates/<key>.ts.
 */
const TEMPLATES: Record<string, string> = {
  talk2dan: TALK2DAN_AGREEMENT_TEXT,
};

/**
 * Returns the exact template text (trimmed) plus a SHA-256 hash of that
 * same text. Nothing downstream ever re-reads this for an existing
 * agreement -- the returned text is snapshotted onto the agreement row, so
 * editing the template constant later never changes an agreement that
 * already exists.
 */
export async function loadAgreementTemplate(
  templateKey: string,
): Promise<{ text: string; documentHash: string }> {
  const raw = TEMPLATES[templateKey];
  if (!raw) {
    throw new AgreementTemplateNotFoundError(`No template found for: ${templateKey}`);
  }

  const text = raw.trim();
  const documentHash = hashAgreementText(text);
  return { text, documentHash };
}

export function hashAgreementText(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Splits the snapshot into paragraphs for display -- purely presentational, never re-hashed. */
export function paragraphsFromSnapshot(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
