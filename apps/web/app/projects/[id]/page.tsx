'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Bell, Wallet } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { fetchWithAuth } from '@/src/lib/fetchWithAuth';
import { getProjectRatings } from '@/src/services/gigRatingService';

const RATING_PROMPTED_KEY = 'soundbridge_rating_prompted';

interface Project {
  id: string;
  title: string;
  brief: string;
  agreed_amount: number;
  currency: string;
  status: string;
  poster_user_id: string;
  creator_user_id: string;
  updated_at: string;
  completed_at?: string | null;
}

const AUTO_RELEASE_HOURS = 48;
const REMINDER_HOURS = 24;

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0h 0m';
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${h}h ${m}m`;
}

export default function OpportunityProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<string>('');
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  const [ratingPromptDismissed, setRatingPromptDismissed] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [rateeId, setRateeId] = useState<string | null>(null);
  const [rateeName, setRateeName] = useState('');

  const isPoster = project && user?.id === project.poster_user_id;
  const isCreator = project && user?.id === project.creator_user_id;
  const isDelivered = project?.status === 'delivered';
  const isCompleted = project?.status === 'completed';

  useEffect(() => {
    if (!user || !projectId) return;
    (async () => {
      try {
        const res = await fetchWithAuth(`/api/opportunity-projects/${projectId}`);
        if (!res.ok) {
          router.replace('/feed');
          return;
        }
        const p = await res.json();
        setProject(p);
      } catch {
        router.replace('/feed');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, projectId, router]);

  useEffect(() => {
    if (!project || project.status !== 'delivered') return;
    const updatedAt = new Date(project.updated_at).getTime();
    const releaseAt = updatedAt + AUTO_RELEASE_HOURS * 60 * 60 * 1000;
    const tick = () => {
      const now = Date.now();
      setCountdown(formatCountdown(Math.max(0, releaseAt - now)));
    };
    tick();
    const interval = setInterval(tick, 60 * 1000);
    return () => clearInterval(interval);
  }, [project]);

  useEffect(() => {
    if (!project || project.status !== 'completed' || !user) return;
    (async () => {
      try {
        const data = await getProjectRatings(projectId);
        setHasRated(data.has_rated);
        if (data.has_rated) return;
        const prompted = (() => {
          try {
            const raw = localStorage.getItem(RATING_PROMPTED_KEY);
            return raw ? (JSON.parse(raw) as string[]) : [];
          } catch {
            return [];
          }
        })();
        if (prompted.includes(projectId)) {
          setRatingPromptDismissed(true);
          return;
        }
        const otherId = user.id === project.poster_user_id ? project.creator_user_id : project.poster_user_id;
        setRateeId(otherId);
        setRateeName('them');
        setShowRatingPrompt(true);
      } catch {
        setShowRatingPrompt(false);
      }
    })();
  }, [project, projectId, user]);

  const markDelivered = async () => {
    if (!projectId) return;
    try {
      const res = await fetchWithAuth(`/api/opportunity-projects/${projectId}/mark-delivered`, { method: 'POST' });
      if (res.ok) {
        const p = await fetchWithAuth(`/api/opportunity-projects/${projectId}`).then((r) => r.json());
        setProject(p);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const confirmDelivery = async () => {
    if (!projectId) return;
    try {
      const res = await fetchWithAuth(`/api/opportunity-projects/${projectId}/confirm-delivery`, { method: 'POST' });
      if (res.ok) {
        const p = await fetchWithAuth(`/api/opportunity-projects/${projectId}`).then((r) => r.json());
        setProject(p);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRatingLater = () => {
    try {
      const raw = localStorage.getItem(RATING_PROMPTED_KEY);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      if (!arr.includes(projectId)) arr.push(projectId);
      localStorage.setItem(RATING_PROMPTED_KEY, JSON.stringify(arr));
    } catch {}
    setShowRatingPrompt(false);
    setRatingPromptDismissed(true);
  };

  const deliveredHoursAgo = project?.status === 'delivered' && project?.updated_at
    ? (Date.now() - new Date(project.updated_at).getTime()) / (60 * 60 * 1000)
    : 0;
  const show24hReminder = isDelivered && deliveredHoursAgo >= REMINDER_HOURS - 1;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen p-4 pb-8 max-w-xl mx-auto">
      <Link
        href="/feed"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <Card variant="glass" size="default" className="mb-6">
        <CardHeader>
          <CardTitle>{project.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">{project.brief}</p>
          <p className="text-sm font-medium">
            {project.currency} {project.agreed_amount}
          </p>
          <p className="text-xs text-muted-foreground">Status: {project.status}</p>
        </CardContent>
      </Card>

      {/* A. 48-hour auto-release countdown */}
      {isDelivered && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Clock className="w-4 h-4" />
          Auto-releases in {countdown} if not disputed
        </div>
      )}

      {/* B. 24-hour reminder banner */}
      {show24hReminder && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 mb-6 flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-600" />
          <p className="text-sm">
            Please confirm the work was completed — auto-releases in {countdown}
          </p>
        </div>
      )}

      {/* Actions by role and status */}
      {project.status === 'active' && isCreator && (
        <Button onClick={markDelivered} className="w-full mb-4">
          Mark as delivered
        </Button>
      )}

      {isDelivered && isPoster && (
        <>
          <Button onClick={confirmDelivery} className="w-full mb-4">
            Confirm delivery & release payment
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push(`/dispute/${projectId}`)}
          >
            Raise a dispute
          </Button>
        </>
      )}

      {isDelivered && isCreator && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push(`/dispute/${projectId}`)}
        >
          Raise a dispute
        </Button>
      )}

      {/* E. View in Wallet — completed, user is provider (creator) */}
      {isCompleted && isCreator && (
        <Link
          href="/wallet"
          className="inline-flex items-center gap-2 text-primary hover:underline mt-4"
        >
          <Wallet className="w-4 h-4" /> View payment in Wallet →
        </Link>
      )}

      {/* D. Rating prompt after completion */}
      {showRatingPrompt && !hasRated && !ratingPromptDismissed && rateeId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-sm w-full">
            <CardHeader>
              <CardTitle>Leave a review for {rateeName}?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your feedback helps the community.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleRatingLater}
                  className="flex-1"
                >
                  Later
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setShowRatingPrompt(false);
                    const q = new URLSearchParams({
                      rateeId,
                      rateeName,
                      role: isPoster ? 'requester' : 'provider',
                    });
                    router.push(`/rate/${projectId}?${q.toString()}`);
                  }}
                >
                  Leave review
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
