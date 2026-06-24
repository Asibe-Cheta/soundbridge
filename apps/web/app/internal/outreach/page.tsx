'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';
import { Calendar, Plus, RefreshCw, Trash2, Users } from 'lucide-react';

type Meeting = {
  id: string;
  scheduled_at: string;
  meeting_link_or_location: string | null;
  reminder_sent: boolean;
};

type Contact = {
  id: string;
  contact_name: string;
  organisation_name: string | null;
  contact_type: string;
  notes: string | null;
  meeting_held: boolean;
  on_platform: boolean;
  profile_completed: boolean;
  has_invited_others: boolean;
  updated_at: string;
  outreach_meetings?: Meeting[];
};

const CONTACT_TYPES = ['institution', 'artist', 'venue', 'church', 'other'] as const;

const FLAGS = [
  { key: 'meeting_held' as const, label: 'Meeting held' },
  { key: 'on_platform' as const, label: 'On platform' },
  { key: 'profile_completed' as const, label: 'Profile completed' },
  { key: 'has_invited_others' as const, label: 'Invited others' },
];

export default function InternalOutreachPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [scheduleFor, setScheduleFor] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newOrg, setNewOrg] = useState('');
  const [newType, setNewType] = useState<(typeof CONTACT_TYPES)[number]>('other');
  const [newNotes, setNewNotes] = useState('');
  const [meetingAt, setMeetingAt] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');

  const card = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const text = dark ? 'text-white' : 'text-gray-900';
  const muted = dark ? 'text-gray-400' : 'text-gray-500';
  const input = `w-full rounded border px-3 py-2 text-sm ${
    dark ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300'
  }`;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const statusRes = await fetchWithSupabaseAuth('/api/internal/outreach/status');
      if (statusRes.status === 403 || statusRes.status === 401) {
        setAllowed(false);
        router.replace('/feed');
        return;
      }
      if (!statusRes.ok) throw new Error('Access check failed');
      setAllowed(true);

      const res = await fetchWithSupabaseAuth('/api/internal/outreach/contacts');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load contacts');
      }
      const data = await res.json();
      setContacts(data.contacts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login?redirectTo=/internal/outreach');
      return;
    }
    load();
  }, [user, authLoading, load, router]);

  const addContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetchWithSupabaseAuth('/api/internal/outreach/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_name: newName,
        organisation_name: newOrg || null,
        contact_type: newType,
        notes: newNotes || null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || 'Failed to add contact');
      return;
    }
    setNewName('');
    setNewOrg('');
    setNewType('other');
    setNewNotes('');
    setShowAdd(false);
    load();
  };

  const toggleFlag = async (contact: Contact, key: (typeof FLAGS)[number]['key']) => {
    await fetchWithSupabaseAuth(`/api/internal/outreach/contacts/${contact.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: !contact[key] }),
    });
    load();
  };

  const deleteContact = async (id: string) => {
    if (!confirm('Delete this contact and all meetings?')) return;
    await fetchWithSupabaseAuth(`/api/internal/outreach/contacts/${id}`, { method: 'DELETE' });
    load();
  };

  const scheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleFor || !meetingAt) return;
    const res = await fetchWithSupabaseAuth('/api/internal/outreach/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_id: scheduleFor,
        scheduled_at: meetingAt,
        meeting_link_or_location: meetingLocation || null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || 'Failed to schedule meeting');
      return;
    }
    setScheduleFor(null);
    setMeetingAt('');
    setMeetingLocation('');
    load();
  };

  const deleteMeeting = async (id: string) => {
    await fetchWithSupabaseAuth(`/api/internal/outreach/meetings/${id}`, { method: 'DELETE' });
    load();
  };

  if (allowed === false || authLoading || allowed === null) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <p className={muted}>Loading…</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className={`text-2xl font-semibold flex items-center gap-2 ${text}`}>
              <Users className="h-6 w-6 text-red-500" />
              Internal Outreach
            </h1>
            <p className={`text-sm mt-1 ${muted}`}>Restricted CRM — internal team only</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded text-sm bg-red-600 text-white hover:bg-red-700"
            >
              <Plus className="h-4 w-4" /> Add contact
            </button>
            <button
              type="button"
              onClick={load}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded text-sm ${
                dark ? 'bg-gray-700 text-white' : 'bg-gray-200'
              }`}
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {showAdd && (
          <form onSubmit={addContact} className={`rounded-lg border p-4 mb-6 ${card}`}>
            <h2 className={`font-medium mb-3 ${text}`}>New contact</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className={input} placeholder="Contact name *" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              <input className={input} placeholder="Organisation" value={newOrg} onChange={(e) => setNewOrg(e.target.value)} />
              <select className={input} value={newType} onChange={(e) => setNewType(e.target.value as (typeof CONTACT_TYPES)[number])}>
                {CONTACT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input className={input} placeholder="Notes" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="px-4 py-2 rounded text-sm bg-red-600 text-white">Save</button>
              <button type="button" onClick={() => setShowAdd(false)} className={`px-4 py-2 rounded text-sm ${muted}`}>Cancel</button>
            </div>
          </form>
        )}

        {scheduleFor && (
          <form onSubmit={scheduleMeeting} className={`rounded-lg border p-4 mb-6 ${card}`}>
            <h2 className={`font-medium mb-3 ${text}`}>Schedule meeting</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="datetime-local" className={input} value={meetingAt} onChange={(e) => setMeetingAt(e.target.value)} required />
              <input className={input} placeholder="Link or location" value={meetingLocation} onChange={(e) => setMeetingLocation(e.target.value)} />
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="px-4 py-2 rounded text-sm bg-red-600 text-white">Schedule</button>
              <button type="button" onClick={() => setScheduleFor(null)} className={`px-4 py-2 rounded text-sm ${muted}`}>Cancel</button>
            </div>
          </form>
        )}

        {loading ? (
          <p className={muted}>Loading contacts…</p>
        ) : contacts.length === 0 ? (
          <p className={muted}>No outreach contacts yet.</p>
        ) : (
          <div className="space-y-4">
            {contacts.map((c) => (
              <div key={c.id} className={`rounded-lg border p-4 ${card}`}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h3 className={`font-semibold ${text}`}>{c.contact_name}</h3>
                    <p className={`text-sm ${muted}`}>
                      {[c.organisation_name, c.contact_type].filter(Boolean).join(' · ')}
                    </p>
                    {c.notes && <p className={`text-sm mt-2 ${text}`}>{c.notes}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setScheduleFor(c.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-700 text-white"
                    >
                      <Calendar className="h-3 w-3" /> Meeting
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteContact(c.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400 border border-red-500/40"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {FLAGS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleFlag(c, key)}
                      className={`px-2 py-1 rounded-full text-xs border ${
                        c[key]
                          ? 'bg-green-600/20 border-green-500 text-green-400'
                          : dark
                            ? 'border-gray-600 text-gray-400'
                            : 'border-gray-300 text-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {(c.outreach_meetings?.length ?? 0) > 0 && (
                  <div className="mt-4 border-t border-inherit pt-3">
                    <p className={`text-xs font-medium mb-2 ${muted}`}>Upcoming / past meetings</p>
                    <ul className="space-y-2">
                      {c.outreach_meetings!
                        .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
                        .map((m) => (
                          <li key={m.id} className={`text-sm flex justify-between gap-2 ${text}`}>
                            <span>
                              {new Date(m.scheduled_at).toLocaleString()}
                              {m.meeting_link_or_location ? ` — ${m.meeting_link_or_location}` : ''}
                              {m.reminder_sent ? ' (reminder sent)' : ''}
                            </span>
                            <button type="button" onClick={() => deleteMeeting(m.id)} className="text-red-400 text-xs">
                              Remove
                            </button>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
