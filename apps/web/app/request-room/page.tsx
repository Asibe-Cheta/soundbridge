'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import QRCode from 'qrcode';

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

  if (loading) return <main className="min-h-screen bg-[#121212] p-6 text-white">Loading...</main>;

  return (
    <main className="min-h-screen bg-[#121212] p-6 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-3xl font-bold">Request Room</h1>
        <p className="text-white/70">
          Open a live request session, set a minimum tip, share your link or QR code, and get requests in real time.
        </p>

        {error ? <div className="rounded-lg bg-red-600/20 p-3 text-red-200">{error}</div> : null}

        {!session ? (
          <div className="rounded-xl border border-white/10 bg-black/20 p-6 space-y-3">
            <input
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
              placeholder="Session name (optional)"
              className="w-full rounded-lg border border-white/20 bg-black/30 px-4 py-3"
            />
            <input
              type="number"
              min="1"
              step="0.01"
              value={minimumTip}
              onChange={e => setMinimumTip(e.target.value)}
              placeholder="Minimum tip amount"
              className="w-full rounded-lg border border-white/20 bg-black/30 px-4 py-3"
            />
            <button onClick={startSession} className="rounded-lg bg-red-600 px-5 py-3 font-semibold hover:bg-red-500">
              Start Session
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/20 p-6 space-y-3">
                <p className="text-lg font-semibold">{session.session_name || 'Live Request Room'}</p>
                <p className="text-white/70">Minimum tip: ${Number(session.minimum_tip_amount || 0).toFixed(2)}</p>
                <p className="text-white/70">Total tips: ${Number(session.total_tips_collected || 0).toFixed(2)}</p>
                <p className="text-white/70">Requests: {session.total_requests_received || 0}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(sessionUrl)}
                    className="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10"
                  >
                    Copy Link
                  </button>
                  <a
                    href={`/request-room/${session.id}/project`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10"
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
              <div className="rounded-xl border border-white/10 bg-white p-4 text-black">
                {qrUrl ? <img src={qrUrl} alt="Request room QR code" className="mx-auto h-72 w-72 object-contain" /> : null}
                <p className="mt-3 text-center text-sm">Scan to request: {sessionUrl}</p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <h2 className="mb-3 text-xl font-semibold">Request Queue</h2>
              <div className="space-y-3">
                {requests.length === 0 ? (
                  <p className="text-white/60">No requests yet.</p>
                ) : (
                  requests.map(req => (
                    <div key={req.id} className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                      <div>
                        <p className="font-medium">{req.song_request}</p>
                        <p className="text-sm text-white/70">
                          {req.tipper_name || 'Anonymous'} - ${Number(req.tip_amount || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => updateStatus(req.id, 'playing')} className="rounded border border-white/20 px-2 py-1 text-sm">
                          Playing
                        </button>
                        <button onClick={() => updateStatus(req.id, 'done')} className="rounded border border-white/20 px-2 py-1 text-sm">
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

