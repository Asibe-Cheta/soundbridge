'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, User } from 'lucide-react';
import { createClient } from '@/src/lib/supabase-browser';
import { getTextareaCaretClientRect } from '@/src/lib/textarea-caret-rect';
import {
  type PostMention,
  parseActiveMention,
  syncMentionsWithContent,
} from '@/src/lib/post-mentions';

type ProfileHit = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type PostComposerMentionFieldProps = {
  value: string;
  onChange: (next: string) => void;
  mentions: PostMention[];
  onMentionsChange: (next: PostMention[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Classes applied to the visible textarea (overlay uses matching padding / radius) */
  textareaClassName: string;
  maxLength: number;
  currentUserId?: string | null;
  /** Scroll container for dismiss-on-scroll (post form) */
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
};

function renderHighlightedOverlay(content: string, mentionUsernames: Set<string>): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /@(\w+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) {
      parts.push(<span key={`t${key++}`}>{content.slice(last, m.index)}</span>);
    }
    const whole = m[0];
    const u = m[1];
    if (u && mentionUsernames.has(u)) {
      parts.push(
        <span key={`m${key++}`} className="font-bold text-red-400">
          {whole}
        </span>
      );
    } else {
      parts.push(<span key={`u${key++}`}>{whole}</span>);
    }
    last = m.index + whole.length;
  }
  if (last < content.length) {
    parts.push(<span key={`t${key++}`}>{content.slice(last)}</span>);
  }
  return parts.length ? <>{parts}</> : <span>{content}</span>;
}

export function PostComposerMentionField({
  value,
  onChange,
  mentions,
  onMentionsChange,
  disabled,
  placeholder,
  className,
  textareaClassName,
  maxLength,
  currentUserId,
  scrollContainerRef,
}: PostComposerMentionFieldProps) {
  const supabase = useMemo(() => createClient(), []);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [selStart, setSelStart] = useState(0);
  const [results, setResults] = useState<ProfileHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  const mentionUsernames = useMemo(() => new Set(mentions.map((x) => x.username).filter(Boolean)), [mentions]);

  const textBeforeCursor = value.slice(0, selStart);
  const active = parseActiveMention(textBeforeCursor);
  const showDropdown =
    !!active &&
    active.query.length >= 1 &&
    (loading || results.length > 0);

  const repositionDropdown = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta || !active || active.query.length < 1) {
      setDropdownPos(null);
      return;
    }
    const caret = getTextareaCaretClientRect(ta, active.endIndex);
    const pad = 4;
    setDropdownPos({
      top: caret.top + caret.height + pad,
      left: caret.left,
    });
  }, [active]);

  useLayoutEffect(() => {
    if (!showDropdown) {
      setDropdownPos(null);
      return;
    }
    repositionDropdown();
  }, [showDropdown, value, selStart, repositionDropdown, results.length, loading]);

  useEffect(() => {
    if (!showDropdown) return;
    const onResize = () => repositionDropdown();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [showDropdown, repositionDropdown]);

  useEffect(() => {
    if (!active || active.query.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }

    const q = active.query;
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const pattern = `%${q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
        const selectProfiles = () => {
          let qb = supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .not('username', 'is', null)
            .limit(8);
          if (currentUserId) qb = qb.neq('id', currentUserId);
          return qb;
        };
        const [byUsername, byDisplay] = await Promise.all([
          selectProfiles().ilike('username', pattern),
          selectProfiles().ilike('display_name', pattern),
        ]);
        const err = byUsername.error || byDisplay.error;
        if (err) throw err;
        const map = new Map<string, ProfileHit>();
        for (const row of [...(byUsername.data || []), ...(byDisplay.data || [])]) {
          const r = row as ProfileHit;
          if (r.username) map.set(r.id, r);
        }
        const rows = Array.from(map.values()).slice(0, 8);
        setResults(rows);
        setHighlight(0);
      } catch (e: unknown) {
        console.warn('[mentions] search failed', e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(t);
    };
  }, [active?.query, active?.endIndex, supabase, currentUserId]);

  useEffect(() => {
    const onDocDown = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (shellRef.current?.contains(t)) return;
      if (dropdownRef.current?.contains(t)) return;
      setResults([]);
      setLoading(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef?.current;
    if (!el) return;
    const onScroll = () => {
      setResults([]);
      setLoading(false);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollContainerRef]);

  const applyContentAndMentions = useCallback(
    (next: string, nextMentions: PostMention[]) => {
      const capped = next.length > maxLength ? next.slice(0, maxLength) : next;
      const synced = syncMentionsWithContent(capped, nextMentions);
      onChange(capped);
      onMentionsChange(synced);
    },
    [maxLength, onChange, onMentionsChange]
  );

  const selectProfile = useCallback(
    (row: ProfileHit) => {
      if (!active || !row.username) return;
      const before = value.slice(0, active.startIndex);
      const after = value.slice(active.endIndex);
      const insertion = `@${row.username} `;
      const next = `${before}${insertion}${after}`;
      const pos = (before + insertion).length;

      const nextMention: PostMention = {
        userId: row.id,
        username: row.username,
        display_name: row.display_name,
      };
      const dedup = mentions.filter((m) => m.userId !== nextMention.userId);
      dedup.push(nextMention);

      applyContentAndMentions(next, dedup);
      setResults([]);
      setLoading(false);

      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta) {
          ta.focus();
          ta.setSelectionRange(pos, pos);
          setSelStart(pos);
        }
      });
    },
    [active, value, mentions, applyContentAndMentions]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(0, results.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const row = results[highlight];
      if (row) selectProfile(row);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setResults([]);
      setLoading(false);
    }
  };

  const dropdown =
    showDropdown && dropdownPos && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[60] min-w-[240px] max-w-[320px] rounded-lg border border-white/15 bg-gray-900 shadow-xl overflow-hidden"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
            role="listbox"
          >
            {loading && results.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>Searching…</span>
              </div>
            ) : (
              results.map((row, i) => (
                <button
                  key={row.id}
                  type="button"
                  role="option"
                  aria-selected={i === highlight}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                    i === highlight ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    selectProfile(row);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                >
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-700">
                    {row.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-gray-400 absolute inset-0 m-auto" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white">
                      {row.display_name?.trim() || row.username}
                    </div>
                    <div className="truncate text-xs text-gray-400">@{row.username}</div>
                  </div>
                </button>
              ))
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={shellRef} className={className}>
      <div className="relative w-full min-h-[120px]">
        <div
          className="pointer-events-none absolute inset-0 z-0 whitespace-pre-wrap break-words rounded-lg border border-transparent px-3 py-3 text-[15px] leading-relaxed text-white"
          aria-hidden
        >
          {renderHighlightedOverlay(value, mentionUsernames)}
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            const el = e.target;
            let v = el.value;
            if (v.length > maxLength) v = v.slice(0, maxLength);
            const synced = syncMentionsWithContent(v, mentions);
            onChange(v);
            if (synced.length !== mentions.length) onMentionsChange(synced);
            setSelStart(el.selectionStart);
          }}
          onSelect={(e) => setSelStart(e.currentTarget.selectionStart)}
          onClick={(e) => setSelStart(e.currentTarget.selectionStart)}
          onKeyUp={(e) => setSelStart(e.currentTarget.selectionStart)}
          onKeyDown={onKeyDown}
          className={`relative z-10 min-h-[120px] w-full resize-y bg-transparent px-3 py-3 text-transparent caret-white ${textareaClassName}`}
        />
      </div>
      {dropdown}
    </div>
  );
}
