'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import QRCode from 'qrcode';
import { useTheme } from '@/src/contexts/ThemeContext';

type Session = {
  id: string;
  session_name: string | null;
  minimum_tip_amount: number;
  status: 'active' | 'ended';
  total_tips_collected: number;
  total_requests_received: number;
};

type RoomRequest = {
  id: string;
  song_request: string;
  tipper_name: string;
  tip_amount: number;
  status: 'pending' | 'playing' | 'done';
  created_at: string;
};

export default function RequestRoomDashboardPage() {
  const { theme } = useTheme();
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [requests, setRequests] = useState<RoomRequest[]>([]);
  const [sessionName, setSessionName] = useState('');
  const [minimumTip, setMinimumTip] = useState('1');
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionUrl =
    session ? `${typeof window !== 'undefined' ? window.location.origin : 'https://www.soundbridge.live'}/request/${session.id}` : '';

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/request-room/sessions');
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || 'Unable to load Request Room');
      setLoading(false);
      return;
    }

    const active = (json.sessions || []).find((s: Session) => s.status === 'active') || null;
    setSession(active);
    if (active) {
      const { data } = await supabase
        .from('request_room_requests')
        .select('*')
        .eq('session_id', active.id)
        .order('created_at', { ascending: false })
        .limit(100);
      setRequests((data || []) as RoomRequest[]);
    } else {
      setRequests([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!sessionUrl) {
      setQrUrl('');
      return;
    }
    QRCode.toDataURL(sessionUrl, { width: 512, margin: 1, color: { dark: '#111111', light: '#ffffff' } })
      .then(setQrUrl)
      .catch(() => setQrUrl(''));
  }, [sessionUrl]);

  useEffect(() => {
    if (!session?.id) return;
    const channel = supabase
      .channel(`request_room_${session.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'request_room_requests', filter: `session_id=eq.${session.id}` },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, supabase]);

  const startSession = async () => {
    setError(null);
    const res = await fetch('/api/request-room/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_name: sessionName,
        minimum_tip_amount: Number(minimumTip),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || 'Could not start session');
      return;
    }
    await loadData();
  };

  const endSession = async () => {
    if (!session) return;
    const res = await fetch(`/api/request-room/sessions/${session.id}/end`, { method: 'POST' });
    if (res.ok) await loadData();
  };

  const updateStatus = async (requestId: string, status: 'pending' | 'playing' | 'done') => {
    await fetch(`/api/request-room/requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadData();
  };

  const isDark = theme === 'dark';
  const pageClass = isDark ? 'min-h-screen bg-[#121212] p-6 text-white' : 'min-h-screen bg-slate-50 p-6 text-slate-900';
  const cardClass = isDark ? 'rounded-xl border border-white/10 bg-black/20 p-6 shadow-sm' : 'rounded-xl border border-slate-200 bg-white p-6 shadow-sm';
  const helperCardClass = isDark ? 'rounded-lg border border-white/10 bg-white/5 p-3' : 'rounded-lg border border-slate-200 bg-slate-50 p-3';
  const sectionCardClass = isDark ? 'rounded-xl border border-white/10 bg-black/20 p-4 shadow-sm' : 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm';
  const mutedTextClass = isDark ? 'text-white/70' : 'text-slate-600';
  const inputClass = isDark
    ? 'w-full rounded-lg border border-white/20 bg-black/30 px-4 py-3 text-white placeholder:text-white/40 focus:border-rose-500 focus:outline-none'
    : 'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none';
  const subtleBtnClass = isDark
    ? 'rounded-lg border border-white/20 px-4 py-2 text-white hover:bg-white/10'
    : 'rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100';
  const queueItemClass = isDark ? 'flex items-center justify-between rounded-lg border border-white/10 p-3' : 'flex items-center justify-between rounded-lg border border-slate-200 p-3';

  if (loading) return <main className={pageClass}>Loading...</main>;

  return (
    <main className={pageClass}>
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-3xl font-bold">Request Room</h1>
        <p className={mutedTextClass}>
          Open a live request session, set a minimum tip, share your link or QR code, and get requests in real time.
        </p>
        <div className={isDark ? 'rounded-xl border border-white/10 bg-black/20 p-5 shadow-sm' : 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm'}>
          <h2 className={isDark ? 'text-lg font-semibold text-white' : 'text-lg font-semibold text-slate-900'}>How it works</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className={helperCardClass}>
              <p className={isDark ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-800'}>1. Start session</p>
              <p className={isDark ? 'mt-1 text-sm text-white/70' : 'mt-1 text-sm text-slate-600'}>Set a session name and minimum tip amount in USD.</p>
            </div>
            <div className={helperCardClass}>
              <p className={isDark ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-800'}>2. Share link or QR</p>
              <p className={isDark ? 'mt-1 text-sm text-white/70' : 'mt-1 text-sm text-slate-600'}>Fans scan the QR or open your link to send requests and tips.</p>
            </div>
            <div className={helperCardClass}>
              <p className={isDark ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-800'}>3. Manage requests live</p>
              <p className={isDark ? 'mt-1 text-sm text-white/70' : 'mt-1 text-sm text-slate-600'}>Track incoming requests, mark as Playing/Done, and end session when finished.</p>
            </div>
          </div>
        </div>

        {error ? <div className={isDark ? 'rounded-lg border border-red-500/40 bg-red-900/20 p-3 text-red-200' : 'rounded-lg border border-red-200 bg-red-50 p-3 text-red-700'}>{error}</div> : null}

        {!session ? (
          <div className={`${cardClass} space-y-4`}>
            <div>
              <label className={isDark ? 'mb-2 block text-sm font-semibold text-white' : 'mb-2 block text-sm font-semibold text-slate-800'}>Session name (optional)</label>
              <input
                value={sessionName}
                onChange={e => setSessionName(e.target.value)}
                placeholder='Example: "Saturday Night at Lounge 44"'
                className={inputClass}
              />
            </div>
            <div>
              <label className={isDark ? 'mb-2 block text-sm font-semibold text-white' : 'mb-2 block text-sm font-semibold text-slate-800'}>Minimum tip amount (USD)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={minimumTip}
                onChange={e => setMinimumTip(e.target.value)}
                placeholder="1.00"
                className={inputClass}
              />
              <p className={isDark ? 'mt-2 text-sm text-white/60' : 'mt-2 text-sm text-slate-500'}>
                This is the minimum money a fan must pay per request. The default value <strong>1</strong> means $1.00.
              </p>
            </div>
            <button onClick={startSession} className="rounded-lg bg-red-600 px-5 py-3 font-semibold hover:bg-red-500">
              Start Session
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <div className={`${cardClass} space-y-3`}>
                <p className="text-lg font-semibold">{session.session_name || 'Live Request Room'}</p>
                <p className={mutedTextClass}>Minimum tip: ${Number(session.minimum_tip_amount || 0).toFixed(2)}</p>
                <p className={mutedTextClass}>Total tips: ${Number(session.total_tips_collected || 0).toFixed(2)}</p>
                <p className={mutedTextClass}>Requests: {session.total_requests_received || 0}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(sessionUrl)}
                    className={subtleBtnClass}
                  >
                    Copy Link
                  </button>
                  <a
                    href={`/request-room/${session.id}/project`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={subtleBtnClass}
                  >
                    Open Projection View
                  </a>
                  <button
                    onClick={endSession}
                    className="rounded-lg bg-red-600 px-4 py-2 font-semibold hover:bg-red-500"
                  >
                    End Session
                  </button>
                </div>
              </div>
              <div className={isDark ? 'rounded-xl border border-white/10 bg-black/20 p-4 text-white shadow-sm' : 'rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm'}>
                {qrUrl ? <img src={qrUrl} alt="Request room QR code" className="mx-auto h-72 w-72 object-contain" /> : null}
                <p className={isDark ? 'mt-3 text-center text-sm text-white/70' : 'mt-3 text-center text-sm text-slate-600'}>Scan to request: {sessionUrl}</p>
              </div>
            </div>

            <div className={sectionCardClass}>
              <h2 className="mb-3 text-xl font-semibold">Request Queue</h2>
              <div className="space-y-3">
                {requests.length === 0 ? (
                  <p className={isDark ? 'text-white/60' : 'text-slate-500'}>No requests yet.</p>
                ) : (
                  requests.map(req => (
                    <div key={req.id} className={queueItemClass}>
                      <div>
                        <p className="font-medium">{req.song_request}</p>
                        <p className={isDark ? 'text-sm text-white/70' : 'text-sm text-slate-600'}>
                          {req.tipper_name || 'Anonymous'} - ${Number(req.tip_amount || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => updateStatus(req.id, 'playing')} className={isDark ? 'rounded border border-white/20 px-2 py-1 text-sm text-white hover:bg-white/10' : 'rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-100'}>
                          Playing
                        </button>
                        <button onClick={() => updateStatus(req.id, 'done')} className={isDark ? 'rounded border border-white/20 px-2 py-1 text-sm text-white hover:bg-white/10' : 'rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-100'}>
                          Done
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

