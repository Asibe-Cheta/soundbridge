import {
  normalizeOutreachContactType,
  OUTREACH_CONTACT_TYPES,
  type OutreachContactType,
} from '@/src/lib/outreach-contact-types';

export type ParsedOutreachContactRow = {
  line: number;
  contact_name: string;
  organisation_name: string | null;
  contact_type: OutreachContactType;
  notes: string | null;
};

export type OutreachCsvParseResult = {
  rows: ParsedOutreachContactRow[];
  errors: string[];
};

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function headerIndex(headers: string[], names: string[]): number {
  const normalized = headers.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  for (const name of names) {
    const idx = normalized.indexOf(name);
    if (idx >= 0) return idx;
  }
  return -1;
}

/**
 * Parse outreach contacts CSV.
 * Expected headers (flexible): contact_name, organisation_name|organization_name, contact_type, notes
 */
export function parseOutreachContactsCsv(text: string): OutreachCsvParseResult {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const errors: string[] = [];
  const rows: ParsedOutreachContactRow[] = [];

  if (lines.length === 0) {
    return { rows, errors: ['CSV is empty'] };
  }

  const headerCells = splitCsvLine(lines[0]!);
  const nameIdx = headerIndex(headerCells, ['contact_name', 'name', 'contact']);
  const orgIdx = headerIndex(headerCells, ['organisation_name', 'organization_name', 'organisation', 'organization', 'org']);
  const typeIdx = headerIndex(headerCells, ['contact_type', 'type']);
  const notesIdx = headerIndex(headerCells, ['notes', 'note']);

  const hasHeader = nameIdx >= 0 || typeIdx >= 0;
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const startLine = hasHeader ? 2 : 1;

  if (!hasHeader) {
    // Positional fallback: name, org, type, notes
    for (let i = 0; i < dataLines.length; i++) {
      const cells = splitCsvLine(dataLines[i]!);
      const contactName = cells[0]?.trim() ?? '';
      if (!contactName) {
        errors.push(`Line ${startLine + i}: missing contact name`);
        continue;
      }
      const rawType = cells[2]?.trim() ?? 'other';
      const contactType = normalizeOutreachContactType(rawType) ?? 'other';
      if (!normalizeOutreachContactType(rawType) && rawType.toLowerCase() !== 'other') {
        errors.push(
          `Line ${startLine + i}: unknown contact_type "${rawType}" — saved as other (allowed: ${OUTREACH_CONTACT_TYPES.join(', ')})`,
        );
      }
      rows.push({
        line: startLine + i,
        contact_name: contactName,
        organisation_name: cells[1]?.trim() || null,
        contact_type: contactType,
        notes: cells[3]?.trim() || null,
      });
    }
    return { rows, errors };
  }

  if (nameIdx < 0) {
    return { rows, errors: ['CSV header must include contact_name (or name)'] };
  }

  for (let i = 0; i < dataLines.length; i++) {
    const cells = splitCsvLine(dataLines[i]!);
    const contactName = (cells[nameIdx] ?? '').trim();
    if (!contactName) {
      errors.push(`Line ${startLine + i}: missing contact_name`);
      continue;
    }
    const rawType = typeIdx >= 0 ? (cells[typeIdx] ?? '').trim() : 'other';
    const contactType = normalizeOutreachContactType(rawType) ?? 'other';
    if (rawType && !normalizeOutreachContactType(rawType) && rawType.toLowerCase() !== 'other') {
      errors.push(
        `Line ${startLine + i}: unknown contact_type "${rawType}" — saved as other`,
      );
    }
    rows.push({
      line: startLine + i,
      contact_name: contactName,
      organisation_name: orgIdx >= 0 ? (cells[orgIdx]?.trim() || null) : null,
      contact_type: contactType,
      notes: notesIdx >= 0 ? (cells[notesIdx]?.trim() || null) : null,
    });
  }

  return { rows, errors };
}
