'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { PostTipCommunityPrompt } from '@/src/components/community/PostTipCommunityPrompt';
import { isCommunityTipPromptDismissed } from '@/src/lib/community-join-prompt-storage';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';

function TipSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const creatorId = searchParams.get('creator_id') ?? '';
  const creatorName = searchParams.get('creator_name') ?? 'this creator';

  const [isLoading, setIsLoading] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkPrompt() {
      if (!creatorId || isCommunityTipPromptDismissed(creatorId)) {
        if (!cancelled) {
          setShowPrompt(false);
          setIsLoading(false);
        }
        return;
      }

      try {
        const res = await fetchWithSupabaseAuth(
          `/api/community/tip-prompt-eligible?creator_id=${encodeURIComponent(creatorId)}`,
        );
        const json = await res.json();
        if (!cancelled) {
          setShowPrompt(Boolean(json?.eligible));
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setShowPrompt(false);
          setIsLoading(false);
        }
      }
    }

    const timer = setTimeout(() => {
      checkPrompt();
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [creatorId]);

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-pink-500 mx-auto mb-4" />
          <p className="text-gray-400">Processing your tip...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Tip Sent Successfully!</h1>
          <p className="text-gray-400">
            Thank you for supporting {creatorName}. Your tip has been processed and the creator
            will receive their earnings.
          </p>
        </div>

        {showPrompt && creatorId ? (
          <PostTipCommunityPrompt
            creatorId={creatorId}
            creatorName={creatorName}
            onDismiss={() => setShowPrompt(false)}
            onJoined={() => setShowPrompt(false)}
          />
        ) : null}

        <div className="space-y-3 mt-6">
          <button
            onClick={handleGoBack}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-lg hover:from-pink-600 hover:to-red-600 transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go Back</span>
          </button>

          <button
            onClick={handleGoHome}
            className="w-full px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TipSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-pink-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <TipSuccessContent />
    </Suspense>
  );
}
