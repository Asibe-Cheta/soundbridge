'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { fetchJsonWithAuth } from '@/src/lib/fetchWithAuth';
import { clearCommunityEntryAttributionClient } from '@/src/lib/community-entry';

export type CommunityWelcomeClientProps = {
  creatorId: string;
  canonicalUsername: string;
  displayName: string;
  avatarUrl: string | null;
  subtitle: string;
};

export function CommunityWelcomeClient({
  creatorId,
  canonicalUsername,
  displayName,
  avatarUrl,
  subtitle,
}: CommunityWelcomeClientProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<'follow' | 'explore' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const complete = async (action: 'follow' | 'explore') => {
    setLoadingAction(action);
    setError(null);
    try {
      const { data, error: apiError, response } = await fetchJsonWithAuth(
        '/api/user/community-entry/complete',
        {
          method: 'POST',
          body: JSON.stringify({ action, creatorId }),
        },
      );

      if (apiError || !response?.ok || !data?.success) {
        throw new Error(apiError || data?.error || 'Something went wrong');
      }

      clearCommunityEntryAttributionClient();
      router.replace(data.redirectTo || (action === 'follow' ? `/creator/${canonicalUsername}` : '/feed'));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Please try again.');
      setLoadingAction(null);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-gray-950 via-[#120818] to-gray-950 px-6 py-12 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            'radial-gradient(ellipse 70% 45% at 50% 15%, rgba(168,85,247,0.22), transparent 55%), radial-gradient(ellipse 50% 35% at 80% 60%, rgba(34,211,238,0.12), transparent 50%)',
        }}
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <div className="relative flex h-[148px] w-[148px] items-center justify-center">
          <div
            className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-purple-500/40 to-cyan-400/25 blur-2xl"
            aria-hidden
          />
          <div
            className="relative h-[128px] w-[128px] rounded-full p-[3px] shadow-[0_0_40px_rgba(168,85,247,0.45)]"
            style={{
              background: 'linear-gradient(135deg, #a855f7, #22d3ee, #ec4899)',
            }}
          >
            <div className="relative h-full w-full overflow-hidden rounded-full bg-[#0a0a0f]">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  fill
                  className="object-cover"
                  sizes="128px"
                  priority
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-purple-200">
                  {displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        <h1 className="mt-8 text-2xl font-bold tracking-tight sm:text-3xl">{displayName}</h1>
        {subtitle ? <p className="mt-2 text-sm text-white/60">{subtitle}</p> : null}

        <h2 className="mt-10 text-xl font-semibold leading-snug sm:text-2xl">
          Welcome to {displayName}&apos;s community.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-white/75 sm:text-base">
          You are now connected with {displayName} on SoundBridge. Follow them to get notified about new music,
          events and everything they create.
        </p>

        {error ? (
          <p className="mt-6 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => complete('follow')}
          disabled={loadingAction !== null}
          className="mt-10 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500 px-6 py-4 text-base font-semibold shadow-lg shadow-purple-900/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingAction === 'follow' ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Following…
            </>
          ) : (
            `Follow ${displayName}`
          )}
        </button>

        <button
          type="button"
          onClick={() => complete('explore')}
          disabled={loadingAction !== null}
          className="mt-4 text-sm font-medium text-white/70 underline underline-offset-4 transition hover:text-white disabled:opacity-50"
        >
          {loadingAction === 'explore' ? 'Loading…' : 'Explore SoundBridge'}
        </button>

        <Link href="/" className="mt-10 text-xs text-white/35 hover:text-white/55">
          soundbridge.live
        </Link>
      </div>
    </div>
  );
}
