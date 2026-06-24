'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';
import { RefreshCw, Search, UserPlus, Users, LogIn } from 'lucide-react';

type Summary = {
  total_community_memberships: number;
  total_entry_attributions: number;
  creators_with_members: number;
  creators_with_entry_attributions: number;
  unique_creators: number;
};

type CreatorRow = {
  creator_id: string;
  username: string | null;
  display_name: string | null;
  label: string;
  member_count: number;
  entry_count: number;
  last_member_joined_at: string | null;
  last_entry_at: string | null;
};

type MemberRow = {
  id: string;
  creator_id: string;
  user_id: string;
  join_source: string;
  joined_at: string;
  creator_username: string | null;
  creator_display_name: string | null;
  member_username: string | null;
  member_display_name: string | null;
};

type EntryRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  signed_up_at: string;
  creator_id: string;
  creator_username: string | null;
  creator_display_name: string | null;
  is_community_member: boolean;
};

type Tab = 'creators' | 'members' | 'entry';

const formatDate = (v: string | null) => (v ? new Date(v).toLocaleString() : '—');

const labelFor = (displayName: string | null, username: string | null, fallback: string) =>
  displayName || username || fallback;

export default function AdminCommunityInvitesPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const cardClass = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textClass = dark ? 'text-white' : 'text-gray-900';
  const mutedClass = dark ? 'text-gray-400' : 'text-gray-500';
  const inputClass = `text-sm rounded border px-2 py-2 w-full sm:w-64 ${
    dark ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
  }`;

  const [tab, setTab] = useState<Tab>('creators');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [creators, setCreators] = useState<CreatorRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [creatorFilter, setCreatorFilter] = useState<string | null>(null);
  const limit = 25;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('view', tab);
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (creatorFilter && tab !== 'creators') params.set('creator_id', creatorFilter);

      const res = await fetchWithSupabaseAuth(`/api/admin/community-invites?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load community data');
      }

      const data = await res.json();
      setTotal(data.total ?? 0);

      if (tab === 'creators') {
        setSummary(data.summary ?? null);
        setCreators(data.creators ?? []);
      } else if (tab === 'members') {
        setMembers(data.rows ?? []);
      } else {
        setEntries(data.rows ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tab, page, search, creatorFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const switchTab = (next: Tab) => {
    setTab(next);
    setPage(0);
    if (next === 'creators') setCreatorFilter(null);
  };

  const filterByCreator = (creatorId: string, nextTab: 'members' | 'entry') => {
    setCreatorFilter(creatorId);
    setTab(nextTab);
    setPage(0);
  };

  const clearCreatorFilter = () => {
    setCreatorFilter(null);
    setPage(0);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className={`text-2xl font-semibold ${textClass}`}>Community Invites</h1>
          <p className={`text-sm mt-1 ${mutedClass}`}>
            Creators who brought people in — community memberships and signup entry attribution
          </p>
        </div>
        <button
          type="button"
          className={`inline-flex items-center gap-2 px-3 py-2 rounded text-sm ${
            dark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
          }`}
          onClick={load}
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {summary && tab === 'creators' && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Community members', value: summary.total_community_memberships, icon: Users },
            { label: 'Entry attributions', value: summary.total_entry_attributions, icon: LogIn },
            { label: 'Creators w/ members', value: summary.creators_with_members, icon: UserPlus },
            {
              label: 'Creators w/ entries',
              value: summary.creators_with_entry_attributions,
              icon: UserPlus,
            },
            { label: 'Unique creators', value: summary.unique_creators, icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className={`rounded-lg border p-4 ${cardClass}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${mutedClass}`} />
                <span className={`text-xs ${mutedClass}`}>{label}</span>
              </div>
              <p className={`text-2xl font-semibold ${textClass}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className={`rounded-lg border mb-4 ${cardClass}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-inherit">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'creators' as const, label: 'By creator' },
                { id: 'members' as const, label: 'All memberships' },
                { id: 'entry' as const, label: 'Entry attributions' },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => switchTab(id)}
                className={`px-3 py-1.5 rounded text-sm font-medium ${
                  tab === id
                    ? dark
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-600 text-white'
                    : dark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput.trim());
              setPage(0);
            }}
          >
            <div className="relative">
              <Search className={`absolute left-2 top-2.5 h-4 w-4 ${mutedClass}`} />
              <input
                className={`${inputClass} pl-8`}
                placeholder="Search creator or member…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className={`px-3 py-2 rounded text-sm ${
                dark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
              }`}
            >
              Search
            </button>
          </form>
        </div>

        {creatorFilter && tab !== 'creators' && (
          <div className={`px-4 py-2 text-sm border-b border-inherit ${mutedClass} flex items-center gap-2`}>
            Filtered to creator
            <button
              type="button"
              onClick={clearCreatorFilter}
              className="text-blue-400 hover:underline"
            >
              Clear filter
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          {loading ? (
            <p className={`p-6 text-sm ${mutedClass}`}>Loading…</p>
          ) : tab === 'creators' ? (
            <table className="w-full text-sm">
              <thead className={dark ? 'bg-gray-900/50' : 'bg-gray-50'}>
                <tr>
                  <th className={`text-left p-3 font-medium ${mutedClass}`}>Creator</th>
                  <th className={`text-right p-3 font-medium ${mutedClass}`}>Members</th>
                  <th className={`text-right p-3 font-medium ${mutedClass}`}>Entry signups</th>
                  <th className={`text-left p-3 font-medium ${mutedClass}`}>Last member</th>
                  <th className={`text-left p-3 font-medium ${mutedClass}`}>Last entry</th>
                  <th className={`text-left p-3 font-medium ${mutedClass}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {creators.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`p-6 text-center ${mutedClass}`}>
                      No community activity yet
                    </td>
                  </tr>
                ) : (
                  creators.map((c) => (
                    <tr
                      key={c.creator_id}
                      className={dark ? 'border-t border-gray-700' : 'border-t border-gray-100'}
                    >
                      <td className={`p-3 ${textClass}`}>
                        <div className="font-medium">{c.label}</div>
                        {c.username && (
                          <Link
                            href={`/${c.username}`}
                            className={`text-xs ${mutedClass} hover:underline`}
                            target="_blank"
                          >
                            @{c.username}
                          </Link>
                        )}
                      </td>
                      <td className={`p-3 text-right font-medium ${textClass}`}>{c.member_count}</td>
                      <td className={`p-3 text-right font-medium ${textClass}`}>{c.entry_count}</td>
                      <td className={`p-3 ${mutedClass}`}>{formatDate(c.last_member_joined_at)}</td>
                      <td className={`p-3 ${mutedClass}`}>{formatDate(c.last_entry_at)}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="text-xs text-blue-400 hover:underline"
                            onClick={() => filterByCreator(c.creator_id, 'members')}
                          >
                            Members
                          </button>
                          <button
                            type="button"
                            className="text-xs text-blue-400 hover:underline"
                            onClick={() => filterByCreator(c.creator_id, 'entry')}
                          >
                            Entries
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : tab === 'members' ? (
            <table className="w-full text-sm">
              <thead className={dark ? 'bg-gray-900/50' : 'bg-gray-50'}>
                <tr>
                  <th className={`text-left p-3 font-medium ${mutedClass}`}>Member</th>
                  <th className={`text-left p-3 font-medium ${mutedClass}`}>Creator</th>
                  <th className={`text-left p-3 font-medium ${mutedClass}`}>Source</th>
                  <th className={`text-left p-3 font-medium ${mutedClass}`}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={`p-6 text-center ${mutedClass}`}>
                      No memberships found
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr
                      key={m.id}
                      className={dark ? 'border-t border-gray-700' : 'border-t border-gray-100'}
                    >
                      <td className={`p-3 ${textClass}`}>
                        {labelFor(m.member_display_name, m.member_username, m.user_id.slice(0, 8))}
                        {m.member_username && (
                          <div className={`text-xs ${mutedClass}`}>@{m.member_username}</div>
                        )}
                      </td>
                      <td className={`p-3 ${textClass}`}>
                        {labelFor(m.creator_display_name, m.creator_username, '—')}
                        {m.creator_username && (
                          <div className={`text-xs ${mutedClass}`}>@{m.creator_username}</div>
                        )}
                      </td>
                      <td className={`p-3 ${mutedClass}`}>{m.join_source}</td>
                      <td className={`p-3 ${mutedClass}`}>{formatDate(m.joined_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className={dark ? 'bg-gray-900/50' : 'bg-gray-50'}>
                <tr>
                  <th className={`text-left p-3 font-medium ${mutedClass}`}>User</th>
                  <th className={`text-left p-3 font-medium ${mutedClass}`}>Entry creator</th>
                  <th className={`text-left p-3 font-medium ${mutedClass}`}>Signed up</th>
                  <th className={`text-left p-3 font-medium ${mutedClass}`}>Also member?</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={`p-6 text-center ${mutedClass}`}>
                      No entry attributions found
                    </td>
                  </tr>
                ) : (
                  entries.map((e) => (
                    <tr
                      key={e.user_id}
                      className={dark ? 'border-t border-gray-700' : 'border-t border-gray-100'}
                    >
                      <td className={`p-3 ${textClass}`}>
                        {labelFor(e.display_name, e.username, e.user_id.slice(0, 8))}
                        {e.username && <div className={`text-xs ${mutedClass}`}>@{e.username}</div>}
                      </td>
                      <td className={`p-3 ${textClass}`}>
                        {labelFor(e.creator_display_name, e.creator_username, '—')}
                        {e.creator_username && (
                          <div className={`text-xs ${mutedClass}`}>@{e.creator_username}</div>
                        )}
                      </td>
                      <td className={`p-3 ${mutedClass}`}>{formatDate(e.signed_up_at)}</td>
                      <td className={`p-3 ${mutedClass}`}>
                        {e.is_community_member ? 'Yes' : 'No'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-inherit">
            <span className={`text-sm ${mutedClass}`}>
              Page {page + 1} of {totalPages} ({total} total)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className={`px-3 py-1 rounded text-sm disabled:opacity-40 ${
                  dark ? 'bg-gray-700 text-white' : 'bg-gray-200'
                }`}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className={`px-3 py-1 rounded text-sm disabled:opacity-40 ${
                  dark ? 'bg-gray-700 text-white' : 'bg-gray-200'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
