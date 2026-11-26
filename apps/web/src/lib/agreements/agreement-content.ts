import { readFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export class AgreementTemplateNotFoundError extends Error {}

/**
 * Reads content/agreements/<templateKey>.md at creation time and returns
 * its exact text (trimmed) plus a SHA-256 hash of that same text. Nothing
 * downstream ever re-reads the file for an existing agreement -- the
 * returned text is snapshotted onto the agreement row, so editing the .md
 * file later never changes an agreement that already exists.
 */
export async function loadAgreementTemplate(
  templateKey: string,
): Promise<{ text: string; documentHash: string }> {
  if (!/^[a-z0-9-]+$/.test(templateKey)) {
    throw new AgreementTemplateNotFoundError(`Invalid template key: ${templateKey}`);
  }

  const filePath = path.join(process.cwd(), 'content', 'agreements', `${templateKey}.md`);
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch {
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
