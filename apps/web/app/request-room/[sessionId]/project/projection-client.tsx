'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type PublicSession = {
  id: string;
  session_name: string | null;
  status: 'active' | 'ended';
};

export default function RequestRoomProjectionClient({ sessionId }: { sessionId: string }) {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [session, setSession] = useState<PublicSession | null>(null);
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const audienceUrl =
    typeof window === 'undefined'
      ? `https://www.soundbridge.live/request/${sessionId}`
      : `${window.location.origin}/request/${sessionId}`;

  const loadSession = async () => {
    const res = await fetch(`/api/request-room/sessions/${sessionId}`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.session) {
      setSession({ id: sessionId, session_name: null, status: 'ended' });
      setLoading(false);
      return;
    }
    setSession(json.session as PublicSession);
    setLoading(false);
  };

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  useEffect(() => {
    QRCode.toDataURL(audienceUrl, {
      width: 900,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then(setQrUrl)
      .catch(() => setQrUrl(''));
  }, [audienceUrl]);

  useEffect(() => {
    const channel = supabase
      .channel(`request_room_projection_${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'request_room_sessions', filter: `id=eq.${sessionId}` },
        () => {
          loadSession();
        },
      )
      .subscribe(status => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    // Fallback polling to handle RLS visibility transition once a session is ended.
    const timer = window.setInterval(() => {
      loadSession();
    }, 10000); // Hard cap: refresh within 10s even if realtime disconnects.

    return () => {
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-2xl">Loading session...</p>
      </main>
    );
  }

  if (!session || session.status !== 'active') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
        <img src="/images/logo-trans-lockup.svg" alt="SoundBridge" className="mb-8 h-14 w-auto" />
        <h1 className="text-5xl font-bold">This session has ended</h1>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-8 text-white">
      <style>{`
        @keyframes qr-frame-breathe {
          0%, 100% { box-shadow: 0 0 0 2px rgba(255,255,255,0.10), 0 0 24px rgba(255,214,102,0.14); }
          50% { box-shadow: 0 0 0 2px rgba(255,255,255,0.20), 0 0 34px rgba(255,214,102,0.28); }
        }
        @keyframes label-soft-fade {
          0%, 100% { opacity: 0.72; }
          50% { opacity: 1; }
        }
      `}</style>

      <div
        className="relative rounded-3xl bg-white p-8 shadow-2xl"
        style={{ animation: 'qr-frame-breathe 3.8s ease-in-out infinite' }}
      >
        {qrUrl ? (
          <img
            src={qrUrl}
            alt="Request Room QR code"
            className="h-[72vh] w-[72vh] max-h-[860px] max-w-[860px]"
          />
        ) : null}
        <div className="absolute left-1/2 top-1/2 flex h-28 w-56 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-white p-3 shadow-md">
          <img src="/images/logo-trans-lockup.svg" alt="SoundBridge" className="h-10 w-auto" />
        </div>
      </div>

      <p className="mt-8 text-center text-3xl font-semibold">{session.session_name || 'Request Room'}</p>
      <p
        className="mt-2 text-center text-lg text-white/80"
        style={{ animation: 'label-soft-fade 3.4s ease-in-out infinite' }}
      >
        Scan to Request
      </p>
      <p className="mt-3 text-center text-2xl text-white/80">{audienceUrl}</p>
      {!realtimeConnected ? <p className="mt-2 text-sm text-amber-300/80">Reconnecting live updates...</p> : null}
    </main>
  );
}

