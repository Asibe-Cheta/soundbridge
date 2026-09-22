'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Loader2, User } from 'lucide-react';
import { createClient } from '@/src/lib/supabase-browser';

export type CoOrganizerUser = {
  userId: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type ProfileHit = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type CoOrganizerTagFieldProps = {
  value: CoOrganizerUser[];
  onChange: (next: CoOrganizerUser[]) => void;
  currentUserId?: string | null;
  disabled?: boolean;
  placeholder?: string;
};

/**
 * Item 43 — Co-Organizer Tagging. Reuses the same search-and-select pattern as
 * PostComposerMentionField (client-side ilike against profiles, 300ms debounce,
 * escaped % / _ wildcards), adapted to a standalone tag input with chips instead
 * of embedding mentions inside free text — there's no surrounding paragraph here,
 * just a list of tagged users.
 */
export function CoOrganizerTagField({
  value,
  onChange,
  currentUserId,
  disabled,
  placeholder,
}: CoOrganizerTagFieldProps) {
  const supabase = useMemo(() => createClient(), []);
  const shellRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProfileHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const selectedIds = useMemo(() => new Set(value.map((v) => v.userId)), [value]);

  useEffect(() => {
    const q = query.trim().replace(/^@/, '');
    if (q.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }

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
          if (r.username && !selectedIds.has(r.id)) map.set(r.id, r);
        }
        setResults(Array.from(map.values()).slice(0, 8));
      } catch (e: unknown) {
        console.warn('[co-organizers] search failed', e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [query, supabase, currentUserId, selectedIds]);

  useEffect(() => {
    const onDocDown = (ev: MouseEvent) => {
      if (shellRef.current?.contains(ev.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  const addUser = useCallback(
    (row: ProfileHit) => {
      if (!row.username) return;
      onChange([
        ...value,
        { userId: row.id, username: row.username, display_name: row.display_name, avatar_url: row.avatar_url },
      ]);
      setQuery('');
      setResults([]);
      setOpen(false);
    },
    [value, onChange]
  );

  const removeUser = useCallback(
    (userId: string) => {
      onChange(value.filter((v) => v.userId !== userId));
    },
    [value, onChange]
  );

  const showDropdown = open && query.trim().length > 0 && (loading || results.length > 0);

  return (
    <div ref={shellRef} style={{ position: 'relative' }}>
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {value.map((co) => (
            <span
              key={co.userId}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(236, 72, 153, 0.15)',
                border: '1px solid rgba(236, 72, 153, 0.4)',
                borderRadius: '999px',
                padding: '0.3rem 0.6rem 0.3rem 0.4rem',
                color: 'white',
                fontSize: '0.85rem',
              }}
            >
              @{co.username}
              <button
                type="button"
                onClick={() => removeUser(co.userId)}
                disabled={disabled}
                aria-label={`Remove ${co.username}`}
                style={{
                  display: 'flex',
                  background: 'none',
                  border: 'none',
                  color: '#ccc',
                  cursor: disabled ? 'default' : 'pointer',
                  padding: 0,
                }}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        value={query}
        disabled={disabled}
        placeholder={placeholder ?? 'Type @ to search registered users…'}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        style={{
          width: '100%',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          padding: '1rem',
          color: 'white',
        }}
      />

      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            zIndex: 20,
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.4rem',
            background: '#1a1a1a',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {loading && results.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', color: '#ccc' }}>
              <Loader2 size={16} className="animate-spin" />
              <span>Searching…</span>
            </div>
          ) : (
            results.map((row) => (
              <button
                key={row.id}
                type="button"
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  addUser(row);
                }}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.6rem 1rem',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'white',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: '#444',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {row.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={16} color="#999" />
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {row.display_name?.trim() || row.username}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#999' }}>@{row.username}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
