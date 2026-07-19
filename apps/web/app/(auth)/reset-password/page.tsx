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
 * A raw token_hash is handed off to /auth/confirm, which only calls verifyOtp()
 * on explicit user click — auto-verifying here would let link-scanning proxies
 * (mail security scanners, link previewers) burn the single-use token before the
 * real user opens the email.
 * PKCE/code flow: ?code=… is exchanged for a session directly (requires the
 * code_verifier from the browser that requested it, so it isn't exposed to the
 * same remote-scanner risk), then redirected to /update-password.
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

        if (tokenHash) {
          // Hand off to the click-to-verify confirm page instead of consuming
          // the single-use token here.
          const confirmUrl = new URL('/auth/confirm', window.location.origin);
          confirmUrl.searchParams.set('token_hash', tokenHash);
          confirmUrl.searchParams.set('type', 'recovery');
          confirmUrl.searchParams.set('next', '/update-password');
          router.replace(confirmUrl.pathname + confirmUrl.search);
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
          <p style={{ color: 'white', opacity: 0.8 }}>Confirming reset link…</p>
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
        <h1 style={{ color: 'white', marginBottom: '1rem' }}>Reset link invalid</h1>
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
