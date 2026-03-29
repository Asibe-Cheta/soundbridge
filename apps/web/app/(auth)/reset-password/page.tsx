'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createBrowserClient } from '@/src/lib/supabase';
import Image from 'next/image';

/**
 * Recovery entrypoint: Supabase "Reset password" email should link here as:
 *   {SITE_URL}/reset-password?token_hash={{ .TokenHash }}&type=recovery
 * We verify the OTP client-side, then send the user to /update-password (session active).
 * PKCE/code flow: ?code=… is exchanged for a session, then same redirect.
 * With no token/code, users are sent to /forgot-password (request email form).
 */
function ResetPasswordVerifyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      const code = searchParams.get('code');
      const supabase = createBrowserClient();

      try {
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (exErr) {
            setError(exErr.message);
            setWorking(false);
            return;
          }
          router.replace('/update-password');
          return;
        }

        if (tokenHash && type === 'recovery') {
          const { error: vErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (cancelled) return;
          if (vErr) {
            setError(vErr.message);
            setWorking(false);
            return;
          }
          router.replace('/update-password');
          return;
        }

        if (tokenHash && !type) {
          const { error: vErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (cancelled) return;
          if (vErr) {
            setError(vErr.message);
            setWorking(false);
            return;
          }
          router.replace('/update-password');
          return;
        }

        router.replace('/forgot-password');
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Verification failed');
          setWorking(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  if (working && !error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(255, 255, 255, 0.1)',
              borderTop: '4px solid #DC2626',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          <p style={{ color: 'white', fontSize: '1rem', opacity: 0.8 }}>Confirming reset link…</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <Link
        href="/"
        style={{
          position: 'absolute',
          top: '2rem',
          left: '2rem',
          color: 'white',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          borderRadius: '25px',
          border: '2px solid rgba(255, 255, 255, 0.3)',
        }}
      >
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      <div
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '3rem',
          maxWidth: '480px',
          textAlign: 'center',
        }}
      >
        <div className="logo" style={{ marginBottom: '1.5rem' }}>
          <Image src="/images/logos/logo-trans-lockup.png" alt="SoundBridge" width={150} height={40} priority style={{ height: 'auto' }} />
        </div>
        <h1 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '1rem' }}>Reset link invalid</h1>
        <p style={{ color: '#ccc', marginBottom: '1.5rem' }}>{error}</p>
        <Link href="/forgot-password" style={{ color: '#EC4899', textDecoration: 'underline' }}>
          Request a new reset link
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p style={{ color: 'white' }}>Loading…</p>
        </div>
      }
    >
      <ResetPasswordVerifyInner />
    </Suspense>
  );
}
