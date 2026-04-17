export interface PostMention {
  userId: string;
  username: string;
  display_name: string | null;
}

/** Active @mention at end of text before cursor: /@(\w*)$/ */
export function parseActiveMention(textBeforeCursor: string): {
  query: string;
  startIndex: number;
  endIndex: number;
} | null {
  const match = textBeforeCursor.match(/@(\w*)$/);
  if (!match || match.index === undefined) return null;
  const startIndex = match.index;
  const endIndex = startIndex + match[0].length;
  return { query: match[1] ?? '', startIndex, endIndex };
}

export function syncMentionsWithContent(content: string, mentions: PostMention[]): PostMention[] {
  const kept: PostMention[] = [];
  const seen = new Set<string>();
  for (const m of mentions) {
    if (!m.userId || !m.username || seen.has(m.userId)) continue;
    const safe = m.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`@${safe}(?![A-Za-z0-9_])`);
    if (re.test(content)) {
      kept.push(m);
      seen.add(m.userId);
    }
  }
  return kept;
}
