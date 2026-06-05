'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Music } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { CreatorAgreementForm } from '@/src/components/legal/CreatorAgreementForm';
import {
  allCreatorAgreementChecksTicked,
  CREATOR_AGREEMENT_VERSION,
  emptyCreatorAgreementChecks,
  type CreatorAgreementCheckboxId,
} from '@/src/constants/creatorAgreement';
import { fetchJsonWithAuth } from '@/src/lib/fetchWithAuth';
import { createBrowserClient } from '@/src/lib/supabase';

type Step = 'perks' | 'agreement';

export default function BecomeCreatorPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, session, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>('perks');
  const [checks, setChecks] = useState(emptyCreatorAgreementChecks());
  const [isLoading, setIsLoading] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || authLoading) return;

    let cancelled = false;
    (async () => {
      try {
        const supabase = createBrowserClient();
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, creator_agreement_accepted')
          .eq('id', user.id)
          .maybeSingle();

        if (!cancelled && profile?.role === 'creator' && profile?.creator_agreement_accepted) {
          router.replace('/upload');
        }
        if (!cancelled && profile?.role === 'creator' && !profile?.creator_agreement_accepted) {
          setStep('agreement');
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setCheckingRole(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading, router]);

  const toggleCheck = (id: CreatorAgreementCheckboxId) => {
    setChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleConfirm = async () => {
    if (!allCreatorAgreementChecksTicked(checks)) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: apiError, response } = await fetchJsonWithAuth('/api/user/become-creator', {
        method: 'POST',
        body: JSON.stringify({
          creator_agreement_accepted: true,
          creator_agreement_version: CREATOR_AGREEMENT_VERSION,
        }),
      });

      if (apiError || !response?.ok || !data?.success) {
        throw new Error(apiError || data?.error || 'Failed to become a creator');
      }

      router.push('/upload');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const allTicked = allCreatorAgreementChecksTicked(checks);
  const isDark = theme === 'dark';

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div
        className={`min-h-screen ${
          isDark ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' : 'bg-gray-50'
        }`}
      >
        <main className="main-container py-12 sm:py-16">
          <div
            className={`mx-auto max-w-2xl rounded-2xl border p-6 sm:p-8 ${
              isDark ? 'border-white/10 bg-white/10 backdrop-blur-lg' : 'border-gray-200 bg-white shadow-lg'
            }`}
          >
            {step === 'perks' ? (
              <>
                <div className="mb-8 text-center">
                  <Music className={`mx-auto mb-4 h-14 w-14 ${isDark ? 'text-pink-400' : 'text-pink-600'}`} />
                  <h1 className={`text-3xl font-bold sm:text-4xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Become a Creator
                  </h1>
                  <p className={`mt-3 text-lg ${isDark ? 'text-white/80' : 'text-gray-600'}`}>
                    Upload music, host events, offer services, and earn on SoundBridge.
                  </p>
                </div>
                <ul className={`mb-8 space-y-3 ${isDark ? 'text-white/85' : 'text-gray-700'}`}>
                  {[
                    'Upload tracks, albums, and podcasts',
                    'Create and promote live events',
                    'Receive tips and sell content directly',
                    'List professional audio services',
                  ].map((perk) => (
                    <li key={perk} className="flex items-start gap-3">
                      <CheckCircle className={`mt-0.5 h-5 w-5 shrink-0 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setStep('agreement')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-pink-500 px-6 py-4 font-semibold text-white shadow-lg transition hover:brightness-110"
                >
                  Continue
                  <ArrowRight className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep('perks')}
                  className={`mb-6 inline-flex items-center gap-2 text-sm ${isDark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <h1 className={`mb-2 text-2xl font-bold sm:text-3xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Creator Agreement
                </h1>
                <p className={`mb-6 ${isDark ? 'text-white/75' : 'text-gray-600'}`}>
                  Before you start uploading and earning on SoundBridge, please confirm the following.
                </p>

                {error && (
                  <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </p>
                )}

                <CreatorAgreementForm checks={checks} onToggle={toggleCheck} />

                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!allTicked || isLoading || !session}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-pink-500 px-6 py-4 font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    'I Agree — Start Creating'
                  )}
                </button>
              </>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
