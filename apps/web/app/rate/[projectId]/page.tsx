'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Star } from 'lucide-react';
import { Button, Card, CardContent, Avatar, AvatarImage, AvatarFallback } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { getProjectRatings, submitRating } from '@/src/services/gigRatingService';
import { cn } from '@/src/lib/utils';

const RATING_MAX = 5;
const REVIEW_MAX = 1000;
const RATED_SKIPPED_KEY = 'soundbridge_rating_skipped';

function StarRating({
  value,
  onChange,
  label,
  required,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            <Star
              className={cn(
                'w-8 h-8 transition-colors',
                n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PostGigRatingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = params.projectId as string;

  const rateeId = searchParams.get('rateeId') ?? '';
  const rateeName = searchParams.get('rateeName') ?? 'them';
  const rateeAvatarUrl = searchParams.get('rateeAvatarUrl') ?? undefined;
  const role = (searchParams.get('role') === 'provider' ? 'provider' : 'requester') as 'requester' | 'provider';

  const [loading, setLoading] = useState(true);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [overall, setOverall] = useState(0);
  const [professionalism, setProfessionalism] = useState(0);
  const [punctuality, setPunctuality] = useState(0);
  const [quality, setQuality] = useState(0);
  const [paymentPromptness, setPaymentPromptness] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !projectId) return;
    (async () => {
      setError(null);
      try {
        const data = await getProjectRatings(projectId);
        if (data.has_rated) {
          setAlreadyRated(true);
          router.replace('/feed');
          return;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, projectId, router]);

  const requiredDone = overall >= 1 && professionalism >= 1 && punctuality >= 1;

  const handleSubmit = async () => {
    if (!requiredDone || !rateeId) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitRating({
        project_id: projectId,
        ratee_id: rateeId,
        overall_rating: overall,
        professionalism_rating: professionalism,
        punctuality_rating: punctuality,
        quality_rating: role === 'provider' ? (quality || undefined) : undefined,
        payment_promptness_rating: role === 'requester' ? (paymentPromptness || undefined) : undefined,
        review_text: reviewText.trim() || undefined,
      });
      if (typeof window !== 'undefined') {
        try {
          const skipped = JSON.parse(localStorage.getItem(RATED_SKIPPED_KEY) || '[]');
          const next = skipped.filter((p: string) => p !== projectId);
          localStorage.setItem(RATED_SKIPPED_KEY, JSON.stringify(next));
        } catch {}
      }
      router.push('/feed');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (typeof window !== 'undefined') {
      try {
        const skipped = JSON.parse(localStorage.getItem(RATED_SKIPPED_KEY) || '[]');
        if (!skipped.includes(projectId)) {
          skipped.push(projectId);
          localStorage.setItem(RATED_SKIPPED_KEY, JSON.stringify(skipped));
        }
      } catch {}
    }
    router.push('/feed');
  };

  if (loading || alreadyRated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-8 max-w-lg mx-auto">
      <Link
        href="/feed"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <Avatar className="h-14 w-14">
          {rateeAvatarUrl && <AvatarImage src={rateeAvatarUrl} alt="" />}
          <AvatarFallback>{rateeName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-semibold">How was your experience with {rateeName}?</h1>
        </div>
      </div>

      <Card variant="glass" size="default" className="mb-6">
        <CardContent className="pt-6 space-y-2">
          <StarRating label="Overall" value={overall} onChange={setOverall} required />
          <StarRating label="Professionalism" value={professionalism} onChange={setProfessionalism} required />
          <StarRating label="Punctuality" value={punctuality} onChange={setPunctuality} required />
          {role === 'provider' && (
            <StarRating label="Quality of work" value={quality} onChange={setQuality} />
          )}
          {role === 'requester' && (
            <StarRating label="Payment promptness" value={paymentPromptness} onChange={setPaymentPromptness} />
          )}
        </CardContent>
      </Card>

      <div className="space-y-2 mb-6">
        <label className="text-sm font-medium">Write a review (optional)</label>
        <textarea
          placeholder="Write a review..."
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value.slice(0, REVIEW_MAX))}
          className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          maxLength={REVIEW_MAX}
        />
        <p className="text-xs text-muted-foreground">{reviewText.length} / {REVIEW_MAX} characters</p>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        You won&apos;t see their rating until both have submitted.
      </p>

      {error && <p className="text-destructive text-sm mb-4">{error}</p>}

      <div className="flex flex-col gap-2">
        <Button onClick={handleSubmit} disabled={!requiredDone || submitting} className="w-full">
          {submitting ? 'Submitting...' : 'Submit Rating'}
        </Button>
        <Button variant="ghost" onClick={handleSkip} disabled={submitting} className="w-full">
          Skip for now
        </Button>
      </div>
    </div>
  );
}
